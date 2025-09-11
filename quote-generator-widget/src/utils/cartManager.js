// Service Needs Cart Management System
// Handles cart state, persistence, and business logic

export class CartManager {
  constructor(businessId, leadId = null) {
    this.businessId = businessId;
    this.leadId = leadId;
    this.sessionId = this.generateSessionId();
    this.cart = this.loadCart();
    this.listeners = [];
  }

  // Generate unique session ID
  generateSessionId() {
    return 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Load cart from localStorage
  loadCart() {
    try {
      const storageKey = `serviceCart_${this.businessId}`;
      const savedCart = localStorage.getItem(storageKey);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        // Validate cart structure
        if (this.isValidCart(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load cart from localStorage:', error);
    }

    // Return empty cart structure
    return this.createEmptyCart();
  }

  // Create empty cart structure
  createEmptyCart() {
    return {
      sessionId: this.sessionId,
      businessId: this.businessId,
      leadId: this.leadId,
      cartItems: [],
      totalEstimate: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
  }

  // Validate cart structure
  isValidCart(cart) {
    return cart && 
           typeof cart === 'object' && 
           Array.isArray(cart.cartItems) &&
           cart.businessId === this.businessId;
  }

  // Save cart to localStorage
  saveCart() {
    try {
      const storageKey = `serviceCart_${this.businessId}`;
      this.cart.lastModified = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify(this.cart));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }

  // Add item to cart
  addItem(serviceItem) {
    const newItem = {
      id: this.generateItemId(),
      serviceType: serviceItem.serviceType || 'general',
      serviceName: serviceItem.serviceName,
      details: {
        quantity: serviceItem.details?.quantity || 1,
        measurement: serviceItem.details?.measurement || '',
        frequency: serviceItem.details?.frequency || 'one-time',
        specifications: serviceItem.details?.specifications || [],
        customRequirements: serviceItem.details?.customRequirements || '',
        urgency: serviceItem.details?.urgency || 'normal'
      },
      addedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      estimatedPrice: serviceItem.estimatedPrice || null,
      aiConfidenceScore: serviceItem.aiConfidenceScore || 0.8,
      userConfirmed: true
    };

    // Check for duplicates and merge if similar
    const existingItemIndex = this.findSimilarItem(newItem);
    if (existingItemIndex !== -1) {
      // Update existing item instead of adding duplicate
      this.updateItem(this.cart.cartItems[existingItemIndex].id, newItem.details);
    } else {
      this.cart.cartItems.push(newItem);
    }

    this.updateTotalEstimate();
    this.saveCart();
    return newItem;
  }

  // Find similar items to prevent duplicates
  findSimilarItem(newItem) {
    return this.cart.cartItems.findIndex(item => 
      item.serviceName.toLowerCase() === newItem.serviceName.toLowerCase() &&
      item.serviceType === newItem.serviceType
    );
  }

  // Generate unique item ID
  generateItemId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }

  // Update existing cart item
  updateItem(itemId, updates) {
    const itemIndex = this.cart.cartItems.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      this.cart.cartItems[itemIndex] = {
        ...this.cart.cartItems[itemIndex],
        ...updates,
        lastModified: new Date().toISOString()
      };
      this.updateTotalEstimate();
      this.saveCart();
      return this.cart.cartItems[itemIndex];
    }
    return null;
  }

  // Remove item from cart
  removeItem(itemId) {
    const initialLength = this.cart.cartItems.length;
    this.cart.cartItems = this.cart.cartItems.filter(item => item.id !== itemId);
    
    if (this.cart.cartItems.length < initialLength) {
      this.updateTotalEstimate();
      this.saveCart();
      return true;
    }
    return false;
  }

  // Get cart items
  getItems() {
    return this.cart.cartItems;
  }

  // Get cart item count
  getItemCount() {
    return this.cart.cartItems.length;
  }

  // Update total estimate
  updateTotalEstimate() {
    let total = 0;
    this.cart.cartItems.forEach(item => {
      if (item.estimatedPrice && typeof item.estimatedPrice === 'number') {
        total += item.estimatedPrice;
      }
    });
    this.cart.totalEstimate = total;
  }

  // Clear cart
  clearCart() {
    this.cart = this.createEmptyCart();
    this.saveCart();
  }

  // Set lead ID (when lead is created)
  setLeadId(leadId) {
    this.leadId = leadId;
    this.cart.leadId = leadId;
    this.saveCart();
  }

  // Export cart data for API calls
  exportCartData() {
    return {
      sessionId: this.cart.sessionId,
      businessId: this.cart.businessId,
      leadId: this.cart.leadId,
      cartItems: this.cart.cartItems.map(item => ({
        serviceName: item.serviceName,
        serviceType: item.serviceType,
        details: item.details,
        estimatedPrice: item.estimatedPrice,
        addedAt: item.addedAt
      })),
      totalEstimate: this.cart.totalEstimate,
      itemCount: this.getItemCount()
    };
  }

  // Subscribe to cart changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of cart changes
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.exportCartData());
      } catch (error) {
        console.error('Error in cart listener:', error);
      }
    });
  }

  // Sync cart with backend (when user has lead ID)
  async syncWithBackend(apiBaseUrl) {
    if (!this.leadId || this.cart.cartItems.length === 0) {
      return { success: false, message: 'No lead ID or empty cart' };
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/cart/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.exportCartData())
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result };
      } else {
        return { success: false, message: 'Failed to sync cart' };
      }
    } catch (error) {
      console.error('Cart sync error:', error);
      return { success: false, message: error.message };
    }
  }
}

