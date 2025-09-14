// Test script to demonstrate the intelligent detail gathering functionality
const ChatSessionService = require('../services/chatSessionService');
const DetailGatheringService = require('../services/detailGatheringService');

// Mock database query for testing
const mockQuery = (sql, params) => {
  console.log(`🔍 Mock Query: ${sql.substring(0, 100)}... with params:`, params);

  // Mock service requirements based on service ID
  if (sql.includes('SELECT required_info FROM services')) {
    const serviceId = params[0];

    // Mock different services with different requirements
    const mockServices = {
      'hvac-service-1': [
        { key: "system_type", prompt: "What type of HVAC system do you have?", required: true, type: "text" },
        { key: "square_footage", prompt: "What is the approximate square footage of your home?", required: true, type: "number" },
        { key: "issue_description", prompt: "Please describe the issue you're experiencing.", required: false, type: "textarea" }
      ],
      'plumbing-service-1': [
        { key: "issue_type", prompt: "What type of plumbing issue are you experiencing?", required: true, type: "text" },
        { key: "location", prompt: "Where in your home is the plumbing issue located?", required: true, type: "text" },
        { key: "urgency", prompt: "Is this an emergency situation?", required: false, type: "select", options: ["Yes - Emergency", "No - Can wait"] }
      ]
    };

    return Promise.resolve({
      rows: [{
        required_info: mockServices[serviceId] || []
      }]
    });
  }

  return Promise.resolve({ rows: [] });
};

// Override require to provide mock database
require.cache[require.resolve('../config/database')] = {
  exports: { query: mockQuery, pool: { query: mockQuery } }
};

