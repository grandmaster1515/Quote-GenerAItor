const { HuggingFaceTransformers } = require('@langchain/community/embeddings/hf_transformers');
const { PGVectorStore } = require('@langchain/community/vectorstores/pgvector');
const { OpenAI } = require('@langchain/openai');
const { RetrievalQAChain } = require('langchain/chains');
const { PromptTemplate } = require('@langchain/core/prompts');
const { pool } = require('../config/database');

class RAGService {
  constructor() {
    this.embeddings = null;
    this.vectorStore = null;
    this.llm = null;
    this.chains = new Map(); // Cache chains by business ID
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔄 Initializing RAG service...');

      // Initialize embeddings model (Sentence-BERT)
      this.embeddings = new HuggingFaceTransformers({
        modelName: 'sentence-transformers/all-MiniLM-L6-v2',
        // Use local model if available, otherwise download
        cache: true
      });

      // Initialize LLM (OpenAI or local alternative)
      if (process.env.OPENAI_API_KEY) {
        this.llm = new OpenAI({
          openAIApiKey: process.env.OPENAI_API_KEY,
          modelName: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 500
        });
        console.log('✅ Using OpenAI LLM');
      } else {
        // Fallback to mock LLM for development
        console.log('⚠️  No OpenAI API key found, using mock responses');
        this.llm = new MockLLM();
      }

      // Initialize vector store
      await this.initializeVectorStore();

      this.initialized = true;
      console.log('✅ RAG service initialized successfully');
    } catch (error) {
      console.error('❌ RAG service initialization failed:', error.message);
      throw error;
    }
  }

  async initializeVectorStore() {
    try {
      // pgvector connection config
      const config = {
        postgresConnectionOptions: {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'quote_generator',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
        },
        tableName: 'business_context',
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'embedding',
          contentColumnName: 'answer',
          metadataColumnName: 'metadata',
        },
      };

      this.vectorStore = await PGVectorStore.initialize(this.embeddings, config);
      console.log('✅ Vector store initialized');
    } catch (error) {
      console.error('❌ Vector store initialization failed:', error);
      // Continue without vector store for development
      this.vectorStore = null;
    }
  }

  async generateEmbeddings(texts) {
    if (!this.embeddings) {
      throw new Error('Embeddings model not initialized');
    }

    try {
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      console.error('❌ Error generating embeddings:', error);
      throw error;
    }
  }

  async addBusinessContext(businessId, contextData) {
    try {
      const { question, answer, contentType, keywords } = contextData;
      
      // Generate embedding for the answer
      const embedding = await this.embeddings.embedQuery(answer);
      
      // Store in database
      const query = `
        INSERT INTO business_context (business_id, content_type, question, answer, keywords, embedding, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      
      const metadata = {
        businessId,
        contentType,
        addedAt: new Date().toISOString()
      };
      
      const result = await pool.query(query, [
        businessId,
        contentType,
        question,
        answer,
        keywords,
        `[${embedding.join(',')}]`, // Convert array to PostgreSQL array format
        JSON.stringify(metadata)
      ]);
      
      console.log(`✅ Added context for business ${businessId}:`, result.rows[0].id);
      
      // Clear cached chain for this business
      this.chains.delete(businessId);
      
      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Error adding business context:', error);
      throw error;
    }
  }

  async findSimilarContext(businessId, query, limit = 5) {
    try {
      if (!this.embeddings) {
        return this.fallbackSearch(businessId, query, limit);
      }

      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Search for similar content using cosine similarity
      const searchQuery = `
        SELECT id, question, answer, content_type, keywords,
               1 - (embedding <=> $1) as similarity
        FROM business_context
        WHERE business_id = $2 AND is_active = true
        ORDER BY embedding <=> $1
        LIMIT $3
      `;
      
      const result = await pool.query(searchQuery, [
        `[${queryEmbedding.join(',')}]`,
        businessId,
        limit
      ]);
      
      return result.rows.map(row => ({
        id: row.id,
        question: row.question,
        answer: row.answer,
        contentType: row.content_type,
        keywords: row.keywords,
        similarity: row.similarity
      }));
      
    } catch (error) {
      console.error('❌ Error finding similar context:', error);
      // Fallback to keyword search
      return this.fallbackSearch(businessId, query, limit);
    }
  }

  async fallbackSearch(businessId, query, limit = 5) {
    try {
      const lowerQuery = query.toLowerCase();
      
      const searchQuery = `
        SELECT id, question, answer, content_type, keywords
        FROM business_context
        WHERE business_id = $1 
          AND is_active = true
          AND (
            LOWER(answer) LIKE $2 
            OR LOWER(question) LIKE $2
            OR EXISTS (
              SELECT 1 FROM unnest(keywords) keyword 
              WHERE LOWER(keyword) LIKE $2
            )
          )
        ORDER BY 
          CASE 
            WHEN LOWER(question) LIKE $2 THEN 1
            WHEN LOWER(answer) LIKE $2 THEN 2
            ELSE 3
          END
        LIMIT $3
      `;
      
      const result = await pool.query(searchQuery, [
        businessId,
        `%${lowerQuery}%`,
        limit
      ]);
      
      return result.rows.map(row => ({
        id: row.id,
        question: row.question,
        answer: row.answer,
        contentType: row.content_type,
        keywords: row.keywords,
        similarity: 0.5 // Default similarity for keyword matches
      }));
      
    } catch (error) {
      console.error('❌ Error in fallback search:', error);
      return [];
    }
  }

  async generateResponse(businessId, query, context = []) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Find relevant context
      const relevantContext = context.length > 0 
        ? context 
        : await this.findSimilarContext(businessId, query);

      // Build context string
      const contextString = relevantContext
        .map(ctx => `Q: ${ctx.question}\nA: ${ctx.answer}`)
        .join('\n\n');

      // Create prompt
      const prompt = this.createPrompt(query, contextString);

      // Generate response
      const response = await this.llm.call(prompt);

      return {
        response: response.trim(),
        context: relevantContext,
        confidence: this.calculateConfidence(relevantContext)
      };

    } catch (error) {
      console.error('❌ Error generating response:', error);
      throw error;
    }
  }

  createPrompt(query, context) {
    return `You are a helpful customer service assistant for a home improvement company. 
Use the following context to answer the customer's question. If the context doesn't contain 
relevant information, provide a helpful general response and suggest they contact the company directly.

Context:
${context}

Customer Question: ${query}

Response (be helpful, professional, and concise):`;
  }

  calculateConfidence(context) {
    if (context.length === 0) return 0.1;
    
    const avgSimilarity = context.reduce((sum, ctx) => sum + (ctx.similarity || 0.5), 0) / context.length;
    return Math.min(avgSimilarity, 0.9); // Cap at 90%
  }
}

// Mock LLM for development when OpenAI API key is not available
class MockLLM {
  async call(prompt) {
    // Simple mock responses based on keywords in the prompt
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('cost') || lowerPrompt.includes('price')) {
      return "I'd be happy to help you with pricing information. Costs can vary based on the specific requirements of your project. For an accurate quote, I recommend scheduling a free consultation where we can assess your needs and provide detailed pricing.";
    }
    
    if (lowerPrompt.includes('schedule') || lowerPrompt.includes('appointment')) {
      return "You can schedule an appointment by calling us directly or filling out our contact form. We typically have availability within 24-48 hours, and we offer emergency services for urgent situations.";
    }
    
    if (lowerPrompt.includes('emergency') || lowerPrompt.includes('urgent')) {
      return "We offer 24/7 emergency services for urgent situations. Please call our emergency line, and we'll dispatch a technician as soon as possible. Emergency service fees may apply.";
    }
    
    return "Thank you for your question! I'd be happy to help you with information about our services. For the most accurate and detailed information specific to your needs, I recommend contacting us directly so we can provide personalized assistance.";
  }
}

module.exports = RAGService;
