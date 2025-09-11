// AI Service Recognition Engine for Cart Suggestions
// Analyzes user messages to identify services and suggest cart items

import { ServicePatterns } from './cartManager.js';

export class ServiceRecognitionEngine {
  constructor(availableServices = []) {
    this.availableServices = availableServices;
    this.threshold = 0.6; // Minimum confidence threshold for suggestions
  }

  // Update available services (from database)
  updateServices(services) {
    this.availableServices = services;
  }

  // Main analysis function
  analyzeMessage(message, conversationContext = []) {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Skip analysis for very short messages unless they're affirmative responses
    if (normalizedMessage.length < 3) {
      return null;
    }

    // Extract potential services from current message and recent context
    const detectedServices = this.detectServices(normalizedMessage);
    const measurements = this.extractMeasurements(normalizedMessage);
    const urgency = this.detectUrgency(normalizedMessage);
    const frequency = this.detectFrequency(normalizedMessage);
    
    // Check if message suggests adding to cart
    const shouldSuggestCart = this.shouldSuggestAddToCart(normalizedMessage);
    
    // If no services detected in current message but it's an affirmative response,
    // check recent conversation for services
    let servicesToAnalyze = detectedServices;
    if (servicesToAnalyze.length === 0 && shouldSuggestCart && conversationContext.length > 0) {
      const recentMessages = conversationContext.slice(-3); // Look at last 3 messages
      for (const contextMessage of recentMessages) {
        if (contextMessage.sender === 'bot') {
          const contextServices = this.detectServices(contextMessage.text.toLowerCase());
          servicesToAnalyze = servicesToAnalyze.concat(contextServices);
        }
      }
    }
    
    console.log('Service Recognition Debug:', {
      message: normalizedMessage,
      detectedServices: servicesToAnalyze,
      shouldSuggestCart,
      contextChecked: conversationContext.length > 0
    });
    
    if (servicesToAnalyze.length > 0 && shouldSuggestCart) {
      // Return the best match
      const bestService = servicesToAnalyze[0];
      
      return {
        shouldShowPopup: true,
        service: bestService.name,
        serviceType: bestService.type,
        details: {
          quantity: measurements.quantity || 1,
          measurement: measurements.description || '',
          frequency: frequency || 'one-time',
          urgency: urgency || 'normal',
          specifications: this.suggestSpecifications(bestService.type, normalizedMessage),
          customRequirements: this.extractCustomRequirements(normalizedMessage)
        },
        estimatedPrice: this.estimatePrice(bestService, measurements),
        confidenceScore: bestService.confidence,
        suggestedQuestions: ServicePatterns.getSuggestedQuestions(bestService.type)
      };
    }

    return null;
  }