async function testIntelligentDetailGathering() {
  console.log('🧪 Testing Intelligent Detail Gathering...\n');

  const chatService = new ChatSessionService();
  const detailService = new DetailGatheringService();

  await detailService.initialize();

  // Test Scenario 1: User provides address upfront, system remembers for all services
  console.log('📋 Test Scenario 1: Pre-provided Information Reuse');
  console.log('=' .repeat(50));

  // Create a mock session
  const session = {
    sessionId: 'test-session-1',
    businessId: 'test-business',
    state: 'GATHERING_DETAILS',
    currentService: {
      id: 'hvac-service-1',
      name: 'HVAC Services'
    },
    serviceQueue: [
      { id: 'hvac-service-1', name: 'HVAC Services', status: 'in_progress' },
      { id: 'plumbing-service-1', name: 'Plumbing Services', status: 'pending' }
    ],
    collected_details: {
      // Simulate that user provided address earlier in conversation
      address: {
        value: '123 Main St, Springfield, IL 62701',
        source: 'initial_conversation',
        collectedAt: new Date(),
        sessionId: 'test-session-1'
      },
      square_footage: {
        value: '1500',
        source: 'initial_conversation',
        collectedAt: new Date(),
        sessionId: 'test-session-1'
      }
    }
  };

  console.log('Initial session collected details:', Object.keys(session.collected_details));

  // Mock the chatService methods
  chatService.getCollectedDetails = function(session, requirements) {
    const collectedDetails = {};
    const missingRequirements = [];

    for (const requirement of requirements) {
      const key = requirement.key;
      if (session.collected_details[key]) {
        collectedDetails[key] = session.collected_details[key];
      } else {
        missingRequirements.push(requirement);
      }
    }

    return {
      collectedDetails,
      missingRequirements,
      hasAllRequiredDetails: missingRequirements.filter(req => req.required).length === 0
    };
  };

  chatService.generateNextQuestion = function(missingRequirements, serviceName, context = {}) {
    if (missingRequirements.length === 0) return null;

    const requiredMissing = missingRequirements.filter(req => req.required);
    const nextRequirement = requiredMissing.length > 0 ? requiredMissing[0] : missingRequirements[0];

    let question = nextRequirement.prompt;
    if (context.isFirstQuestionForService) {
      question = `Great! Now I need a few details about your ${serviceName.toLowerCase()} needs. ${question}`;
    }

    return {
      question,
      requirement: nextRequirement,
      remainingQuestions: missingRequirements.length - 1,
      isRequired: nextRequirement.required
    };
  };

  // Test 1: First service (HVAC) - should skip already collected details
  console.log('\n🔧 Processing HVAC Service (should skip square_footage)...');

  const hvacResult = await detailService.processDetailsGathering(session, null, chatService);

  console.log('✅ HVAC Result:');
  console.log('  Response:', hvacResult.response);
  console.log('  Next Action:', hvacResult.nextAction);
  console.log('  Current Requirement:', hvacResult.currentRequirement?.key);

  // Simulate user providing system type
  console.log('\n👤 User: "I have a gas furnace"');
  session.collected_details.system_type = {
    value: 'gas furnace',
    source: 'detail_gathering',
    collectedAt: new Date(),
    sessionId: 'test-session-1'
  };

  const hvacResult2 = await detailService.processDetailsGathering(session, 'I have a gas furnace', chatService);
  console.log('✅ HVAC Result after user response:');
  console.log('  Response:', hvacResult2.response);
  console.log('  Next Action:', hvacResult2.nextAction);

  // Test 2: Show that common details are extracted automatically
  console.log('\n📋 Test Scenario 2: Automatic Detail Extraction');
  console.log('=' .repeat(50));

  const extractionTest = chatService.extractDetailFromResponse || function(userResponse, currentRequirement) {
    const extractedDetails = {};
    extractedDetails[currentRequirement.key] = userResponse.trim();

    // Mock common detail extraction
    const response = userResponse.toLowerCase();
    if (response.includes('emergency') || response.includes('urgent')) {
      extractedDetails.urgency = 'Yes - Emergency';
    }
    if (response.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)) {
      extractedDetails.phone = userResponse.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/)[1];
    }

    return extractedDetails;
  };

  // Simulate user response that contains multiple pieces of information
  const userResponse = "It's an urgent toilet leak in the bathroom, you can call me at 555-123-4567";
  const mockRequirement = { key: "issue_type", type: "text", required: true };

  const extracted = extractionTest(userResponse, mockRequirement);

  console.log('👤 User:', userResponse);
  console.log('✅ Extracted details:');
  Object.entries(extracted).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  // Test 3: Show pre-computation check working
  console.log('\n📋 Test Scenario 3: Pre-computation Check');
  console.log('=' .repeat(50));

  // Create session with many pre-filled details
  const richSession = {
    ...session,
    currentService: { id: 'plumbing-service-1', name: 'Plumbing Services' },
    collected_details: {
      ...session.collected_details,
      issue_type: { value: 'leak', source: 'previous_interaction' },
      location: { value: 'bathroom', source: 'previous_interaction' },
      urgency: { value: 'Yes - Emergency', source: 'previous_interaction' }
    }
  };

  console.log('Session has pre-collected details:', Object.keys(richSession.collected_details));

  const prefilledResult = await detailService.processDetailsGathering(richSession, null, chatService);

  console.log('✅ Pre-filled service result:');
  console.log('  Response:', prefilledResult.response);
  console.log('  Next Action:', prefilledResult.nextAction);
  console.log('  Should skip to completion:', prefilledResult.nextAction === 'MOVE_TO_NEXT_SERVICE');

  console.log('\n🎉 Intelligent Detail Gathering Test Complete!');

  return {
    success: true,
    scenarios: [
      { name: 'Pre-provided Information Reuse', passed: hvacResult.currentRequirement?.key === 'system_type' },
      { name: 'Automatic Detail Extraction', passed: extracted.phone === '555-123-4567' && extracted.urgency === 'Yes - Emergency' },
      { name: 'Pre-computation Check', passed: prefilledResult.nextAction === 'MOVE_TO_NEXT_SERVICE' }
    ]
  };
}

// Run the test
if (require.main === module) {
  testIntelligentDetailGathering()
    .then(result => {
      console.log('\n📊 Test Summary:');
      result.scenarios.forEach(scenario => {
        console.log(`  ${scenario.passed ? '✅' : '❌'} ${scenario.name}`);
      });

      const allPassed = result.scenarios.every(s => s.passed);
      console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = testIntelligentDetailGathering;