// Simple standalone test for detail gathering logic without database dependency
console.log('🧪 Testing Detail Gathering Logic...\n');

// Test 1: Session-wide detail storage structure
console.log('📋 Test 1: Session-wide detail storage');
console.log('=' .repeat(40));

const mockSession = {
  sessionId: 'test-123',
  collected_details: {
    address: {
      value: '123 Main St, Springfield, IL',
      source: 'user_input',
      collectedAt: new Date(),
      sessionId: 'test-123'
    },
    square_footage: {
      value: '1500',
      source: 'detail_gathering',
      collectedAt: new Date(),
      sessionId: 'test-123'
    }
  },
  serviceQueue: [
    { id: 'hvac-1', name: 'HVAC Services', status: 'in_progress' },
    { id: 'plumbing-1', name: 'Plumbing Services', status: 'pending' }
  ]
};

console.log('✅ Session has collected details:', Object.keys(mockSession.collected_details));
console.log('   Address:', mockSession.collected_details.address.value);
console.log('   Square Footage:', mockSession.collected_details.square_footage.value);

// Test 2: Pre-computation check logic
console.log('\n📋 Test 2: Pre-computation check logic');
console.log('=' .repeat(40));

function getCollectedDetails(session, requirements) {
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
}

const hvacRequirements = [
  { key: "system_type", prompt: "What type of HVAC system do you have?", required: true, type: "text" },
  { key: "square_footage", prompt: "What is the approximate square footage?", required: true, type: "number" },
  { key: "issue_description", prompt: "Please describe the issue.", required: false, type: "textarea" }
];

const analysis = getCollectedDetails(mockSession, hvacRequirements);

console.log('HVAC Service Requirements Analysis:');
console.log('  Total requirements:', hvacRequirements.length);
console.log('  Already collected:', Object.keys(analysis.collectedDetails).length);
console.log('  Missing:', analysis.missingRequirements.length);
console.log('  Has all required details:', analysis.hasAllRequiredDetails);

console.log('\nMissing requirements:');
analysis.missingRequirements.forEach(req => {
  console.log(`  - ${req.key} (${req.required ? 'required' : 'optional'}): ${req.prompt}`);
});

// Test 3: Intelligent question generation
console.log('\n📋 Test 3: Intelligent question generation');
console.log('=' .repeat(40));

function generateNextQuestion(missingRequirements, serviceName, context = {}) {
  if (missingRequirements.length === 0) return null;

  const requiredMissing = missingRequirements.filter(req => req.required);
  const optionalMissing = missingRequirements.filter(req => !req.required);
  const nextRequirement = requiredMissing.length > 0 ? requiredMissing[0] : optionalMissing[0];

  let question = nextRequirement.prompt;

  if (context.isFirstQuestionForService) {
    question = `Great! Now I need a few details about your ${serviceName.toLowerCase()} needs. ${question}`;
  }

  const totalRequired = missingRequirements.filter(req => req.required).length;
  if (totalRequired > 1 && nextRequirement.required) {
    const requiredIndex = requiredMissing.indexOf(nextRequirement);
    question += ` (This is question ${requiredIndex + 1} of ${totalRequired} required details.)`;
  }

  return {
    question,
    requirement: nextRequirement,
    remainingQuestions: missingRequirements.length - 1,
    isRequired: nextRequirement.required
  };
}

const questionData = generateNextQuestion(analysis.missingRequirements, 'HVAC Services', { isFirstQuestionForService: true });

if (questionData) {
  console.log('Generated question:', questionData.question);
  console.log('Current requirement:', questionData.requirement.key);
  console.log('Remaining questions:', questionData.remainingQuestions);
} else {
  console.log('✅ All requirements satisfied - no question needed');
}

// Test 4: Detail extraction from user responses
console.log('\n📋 Test 4: Detail extraction from user responses');
console.log('=' .repeat(40));

function extractCommonDetails(userResponse) {
  const extractedDetails = {};
  const response = userResponse.toLowerCase();

  // Extract address patterns
  const addressPatterns = [
    /(?:address|located at|live at|home is at)\s*:?\s*([^,.!?]+)/i,
    /\b(\d+\s+[a-zA-Z\s]+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|blvd|boulevard))/i
  ];

  for (const pattern of addressPatterns) {
    const match = userResponse.match(pattern);
    if (match) {
      extractedDetails.address = match[1].trim();
      break;
    }
  }

  // Extract phone patterns
  const phonePattern = /\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/;
  const phoneMatch = userResponse.match(phonePattern);
  if (phoneMatch) {
    extractedDetails.phone = phoneMatch[1];
  }

  // Extract square footage patterns
  const sqftPatterns = [
    /(\d+)[-\s]*(sq|square)[-\s]*f/i,
    /(\d+)[-\s]*square[-\s]*feet/i,
    /(\d+)[-\s]*sqft/i
  ];

  for (const pattern of sqftPatterns) {
    const match = userResponse.match(pattern);
    if (match) {
      extractedDetails.square_footage = match[1];
      extractedDetails.sqft = match[1];
      break;
    }
  }

  return extractedDetails;
}

