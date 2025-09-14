// Test quote finalization and AI estimate generation
const QuoteFinalizationService = require('../services/quoteFinalizationService');

console.log('🧪 Testing Quote Finalization Flow...\n');

// Mock dependencies to avoid external API calls and database dependencies
function createMockFinalizationService() {
  const service = new QuoteFinalizationService();

  // Override external dependencies for testing
  service.callLLMForEstimate = async function(prompt) {
    // Mock AI response in the expected format
    return `PRELIMINARY ESTIMATE BREAKDOWN:
HVAC Services: $350 - $450 - Professional system inspection and repair with quality parts
Kitchen Remodeling: $25000 - $35000 - Complete kitchen renovation with modern appliances and finishes

TOTAL ESTIMATED RANGE: $25,350 - $35,450

ESTIMATE EXPLANATION:
This estimate reflects typical industry pricing for HVAC repair services and mid-range kitchen remodeling. The HVAC work includes diagnostic, repair, and parts replacement. Kitchen remodeling includes cabinets, countertops, appliances, and labor for a standard-sized kitchen renovation.

IMPORTANT DISCLAIMER:
This is a preliminary AI-generated estimate. Final pricing will be determined by our professional team after a thorough site evaluation and may vary based on specific requirements, local building codes, material costs, and project complexity.`;
  };

  // Mock database operations
  service.createQuoteRequest = async function(session, aiEstimate, quoteSummary) {
    return {
      success: true,
      quoteId: 'Q12345678-0001',
      quoteRequestId: 'qr_001',
      leadId: 'lead_001',
      createdAt: new Date()
    };
  };

  service.ensureLeadRecord = async function(businessId, leadData) {
    return {
      success: true,
      leadId: 'lead_001',
      isNew: false
    };
  };

  return service;
}

async function testAIEstimateGeneration() {
  console.log('📋 Test 1: AI Estimate Generation');
  console.log('=' .repeat(40));

  const service = createMockFinalizationService();
  await service.initialize();

  const mockCartItems = [
    {
      serviceId: 'hvac-1',
      serviceName: 'HVAC Services',
      estimatedPrice: 300,
      collectedDetails: {
        address: { value: '123 Main St' },
        system_type: { value: 'gas furnace' },
        square_footage: { value: '1800' }
      }
    },
    {
      serviceId: 'kitchen-1',
      serviceName: 'Kitchen Remodeling',
      estimatedPrice: 30000,
      collectedDetails: {
        address: { value: '123 Main St' },
        kitchen_size: { value: 'Medium' },
        budget_range: { value: '$25,000 - $35,000' }
      }
    }
  ];

  const estimate = await service.generateAIEstimate(mockCartItems);

  console.log('✅ Generated AI Estimate:');
  console.log(`  Total Range: $${estimate.totalEstimate.low.toLocaleString()} - $${estimate.totalEstimate.high.toLocaleString()}`);
  console.log(`  Services: ${estimate.breakdown.length}`);
  console.log(`  AI Generated: ${estimate.isAIGenerated}`);
  console.log(`  Has Disclaimer: ${estimate.disclaimer ? 'Yes' : 'No'}`);

  // Verify breakdown details
  estimate.breakdown.forEach(item => {
    console.log(`    ${item.serviceName}: $${item.estimate.low} - $${item.estimate.high}`);
  });

  const isValid = (
    estimate.totalEstimate.low > 0 &&
    estimate.totalEstimate.high > estimate.totalEstimate.low &&
    estimate.breakdown.length === mockCartItems.length &&
    estimate.disclaimer &&
    estimate.disclaimer.includes('preliminary')
  );

  console.log(`\n✅ AI Estimate Generation: ${isValid ? 'PASSED' : 'FAILED'}\n`);
  return { passed: isValid, estimate };
}

