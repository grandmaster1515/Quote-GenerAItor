const { query } = require('../config/database');

class DetailGatheringService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Detail Gathering Service...');
      this.initialized = true;
      console.log('✅ Detail Gathering Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Detail Gathering Service:', error);
      throw error;
    }
  }

  // Main method to handle GATHERING_DETAILS state logic
  async processDetailsGathering(session, userQuery, chatSessionService) {
    try {
      if (!session.currentService) {
        throw new Error('No current service to gather details for');
      }

      const currentService = session.currentService;
      console.log(`🔍 Processing detail gathering for service: ${currentService.name}`);

      // Get service requirements from database
      const serviceRequirements = await this.getServiceRequirements(currentService.id);

      if (!serviceRequirements || serviceRequirements.length === 0) {
        console.log(`⚠️ No requirements found for service ${currentService.name}, completing service`);
        return this.completeServiceGathering(session, chatSessionService, {
          response: `Thanks for the information about your ${currentService.name.toLowerCase()}. I have all the details I need for now.`,
          nextAction: 'MOVE_TO_NEXT_SERVICE'
        });
      }

      // Check what details we already have vs what we need
      const detailAnalysis = chatSessionService.getCollectedDetails(session, serviceRequirements);
      console.log(`📊 Detail analysis: ${Object.keys(detailAnalysis.collectedDetails).length} collected, ${detailAnalysis.missingRequirements.length} missing`);

      // If this is a user response, extract details from it first
      if (userQuery && userQuery.trim()) {
        await this.extractAndStoreDetails(session, userQuery, serviceRequirements, chatSessionService);

        // Re-check what we need after extraction
        const updatedAnalysis = chatSessionService.getCollectedDetails(session, serviceRequirements);

        // If we have all required details, move to confirmation
        if (updatedAnalysis.hasAllRequiredDetails) {
          return this.completeServiceGathering(session, chatSessionService, {
            response: this.generateServiceSummary(currentService, session).text,
            nextAction: 'AWAIT_CART_CONFIRMATION'
          });
        }

        // Otherwise, ask the next question
        return this.generateNextQuestion(session, updatedAnalysis.missingRequirements, chatSessionService);
      } else {
        // This is the initial question for this service
        if (detailAnalysis.hasAllRequiredDetails) {
          // We already have all required details from previous interactions
          return this.completeServiceGathering(session, chatSessionService, {
            response: this.generateServiceSummary(currentService, session).text,
            nextAction: 'AWAIT_CART_CONFIRMATION'
          });
        } else {
          // Ask the first question
          return this.generateNextQuestion(session, detailAnalysis.missingRequirements, chatSessionService, true);
        }
      }

    } catch (error) {
      console.error('❌ Error processing details gathering:', error);
      return {
        response: "I'm sorry, I encountered an issue while gathering your service details. Let me try to help you in a different way.",
        nextAction: 'ERROR_RECOVERY',
        error: error.message
      };
    }
  }

  // Get service requirements from database
  async getServiceRequirements(serviceId) {
    try {
      const result = await query(`
        SELECT required_info
        FROM services
        WHERE id = $1 AND is_active = true
      `, [serviceId]);

      if (result.rows.length === 0) {
        console.log(`⚠️ Service ${serviceId} not found`);
        return [];
      }

      const requiredInfo = result.rows[0].required_info;
      return Array.isArray(requiredInfo) ? requiredInfo : [];
    } catch (error) {
      console.error('❌ Error fetching service requirements:', error);
      // Return empty array on database errors to allow graceful degradation
      return [];
    }
  }

  // Extract details from user response and store them
  async extractAndStoreDetails(session, userResponse, requirements, chatSessionService) {
    try {
      // Find the requirement we're currently asking about (if any)
      const currentRequirement = this.getCurrentRequirement(session, requirements);

      let extractedDetails = {};

      if (currentRequirement) {
        // Extract details based on the current requirement
        extractedDetails = chatSessionService.extractDetailFromResponse(
          userResponse,
          currentRequirement,
          session.currentService.name
        );
      } else {
        // Extract any details we can find from the response
        extractedDetails = this.extractGeneralDetails(userResponse);
      }

      // Store all extracted details in session
      for (const [key, value] of Object.entries(extractedDetails)) {
        if (value && value.toString().trim()) {
          await chatSessionService.storeSessionDetail(
            session.sessionId,
            key,
            value,
            'detail_gathering'
          );
          console.log(`📝 Stored detail: ${key} = ${value}`);
        }
      }

      return extractedDetails;
    } catch (error) {
      console.error('❌ Error extracting details:', error);
      return {};
    }
  }

  // Find what requirement we're currently asking about
  getCurrentRequirement(session, requirements) {
    // This could be enhanced to track the current question state
    // For now, we'll find the first missing required requirement
    const missingRequired = requirements.filter(req =>
      req.required && !session.collected_details[req.key]
    );

    if (missingRequired.length > 0) {
      return missingRequired[0];
    }

    // If no required missing, find first optional missing
    const missingOptional = requirements.filter(req =>
      !req.required && !session.collected_details[req.key]
    );

    return missingOptional.length > 0 ? missingOptional[0] : null;
  }

  // Extract general details from user response when we don't have a specific requirement
  extractGeneralDetails(userResponse) {
    const details = {};
    const response = userResponse.toLowerCase();

    // Common patterns that might be useful across services
    const patterns = {
      budget: /(?:budget|cost|price|spend|afford).*?[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      timeline: /(?:timeline|when|time|schedule|date).*?(next week|next month|asap|immediately|soon|this year|\d+.*?(?:week|month|year))/i,
      location: /(?:located|location|address|area).*?([^,.!?]+)/i,
      emergency: /(?:emergency|urgent|asap|immediately|right away)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = userResponse.match(pattern);
      if (match) {
        details[key] = match[1] || (key === 'emergency' ? 'Yes' : match[0]);
      }
    }

    return details;
  }

  // Generate the next question to ask
  generateNextQuestion(session, missingRequirements, chatSessionService, isFirstQuestion = false) {
    const questionData = chatSessionService.generateNextQuestion(
      missingRequirements,
      session.currentService.name,
      { isFirstQuestionForService: isFirstQuestion }
    );

    if (!questionData) {
      return this.completeServiceGathering(session, chatSessionService, {
        response: `I have all the information I need for your ${session.currentService.name.toLowerCase()}.`,
        nextAction: 'MOVE_TO_NEXT_SERVICE'
      });
    }

    return {
      response: questionData.question,
      nextAction: 'CONTINUE_GATHERING',
      currentRequirement: questionData.requirement,
      remainingQuestions: questionData.remainingQuestions,
      isRequired: questionData.isRequired
    };
  }

  // Complete service details gathering and prepare for cart confirmation
  completeServiceGathering(session, chatSessionService, result) {
    const queueStatus = chatSessionService.getQueueStatus(session);
    const currentService = session.currentService;

    // Generate service summary for user confirmation
    const serviceSummary = this.generateServiceSummary(currentService, session);

    result.serviceSummary = serviceSummary;
    result.readyForCart = true;
    result.nextAction = 'AWAIT_CART_CONFIRMATION';

    if (queueStatus.hasMore) {
      result.nextService = session.serviceQueue.find(s => s.status === 'pending');
      result.hasMoreServices = true;
    } else {
      result.hasMoreServices = false;
      result.allServicesComplete = true;
    }

    return result;
  }

  // Generate a natural summary of collected service details
  generateServiceSummary(currentService, session) {
    const serviceDetails = session.serviceDetails[currentService.id];
    const collectedDetails = serviceDetails ? serviceDetails.collectedDetails : {};
    const sessionWideDetails = session.collected_details || {};

    // Combine service-specific and session-wide details
    const allDetails = { ...sessionWideDetails, ...collectedDetails };

    // Generate a natural summary
    const serviceName = currentService.name;
    let summary = `I've gathered all the details for your ${serviceName.toLowerCase()}`;

    // Add key details to the summary
    const keyDetails = [];

    // Common details to highlight
    const importantFields = ['address', 'system_type', 'issue_type', 'kitchen_size', 'square_footage', 'location', 'budget_range'];

    for (const field of importantFields) {
      if (allDetails[field]) {
        const value = allDetails[field].value || allDetails[field];
        if (value && typeof value === 'string' && value.trim()) {
          keyDetails.push(`${this.formatFieldName(field)}: ${value}`);
        }
      }
    }

    if (keyDetails.length > 0) {
      if (keyDetails.length === 1) {
        summary += ` (${keyDetails[0]})`;
      } else if (keyDetails.length === 2) {
        summary += ` (${keyDetails.join(' and ')})`;
      } else {
        summary += ` (${keyDetails.slice(0, -1).join(', ')}, and ${keyDetails[keyDetails.length - 1]})`;
      }
    }

    summary += '. Shall I add this to your quote request?';

    return {
      text: summary,
      serviceName,
      serviceId: currentService.id,
      collectedDetails: allDetails,
      keyDetails
    };
  }

  // Format field names for display
  formatFieldName(fieldName) {
    const fieldMappings = {
      'system_type': 'system type',
      'issue_type': 'issue type',
      'kitchen_size': 'kitchen size',
      'square_footage': 'square footage',
      'budget_range': 'budget range',
      'location': 'location',
      'address': 'address'
    };

    return fieldMappings[fieldName] || fieldName.replace(/_/g, ' ');
  }

  // Handle cart confirmation response
  async handleCartConfirmation(session, userResponse, chatSessionService) {
    try {
      const response = userResponse.toLowerCase().trim();
      const isConfirmed = this.isPositiveResponse(response);

      if (isConfirmed) {
        // User confirmed - add to cart
        const cartResult = await this.addServiceToCart(session, chatSessionService);

        if (cartResult.success) {
          // Service added successfully
          await this.completeAndRemoveFromQueue(session, chatSessionService);

          // Check if there are more services
          const queueStatus = chatSessionService.getQueueStatus(session);

          if (queueStatus.hasMore) {
            // Move to next service
            const nextServiceResult = await chatSessionService.startProcessingNextService(session.sessionId);

            return {
              response: `Perfect! I've added that to your quote request. Now let's move on to your ${nextServiceResult.currentService.name.toLowerCase()}.`,
              nextAction: 'MOVE_TO_NEXT_SERVICE',
              cartUpdated: true,
              hasMoreServices: true,
              nextService: nextServiceResult.currentService
            };
          } else {
            // All services complete
            await chatSessionService.updateSessionState(session.sessionId, 'CART_COMPLETE');

            return {
              response: `Excellent! I've added that to your quote request. You now have ${queueStatus.completedServices + 1} services in your cart. Would you like to review your quote or add any additional services?`,
              nextAction: 'CART_COMPLETE',
              cartUpdated: true,
              hasMoreServices: false,
              allServicesComplete: true
            };
          }
        } else {
          // Error adding to cart
          return {
            response: "I'm sorry, I had trouble adding that service to your cart. Let me try again, or you can proceed with the next service.",
            nextAction: 'ERROR_RETRY',
            error: cartResult.error
          };
        }
      } else {
        // User declined - ask what they'd like to change
        return {
          response: "No problem! What would you like to change about this service, or would you prefer to skip it and move to the next one?",
          nextAction: 'AWAIT_MODIFICATION',
          serviceDeclined: true
        };
      }

    } catch (error) {
      console.error('❌ Error handling cart confirmation:', error);
      return {
        response: "I'm sorry, I encountered an issue processing your response. Could you please confirm again whether you'd like to add this service to your quote?",
        nextAction: 'AWAIT_CART_CONFIRMATION',
        error: error.message
      };
    }
  }

  // Check if user response is positive (yes, confirm, add it, etc.)
  isPositiveResponse(response) {
    const positiveIndicators = [
      'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'add it', 'confirm',
      'sounds good', 'looks good', 'perfect', 'correct', 'right', 'add',
      'proceed', 'continue', 'that works', 'good to go'
    ];

    const negativeIndicators = [
      'no', 'nope', 'not', 'don\'t', 'skip', 'remove', 'change', 'modify',
      'wrong', 'incorrect', 'different', 'cancel'
    ];

    // Check for explicit negative responses first
    if (negativeIndicators.some(indicator => response.includes(indicator))) {
      return false;
    }

    // Check for positive responses
    return positiveIndicators.some(indicator => response.includes(indicator));
  }

  // Add service to cart
  async addServiceToCart(session, chatSessionService) {
    try {
      const currentService = session.currentService;
      const serviceDetails = session.serviceDetails[currentService.id];
      const sessionWideDetails = session.collected_details || {};

      // Create cart item from service and collected details
      const cartItem = {
        serviceId: currentService.id,
        serviceName: currentService.name,
        serviceDescription: currentService.description || '',
        collectedDetails: { ...sessionWideDetails, ...serviceDetails.collectedDetails },
        estimatedPrice: this.calculateServiceEstimate(currentService, sessionWideDetails),
        addedAt: new Date().toISOString(),
        sessionId: session.sessionId
      };

      // Note: The actual cart sync will be handled by the frontend
      // We're just preparing the cart item data and storing it in session
      if (!session.cartItems) {
        session.cartItems = [];
      }

      session.cartItems.push(cartItem);

      // Update session with cart data
      await chatSessionService.updateSessionState(
        session.sessionId,
        session.state,
        null,
        { cartItems: session.cartItems }
      );

      console.log(`✅ Service ${currentService.name} prepared for cart`);

      return {
        success: true,
        cartItem,
        cartItemCount: session.cartItems.length
      };

    } catch (error) {
      console.error('❌ Error adding service to cart:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calculate rough estimate for service (this would be enhanced with actual pricing logic)
  calculateServiceEstimate(service, collectedDetails) {
    // Basic estimation logic - in production this would be more sophisticated
    const baseRates = {
      'HVAC Services': 150,
      'Plumbing Services': 125,
      'Kitchen Remodeling': 5000,
      'Bathroom Remodeling': 3000,
      'Electrical Services': 100,
      'Roofing Services': 200
    };

    let baseRate = baseRates[service.name] || 100;

    // Adjust based on collected details
    if (collectedDetails.square_footage) {
      const sqft = parseInt(collectedDetails.square_footage.value || collectedDetails.square_footage);
      if (sqft && sqft > 1000) {
        baseRate *= 1.2; // 20% increase for larger properties
      }
    }

    if (collectedDetails.urgency &&
        (collectedDetails.urgency.value || collectedDetails.urgency).toLowerCase().includes('emergency')) {
      baseRate *= 1.5; // 50% increase for emergency services
    }

    return Math.round(baseRate);
  }

  // Complete current service and remove from queue
  async completeAndRemoveFromQueue(session, chatSessionService) {
    try {
      // Mark current service as completed
      await chatSessionService.completeCurrentService(session.sessionId);

      // Remove from queue
      if (session.serviceQueue && session.currentService) {
        const queueIndex = session.serviceQueue.findIndex(s => s.id === session.currentService.id);
        if (queueIndex !== -1) {
          session.serviceQueue.splice(queueIndex, 1);
        }
      }

      // Update session
      await chatSessionService.updateSessionState(
        session.sessionId,
        session.state,
        null,
        { serviceQueue: session.serviceQueue }
      );

      console.log(`✅ Service ${session.currentService.name} completed and removed from queue`);

    } catch (error) {
      console.error('❌ Error completing and removing service from queue:', error);
      throw error;
    }
  }

  // Generate response when service is already complete
  generateAlreadyCompleteResponse(currentService, collectedDetails) {
    const detailKeys = Object.keys(collectedDetails);

    if (detailKeys.length === 0) {
      return `I'll help you with your ${currentService.name.toLowerCase()}. Let me move on to gather any additional information needed.`;
    }

    const summaryParts = detailKeys.slice(0, 2).map(key => {
      const detail = collectedDetails[key];
      return `${key.replace(/_/g, ' ')}: ${detail.value}`;
    });

    let response = `Great! I already have some details about your ${currentService.name.toLowerCase()}`;
    if (summaryParts.length > 0) {
      response += ` (${summaryParts.join(', ')})`;
    }
    response += '. Let me proceed with the next steps.';

    return response;
  }

  // Generate completion response
  generateCompletionResponse(currentService, collectedDetails) {
    const serviceName = currentService.name.toLowerCase();
    const detailCount = Object.keys(collectedDetails).length;

    let response = `Perfect! I have all the details I need for your ${serviceName}`;

    if (detailCount > 0) {
      response += '. I\'ll use this information to provide you with accurate pricing and next steps';
    }

    response += '.';

    return response;
  }
}

module.exports = DetailGatheringService;