  // Detect services mentioned in the message
  detectServices(message) {
    const detectedServices = [];

    // Check against available services from database
    this.availableServices.forEach(service => {
      const serviceName = service.name.toLowerCase();
      const serviceWords = serviceName.split(' ');
      
      // Check if service name is mentioned
      let matchScore = 0;
      serviceWords.forEach(word => {
        if (message.includes(word) && word.length > 2) {
          matchScore += 1 / serviceWords.length;
        }
      });

      if (matchScore > 0.5) {
        detectedServices.push({
          name: service.name,
          type: this.categorizeService(service.name),
          confidence: Math.min(matchScore, 0.95),
          source: 'database'
        });
      }
    });

    // Check against pattern-based services
    Object.entries(ServicePatterns.patterns).forEach(([serviceType, pattern]) => {
      let matchScore = 0;
      let matchedKeywords = 0;

      pattern.keywords.forEach(keyword => {
        if (message.includes(keyword)) {
          matchedKeywords++;
          matchScore += 1 / pattern.keywords.length;
        }
      });

      if (matchScore > 0.3 && matchedKeywords > 0) {
        const serviceName = this.generateServiceName(serviceType, message);
        
        // Don't duplicate if we already found this from database
        const existingService = detectedServices.find(s => 
          s.type === serviceType || s.name.toLowerCase().includes(serviceName.toLowerCase())
        );

        if (!existingService) {
          detectedServices.push({
            name: serviceName,
            type: serviceType,
            confidence: Math.min(matchScore, 0.85),
            source: 'pattern'
          });
        }
      }
    });

    // Sort by confidence and return top matches
    return detectedServices
      .filter(service => service.confidence >= this.threshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  // Generate service name based on detected type
  generateServiceName(serviceType, message) {
    const serviceNames = {
      'lawn-care': 'Lawn Care Service',
      'window-cleaning': 'Window Cleaning',
      'hvac': 'HVAC Service',
      'plumbing': 'Plumbing Service',
      'electrical': 'Electrical Service',
      'general': 'General Service'
    };

    return serviceNames[serviceType] || 'General Service';
  }

  // Categorize a service name into a type
  categorizeService(serviceName) {
    const name = serviceName.toLowerCase();
    
    if (name.includes('lawn') || name.includes('grass') || name.includes('yard')) {
      return 'lawn-care';
    }
    if (name.includes('window') || name.includes('glass')) {
      return 'window-cleaning';
    }
    if (name.includes('hvac') || name.includes('heating') || name.includes('cooling')) {
      return 'hvac';
    }
    if (name.includes('plumb') || name.includes('pipe') || name.includes('drain')) {
      return 'plumbing';
    }
    if (name.includes('electric') || name.includes('wiring')) {
      return 'electrical';
    }
    
    return 'general';
  }

  // Extract measurements from message
  extractMeasurements(message) {
    const measurements = {};
    
    // Look for common measurement patterns
    const patterns = [
      { regex: /(\d+(?:\.\d+)?)\s*(?:square\s*)?(?:feet|ft|sqft|sq\s*ft)/i, type: 'area', unit: 'sqft' },
      { regex: /(\d+(?:\.\d+)?)\s*acres?/i, type: 'area', unit: 'acres' },
      { regex: /(\d+)\s*windows?/i, type: 'quantity', unit: 'windows' },
      { regex: /(\d+)\s*doors?/i, type: 'quantity', unit: 'doors' },
      { regex: /(\d+)\s*rooms?/i, type: 'quantity', unit: 'rooms' },
      { regex: /(\d+)\s*floors?\s*(?:levels?)?/i, type: 'quantity', unit: 'floors' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:linear\s*)?(?:feet|ft)/i, type: 'length', unit: 'linear feet' }
    ];

    patterns.forEach(pattern => {
      const match = message.match(pattern.regex);
      if (match) {
        const value = parseFloat(match[1]);
        measurements[pattern.type] = value;
        measurements.description = `${value} ${pattern.unit}`;
        
        if (pattern.type === 'quantity') {
          measurements.quantity = value;
        }
      }
    });

    return measurements;
  }

  // Detect urgency indicators
  detectUrgency(message) {
    const urgencyPatterns = {
      emergency: ['emergency', 'urgent', 'asap', 'immediately', 'right now', 'broken', 'leaking', 'flooding'],
      high: ['soon', 'quickly', 'fast', 'this week', 'priority', 'important'],
      normal: ['when possible', 'convenient', 'scheduled', 'planned'],
      low: ['eventually', 'whenever', 'no rush', 'flexible']
    };

    for (const [level, keywords] of Object.entries(urgencyPatterns)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return level;
      }
    }

    return 'normal';
  }

  // Detect frequency preferences
  detectFrequency(message) {
    const frequencyPatterns = {
      'weekly': ['weekly', 'every week', 'once a week'],
      'bi-weekly': ['bi-weekly', 'every two weeks', 'twice a month'],
      'monthly': ['monthly', 'every month', 'once a month'],
      'quarterly': ['quarterly', 'every quarter', 'every three months'],
      'annually': ['annually', 'yearly', 'once a year'],
      'one-time': ['one time', 'once', 'single', 'just once']
    };

    for (const [frequency, keywords] of Object.entries(frequencyPatterns)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return frequency;
      }
    }