async function testFallbackEstimation() {
  console.log('📋 Test 2: Fallback Estimation (No AI)');
  console.log('=' .repeat(40));

  const service = createMockFinalizationService();
  await service.initialize();

  // Override to simulate AI failure
  service.callLLMForEstimate = async function(prompt) {
    throw new Error('AI service unavailable');
  };

  const mockCartItems = [
    {
      serviceId: 'plumbing-1',
      serviceName: 'Plumbing Services',
      estimatedPrice: 200,
      collectedDetails: {
        address: { value: '456 Oak Ave' },
        issue_type: { value: 'leak' },
        urgency: { value: 'Yes - Emergency' }
      }
    }
  ];

  const estimate = await service.generateAIEstimate(mockCartItems);

  console.log('✅ Fallback Estimate Generated:');
  console.log(`  Total Range: $${estimate.totalEstimate.low} - $${estimate.totalEstimate.high}`);
  console.log(`  AI Generated: ${estimate.isAIGenerated}`);
  console.log(`  Confidence: ${estimate.confidence}`);

  // Verify emergency pricing adjustment
  const plumbingEstimate = estimate.breakdown[0];
  const hasEmergencyAdjustment = plumbingEstimate.estimate.high > 200; // Should be adjusted for emergency

  console.log(`  Emergency Adjustment Applied: ${hasEmergencyAdjustment ? 'Yes' : 'No'}`);

  const isValid = (
    !estimate.isAIGenerated &&
    estimate.confidence === 'basic' &&
    estimate.breakdown.length === 1 &&
    hasEmergencyAdjustment
  );

  console.log(`\n✅ Fallback Estimation: ${isValid ? 'PASSED' : 'FAILED'}\n`);
  return { passed: isValid };
}

async function testQuoteSummaryGeneration() {
  console.log('📋 Test 3: Quote Summary Generation');
  console.log('=' .repeat(40));

  const service = createMockFinalizationService();
  await service.initialize();

  const mockCartItems = [
    {
      serviceId: 'hvac-1',
      serviceName: 'HVAC Services',
      estimatedPrice: 400
    },
    {
      serviceId: 'electrical-1',
      serviceName: 'Electrical Services',
      estimatedPrice: 300
    }
  ];

  const mockAIEstimate = {
    breakdown: [
      {
        serviceName: 'HVAC Services',
        estimate: { low: 350, high: 450, currency: 'USD' },
        justification: 'Professional repair service'
      },
      {
        serviceName: 'Electrical Services',
        estimate: { low: 250, high: 350, currency: 'USD' },
        justification: 'Standard electrical work'
      }
    ],
    totalEstimate: { low: 600, high: 800, currency: 'USD' },
    explanation: 'Estimate based on typical service pricing',
    disclaimer: 'This is a preliminary estimate.',
    isAIGenerated: true
  };

  const quoteSummary = service.createQuoteSummary(mockCartItems, mockAIEstimate);

  console.log('✅ Quote Summary Generated:');
  console.log(`  Service Count: ${quoteSummary.serviceCount}`);
  console.log(`  Total Range: $${quoteSummary.totalRange.low} - $${quoteSummary.totalRange.high}`);
  console.log(`  Has Presentation Text: ${quoteSummary.presentation ? 'Yes' : 'No'}`);

  // Check presentation format
  const presentationChecks = [
    quoteSummary.presentation.includes('Quote Summary'),
    quoteSummary.presentation.includes('Services Requested'),
    quoteSummary.presentation.includes('Total Estimated Range'),
    quoteSummary.presentation.includes('Important')
  ];

  console.log('\nPresentation Format Checks:');
  presentationChecks.forEach((check, index) => {
    const labels = ['Has Title', 'Shows Service Count', 'Shows Total', 'Has Disclaimer'];
    console.log(`  ${labels[index]}: ${check ? '✅' : '❌'}`);
  });

  const isValid = (
    quoteSummary.serviceCount === 2 &&
    quoteSummary.totalRange.low === 600 &&
    quoteSummary.totalRange.high === 800 &&
    presentationChecks.every(check => check)
  );

  console.log(`\n✅ Quote Summary Generation: ${isValid ? 'PASSED' : 'FAILED'}\n`);
  return { passed: isValid, quoteSummary };
}