// Cart item validation helpers
export const CartValidators = {
  // Validate service name
  validateServiceName(name) {
    return typeof name === 'string' && name.trim().length > 0;
  },

  // Validate quantity
  validateQuantity(quantity) {
    if (typeof quantity === 'number') {
      return quantity > 0;
    }
    if (typeof quantity === 'string') {
      const parsed = parseFloat(quantity);
      return !isNaN(parsed) && parsed > 0;
    }
    return false;
  },

  // Validate measurement
  validateMeasurement(measurement) {
    if (!measurement) return true; // Optional field
    return typeof measurement === 'string' && measurement.trim().length > 0;
  },

  // Validate frequency
  validateFrequency(frequency) {
    const validFrequencies = ['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually'];
    return validFrequencies.includes(frequency);
  }
};

// Service recognition patterns for AI integration
export const ServicePatterns = {
  // Common service keywords and patterns
  patterns: {
    'lawn-care': {
      keywords: ['lawn', 'grass', 'mowing', 'mow', 'yard', 'cutting', 'edging'],
      measurements: ['sqft', 'square feet', 'acres', 'yards'],
      frequencies: ['weekly', 'bi-weekly', 'monthly'],
      questions: ['property size', 'grass type', 'frequency preference']
    },
    'window-cleaning': {
      keywords: ['window', 'windows', 'glass', 'cleaning'],
      measurements: ['number of windows', 'floors', 'stories'],
      frequencies: ['one-time', 'monthly', 'quarterly'],
      questions: ['interior/exterior', 'number of floors', 'window type']
    },
    'hvac': {
      keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac'],
      measurements: ['sqft', 'btu', 'tons'],
      frequencies: ['one-time', 'maintenance plan'],
      questions: ['system type', 'home size', 'current issues']
    },
    'plumbing': {
      keywords: ['plumbing', 'pipes', 'leak', 'drain', 'toilet', 'faucet'],
      measurements: ['number of fixtures', 'linear feet'],
      frequencies: ['one-time', 'emergency'],
      questions: ['issue type', 'location', 'urgency']
    }
  },

  // Extract service type from text
  extractServiceType(text) {
    const lowerText = text.toLowerCase();
    for (const [serviceType, pattern] of Object.entries(this.patterns)) {
      if (pattern.keywords.some(keyword => lowerText.includes(keyword))) {
        return serviceType;
      }
    }
    return 'general';
  },

  // Extract measurements from text
  extractMeasurements(text, serviceType) {
    const pattern = this.patterns[serviceType];
    if (!pattern) return null;

    const measurements = {};
    
    // Look for numbers followed by measurement units
    pattern.measurements.forEach(unit => {
      const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}`, 'i');
      const match = text.match(regex);
      if (match) {
        measurements[unit] = parseFloat(match[1]);
      }
    });

    // Look for simple numbers that might be quantities
    const numberMatch = text.match(/(\d+)\s*(windows?|rooms?|doors?|units?)/i);
    if (numberMatch) {
      measurements.quantity = parseInt(numberMatch[1]);
      measurements.unit = numberMatch[2];
    }

    return Object.keys(measurements).length > 0 ? measurements : null;
  },

  // Suggest questions based on service type
  getSuggestedQuestions(serviceType) {
    const pattern = this.patterns[serviceType];
    return pattern ? pattern.questions : [];
  }
};