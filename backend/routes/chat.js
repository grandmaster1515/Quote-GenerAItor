const express = require('express');
const RAGService = require('../services/ragService');
const IntentRouter = require('../services/intentRouter');
const ChatSessionService = require('../services/chatSessionService');
const ServiceIdentificationService = require('../services/serviceIdentificationService');
const DetailGatheringService = require('../services/detailGatheringService');
const CartManagementService = require('../services/cartManagementService');
const QuoteFinalizationService = require('../services/quoteFinalizationService');
const router = express.Router();

// Initialize services
const ragService = new RAGService();
const intentRouter = new IntentRouter();
const chatSessionService = new ChatSessionService();
const serviceIdentificationService = new ServiceIdentificationService();
const detailGatheringService = new DetailGatheringService();
const cartManagementService = new CartManagementService();
const quoteFinalizationService = new QuoteFinalizationService();

// Initialize services asynchronously
(async () => {
  try {
    await ragService.initialize();
    await intentRouter.initialize();
    await serviceIdentificationService.initialize();
    await detailGatheringService.initialize();
    await cartManagementService.initialize();
    await quoteFinalizationService.initialize();
    console.log('✅ All chat services initialized successfully');
  } catch (error) {
    console.warn('⚠️ Some chat services failed to initialize:', error.message);
  }
})();

// Clean up old sessions periodically (every hour)
setInterval(() => {
  chatSessionService.cleanupOldSessions();
}, 60 * 60 * 1000);

// Mock RAG responses for demo purposes
// In production, this would use LangChain with pgvector
const mockResponses = {
  hvac: {
    keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'heat pump'],
    responses: [
      "Our HVAC services include installation, repair, and maintenance of heating and cooling systems. Typical costs range from $150 for basic maintenance to $5,000+ for full system replacement.",
      "We offer 24/7 emergency HVAC repair services. Our certified technicians can diagnose and fix issues with furnaces, heat pumps, and air conditioning units.",
      "For HVAC installation, we provide free estimates and energy-efficient options that can save you money on utility bills."
    ]
  },
  plumbing: {
    keywords: ['plumbing', 'pipe', 'leak', 'drain', 'faucet', 'toilet', 'water'],
    responses: [
      "Our plumbing services cover everything from minor repairs to major installations. Emergency leak repairs start at $125, while bathroom remodels range from $3,000-$15,000.",
      "We handle all types of plumbing issues including clogged drains, leaky faucets, toilet repairs, and pipe replacement. Same-day service available.",
      "For plumbing emergencies, we offer 24/7 service with transparent pricing. No hidden fees - you'll know the cost upfront."
    ]
  },
  kitchen: {
    keywords: ['kitchen', 'remodel', 'cabinet', 'countertop', 'appliance'],
    responses: [
      "Kitchen remodeling costs vary widely based on scope. Basic updates start around $10,000, while full luxury remodels can reach $50,000+. We provide detailed estimates.",
      "Our kitchen remodeling includes cabinet installation, countertop replacement, appliance installation, and complete design services.",
      "We offer financing options for kitchen remodels and work with top brands for appliances and materials."
    ]
  },
  bathroom: {
    keywords: ['bathroom', 'shower', 'bathtub', 'vanity', 'tile'],
    responses: [
      "Bathroom remodels typically range from $5,000 for basic updates to $25,000+ for luxury renovations. We handle all aspects from design to completion.",
      "Our bathroom services include tile work, vanity installation, shower/tub replacement, and accessibility modifications.",
      "We specialize in both modern and traditional bathroom designs with quality materials and professional installation."
    ]
  },
  roofing: {
    keywords: ['roof', 'roofing', 'shingle', 'gutter', 'leak'],
    responses: [
      "Roofing services include repair, replacement, and maintenance. Minor repairs start at $200, while full roof replacement ranges from $8,000-$20,000 depending on size and materials.",
      "We offer free roof inspections and provide detailed reports with photos. Emergency leak repairs available 24/7.",
      "Our roofing materials include asphalt shingles, metal roofing, and tile options with warranties up to 25 years."
    ]
  },
  electrical: {
    keywords: ['electrical', 'electric', 'wiring', 'outlet', 'panel', 'light'],
    responses: [
      "Electrical services include wiring, panel upgrades, outlet installation, and lighting. Service calls start at $100, with major work quoted individually.",
      "We handle residential electrical work including panel upgrades, whole-house rewiring, and smart home installations.",
      "All electrical work is performed by licensed electricians and comes with warranty protection."
    ]
  },
  general: {
    keywords: ['cost', 'price', 'quote', 'estimate', 'how much', 'pricing'],
    responses: [
      "We provide free estimates for all services. Costs vary based on project scope, materials, and labor requirements. Contact us for a personalized quote.",
      "Our pricing is competitive and transparent. We'll provide a detailed breakdown of all costs before starting any work.",
      "Most estimates can be provided within 24-48 hours. For urgent matters, same-day quotes are available."
    ]
  }
};

// Function to find relevant response based on query
function findRelevantResponse(query) {
  const lowerQuery = query.toLowerCase();
  
  // Check each category for keyword matches
  for (const [category, data] of Object.entries(mockResponses)) {
    const hasKeyword = data.keywords.some(keyword => 
      lowerQuery.includes(keyword)
    );
    
    if (hasKeyword) {
      // Return a random response from the matching category
      const responses = data.responses;
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
  
  // Default response if no keywords match
  return "Thank you for your question! I'd be happy to help you with information about our home improvement services. Could you tell me more specifically what type of project you're interested in? We offer services in HVAC, plumbing, electrical, kitchen remodeling, bathroom renovation, roofing, and more.";
}

// Function to determine if we should collect lead information
function shouldCollectLead(query) {
  const leadTriggers = [
    'quote', 'estimate', 'cost', 'price', 'how much',
    'schedule', 'appointment', 'visit', 'come out',
    'interested', 'need', 'want', 'looking for'
  ];
  
  const lowerQuery = query.toLowerCase();
  return leadTriggers.some(trigger => lowerQuery.includes(trigger));
}

// Helper function to get business context for AI estimates
async function getBusinessContext(businessId) {
  try {
    // Try to get business context from RAG service
    const contextResult = await ragService.getBusinessContext(businessId);
    if (contextResult && contextResult.length > 0) {
      return contextResult.map(ctx => `${ctx.question}: ${ctx.answer}`).join('\n');
    }
  } catch (error) {
    console.warn('⚠️ Could not fetch business context:', error.message);
  }

  // Return basic context if RAG is unavailable
  return 'Professional contractor services with competitive pricing and quality workmanship.';
}

// POST /chat - Handle chat messages with intent routing
router.post('/', async (req, res) => {
  try {
    const { query, businessId, sessionId, leadData, isInitialMessage } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        error: 'Query is required'
      });
    }

    if (!businessId) {
      return res.status(400).json({
        error: 'Business ID is required'
      });
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await chatSessionService.getSession(sessionId);
    }

    if (!session) {
      session = await chatSessionService.createSession(businessId);
      console.log(`📝 Created new chat session: ${session.sessionId}`);
    }

    // Add user message to session
    await chatSessionService.addMessage(session.sessionId, query, 'user');

    let response, userIntent, newState, context = [], confidence = 0.5;

    try {
      // Step 1: Handle initial state or classify intent
      if (session.state === 'AWAITING_USER_INTENT' && !session.userIntent) {
        console.log('🎯 Classifying user intent...');
        userIntent = await intentRouter.classifyIntent(query);
        console.log(`✅ Intent classified as: ${userIntent}`);

        // Update session state based on intent
        if (userIntent === 'QUESTION_ANSWERING') {
          newState = 'IN_QNA_FLOW';
        } else if (userIntent === 'QUOTE_BUILDING') {
          newState = 'IDENTIFYING_SERVICES';
        }

        await chatSessionService.updateSessionState(session.sessionId, newState, userIntent);
        session.state = newState;
        session.userIntent = userIntent;
      } else {
        // Use existing intent from session
        userIntent = session.userIntent;
      }

      // Step 2: Handle IDENTIFYING_SERVICES state
      if (session.state === 'IDENTIFYING_SERVICES') {
        console.log('🔍 Identifying services from user message...');

        const serviceIdentification = await serviceIdentificationService.identifyServices(businessId, query);
        console.log(`✅ Service identification completed: ${serviceIdentification.matchedServices.length} services found`);

        if (serviceIdentification.needsFallback) {
          // Handle unrecognized service request
          console.log('⚠️ No services matched, creating "Other" service request');

          const otherService = serviceIdentificationService.createOtherServiceRequest(query);
          await chatSessionService.addServicesToQueue(session.sessionId, [otherService]);

          // Generate fallback response
          response = serviceIdentificationService.generateFallbackResponse();

          // Move to gathering details state
          await chatSessionService.updateSessionState(session.sessionId, 'GATHERING_DETAILS');
          const nextServiceResult = await chatSessionService.startProcessingNextService(session.sessionId);
          session = nextServiceResult.session;
        } else {
          // Add identified services to queue
          await chatSessionService.addServicesToQueue(session.sessionId, serviceIdentification.matchedServices);

          // Generate response acknowledging the found services
          response = serviceIdentificationService.generateServiceFoundResponse(serviceIdentification.matchedServices);

          // Move to gathering details state and start processing first service
          await chatSessionService.updateSessionState(session.sessionId, 'GATHERING_DETAILS');
          const nextServiceResult = await chatSessionService.startProcessingNextService(session.sessionId);
          session = nextServiceResult.session;

          if (serviceIdentification.matchedServices.length > 1) {
            response += ` I'll walk you through each service one at a time to make sure we get all the details right.`;
          }
        }

        confidence = serviceIdentification.confidence;
      }

      // Step 3: Handle GATHERING_DETAILS state
      if (session.state === 'GATHERING_DETAILS' && !response) {
        console.log('📋 Processing detail gathering...');

        const gatheringResult = await detailGatheringService.processDetailsGathering(
          session,
          query,
          chatSessionService
        );

        response = gatheringResult.response;
        confidence = 0.9; // High confidence for structured data gathering

        // Handle next actions based on gathering result
        if (gatheringResult.nextAction === 'AWAIT_CART_CONFIRMATION') {
          // Service details complete, awaiting user confirmation to add to cart
          await chatSessionService.updateSessionState(session.sessionId, 'AWAITING_CART_CONFIRMATION');

        } else if (gatheringResult.nextAction === 'MOVE_TO_NEXT_SERVICE') {
          // Service added to cart, move to next service
          if (gatheringResult.hasMoreServices) {
            const nextGatheringResult = await detailGatheringService.processDetailsGathering(
              session,
              null, // No user query, just initial check for next service
              chatSessionService
            );

            if (nextGatheringResult.response && nextGatheringResult.response !== response) {
              response += ` ${nextGatheringResult.response}`;
            }
          } else {
            // All services complete
            response += ' You now have all your services in your cart. Would you like to review your quote or add any additional services?';
            await chatSessionService.updateSessionState(session.sessionId, 'CART_COMPLETE');
          }

        } else if (gatheringResult.nextAction === 'CART_COMPLETE') {
          // All services processed and added to cart
          await chatSessionService.updateSessionState(session.sessionId, 'CART_COMPLETE');
        }

        console.log(`✅ Detail gathering processed: ${gatheringResult.nextAction}`);
      }

      // Step 4: Handle AWAITING_CART_CONFIRMATION state
      if (session.state === 'AWAITING_CART_CONFIRMATION' && !response) {
        console.log('🛒 Processing cart confirmation...');

        const confirmationResult = await detailGatheringService.handleCartConfirmation(
          session,
          query,
          chatSessionService
        );

        response = confirmationResult.response;
        confidence = 0.9; // High confidence for cart operations

        // Handle next actions after cart confirmation
        if (confirmationResult.nextAction === 'MOVE_TO_NEXT_SERVICE') {
          await chatSessionService.updateSessionState(session.sessionId, 'GATHERING_DETAILS');

          if (confirmationResult.hasMoreServices) {
            // Process next service immediately
            const nextGatheringResult = await detailGatheringService.processDetailsGathering(
              confirmationResult.nextService ? { ...session, currentService: confirmationResult.nextService } : session,
              null, // No user query, just initial check
              chatSessionService
            );

            if (nextGatheringResult.response && !response.includes(nextGatheringResult.response)) {
              response += ` ${nextGatheringResult.response}`;
            }
          }

        } else if (confirmationResult.nextAction === 'CART_COMPLETE') {
          await chatSessionService.updateSessionState(session.sessionId, 'CART_COMPLETE');

        } else if (confirmationResult.nextAction === 'AWAIT_MODIFICATION') {
          // User wants to modify the service details
          await chatSessionService.updateSessionState(session.sessionId, 'GATHERING_DETAILS');

        } else if (confirmationResult.nextAction === 'ERROR_RETRY') {
          // Stay in confirmation state for retry
          console.warn('⚠️ Cart confirmation error, staying in AWAITING_CART_CONFIRMATION state');
        }

        console.log(`✅ Cart confirmation processed: ${confirmationResult.nextAction}`);
      }

      // Step 5: Handle cart management intents (edit/remove cart items)
      if (!response && (session.state === 'CART_COMPLETE' || session.state === 'AWAITING_CART_REMOVAL_CONFIRMATION' || session.state === 'AWAITING_CART_EDIT_VALUE')) {
        console.log('🛒 Processing cart management request...');

        const cartResult = await cartManagementService.processCartManagement(
          session,
          query,
          chatSessionService
        );

        if (cartResult) {
          response = cartResult.response;
          confidence = 0.9; // High confidence for cart operations

          // Handle cart management state transitions
          if (cartResult.nextAction === 'AWAIT_REMOVAL_CONFIRMATION') {
            await chatSessionService.updateSessionState(session.sessionId, 'AWAITING_CART_REMOVAL_CONFIRMATION');

          } else if (cartResult.nextAction === 'AWAIT_EDIT_VALUE') {
            await chatSessionService.updateSessionState(session.sessionId, 'AWAITING_CART_EDIT_VALUE');

          } else if (cartResult.nextAction === 'CART_COMPLETE') {
            await chatSessionService.updateSessionState(session.sessionId, 'CART_COMPLETE');

          } else if (cartResult.nextAction === 'CONTINUE_CONVERSATION') {
            // Determine appropriate state based on cart status
            const newState = cartResult.cartEmpty ? 'AWAITING_USER_INTENT' : 'CART_COMPLETE';
            await chatSessionService.updateSessionState(session.sessionId, newState);
          }

          console.log(`✅ Cart management processed: ${cartResult.nextAction}`);
        }
      }

      // Step 5a: Handle awaiting cart removal confirmation
      if (session.state === 'AWAITING_CART_REMOVAL_CONFIRMATION' && !response) {
        console.log('🗑️ Processing cart removal confirmation...');

        const confirmationResult = await cartManagementService.processRemovalConfirmation(
          session,
          query,
          chatSessionService
        );

        response = confirmationResult.response;
        confidence = 0.9;

        // Update session state based on result
        if (confirmationResult.nextAction === 'CART_COMPLETE') {
          await chatSessionService.updateSessionState(session.sessionId, 'CART_COMPLETE');
        } else if (confirmationResult.nextAction === 'CONTINUE_CONVERSATION') {
          const newState = confirmationResult.cartEmpty ? 'AWAITING_USER_INTENT' : 'CART_COMPLETE';
          await chatSessionService.updateSessionState(session.sessionId, newState);
        }

        console.log(`✅ Cart removal confirmation processed: ${confirmationResult.nextAction}`);
      }

      // Step 5b: Handle awaiting cart edit value
      if (session.state === 'AWAITING_CART_EDIT_VALUE' && !response) {
        console.log('✏️ Processing cart edit value...');

        const pendingAction = session.pendingCartAction;
        if (pendingAction && pendingAction.action === 'EDIT') {
          const editResult = await cartManagementService.executeCartItemEdit(
            session,
            { serviceName: pendingAction.targetServiceName, serviceId: pendingAction.targetServiceId },
            pendingAction.itemIndex,
            pendingAction.fieldToEdit,
            query.trim(),
            chatSessionService
          );

          response = editResult.response;
          confidence = 0.9;

          if (editResult.nextAction === 'CART_COMPLETE') {
            await chatSessionService.updateSessionState(session.sessionId, 'CART_COMPLETE');
          }

          console.log(`✅ Cart edit value processed: ${editResult.nextAction}`);
        }
      }

      // Step 5c: Handle quote finalization trigger
      if (session.state === 'CART_COMPLETE' && !response) {
        console.log('🎯 Checking for quote finalization trigger...');

        // Check if user is indicating they're done
        const finalizationTriggers = [
          'done', 'finished', 'complete', 'that\'s all', 'ready for quote',
          'get my quote', 'send me a quote', 'how much', 'total cost',
          'final price', 'ready to submit', 'submit my request'
        ];

        const queryLower = query.toLowerCase();
        const shouldFinalize = finalizationTriggers.some(trigger => queryLower.includes(trigger));

        if (shouldFinalize || queryLower.includes('quote')) {
          const cartItems = session.cartItems || [];

          if (cartItems.length === 0) {
            response = "It looks like your cart is empty. Would you like to add some services to get a quote?";
            confidence = 0.8;
          } else {
            const businessContext = await getBusinessContext(businessId);
            const finalizationResult = await quoteFinalizationService.finalizeQuote(
              session,
              businessContext,
              chatSessionService
            );

            response = finalizationResult.response;
            confidence = 0.9;

            // Handle finalization state transitions
            if (finalizationResult.nextAction === 'AWAIT_LEAD_DETAILS') {
              await chatSessionService.updateSessionState(session.sessionId, 'AWAITING_LEAD_DETAILS');
            } else if (finalizationResult.nextAction === 'QUOTE_COMPLETED') {
              await chatSessionService.updateSessionState(session.sessionId, 'QUOTE_COMPLETED');
            }

            console.log(`✅ Quote finalization processed: ${finalizationResult.nextAction}`);
          }
        }
      }

      // Step 5d: Handle lead capture flow
      if ((session.state === 'AWAITING_LEAD_DETAILS' || session.state === 'AWAIT_LEAD_EMAIL' || session.state === 'AWAIT_LEAD_PHONE') && !response) {
        console.log('👤 Processing lead capture...');

        const leadResult = await quoteFinalizationService.handleLeadCapture(
          session,
          query,
          chatSessionService
        );

        response = leadResult.response;
        confidence = 0.9;

        // Handle lead capture state transitions
        if (leadResult.nextAction === 'AWAIT_LEAD_EMAIL') {
          await chatSessionService.updateSessionState(session.sessionId, 'AWAIT_LEAD_EMAIL');
        } else if (leadResult.nextAction === 'AWAIT_LEAD_PHONE') {
          await chatSessionService.updateSessionState(session.sessionId, 'AWAIT_LEAD_PHONE');
        } else if (leadResult.nextAction === 'QUOTE_COMPLETED') {
          await chatSessionService.updateSessionState(session.sessionId, 'QUOTE_COMPLETED');
        }

        console.log(`✅ Lead capture processed: ${leadResult.nextAction}`);
      }

      // Step 6: Generate response using RAG (only if not already generated)
      if (!response) {
        const personaPrompt = intentRouter.generatePersonaPrompt(userIntent);

        try {
          const ragResponse = await ragService.generateResponse(businessId, query, [], personaPrompt);
          response = ragResponse.response;
          context = ragResponse.context;
          confidence = ragResponse.confidence;

          console.log(`✅ RAG response generated with confidence: ${confidence} for intent: ${userIntent}`);
        } catch (ragError) {
          console.warn('⚠️ RAG service unavailable, using fallback:', ragError.message);

          // Fallback response with natural tone
          const businessName = process.env.BUSINESS_NAME || 'HomeFix Pro Services';
          if (userIntent === 'QUOTE_BUILDING') {
            response = `I'd love to help you with your project! To give you the most accurate information, could you tell me a bit more about what you're looking to have done? Whether it's HVAC work, plumbing, electrical, or home remodeling, ${businessName} has experienced professionals ready to help.`;
          } else {
            response = `Great question! I'm here to help you learn more about ${businessName} and our services. What specific information can I provide for you? We cover everything from HVAC and plumbing to electrical work and home renovations.`;
          }
        }
      }

    } catch (error) {
      console.error('❌ Error in intent routing/response generation:', error);
      response = intentRouter.generateWelcomeMessage();
      userIntent = 'QUESTION_ANSWERING';
      newState = 'IN_QNA_FLOW';
    }

    // Add assistant response to session
    await chatSessionService.addMessage(session.sessionId, response, 'assistant');

    // Determine if we should collect lead data
    const shouldCollectLead = userIntent === 'QUOTE_BUILDING' && !leadData && shouldCollectLead(query);

    // Get queue status for response
    const queueStatus = chatSessionService.getQueueStatus(session);

    // Get cart information if available
    const cartInfo = {
      cartItems: session.cartItems || [],
      cartItemCount: session.cartItems ? session.cartItems.length : 0,
      estimatedTotal: session.cartItems ?
        session.cartItems.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0) : 0
    };

    // Log the interaction
    console.log(`Chat interaction for session ${session.sessionId}:`, {
      query: query.substring(0, 100),
      intent: userIntent,
      state: session.state,
      hasLead: !!leadData,
      shouldCollectLead,
      confidence,
      contextUsed: context.length,
      queueStatus,
      cartItemCount: cartInfo.cartItemCount,
      timestamp: new Date().toISOString()
    });

    res.json({
      response,
      sessionId: session.sessionId,
      userIntent,
      currentState: session.state,
      currentService: session.currentService,
      queueStatus,
      cartInfo,
      shouldCollectLead,
      businessId,
      confidence,
      contextUsed: context.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /chat/welcome - Generate initial welcome message
router.get('/welcome', async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({
        error: 'Business ID is required'
      });
    }

    // Create new session for the welcome message
    const session = await chatSessionService.createSession(businessId);

    // Generate natural welcome message
    const welcomeMessage = intentRouter.generateWelcomeMessage();

    // Add welcome message to session
    await chatSessionService.addMessage(session.sessionId, welcomeMessage, 'assistant');

    console.log(`💬 Generated welcome message for business ${businessId}, session ${session.sessionId}`);

    res.json({
      response: welcomeMessage,
      sessionId: session.sessionId,
      currentState: session.state,
      businessId,
      isWelcomeMessage: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Welcome message error:', error);
    res.status(500).json({
      error: 'Failed to generate welcome message',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /chat/context - Add business context for RAG
router.post('/context', async (req, res) => {
  try {
    const { businessId, question, answer, contentType, keywords } = req.body;
    
    if (!businessId || !answer) {
      return res.status(400).json({ 
        error: 'Business ID and answer are required' 
      });
    }

    const contextData = {
      question: question || '',
      answer,
      contentType: contentType || 'general',
      keywords: keywords || []
    };

    let contextId;
    
    try {
      // Try to use RAG service first
      contextId = await ragService.addBusinessContext(businessId, contextData);
    } catch (ragError) {
      console.warn('RAG service failed, using direct database approach:', ragError.message);
      
      // Fallback: Try to add context directly to database
      try {
        const { query } = require('../config/database');
        const result = await query(`
          INSERT INTO business_context (business_id, content_type, question, answer, keywords, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          businessId,
          contentType || 'general',
          question || '',
          answer,
          keywords || [],
          true
        ]);
        
        contextId = result.rows[0].id;
      } catch (dbError) {
        console.error('Database fallback also failed:', dbError.message);
        // For demo purposes, just generate a mock ID
        contextId = 'mock-' + Date.now();
      }
    }
    
    res.status(201).json({
      success: true,
      contextId,
      message: 'Business context added successfully'
    });

  } catch (error) {
    console.error('Add context error:', error);
    res.status(500).json({ 
      error: 'Failed to add business context',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /chat/health - Health check for chat service
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Chat Service with Intent Routing & Service Identification',
    ragInitialized: ragService.initialized,
    intentRouterInitialized: intentRouter.initialized,
    serviceIdentificationInitialized: serviceIdentificationService.initialized,
    detailGatheringInitialized: detailGatheringService.initialized,
    cartManagementInitialized: cartManagementService.initialized,
    quoteFinalizationInitialized: quoteFinalizationService.initialized,
    activeSessions: chatSessionService.sessions.size,
    timestamp: new Date().toISOString(),
    mockResponses: Object.keys(mockResponses).length
  });
});

module.exports = router;