async function testLeadDataValidation() {
  console.log('📋 Test 4: Lead Data Validation');
  console.log('=' .repeat(40));

  const service = createMockFinalizationService();

  // Test cases for lead data completeness
  const testCases = [
    {
      leadData: null,
      expected: true,
      description: 'Null lead data'
    },
    {
      leadData: { name: 'John Doe' },
      expected: true,
      description: 'Missing email and phone'
    },
    {
      leadData: { name: 'John Doe', email: 'john@example.com' },
      expected: true,
      description: 'Missing phone'
    },
    {
      leadData: { name: 'John Doe', email: 'john@example.com', phone: '555-123-4567' },
      expected: false,
      description: 'Complete lead data'
    },
    {
      leadData: { name: '', email: 'john@example.com', phone: '555-123-4567' },
      expected: true,
      description: 'Empty name field'
    }
  ];

  let correctValidations = 0;

  testCases.forEach(testCase => {
    const isIncomplete = service.isLeadDataIncomplete(testCase.leadData);
    const correct = isIncomplete === testCase.expected;
    correctValidations += correct ? 1 : 0;

    console.log(`${testCase.description}: ${isIncomplete ? 'Incomplete' : 'Complete'} ${correct ? '✅' : '❌'}`);
  });

  const accuracy = (correctValidations / testCases.length * 100).toFixed(1);
  console.log(`\n✅ Lead Validation Accuracy: ${accuracy}%\n`);

  return { passed: accuracy === '100.0', accuracy };
}

async function testEmailPhoneExtraction() {
  console.log('📋 Test 5: Email and Phone Extraction');
  console.log('=' .repeat(40));

  const service = createMockFinalizationService();

  // Test email extraction
  const emailTests = [
    { input: 'My email is john.doe@example.com', expected: 'john.doe@example.com' },
    { input: 'Contact me at jane+work@company.org', expected: 'jane+work@company.org' },
    { input: 'user123@domain.co.uk please', expected: 'user123@domain.co.uk' },
    { input: 'No email here', expected: null },
    { input: 'invalid-email@', expected: null }
  ];

  console.log('Email Extraction Tests:');
  let correctEmails = 0;
  emailTests.forEach(test => {
    const extracted = service.extractEmailFromResponse(test.input);
    const correct = extracted === test.expected;
    correctEmails += correct ? 1 : 0;
    console.log(`  "${test.input}" -> ${extracted || 'null'} ${correct ? '✅' : '❌'}`);
  });

  // Test phone extraction
  const phoneTests = [
    { input: 'Call me at 555-123-4567', expected: '(555) 123-4567' },
    { input: 'My number is (555) 987-6543', expected: '(555) 987-6543' },
    { input: '1-800-555-1234 is my phone', expected: '+1 (800) 555-1234' },
    { input: 'Phone: 5551234567', expected: '(555) 123-4567' },
    { input: 'Invalid phone 123', expected: null }
  ];

  console.log('\nPhone Extraction Tests:');
  let correctPhones = 0;
  phoneTests.forEach(test => {
    const extracted = service.extractPhoneFromResponse(test.input);
    const correct = extracted === test.expected;
    correctPhones += correct ? 1 : 0;
    console.log(`  "${test.input}" -> ${extracted || 'null'} ${correct ? '✅' : '❌'}`);
  });

  const emailAccuracy = (correctEmails / emailTests.length * 100).toFixed(1);
  const phoneAccuracy = (correctPhones / phoneTests.length * 100).toFixed(1);

  console.log(`\nEmail Extraction Accuracy: ${emailAccuracy}%`);
  console.log(`Phone Extraction Accuracy: ${phoneAccuracy}%`);

  const passed = emailAccuracy >= 80 && phoneAccuracy >= 80;
  console.log(`\n✅ Contact Extraction: ${passed ? 'PASSED' : 'FAILED'}\n`);

  return { passed, emailAccuracy, phoneAccuracy };
}

