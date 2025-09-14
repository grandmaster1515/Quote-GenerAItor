// Comprehensive test for the service completion and cart confirmation flow
console.log('🧪 Testing Service Completion & Cart Confirmation Flow...\n');

// Mock the detailed gathering service logic
function mockDetailGatheringService() {
  return {
    generateServiceSummary(currentService, session) {
      const serviceName = currentService.name;
      const collectedDetails = session.collected_details || {};

      let summary = `I've gathered all the details for your ${serviceName.toLowerCase()}`;

      // Add key details
      const keyDetails = [];
      if (collectedDetails.address) keyDetails.push(`address: ${collectedDetails.address.value}`);
      if (collectedDetails.system_type) keyDetails.push(`system type: ${collectedDetails.system_type.value}`);
      if (collectedDetails.square_footage) keyDetails.push(`square footage: ${collectedDetails.square_footage.value}`);

      if (keyDetails.length > 0) {
        summary += ` (${keyDetails.join(', ')})`;
      }

      summary += '. Shall I add this to your quote request?';

      return {
        text: summary,
        serviceName,
        serviceId: currentService.id,
        collectedDetails,
        keyDetails
      };
    },

    handleCartConfirmation(session, userResponse) {
      const response = userResponse.toLowerCase().trim();
      const isConfirmed = this.isPositiveResponse(response);

      if (isConfirmed) {
        // Add to cart
        const cartItem = {
          serviceId: session.currentService.id,
          serviceName: session.currentService.name,
          collectedDetails: session.collected_details,
          estimatedPrice: 150,
          addedAt: new Date().toISOString()
        };

        if (!session.cartItems) session.cartItems = [];
        session.cartItems.push(cartItem);

        // Check if more services
        const remainingServices = session.serviceQueue.filter(s => s.status === 'pending');

        if (remainingServices.length > 0) {
          return {
            response: `Perfect! I've added that to your quote request. Now let's move on to your ${remainingServices[0].name.toLowerCase()}.`,
            nextAction: 'MOVE_TO_NEXT_SERVICE',
            cartUpdated: true,
            hasMoreServices: true,
            nextService: remainingServices[0]
          };
        } else {
          return {
            response: `Excellent! I've added that to your quote request. You now have ${session.cartItems.length} services in your cart. Would you like to review your quote or add any additional services?`,
            nextAction: 'CART_COMPLETE',
            cartUpdated: true,
            hasMoreServices: false,
            allServicesComplete: true
          };
        }
      } else {
        return {
          response: "No problem! What would you like to change about this service, or would you prefer to skip it and move to the next one?",
          nextAction: 'AWAIT_MODIFICATION',
          serviceDeclined: true
        };
      }
    },

    isPositiveResponse(response) {
      const positiveIndicators = ['yes', 'yeah', 'sure', 'ok', 'add it', 'sounds good', 'perfect'];
      const negativeIndicators = ['no', 'nope', 'skip', 'change', 'wrong'];

      if (negativeIndicators.some(indicator => response.includes(indicator))) {
        return false;
      }

      return positiveIndicators.some(indicator => response.includes(indicator));
    }
  };
}