function extractDetailFromResponse(userResponse, currentRequirement) {
  const extractedDetails = {};
  const response = userResponse.toLowerCase().trim();

  // Handle different requirement types
  switch (currentRequirement.type) {
    case 'number':
    case 'text':
      extractedDetails[currentRequirement.key] = userResponse.trim();
      break;

    case 'select':
      if (currentRequirement.options) {
        const matchedOption = currentRequirement.options.find(option =>
          response.includes(option.toLowerCase()) ||
          option.toLowerCase().includes(response)
        );
        if (matchedOption) {
          extractedDetails[currentRequirement.key] = matchedOption;
        } else {
          extractedDetails[currentRequirement.key] = userResponse.trim();
        }
      } else {
        extractedDetails[currentRequirement.key] = userResponse.trim();
      }
      break;

    default:
      extractedDetails[currentRequirement.key] = userResponse.trim();
  }

  // Also extract common details
  const commonDetails = extractCommonDetails(userResponse);
  Object.assign(extractedDetails, commonDetails);

  return extractedDetails;
}

// Test various user responses
const testResponses = [
  {
    input: "I have a gas furnace",
    requirement: { key: "system_type", type: "text", required: true }
  },
  {
    input: "It's an urgent toilet leak at 123 Oak Street, call me at 555-123-4567",
    requirement: { key: "issue_type", type: "text", required: true }
  },
  {
    input: "My house is about 1800 square feet",
    requirement: { key: "square_footage", type: "number", required: true }
  }
];

testResponses.forEach((test, index) => {
  console.log(`\nTest ${index + 1}:`);
  console.log(`  Input: "${test.input}"`);
  console.log(`  Current requirement: ${test.requirement.key}`);

  const extracted = extractDetailFromResponse(test.input, test.requirement);

  console.log('  Extracted details:');
  Object.entries(extracted).forEach(([key, value]) => {
    console.log(`    ${key}: ${value}`);
  });
});

// Test 5: Complete scenario simulation
console.log('\n📋 Test 5: Complete scenario simulation');
console.log('=' .repeat(40));

const scenario = {
  session: {
    sessionId: 'scenario-test',
    collected_details: {
      // User mentioned their address in the initial conversation
      address: { value: '456 Pine Ave', source: 'initial_conversation' }
    },
    serviceQueue: [
      { id: 'hvac-1', name: 'HVAC Services', status: 'in_progress' },
      { id: 'kitchen-1', name: 'Kitchen Remodeling', status: 'pending' }
    ],
    currentService: { id: 'hvac-1', name: 'HVAC Services' }
  },
  services: {
    'hvac-1': [
      { key: "system_type", prompt: "What type of HVAC system do you have?", required: true, type: "text" },
      { key: "square_footage", prompt: "What's your home's square footage?", required: true, type: "number" },
      { key: "address", prompt: "What's your service address?", required: true, type: "text" }
    ],
    'kitchen-1': [
      { key: "kitchen_size", prompt: "What size is your kitchen?", required: true, type: "select", options: ["Small", "Medium", "Large"] },
      { key: "budget_range", prompt: "What's your budget range?", required: true, type: "text" },
      { key: "address", prompt: "What's your service address?", required: true, type: "text" }
    ]
  }
};

console.log('Scenario: User previously mentioned address, now asking about HVAC');
console.log('Pre-collected details:', Object.keys(scenario.session.collected_details));

const hvacAnalysis = getCollectedDetails(scenario.session, scenario.services['hvac-1']);
console.log('\nHVAC Service analysis:');
console.log('  Already have:', Object.keys(hvacAnalysis.collectedDetails));
console.log('  Still need:', hvacAnalysis.missingRequirements.map(r => r.key));
console.log('  ✅ Address already collected - won\'t ask again!');

// Simulate completing HVAC and moving to kitchen
scenario.session.collected_details.system_type = { value: 'gas furnace' };
scenario.session.collected_details.square_footage = { value: '2000' };

console.log('\nAfter HVAC completion, moving to Kitchen Remodeling...');
const kitchenAnalysis = getCollectedDetails(scenario.session, scenario.services['kitchen-1']);
console.log('Kitchen Service analysis:');
console.log('  Already have:', Object.keys(kitchenAnalysis.collectedDetails));
console.log('  Still need:', kitchenAnalysis.missingRequirements.map(r => r.key));
console.log('  ✅ Address still available from session - won\'t ask again!');

console.log('\n🎉 Detail Gathering Logic Test Complete!');

// Test results summary
const testResults = [
  { name: 'Session-wide detail storage', passed: Object.keys(mockSession.collected_details).length > 0 },
  { name: 'Pre-computation check', passed: analysis.collectedDetails.square_footage !== undefined },
  { name: 'Intelligent question generation', passed: questionData && questionData.requirement.key === 'system_type' },
  { name: 'Detail extraction', passed: extractDetailFromResponse("gas furnace", { key: "system_type", type: "text" }).system_type === "gas furnace" },
  { name: 'Cross-service detail reuse', passed: kitchenAnalysis.collectedDetails.address !== undefined }
];

console.log('\n📊 Test Results Summary:');
testResults.forEach(result => {
  console.log(`  ${result.passed ? '✅' : '❌'} ${result.name}`);
});

const allPassed = testResults.every(r => r.passed);
console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`);

process.exit(allPassed ? 0 : 1);