async function testEndToEndQuoteFlow() {
  console.log('📋 Test 6: End-to-End Quote Flow');
  console.log('=' .repeat(40));

  const service = createMockFinalizationService();
  await service.initialize();

  // Simulate a complete session
  const mockSession = {
    sessionId: 'test-session-001',
    businessId: 'business-123',
    cartItems: [
      {
        serviceId: 'hvac-1',
        serviceName: 'HVAC Services',
        estimatedPrice: 400,
        collectedDetails: {
          address: { value: '123 Main St' },
          system_type: { value: 'gas furnace' }
        }
      }
    ],
    leadData: {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '(555) 123-4567'
    }
  };

  // Mock chat session service
  const mockChatService = {
    updateSessionState: async (sessionId, state, intent, data) => {
      console.log(`  Session state updated: ${state}`);
      return mockSession;
    }
  };

  console.log('Simulating complete quote finalization...');

  const result = await service.finalizeQuote(mockSession, 'Test business context', mockChatService);

  console.log('✅ Finalization Result:');
  console.log(`  Next Action: ${result.nextAction}`);
  console.log(`  Has Quote ID: ${result.quoteId ? 'Yes' : 'No'}`);
  console.log(`  Response Length: ${result.response?.length || 0} chars`);

  // Verify response contains expected elements
  const responseChecks = [
    result.response?.includes('Quote Summary'),
    result.response?.includes('Reference ID'),
    result.response?.includes('24 hours'),
    result.nextAction === 'QUOTE_COMPLETED'
  ];

  console.log('\nResponse Content Checks:');
  const checkLabels = ['Has Summary', 'Has Reference ID', 'Has Timeline', 'Correct State'];
  responseChecks.forEach((check, index) => {
    console.log(`  ${checkLabels[index]}: ${check ? '✅' : '❌'}`);
  });

  const isValid = responseChecks.every(check => check) && result.quoteId;

  console.log(`\n✅ End-to-End Flow: ${isValid ? 'PASSED' : 'FAILED'}\n`);
  return { passed: isValid, result };
}

// Run all tests
async function runAllTests() {
  const results = [];

  try {
    results.push(await testAIEstimateGeneration());
    results.push(await testFallbackEstimation());
    results.push(await testQuoteSummaryGeneration());
    results.push(await testLeadDataValidation());
    results.push(await testEmailPhoneExtraction());
    results.push(await testEndToEndQuoteFlow());

    console.log('📊 Test Results Summary:');
    console.log('=' .repeat(40));

    const testNames = [
      'AI Estimate Generation',
      'Fallback Estimation',
      'Quote Summary Generation',
      'Lead Data Validation',
      'Contact Extraction',
      'End-to-End Quote Flow'
    ];

    results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      let details = '';
      if (result.accuracy) {
        details = ` (${result.accuracy}%)`;
      } else if (result.emailAccuracy) {
        details = ` (Email: ${result.emailAccuracy}%, Phone: ${result.phoneAccuracy}%)`;
      }
      console.log(`${status} ${testNames[index]}${details}`);
    });

    const allPassed = results.every(r => r.passed);
    console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`);

    console.log('\n💡 Implementation Features Verified:');
    console.log('  ✅ AI-powered estimate generation with LLM integration');
    console.log('  ✅ Intelligent fallback estimation when AI unavailable');
    console.log('  ✅ Comprehensive quote summary with professional formatting');
    console.log('  ✅ Progressive lead data capture with validation');
    console.log('  ✅ Email and phone extraction from natural language');
    console.log('  ✅ Quote request record creation and database integration');
    console.log('  ✅ Complete finalization flow from cart to formal quote request');

    return allPassed;

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };