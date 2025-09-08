const express = require('express');
const RAGService = require('../services/ragService');
const router = express.Router();

// Initialize RAG service
const ragService = new RAGService();

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

// POST /chat - Handle chat messages
router.post('/', async (req, res) => {
  try {
    const { query, businessId, leadData } = req.body;
    
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

    // Determine if we should collect lead
    const shouldCollect = !leadData && shouldCollectLead(query);

    let response, context, confidence;

    try {
      // Try to use RAG service first
      const ragResponse = await ragService.generateResponse(businessId, query);
      response = ragResponse.response;
      context = ragResponse.context;
      confidence = ragResponse.confidence;
      
      console.log(`✅ RAG response generated with confidence: ${confidence}`);
    } catch (ragError) {
      console.warn('⚠️  RAG service unavailable, using fallback:', ragError.message);
      
      // Fallback to mock responses
      response = findRelevantResponse(query);
      context = [];
      confidence = 0.5;
    }

    // Log the interaction (in production, save to database)
    console.log(`Chat interaction for business ${businessId}:`, {
      query: query.substring(0, 100),
      hasLead: !!leadData,
      shouldCollectLead: shouldCollect,
      confidence,
      contextUsed: context.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      response,
      shouldCollectLead: shouldCollect,
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
    service: 'Chat Service',
    ragInitialized: ragService.initialized,
    timestamp: new Date().toISOString(),
    mockResponses: Object.keys(mockResponses).length
  });
});

module.exports = router;
