const { query } = require('../config/database');

class CartIntentRouter {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Cart Intent Router...');
      this.initialized = true;
      console.log('✅ Cart Intent Router initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Cart Intent Router:', error);
      throw error;
    }
  }

  // Main method to classify cart-related intents
  async classifyCartIntent(userQuery, currentCartItems = []) {
    try {
      const query = userQuery.toLowerCase().trim();

      // Check if this is cart-related at all
      if (!this.isCartRelated(query)) {
        return {
          intent: 'NON_CART_RELATED',
          confidence: 0.1,
          details: null
        };
      }

      // Detect removal intents
      const removeIntent = this.detectRemovalIntent(query, currentCartItems);
      if (removeIntent.detected) {
        return {
          intent: 'REMOVE_CART_ITEM',
          confidence: removeIntent.confidence,
          details: {
            targetService: removeIntent.targetService,
            targetServiceId: removeIntent.targetServiceId,
            matchedText: removeIntent.matchedText,
            requiresConfirmation: true
          }
        };
      }

      // Detect edit intents
      const editIntent = this.detectEditIntent(query, currentCartItems);
      if (editIntent.detected) {
        return {
          intent: 'EDIT_CART_ITEM',
          confidence: editIntent.confidence,
          details: {
            targetService: editIntent.targetService,
            targetServiceId: editIntent.targetServiceId,
            fieldToEdit: editIntent.fieldToEdit,
            newValue: editIntent.newValue,
            matchedText: editIntent.matchedText
          }
        };
      }

      // Detect cart viewing/review intents
      const viewIntent = this.detectViewIntent(query);
      if (viewIntent.detected) {
        return {
          intent: 'VIEW_CART',
          confidence: viewIntent.confidence,
          details: {
            requestType: viewIntent.requestType
          }
        };
      }

      // Default to cart-related but unclear
      return {
        intent: 'CART_RELATED_UNCLEAR',
        confidence: 0.6,
        details: {
          originalQuery: userQuery,
          suggestion: 'I can help you remove items, edit details, or view your cart. What would you like to do?'
        }
      };

    } catch (error) {
      console.error('❌ Error classifying cart intent:', error);
      return {
        intent: 'ERROR',
        confidence: 0.0,
        details: { error: error.message }
      };
    }
  }

  // Check if query is related to cart management
  isCartRelated(query) {
    const cartKeywords = [
      'cart', 'remove', 'delete', 'edit', 'change', 'modify', 'update',
      'get rid of', 'take out', 'drop', 'cancel', 'skip',
      'review', 'show me', 'what\'s in', 'my services',
      'quote', 'estimate', 'total'
    ];

    return cartKeywords.some(keyword => query.includes(keyword));
  }

  // Detect removal intents
  detectRemovalIntent(query, cartItems) {
    const removalPatterns = [
      /remove\s+(?:the\s+)?(.+)/i,
      /get\s+rid\s+of\s+(?:the\s+)?(.+)/i,
      /delete\s+(?:the\s+)?(.+)/i,
      /take\s+out\s+(?:the\s+)?(.+)/i,
      /drop\s+(?:the\s+)?(.+)/i,
      /cancel\s+(?:the\s+)?(.+)/i,
      /(?:don't|do not)\s+(?:want|need)\s+(?:the\s+)?(.+)/i,
      /skip\s+(?:the\s+)?(.+)/i
    ];

    for (const pattern of removalPatterns) {
      const match = query.match(pattern);
      if (match) {
        const targetText = match[1].trim();
        const targetService = this.findMatchingCartItem(targetText, cartItems);

        if (targetService) {
          return {
            detected: true,
            confidence: 0.9,
            targetService: targetService.serviceName,
            targetServiceId: targetService.serviceId,
            matchedText: targetText
          };
        }
      }
    }

    return { detected: false };
  }

  // Detect edit intents
  detectEditIntent(query, cartItems) {
    const editPatterns = [
      /change\s+(?:the\s+)?(.+?)\s+(?:for|in|on)\s+(?:the\s+)?(.+)/i,
      /update\s+(?:the\s+)?(.+?)\s+(?:for|in|on)\s+(?:the\s+)?(.+)/i,
      /edit\s+(?:the\s+)?(.+?)\s+(?:for|in|on)\s+(?:the\s+)?(.+)/i,
      /modify\s+(?:the\s+)?(.+?)\s+(?:for|in|on)\s+(?:the\s+)?(.+)/i,
      /can\s+(?:i|you)\s+change\s+(?:the\s+)?(.+)/i,
      /(?:the\s+)?(.+)\s+should\s+be\s+(.+)/i
    ];

    for (const pattern of editPatterns) {
      const match = query.match(pattern);
      if (match) {
        let fieldToEdit, serviceTarget, newValue;

        if (match.length === 3) {
          // Pattern like "change address for lawn mowing"
          fieldToEdit = match[1].trim();
          serviceTarget = match[2].trim();
        } else if (match.length === 2) {
          // Pattern like "can I change the address" or "address should be 123 Main St"
          if (query.includes('should be')) {
            fieldToEdit = match[1].trim();
            newValue = match[2]?.trim();
          } else {
            fieldToEdit = match[1].trim();
          }
        }

        // Try to find the service if specified
        let targetService = null;
        if (serviceTarget) {
          targetService = this.findMatchingCartItem(serviceTarget, cartItems);
        } else if (cartItems.length === 1) {
          // If only one item in cart, assume that's the target
          targetService = cartItems[0];
        }

        if (targetService || cartItems.length === 1) {
          return {
            detected: true,
            confidence: 0.85,
            targetService: targetService?.serviceName || cartItems[0]?.serviceName,
            targetServiceId: targetService?.serviceId || cartItems[0]?.serviceId,
            fieldToEdit: this.normalizeFieldName(fieldToEdit),
            newValue: newValue,
            matchedText: serviceTarget || fieldToEdit
          };
        }
      }
    }

    return { detected: false };
  }

  // Detect cart viewing intents
  detectViewIntent(query) {
    const viewPatterns = [
      /(?:show|what\'s|what\s+is)\s+(?:me\s+)?(?:my\s+)?(?:in\s+)?(?:the\s+)?cart/i,
      /review\s+(?:my\s+)?(?:cart|quote|services)/i,
      /what\s+(?:services\s+)?(?:do\s+)?i\s+have/i,
      /my\s+(?:current\s+)?(?:services|quote|estimate)/i,
      /total\s+(?:cost|price|estimate)/i
    ];

    for (const pattern of viewPatterns) {
      if (query.match(pattern)) {
        let requestType = 'summary';

        if (query.includes('total') || query.includes('cost') || query.includes('price')) {
          requestType = 'pricing';
        } else if (query.includes('review')) {
          requestType = 'detailed';
        }

        return {
          detected: true,
          confidence: 0.8,
          requestType
        };
      }
    }

    return { detected: false };
  }

  // Find matching cart item by service name
  findMatchingCartItem(targetText, cartItems) {
    if (!cartItems || cartItems.length === 0) return null;

    targetText = targetText.toLowerCase();

    // Direct name match
    let match = cartItems.find(item => {
      const serviceName = item.serviceName.toLowerCase();
      return serviceName.includes(targetText) || targetText.includes(serviceName);
    });

    if (match) return match;

    // Service type keywords matching
    const serviceKeywords = {
      'hvac': ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac'],
      'plumbing': ['plumbing', 'plumber', 'pipe', 'leak', 'drain', 'water', 'toilet', 'faucet'],
      'kitchen': ['kitchen', 'remodel', 'renovation', 'cabinet', 'countertop'],
      'bathroom': ['bathroom', 'bath', 'shower', 'vanity', 'tile'],
      'electrical': ['electrical', 'electric', 'wiring', 'outlet', 'switch'],
      'roofing': ['roof', 'roofing', 'shingle', 'gutter'],
      'lawn': ['lawn', 'grass', 'mowing', 'yard', 'landscaping'],
      'tree': ['tree', 'trimming', 'pruning', 'removal']
    };

    for (const [serviceType, keywords] of Object.entries(serviceKeywords)) {
      if (keywords.some(keyword => targetText.includes(keyword))) {
        match = cartItems.find(item => {
          const serviceName = item.serviceName.toLowerCase();
          return keywords.some(keyword => serviceName.includes(keyword));
        });
        if (match) return match;
      }
    }

    return null;
  }

  // Normalize field names for editing
  normalizeFieldName(fieldName) {
    const fieldMappings = {
      'address': ['address', 'location', 'where'],
      'square_footage': ['square footage', 'sqft', 'size', 'footage'],
      'system_type': ['system type', 'type of system', 'system'],
      'issue_type': ['issue type', 'problem', 'issue'],
      'kitchen_size': ['kitchen size', 'size'],
      'budget_range': ['budget', 'budget range', 'cost', 'price range'],
      'urgency': ['urgency', 'priority', 'when', 'timing'],
      'description': ['description', 'details', 'notes']
    };

    fieldName = fieldName.toLowerCase();

    for (const [normalizedField, variations] of Object.entries(fieldMappings)) {
      if (variations.some(variation => fieldName.includes(variation) || variation.includes(fieldName))) {
        return normalizedField;
      }
    }

    return fieldName;
  }

  // Generate confirmation message for removal
  generateRemovalConfirmation(serviceName) {
    return `Are you sure you want to remove the ${serviceName} from your quote request?`;
  }

  // Generate edit clarification question
  generateEditClarification(serviceName, fieldToEdit, currentValue = null) {
    const fieldDisplayName = fieldToEdit.replace(/_/g, ' ');

    let question = `What should the new ${fieldDisplayName} be for your ${serviceName}?`;

    if (currentValue) {
      question = `The current ${fieldDisplayName} for your ${serviceName} is "${currentValue}". What would you like to change it to?`;
    }

    return question;
  }
}

module.exports = CartIntentRouter;