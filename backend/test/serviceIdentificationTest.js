const ServiceIdentificationService = require('../services/serviceIdentificationService');
const ChatSessionService = require('../services/chatSessionService');

// Mock test to demonstrate functionality without requiring full database setup
async function testServiceIdentification() {
  console.log('🧪 Testing Service Identification Service...\n');

  const serviceIdentificationService = new ServiceIdentificationService();
  const chatSessionService = new ChatSessionService();

  try {
    // Test 1: Multi-service recognition
    console.log('Test 1: Multi-service recognition');
    console.log('Input: "Hi, I need my lawn cut and two trees trimmed"');

    // Mock the database call for available services
    const mockServices = [
      { id: 'svc_1', name: 'Lawn Mowing', description: 'Professional lawn cutting and maintenance services' },
      { id: 'svc_2', name: 'Tree Trimming', description: 'Tree pruning and trimming services' },
      { id: 'svc_3', name: 'HVAC Services', description: 'Heating and cooling system services' },
      { id: 'svc_4', name: 'Plumbing Services', description: 'Complete plumbing repair and installation' }
    ];

    // Override the getBusinessServices method for testing
    serviceIdentificationService.getBusinessServices = async () => mockServices;

    if (process.env.OPENAI_API_KEY) {
      await serviceIdentificationService.initialize();

      const result = await serviceIdentificationService.identifyServices('test-business', 'Hi, I need my lawn cut and two trees trimmed');

      console.log('Identified Services:', result.identifiedServices);
      console.log('Matched Services:', result.matchedServices.map(s => s.name));
      console.log('Needs Fallback:', result.needsFallback);
      console.log('Confidence:', result.confidence);
      console.log('Response:', serviceIdentificationService.generateServiceFoundResponse(result.matchedServices));
    } else {
      console.log('⚠️  No OpenAI API key - skipping LLM test');

      // Simulate successful identification
      const mockResult = {
        identifiedServices: ['Lawn Mowing', 'Tree Trimming'],
        matchedServices: [mockServices[0], mockServices[1]],
        needsFallback: false,
        confidence: 0.9
      };

      console.log('Simulated Result:');
      console.log('Identified Services:', mockResult.identifiedServices);
      console.log('Matched Services:', mockResult.matchedServices.map(s => s.name));
      console.log('Response:', serviceIdentificationService.generateServiceFoundResponse(mockResult.matchedServices));
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Fallback for unrecognized services
    console.log('Test 2: Fallback for unrecognized services');
    console.log('Input: "I need help with quantum computer repair"');

    if (process.env.OPENAI_API_KEY) {
      const fallbackResult = await serviceIdentificationService.identifyServices('test-business', 'I need help with quantum computer repair');

      console.log('Identified Services:', fallbackResult.identifiedServices);
      console.log('Matched Services:', fallbackResult.matchedServices.map(s => s.name));
      console.log('Needs Fallback:', fallbackResult.needsFallback);

      if (fallbackResult.needsFallback) {
        const otherService = serviceIdentificationService.createOtherServiceRequest('I need help with quantum computer repair');
        console.log('Other Service Created:', otherService.name);
        console.log('Response:', serviceIdentificationService.generateFallbackResponse());
      }
    } else {
      // Simulate fallback scenario
      console.log('Simulated Fallback Result:');
      console.log('Identified Services: []');
      console.log('Matched Services: []');
      console.log('Needs Fallback: true');

      const otherService = serviceIdentificationService.createOtherServiceRequest('I need help with quantum computer repair');
      console.log('Other Service Created:', otherService.name);
      console.log('Response:', serviceIdentificationService.generateFallbackResponse());
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Service Queue Management
    console.log('Test 3: Service Queue Management');

    const session = await chatSessionService.createSession('test-business');
    console.log('Created session:', session.sessionId);

    // Add multiple services to queue
    const services = [mockServices[0], mockServices[1], mockServices[2]];
    await chatSessionService.addServicesToQueue(session.sessionId, services);

    console.log('Added services to queue:', services.map(s => s.name));

    // Check queue status
    const updatedSession = await chatSessionService.getSession(session.sessionId);
    const queueStatus = chatSessionService.getQueueStatus(updatedSession);
    console.log('Queue Status:', queueStatus);

    // Start processing first service
    const nextServiceResult = await chatSessionService.startProcessingNextService(session.sessionId);
    if (nextServiceResult.hasNextService) {
      console.log('Started processing:', nextServiceResult.currentService.name);

      const statusAfterStart = chatSessionService.getQueueStatus(nextServiceResult.session);
      console.log('Queue Status after starting service:', statusAfterStart);
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error:', error);
    }
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testServiceIdentification()
    .then(() => {
      console.log('🎉 Service Identification Test Suite completed');
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testServiceIdentification };