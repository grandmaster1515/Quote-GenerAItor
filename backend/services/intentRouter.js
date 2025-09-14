const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

class IntentRouter {
  constructor() {
    this.llm = null;
    this.initialized = false;
    this.businessName = process.env.BUSINESS_NAME || 'HomeFix Pro Services';
  }

  async initialize() {
    try {
      console.log('🔄 Initializing Intent Router...');

      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY environment variable.');
      }

      this.llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-3.5-turbo',
        temperature: 0.1, // Low temperature for consistent classification
        maxTokens: 50
      });

      this.initialized = true;
      console.log('✅ Intent Router initialized successfully');
    } catch (error) {
      console.error('❌ Intent Router initialization failed:', error.message);
      throw error;
    }
  }

  async classifyIntent(userMessage) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const classificationPrompt = PromptTemplate.fromTemplate(`
        You are an intelligent intent classifier for {businessName}.

        Your task is to classify user messages into exactly one of these intents:
        - QUESTION_ANSWERING: General questions about services, company info, how-to questions, or requests for information
        - QUOTE_BUILDING: Requests for work to be done, pricing, estimates, scheduling services, or hiring for a specific project

        Analyze the user's message and respond with ONLY the intent classification (no additional text).

        Examples:
        "How do I fix a leaky faucet?" → QUESTION_ANSWERING
        "What services do you offer?" → QUESTION_ANSWERING
        "How much does HVAC repair cost?" → QUESTION_ANSWERING
        "I need someone to install new kitchen cabinets" → QUOTE_BUILDING
        "Can you come fix my broken toilet?" → QUOTE_BUILDING
        "I want a quote for bathroom remodeling" → QUOTE_BUILDING
        "Schedule an appointment for roof repair" → QUOTE_BUILDING

        User message: "{message}"

        Intent:
      `);

      const chain = classificationPrompt.pipe(this.llm).pipe(new StringOutputParser());

      const result = await chain.invoke({
        businessName: this.businessName,
        message: userMessage
      });

      // Clean and validate the result
      const cleanResult = result.trim().toUpperCase();
      const validIntents = ['QUESTION_ANSWERING', 'QUOTE_BUILDING'];

      if (!validIntents.includes(cleanResult)) {
        console.warn(`⚠️ Invalid intent classification: "${cleanResult}", defaulting to QUESTION_ANSWERING`);
        return 'QUESTION_ANSWERING';
      }

      console.log(`✅ Intent classified as: ${cleanResult}`);
      return cleanResult;

    } catch (error) {
      console.error('❌ Error classifying intent:', error);
      // Default to QUESTION_ANSWERING on error
      return 'QUESTION_ANSWERING';
    }
  }

  generatePersonaPrompt(intent) {
    const basePersona = `You are a friendly and helpful assistant for ${this.businessName}. Your tone should be professional yet approachable. Avoid sounding like a robot. Vary your sentence structure and phrasing to make the conversation feel natural and engaging.`;

    if (intent === 'QUOTE_BUILDING') {
      return `${basePersona} The customer is interested in getting work done or pricing information. Be helpful in gathering information they need for their project, but keep responses conversational and personable.`;
    } else {
      return `${basePersona} The customer has questions about your services or needs information. Provide helpful, informative responses while maintaining a natural, conversational tone.`;
    }
  }

  generateWelcomeMessage() {
    const welcomeMessages = [
      `Hi there! I'm here to help you with any questions about ${this.businessName}. What can I assist you with today?`,
      `Hello! Welcome to ${this.businessName}. I'd be happy to help you with information about our services or answer any questions you might have.`,
      `Hey! Thanks for reaching out to ${this.businessName}. How can I help make your home improvement project a reality?`,
      `Welcome! I'm here to help you learn about ${this.businessName} and our services. What brings you here today?`
    ];

    // Return a random welcome message to feel more natural
    return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  }
}

module.exports = IntentRouter;