const axios = require('axios');
const CartIntentRouter = require('./cartIntentRouter');

class CartManagementService {
  constructor() {
    this.cartIntentRouter = new CartIntentRouter();
    this.initialized = false;
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Cart Management Service...');
      await this.cartIntentRouter.initialize();
      this.initialized = true;
      console.log('✅ Cart Management Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Cart Management Service:', error);
      throw error;
    }
  }

  // Main method to process cart management requests
  async processCartManagement(session, userQuery, chatSessionService) {
    try {
      const cartItems = session.cartItems || [];

      // Classify the cart intent
      const intentResult = await this.cartIntentRouter.classifyCartIntent(userQuery, cartItems);

      switch (intentResult.intent) {
        case 'REMOVE_CART_ITEM':
          return await this.handleCartRemoval(session, intentResult.details, chatSessionService);

        case 'EDIT_CART_ITEM':
          return await this.handleCartEditing(session, intentResult.details, chatSessionService);

        case 'VIEW_CART':
          return this.handleCartView(session, intentResult.details);

        case 'CART_RELATED_UNCLEAR':
          return {
            response: intentResult.details.suggestion,
            nextAction: 'AWAIT_CART_CLARIFICATION',
            needsClarification: true
          };

        case 'NON_CART_RELATED':
          return null; // Let other services handle this

        default:
          return {
            response: "I'm not sure how to help with that cart request. Could you please be more specific?",
            nextAction: 'AWAIT_CART_CLARIFICATION',
            needsClarification: true
          };
      }

    } catch (error) {
      console.error('❌ Error processing cart management:', error);
      return {
        response: "I'm sorry, I encountered an issue while trying to help with your cart. Could you please try again?",
        nextAction: 'ERROR_RECOVERY',
        error: error.message
      };
    }
  }

  // Handle cart item removal with confirmation
  async handleCartRemoval(session, details, chatSessionService) {
    try {
      const { targetService, targetServiceId } = details;

      // Check if we're in confirmation state for removal
      if (session.pendingCartAction?.action === 'REMOVE' && session.pendingCartAction?.targetServiceId === targetServiceId) {
        // This is a confirmation response
        return await this.processRemovalConfirmation(session, details, chatSessionService);
      }

      // Find the cart item to remove
      const cartItems = session.cartItems || [];
      const itemIndex = cartItems.findIndex(item =>
        item.serviceName === targetService || item.serviceId === targetServiceId
      );

      if (itemIndex === -1) {
        return {
          response: `I don't see "${targetService}" in your cart. Your current cart contains: ${cartItems.map(item => item.serviceName).join(', ')}.`,
          nextAction: 'CONTINUE_CONVERSATION',
          error: 'Service not found in cart'
        };
      }

      const targetItem = cartItems[itemIndex];

      // Set pending action and ask for confirmation
      await chatSessionService.updateSessionState(
        session.sessionId,
        'AWAITING_CART_REMOVAL_CONFIRMATION',
        null,
        {
          pendingCartAction: {
            action: 'REMOVE',
            targetServiceId: targetItem.serviceId,
            targetServiceName: targetItem.serviceName,
            itemIndex: itemIndex
          }
        }
      );

      const confirmationMessage = this.cartIntentRouter.generateRemovalConfirmation(targetItem.serviceName);

      return {
        response: confirmationMessage,
        nextAction: 'AWAIT_REMOVAL_CONFIRMATION',
        pendingAction: {
          type: 'REMOVE_CART_ITEM',
          targetService: targetItem.serviceName,
          itemIndex: itemIndex
        }
      };

    } catch (error) {
      console.error('❌ Error handling cart removal:', error);
      return {
        response: "I'm sorry, I had trouble processing that removal request. Could you please try again?",
        nextAction: 'ERROR_RECOVERY',
        error: error.message
      };
    }
  }

  // Process removal confirmation
  async processRemovalConfirmation(session, userResponse, chatSessionService) {
    try {
      const response = userResponse.toLowerCase?.() || userResponse;
      const isConfirmed = this.isPositiveResponse(response);

      const pendingAction = session.pendingCartAction;

      if (isConfirmed) {
        // Execute the removal
        const removeResult = await this.executeCartItemRemoval(session.sessionId, pendingAction.itemIndex);

        if (removeResult.success) {
          // Update session cart items
          await chatSessionService.updateSessionState(
            session.sessionId,
            'CART_COMPLETE',
            null,
            {
              cartItems: removeResult.cartItems,
              pendingCartAction: null
            }
          );

          let response = `I've removed ${pendingAction.targetServiceName} from your cart.`;

          if (removeResult.cartEmpty) {
            response += ' Your cart is now empty.';
          } else {
            response += ` You now have ${removeResult.itemCount} service${removeResult.itemCount !== 1 ? 's' : ''} remaining in your cart.`;
          }

          return {
            response,
            nextAction: removeResult.cartEmpty ? 'CONTINUE_CONVERSATION' : 'CART_COMPLETE',
            cartUpdated: true,
            removedItem: removeResult.removedItem,
            cartItems: removeResult.cartItems,
            cartEmpty: removeResult.cartEmpty
          };

        } else {
          return {
            response: "I'm sorry, I had trouble removing that item from your cart. Please try again.",
            nextAction: 'ERROR_RECOVERY',
            error: removeResult.error
          };
        }

      } else {
        // User declined removal
        await chatSessionService.updateSessionState(
          session.sessionId,
          'CART_COMPLETE',
          null,
          { pendingCartAction: null }
        );

        return {
          response: `Okay, I won't remove ${pendingAction.targetServiceName} from your cart. Is there anything else I can help you with?`,
          nextAction: 'CONTINUE_CONVERSATION',
          removalCancelled: true
        };
      }

    } catch (error) {
      console.error('❌ Error processing removal confirmation:', error);
      return {
        response: "I'm sorry, I encountered an error while processing your confirmation. Could you please try again?",
        nextAction: 'ERROR_RECOVERY',
        error: error.message
      };
    }
  }

  // Handle cart editing
  async handleCartEditing(session, details, chatSessionService) {
    try {
      const { targetService, targetServiceId, fieldToEdit, newValue } = details;

      // Find the cart item to edit
      const cartItems = session.cartItems || [];
      const itemIndex = cartItems.findIndex(item =>
        item.serviceName === targetService || item.serviceId === targetServiceId
      );

      if (itemIndex === -1) {
        return {
          response: `I don't see "${targetService}" in your cart. Your current cart contains: ${cartItems.map(item => item.serviceName).join(', ')}.`,
          nextAction: 'CONTINUE_CONVERSATION',
          error: 'Service not found in cart'
        };
      }

      const targetItem = cartItems[itemIndex];

      // If newValue is provided, execute the edit directly
      if (newValue) {
        return await this.executeCartItemEdit(session, targetItem, itemIndex, fieldToEdit, newValue, chatSessionService);
      }

      // Otherwise, ask for the new value
      const currentValue = targetItem.collectedDetails?.[fieldToEdit]?.value ||
                          targetItem.collectedDetails?.[fieldToEdit];

      const clarificationQuestion = this.cartIntentRouter.generateEditClarification(
        targetItem.serviceName,
        fieldToEdit,
        currentValue
      );

      // Set pending action
      await chatSessionService.updateSessionState(
        session.sessionId,
        'AWAITING_CART_EDIT_VALUE',
        null,
        {
          pendingCartAction: {
            action: 'EDIT',
            targetServiceId: targetItem.serviceId,
            targetServiceName: targetItem.serviceName,
            itemIndex: itemIndex,
            fieldToEdit: fieldToEdit
          }
        }
      );

      return {
        response: clarificationQuestion,
        nextAction: 'AWAIT_EDIT_VALUE',
        pendingAction: {
          type: 'EDIT_CART_ITEM',
          targetService: targetItem.serviceName,
          fieldToEdit: fieldToEdit,
          itemIndex: itemIndex
        }
      };

    } catch (error) {
      console.error('❌ Error handling cart editing:', error);
      return {
        response: "I'm sorry, I had trouble processing that edit request. Could you please try again?",
        nextAction: 'ERROR_RECOVERY',
        error: error.message
      };
    }
  }

  // Execute cart item edit
  async executeCartItemEdit(session, targetItem, itemIndex, fieldToEdit, newValue, chatSessionService) {
    try {
      const updatedDetails = {
        [fieldToEdit]: {
          value: newValue,
          source: 'cart_edit',
          updatedAt: new Date().toISOString()
        }
      };

      // Call the API to update the cart item
      const editResult = await this.executeCartItemUpdate(session.sessionId, itemIndex, updatedDetails);

      if (editResult.success) {
        // Update session cart items
        await chatSessionService.updateSessionState(
          session.sessionId,
          'CART_COMPLETE',
          null,
          {
            cartItems: editResult.cartItems,
            pendingCartAction: null
          }
        );

        const fieldDisplayName = fieldToEdit.replace(/_/g, ' ');
        const response = `Perfect! I've updated the ${fieldDisplayName} for your ${targetItem.serviceName} to "${newValue}".`;

        return {
          response,
          nextAction: 'CART_COMPLETE',
          cartUpdated: true,
          editedItem: editResult.updatedItem,
          cartItems: editResult.cartItems
        };

      } else {
        return {
          response: "I'm sorry, I had trouble updating that information. Please try again.",
          nextAction: 'ERROR_RECOVERY',
          error: editResult.error
        };
      }

    } catch (error) {
      console.error('❌ Error executing cart item edit:', error);
      return {
        response: "I'm sorry, I encountered an error while updating your cart. Please try again.",
        nextAction: 'ERROR_RECOVERY',
        error: error.message
      };
    }
  }

  // Handle cart viewing
  handleCartView(session, details) {
    const cartItems = session.cartItems || [];

    if (cartItems.length === 0) {
      return {
        response: "Your cart is currently empty. Would you like to add some services?",
        nextAction: 'CONTINUE_CONVERSATION',
        cartEmpty: true
      };
    }

    const { requestType } = details;

    if (requestType === 'pricing') {
      const totalEstimate = cartItems.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
      const response = `Your current cart has ${cartItems.length} service${cartItems.length !== 1 ? 's' : ''} with a total estimate of $${totalEstimate}. The services are: ${cartItems.map(item => `${item.serviceName} ($${item.estimatedPrice || 0})`).join(', ')}.`;

      return {
        response,
        nextAction: 'CONTINUE_CONVERSATION',
        cartSummary: {
          itemCount: cartItems.length,
          totalEstimate,
          items: cartItems
        }
      };

    } else {
      const itemsDescription = cartItems.map((item, index) => {
        const keyDetails = this.getKeyDetails(item.collectedDetails);
        return `${index + 1}. ${item.serviceName}${keyDetails ? ` (${keyDetails})` : ''}`;
      }).join('\n');

      const response = `Here's what's currently in your cart:\n\n${itemsDescription}\n\nWould you like to modify any of these services or add more?`;

      return {
        response,
        nextAction: 'CONTINUE_CONVERSATION',
        cartSummary: {
          itemCount: cartItems.length,
          items: cartItems
        }
      };
    }
  }

  // Helper method to get key details for display
  getKeyDetails(collectedDetails) {
    const keyFields = ['address', 'system_type', 'issue_type', 'kitchen_size'];
    const details = [];

    for (const field of keyFields) {
      if (collectedDetails?.[field]) {
        const value = collectedDetails[field].value || collectedDetails[field];
        if (value) {
          details.push(value);
        }
      }
    }

    return details.slice(0, 2).join(', '); // Show max 2 key details
  }

  // Execute cart item removal via API
  async executeCartItemRemoval(sessionId, itemIndex) {
    try {
      const response = await axios.delete(`${this.apiBaseUrl}/api/cart/item/${sessionId}/${itemIndex}`);
      return response.data;
    } catch (error) {
      console.error('❌ API error removing cart item:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Execute cart item update via API
  async executeCartItemUpdate(sessionId, itemIndex, updatedDetails) {
    try {
      const response = await axios.patch(`${this.apiBaseUrl}/api/cart/item/${sessionId}/${itemIndex}`, {
        updatedDetails
      });
      return response.data;
    } catch (error) {
      console.error('❌ API error updating cart item:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Check if user response is positive
  isPositiveResponse(response) {
    const positiveIndicators = [
      'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'confirm',
      'go ahead', 'do it', 'remove it', 'delete it'
    ];

    const negativeIndicators = [
      'no', 'nope', 'cancel', 'nevermind', 'don\'t', 'stop',
      'wait', 'hold on', 'keep it'
    ];

    response = response.toLowerCase().trim();

    // Check for explicit negative responses first
    if (negativeIndicators.some(indicator => response.includes(indicator))) {
      return false;
    }

    // Check for positive responses
    return positiveIndicators.some(indicator => response.includes(indicator));
  }
}

module.exports = CartManagementService;