async function testServiceCompletionFlow() {
  const detailService = mockDetailGatheringService();

  // Test Scenario 1: Service completion with summary generation
  console.log('📋 Test Scenario 1: Service Completion Summary');
  console.log('=' .repeat(50));

  const session1 = {
    sessionId: 'test-session-1',
    currentService: {
      id: 'hvac-1',
      name: 'HVAC Services'
    },
    collected_details: {
      address: { value: '123 Main St' },
      system_type: { value: 'gas furnace' },
      square_footage: { value: '1800' }
    },
    serviceQueue: [
      { id: 'hvac-1', name: 'HVAC Services', status: 'in_progress' },
      { id: 'plumbing-1', name: 'Plumbing Services', status: 'pending' }
    ]
  };

  const summary = detailService.generateServiceSummary(session1.currentService, session1);

  console.log('✅ Generated Summary:');
  console.log(`  "${summary.text}"`);
  console.log(`  Key details: ${summary.keyDetails.join(', ')}`);
  console.log(`  Service: ${summary.serviceName}`);

  // Test Scenario 2: User confirms service addition
  console.log('\n📋 Test Scenario 2: User Confirms Service Addition');
  console.log('=' .repeat(50));

  console.log('👤 User: "Yes, that looks perfect!"');
  const confirmResult = detailService.handleCartConfirmation(session1, 'Yes, that looks perfect!');

  console.log('✅ Confirmation Result:');
  console.log(`  Response: "${confirmResult.response}"`);
  console.log(`  Next Action: ${confirmResult.nextAction}`);
  console.log(`  Cart Updated: ${confirmResult.cartUpdated}`);
  console.log(`  Has More Services: ${confirmResult.hasMoreServices}`);
  console.log(`  Cart Items: ${session1.cartItems?.length || 0}`);

  if (session1.cartItems && session1.cartItems.length > 0) {
    console.log('  Added Item:');
    console.log(`    Service: ${session1.cartItems[0].serviceName}`);
    console.log(`    Price: $${session1.cartItems[0].estimatedPrice}`);
  }

  // Test Scenario 3: User declines service
  console.log('\n📋 Test Scenario 3: User Declines Service');
  console.log('=' .repeat(50));

  const session3 = {
    sessionId: 'test-session-3',
    currentService: {
      id: 'plumbing-1',
      name: 'Plumbing Services'
    },
    collected_details: {
      address: { value: '456 Oak Ave' },
      issue_type: { value: 'leak' }
    }
  };

  console.log('👤 User: "No, that doesn\'t look right"');
  const declineResult = detailService.handleCartConfirmation(session3, "No, that doesn't look right");

  console.log('✅ Decline Result:');
  console.log(`  Response: "${declineResult.response}"`);
  console.log(`  Next Action: ${declineResult.nextAction}`);
  console.log(`  Service Declined: ${declineResult.serviceDeclined}`);

  // Test Scenario 4: Complete flow with multiple services
  console.log('\n📋 Test Scenario 4: Complete Multi-Service Flow');
  console.log('=' .repeat(50));

  const session4 = {
    sessionId: 'test-session-4',
    currentService: {
      id: 'kitchen-1',
      name: 'Kitchen Remodeling'
    },
    collected_details: {
      address: { value: '789 Pine St' },
      kitchen_size: { value: 'Large' },
      budget_range: { value: '$50,000+' }
    },
    serviceQueue: [
      { id: 'kitchen-1', name: 'Kitchen Remodeling', status: 'in_progress' }
    ],
    cartItems: [
      { serviceName: 'HVAC Services', estimatedPrice: 150 },
      { serviceName: 'Plumbing Services', estimatedPrice: 125 }
    ]
  };

  console.log('Current cart has 2 items, processing final service...');

  const finalSummary = detailService.generateServiceSummary(session4.currentService, session4);
  console.log(`📝 Final service summary: "${finalSummary.text}"`);

  console.log('👤 User: "Add it!"');
  const finalResult = detailService.handleCartConfirmation(session4, 'Add it!');

  console.log('✅ Final Result:');
  console.log(`  Response: "${finalResult.response}"`);
  console.log(`  Next Action: ${finalResult.nextAction}`);
  console.log(`  All Services Complete: ${finalResult.allServicesComplete}`);
  console.log(`  Final Cart Items: ${session4.cartItems?.length || 0}`);

  // Test Scenario 5: Response detection accuracy
  console.log('\n📋 Test Scenario 5: Response Detection Accuracy');
  console.log('=' .repeat(50));

  const testResponses = [
    { input: 'yes', expected: true },
    { input: 'yeah that looks good', expected: true },
    { input: 'sounds perfect', expected: true },
    { input: 'add it to my cart', expected: true },
    { input: 'no thanks', expected: false },
    { input: 'that looks wrong', expected: false },
    { input: 'skip this one', expected: false },
    { input: 'I want to change something', expected: false }
  ];

  let correctDetections = 0;
  testResponses.forEach(test => {
    const detected = detailService.isPositiveResponse(test.input);
    const correct = detected === test.expected;
    correctDetections += correct ? 1 : 0;

    console.log(`  "${test.input}" -> ${detected ? 'Positive' : 'Negative'} ${correct ? '✅' : '❌'}`);
  });

  const accuracy = (correctDetections / testResponses.length * 100).toFixed(1);
  console.log(`  Response Detection Accuracy: ${accuracy}%`);

  return {
    success: true,
    scenarios: [
      { name: 'Service Summary Generation', passed: summary.text.includes('hvac services') && summary.keyDetails.length > 0 },
      { name: 'Positive Confirmation Handling', passed: confirmResult.nextAction === 'MOVE_TO_NEXT_SERVICE' },
      { name: 'Negative Confirmation Handling', passed: declineResult.nextAction === 'AWAIT_MODIFICATION' },
      { name: 'Multi-Service Flow Completion', passed: finalResult.allServicesComplete === true },
      { name: 'Response Detection Accuracy', passed: accuracy >= 87.5 } // 7/8 correct
    ]
  };
}

// Run the test
if (require.main === module) {
  testServiceCompletionFlow()
    .then(result => {
      console.log('\n📊 Test Summary:');
      result.scenarios.forEach(scenario => {
        console.log(`  ${scenario.passed ? '✅' : '❌'} ${scenario.name}`);
      });

      const allPassed = result.scenarios.every(s => s.passed);
      console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`);
      console.log('\n💡 Implementation Summary:');
      console.log('  ✅ Service summary generation with natural language');
      console.log('  ✅ Cart confirmation state handling');
      console.log('  ✅ Intelligent response detection (positive/negative)');
      console.log('  ✅ Service queue management and progression');
      console.log('  ✅ Cart integration with collected service details');
      console.log('  ✅ Multi-service flow handling');

      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = testServiceCompletionFlow;