    return null;
  }

  // Suggest specifications based on service type and message content
  suggestSpecifications(serviceType, message) {
    const suggestions = [];
    
    const specPatterns = {
      'window-cleaning': {
        'interior': ['inside', 'interior', 'indoor'],
        'exterior': ['outside', 'exterior', 'outdoor'],
        'both sides': ['both', 'inside and outside', 'interior and exterior'],
        'screen cleaning': ['screen', 'screens'],
        'sill cleaning': ['sill', 'sills', 'window sill']
      },
      'lawn-care': {
        'mowing': ['mow', 'mowing', 'cut', 'cutting'],
        'edging': ['edge', 'edging', 'trim', 'trimming'],
        'leaf removal': ['leaves', 'leaf', 'cleanup', 'clean up'],
        'fertilizing': ['fertilize', 'fertilizer', 'feed', 'feeding']
      },
      'hvac': {
        'inspection': ['inspect', 'check', 'look at', 'examine'],
        'cleaning': ['clean', 'cleaning', 'service'],
        'repair': ['repair', 'fix', 'broken', 'not working'],
        'maintenance': ['maintain', 'tune up', 'service']
      }
    };

    const serviceSpecs = specPatterns[serviceType];
    if (serviceSpecs) {
      Object.entries(serviceSpecs).forEach(([spec, keywords]) => {
        if (keywords.some(keyword => message.includes(keyword))) {
          suggestions.push(spec);
        }
      });
    }

    return suggestions;
  }

  // Extract custom requirements from message
  extractCustomRequirements(message) {
    // Look for requirement indicators
    const requirementPatterns = [
      /(?:need|want|require|must have|important|special)\s+(.+?)(?:\.|$|,)/gi,
      /(?:make sure|ensure|please)\s+(.+?)(?:\.|$|,)/gi
    ];

    const requirements = [];
    
    requirementPatterns.forEach(pattern => {
      const matches = [...message.matchAll(pattern)];
      matches.forEach(match => {
        const requirement = match[1].trim();
        if (requirement.length > 5 && requirement.length < 100) {
          requirements.push(requirement);
        }
      });
    });

    return requirements.join('. ');
  }

  // Determine if message suggests adding to cart
  shouldSuggestAddToCart(message) {
    // Positive indicators
    const positiveIndicators = [
      /(?:need|want|looking for|require)\s+(?:help with|someone to|a)/i,
      /(?:can you|could you|would you|will you)\s+(?:help|do|provide)/i,
      /(?:how much|what(?:'s| is) the cost|price|estimate|quote)/i,
      /(?:schedule|book|arrange|set up)/i,
      /(?:get|receive|obtain)\s+(?:service|help|estimate)/i,
      /\d+\s+(?:windows?|rooms?|sqft|feet|doors?)/i, // Contains measurements
      /(?:have|got)\s+(?:a|\d+)/i, // "I have 20 windows"
      /^(?:yes|yeah|yep|sure|okay|ok|definitely|absolutely)$/i, // Affirmative responses
      /^yes\s+/i, // "Yes, I need..."
      /(?:add|put)\s+(?:it|this|that)\s+(?:in|to)\s+(?:cart|list)/i, // Direct cart requests
      /(?:interested|interested in)/i // Interest expressions
    ];

    // Negative indicators (don't suggest cart)
    const negativeIndicators = [
      /(?:just|only)\s+(?:asking|wondering|curious)/i,
      /(?:general|basic)\s+(?:question|info|information)/i,
      /(?:what is|what are|tell me about)/i,
      /(?:thanks|thank you|goodbye|bye)$/i,
      /^(?:no|nope|not|never)$/i // Negative responses
    ];

    // Check negative indicators first
    if (negativeIndicators.some(pattern => pattern.test(message))) {
      return false;
    }

    // Check positive indicators
    return positiveIndicators.some(pattern => pattern.test(message));
  }

  // Estimate price based on service and measurements
  estimatePrice(service, measurements) {
    // Basic pricing estimation (in production, this would use business pricing rules)
    const basePrices = {
      'lawn-care': 50,
      'window-cleaning': 15,
      'hvac': 150,
      'plumbing': 125,
      'electrical': 100,
      'general': 100
    };

    let basePrice = basePrices[service.type] || 100;

    // Adjust based on measurements
    if (measurements.quantity && measurements.quantity > 1) {
      if (service.type === 'window-cleaning') {
        basePrice = measurements.quantity * 8; // $8 per window
      } else {
        basePrice *= Math.min(measurements.quantity, 5); // Cap multiplier
      }
    }

    if (measurements.area) {
      if (service.type === 'lawn-care' && measurements.area > 1000) {
        basePrice += (measurements.area / 1000) * 25; // $25 per 1000 sqft
      }
    }

    return Math.round(basePrice);
  }

  // Get contextual follow-up questions
  getFollowUpQuestions(serviceType, detectedDetails) {
    const questions = ServicePatterns.getSuggestedQuestions(serviceType);
    
    // Filter out questions we already have answers for
    const filteredQuestions = questions.filter(question => {
      const lowerQ = question.toLowerCase();
      if (lowerQ.includes('size') && detectedDetails.measurement) return false;
      if (lowerQ.includes('frequency') && detectedDetails.frequency !== 'one-time') return false;
      return true;
    });

    return filteredQuestions.slice(0, 3); // Max 3 questions
  }
}

// Export a default instance
export const defaultServiceRecognition = new ServiceRecognitionEngine();