const { HfInference } = require('@huggingface/inference');
const { PGVectorStore } = require('@langchain/community/vectorstores/pgvector');
const { ChatOpenAI } = require('@langchain/openai');
const { RetrievalQAChain } = require('langchain/chains');
const { PromptTemplate } = require('@langchain/core/prompts');
const { pool } = require('../config/database');

class RAGService {
  constructor() {
    this.hf = null;
    this.vectorStore = null;
    this.llm = null;
    this.chains = new Map(); // Cache chains by business ID
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔄 Initializing RAG service...');

      // Initialize Hugging Face client
      const hfToken = process.env.HUGGING_FACE_API_KEY;
      if (!hfToken) {
        throw new Error('Hugging Face API key is required. Please set HUGGING_FACE_API_KEY environment variable.');
      }

      this.hf = new HfInference(hfToken);
      console.log('✅ Hugging Face client initialized');

      // Initialize LLM (prioritize Hugging Face, fallback to OpenAI)
      if (process.env.OPENAI_API_KEY) {
        this.llm = new ChatOpenAI({
          openAIApiKey: process.env.OPENAI_API_KEY,
          modelName: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 500
        });
        console.log('✅ Using OpenAI ChatOpenAI LLM as backup');
      } else {
        console.log('✅ Using Hugging Face API for text generation');
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
      // pgvector connection config - use same config as database.js
      const config = {
        postgresConnectionOptions: {
          host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
          port: process.env.PGPORT || process.env.DB_PORT || 5432,
          database: process.env.PGDATABASE || process.env.DB_NAME || 'quote_generator',
          user: process.env.PGUSER || process.env.DB_USER || 'postgres',
          password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'password',
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        },
        tableName: 'business_context',
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'embedding',
          contentColumnName: 'answer',
          metadataColumnName: 'metadata',
        },
      };

      // Skip vector store initialization since we'll use Hugging Face API for embeddings
      console.log('✅ Using Hugging Face API for embeddings - skipping vector store');
      this.vectorStore = null;
    } catch (error) {
      console.error('❌ Vector store initialization failed:', error);
      this.vectorStore = null;
    }
  }

  async generateEmbeddings(texts) {
    if (!this.hf) {
      throw new Error('Hugging Face client not initialized');
    }

    try {
      const embeddings = [];
      for (const text of texts) {
        const response = await this.hf.featureExtraction({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: text
        });
        embeddings.push(response);
      }
      return embeddings;
    } catch (error) {
      console.error('❌ Error generating embeddings:', error);
      throw error;
    }
  }

  async addBusinessContext(businessId, contextData) {
    try {
      const { question, answer, contentType, keywords } = contextData;
      
      // Generate embedding for the answer using Hugging Face API
      const embedding = await this.hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: answer
      });
      
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
      if (!this.hf) {
        console.log('⚠️  No Hugging Face client available, using keyword search');
        return this.fallbackSearch(businessId, query, limit);
      }

      // Generate embedding for the query using Hugging Face API
      const queryEmbedding = await this.hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: query
      });
      
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

      // Generate response using Hugging Face API
      let response;
      if (this.llm instanceof ChatOpenAI) {
        // Use ChatOpenAI format with structured messages
        const result = await this.llm.invoke(prompt);
        response = result.content;
      } else {
        // Use Hugging Face API for text generation
        try {
          const hfResponse = await this.hf.textGeneration({
            model: 'microsoft/DialoGPT-medium',
            inputs: typeof prompt === 'string' ? prompt : prompt[1].content,
            parameters: {
              max_new_tokens: 500,
              temperature: 0.7,
              do_sample: true,
              pad_token_id: 50256
            }
          });
          response = hfResponse.generated_text;
          
          // Clean up the response by removing the prompt if it's included
          if (typeof prompt === 'string' && response.startsWith(prompt)) {
            response = response.substring(prompt.length).trim();
          }
          
          console.log('✅ Generated response using Hugging Face API');
        } catch (hfError) {
          console.warn('⚠️  Hugging Face text generation failed, using fallback:', hfError.message);
          response = "I'd be happy to help you with your home improvement needs. Could you please provide more details about what specific service you're looking for? We offer a wide range of services including HVAC, plumbing, electrical, and remodeling work.";
        }
      }

      return {
        response: response.trim(),
        context: relevantContext,
        confidence: this.calculateConfidence(relevantContext)
      };

    } catch (error) {
      console.error('❌ Error generating response:', error);
      // Return a fallback response instead of throwing
      return {
        response: "I apologize, but I'm having trouble processing your request right now. Please try again or contact us directly for assistance.",
        context: [],
        confidence: 0.1
      };
    }
  }

  createPrompt(query, context) {
    if (this.llm instanceof ChatOpenAI) {
      // Return structured message for ChatOpenAI
      return [
        {
          role: "system",
          content: `You are a helpful customer service assistant for a home improvement company. 
Use the following context to answer the customer's question. If the context doesn't contain 
relevant information, provide a helpful general response and suggest they contact the company directly.

Context:
${context}`
        },
        {
          role: "user", 
          content: query
        }
      ];
    } else {
      // Return string prompt for mock LLM
      return `You are a helpful customer service assistant for a home improvement company. 
Use the following context to answer the customer's question. If the context doesn't contain 
relevant information, provide a helpful general response and suggest they contact the company directly.

Context:
${context}

Customer Question: ${query}

Response (be helpful, professional, and concise):`;
    }
  }

  calculateConfidence(context) {
    if (context.length === 0) return 0.1;
    
    const avgSimilarity = context.reduce((sum, ctx) => sum + (ctx.similarity || 0.5), 0) / context.length;
    return Math.min(avgSimilarity, 0.9); // Cap at 90%
  }
}


module.exports = RAGService;
