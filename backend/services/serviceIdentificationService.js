const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { pool } = require('../config/database');

class ServiceIdentificationService {
  constructor() {
    this.llm = null;
    this.initialized = false;
    this.businessName = process.env.BUSINESS_NAME || 'HomeFix Pro Services';
  }

  async initialize() {
    try {
      console.log('🔄 Initializing Service Identification Service...');

      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY environment variable.');
      }

      this.llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-3.5-turbo',
        temperature: 0.2, // Low temperature for consistent service matching
        maxTokens: 200
      });

      this.initialized = true;
      console.log('✅ Service Identification Service initialized successfully');
    } catch (error) {
      console.error('❌ Service Identification Service initialization failed:', error.message);
      throw error;
    }
  }

  async getBusinessServices(businessId) {
    try {
      const query = `
        SELECT id, name, description, pricing_info
        FROM services
        WHERE business_id = $1 AND is_active = true
        ORDER BY display_order ASC, name ASC
      `;

      const result = await pool.query(query, [businessId]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching business services:', error);
      return [];
    }
  }

  async identifyServices(businessId, userMessage) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Fetch available services for this business
      const availableServices = await this.getBusinessServices(businessId);

      if (availableServices.length === 0) {
        console.warn(`⚠️ No services found for business ${businessId}`);
        return {
          identifiedServices: [],
          matchedServices: [],
          needsFallback: true,
          confidence: 0.1
        };
      }

      // Create service list for the prompt
      const serviceList = availableServices
        .map(service => `- ${service.name}: ${service.description || 'No description available'}`)
        .join('\n');

      // Create the identification prompt
      const identificationPrompt = PromptTemplate.fromTemplate(`
        You are a service identification system for {businessName}.

        Your task is to analyze the user's message and identify ALL services they are requesting from the available service list.

        Available services:
        {serviceList}

        User message: "{userMessage}"

        Instructions:
        1. Identify ALL services mentioned in the user's message that match the available services
        2. Look for synonyms, related terms, and implied services
        3. If multiple services are requested, identify all of them
        4. Return ONLY a valid JSON array of exact service names from the list above
        5. If no services match, return an empty array: []

        Examples:
        - "I need my lawn cut and trees trimmed" → ["Lawn Mowing", "Tree Trimming"] (if these services exist)
        - "HVAC repair and plumbing help" → ["HVAC Services", "Plumbing Services"] (if these services exist)
        - "Kitchen renovation" → ["Kitchen Remodeling"] (if this service exists)
        - "I need help with something not listed" → []

        Return only the JSON array:
      `);

      const chain = identificationPrompt.pipe(this.llm).pipe(new StringOutputParser());

      const result = await chain.invoke({
        businessName: this.businessName,
        serviceList,
        userMessage
      });

      // Parse the JSON response
      let identifiedServiceNames = [];
      try {
        const cleanResult = result.trim().replace(/```json|```/g, '');
        identifiedServiceNames = JSON.parse(cleanResult);

        if (!Array.isArray(identifiedServiceNames)) {
          throw new Error('Response is not an array');
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse LLM response as JSON:', result);
        identifiedServiceNames = [];
      }

      // Match identified service names to actual service objects
      const matchedServices = [];
      for (const serviceName of identifiedServiceNames) {
        const matchedService = availableServices.find(
          service => service.name.toLowerCase() === serviceName.toLowerCase()
        );
        if (matchedService) {
          matchedServices.push(matchedService);
        }
      }

      // Calculate confidence based on how many services were matched
      const confidence = matchedServices.length > 0 ? 0.8 : 0.1;
      const needsFallback = matchedServices.length === 0;

      console.log(`✅ Identified ${matchedServices.length} services for message: "${userMessage.substring(0, 50)}..."`);
      if (matchedServices.length > 0) {
        console.log('   Matched services:', matchedServices.map(s => s.name).join(', '));
      }

      return {
        identifiedServices: identifiedServiceNames,
        matchedServices,
        needsFallback,
        confidence
      };

    } catch (error) {
      console.error('❌ Error identifying services:', error);
      return {
        identifiedServices: [],
        matchedServices: [],
        needsFallback: true,
        confidence: 0.1
      };
    }
  }

  createOtherServiceRequest(userMessage) {
    return {
      id: 'other_service_' + Date.now(),
      name: 'Other Service Request',
      description: `Custom service request: ${userMessage}`,
      pricing_info: 'Custom pricing',
      isOtherService: true
    };
  }

  generateFallbackResponse() {
    const fallbackResponses = [
      "I couldn't find a specific service that matches your request, but we can definitely still help! Could you please describe the work you need done in more detail?",
      "That sounds like something we might be able to help with! While I don't see an exact match in our standard services, could you tell me more about what you're looking for?",
      "I'd love to help you with that! Could you give me a bit more detail about the specific work you need? We handle a wide variety of projects and I want to make sure we connect you with the right expertise.",
      "Great question! While I don't have that exact service listed, we work on many different types of projects. Could you describe what you're trying to accomplish in more detail?"
    ];

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  generateServiceFoundResponse(matchedServices) {
    const businessName = this.businessName;

    if (matchedServices.length === 1) {
      const service = matchedServices[0];
      const responses = [
        `Perfect! I can help you with ${service.name.toLowerCase()}. ${businessName} offers excellent ${service.name.toLowerCase()} services. Let me gather a few details to provide you with accurate information.`,
        `Great choice! We provide top-quality ${service.name.toLowerCase()} services. I'd like to ask a few questions to better understand your specific needs.`,
        `Excellent! ${service.name} is one of our specialties at ${businessName}. To give you the most accurate information, could you tell me a bit more about your project?`
      ];

      return responses[Math.floor(Math.random() * responses.length)];
    } else {
      const serviceNames = matchedServices.map(s => s.name.toLowerCase()).join(' and ');
      const responses = [
        `Wonderful! I can help you with both ${serviceNames}. ${businessName} handles these services regularly. Let me start by gathering some details for your first service request.`,
        `Perfect! You're looking at ${serviceNames} - we do excellent work in both areas. I'll help you through each service, starting with the first one.`,
        `Great! ${businessName} offers both ${serviceNames}. I'll make sure we address both of your needs. Let's start with some details about your first service request.`
      ];

      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
}

module.exports = ServiceIdentificationService;