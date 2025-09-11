// Decision Tree State Management and Configuration

export const DECISION_TREE_PATHS = {
  ROOT: 'root',
  GET_ESTIMATE: 'get_estimate',
  OUR_SERVICES: 'our_services'
};

export const DECISION_TREE_STEPS = {
  // Root level
  WELCOME: 'welcome',
  
  // Get Estimate path
  ESTIMATE_DESCRIPTION: 'estimate_description',
  ESTIMATE_CONFIRMATION: 'estimate_confirmation',
  ESTIMATE_TIMELINE: 'estimate_timeline',
  ESTIMATE_CONTACT: 'estimate_contact',
  
  // Services path
  SERVICE_SELECTION: 'service_selection',
  SERVICE_DETAILS: 'service_details',
  SERVICE_ACTION: 'service_action'
};

// Default decision tree configuration
export const DEFAULT_DECISION_TREE_CONFIG = {
  welcomeMessage: "Hi! I'm here to help you with your home improvement needs. How can I assist you today?",
  mainOptions: [
    {
      id: 'get_estimate',
      displayText: 'Get an estimate',
      order: 1,
      enabled: true,
      followUpMessage: "I'd be happy to help you get an estimate. Please describe what you're looking to have done."
    },
    {
      id: 'our_services',
      displayText: 'Our services',
      order: 2,
      enabled: true,
      followUpMessage: "Here are our available services. Select one to learn more:",
      services: [] // This will be populated from the database
    }
  ]
};

// Timeline options for estimates
export const TIMELINE_OPTIONS = [
  { id: 'asap', text: 'ASAP', value: 'asap' },
  { id: 'week', text: 'Within a week', value: 'week' },
  { id: 'month', text: 'Within a month', value: 'month' },
  { id: 'flexible', text: 'Flexible', value: 'flexible' }
];

// Common action options
export const COMMON_ACTIONS = {
  YES_NO: [
    { id: 'yes', text: 'Yes', value: true },
    { id: 'no', text: 'No', value: false }
  ],
  SERVICE_ACTIONS: [
    { id: 'yes', text: 'Yes, add to quote', value: 'add' },
    { id: 'no', text: 'No thanks', value: 'decline' },
    { id: 'more', text: 'Tell me more', value: 'more_info' }
  ]
};

// Decision Tree State Class
export class DecisionTreeState {
  constructor(config = DEFAULT_DECISION_TREE_CONFIG, businessId = null, apiBaseUrl = 'http://localhost:3001') {
    this.config = config;
    this.businessId = businessId;
    this.apiBaseUrl = apiBaseUrl;
    this.currentPath = DECISION_TREE_PATHS.ROOT;
    this.currentStep = DECISION_TREE_STEPS.WELCOME;
    this.history = [];
    this.userData = {};
    this.selectedServices = [];
    this.dynamicServices = []; // Services loaded from database
  }

  // Get current options based on state
  getCurrentOptions() {
    switch (this.currentStep) {
      case DECISION_TREE_STEPS.WELCOME:
        return this.config.mainOptions
          .filter(option => option.enabled)
          .sort((a, b) => a.order - b.order)
          .map(option => ({
            id: option.id,
            text: option.displayText,
            value: option.id
          }));

      case DECISION_TREE_STEPS.ESTIMATE_CONFIRMATION:
        return COMMON_ACTIONS.YES_NO;

      case DECISION_TREE_STEPS.ESTIMATE_TIMELINE:
        return TIMELINE_OPTIONS;

      case DECISION_TREE_STEPS.SERVICE_SELECTION:
        // Use dynamic services from database if available, fallback to config
        const servicesToUse = this.dynamicServices.length > 0 ? this.dynamicServices : 
          (this.config.mainOptions.find(opt => opt.id === 'our_services')?.services || []);
        
        return servicesToUse.map(service => ({
          id: service.id,
          text: service.name,
          value: service.id
        }));

      case DECISION_TREE_STEPS.SERVICE_ACTION:
        return COMMON_ACTIONS.SERVICE_ACTIONS;

      default:
        return [];
    }
  }

  // Get current message based on state
  getCurrentMessage() {
    switch (this.currentStep) {
      case DECISION_TREE_STEPS.WELCOME:
        return this.config.welcomeMessage;

      case DECISION_TREE_STEPS.ESTIMATE_DESCRIPTION:
        const estimateOption = this.config.mainOptions.find(opt => opt.id === 'get_estimate');
        return estimateOption?.followUpMessage || "Please describe what you're looking to have done.";

      case DECISION_TREE_STEPS.ESTIMATE_CONFIRMATION:
        return `Based on your description, here's what I understand you need: ${this.userData.estimateDescription || 'your project'}. Would you like to add this to your service needs?`;

      case DECISION_TREE_STEPS.ESTIMATE_TIMELINE:
        return "What's your timeline for this service?";

      case DECISION_TREE_STEPS.SERVICE_SELECTION:
        const servicesOption = this.config.mainOptions.find(opt => opt.id === 'our_services');
        return servicesOption?.followUpMessage || "Here are our available services:";

      case DECISION_TREE_STEPS.SERVICE_DETAILS:
        const selectedService = this.getSelectedService();
        return selectedService ? 
          `${selectedService.description} ${selectedService.pricing_info || selectedService.basePrice || ''}. Would you like to add this service to your quote request?` :
          "Please select a service to learn more.";

      default:
        return "How can I help you today?";
    }
  }

  // Handle option selection
  selectOption(option) {
    this.addToHistory();

    switch (this.currentStep) {
      case DECISION_TREE_STEPS.WELCOME:
        this.handleMainOptionSelection(option);
        break;

      case DECISION_TREE_STEPS.ESTIMATE_CONFIRMATION:
        this.handleEstimateConfirmation(option);
        break;

      case DECISION_TREE_STEPS.ESTIMATE_TIMELINE:
        this.handleTimelineSelection(option);
        break;

      case DECISION_TREE_STEPS.SERVICE_SELECTION:
        this.handleServiceSelection(option);
        break;

      case DECISION_TREE_STEPS.SERVICE_ACTION:
        this.handleServiceAction(option);
        break;
    }
  }

  // Handle main option selection
  handleMainOptionSelection(option) {
    this.currentPath = option.value;
    
    switch (option.value) {
      case 'get_estimate':
        this.currentStep = DECISION_TREE_STEPS.ESTIMATE_DESCRIPTION;
        break;
      case 'our_services':
        this.currentStep = DECISION_TREE_STEPS.SERVICE_SELECTION;
        break;
    }
  }

  // Handle estimate flow
  handleEstimateConfirmation(option) {
    if (option.value) {
      this.currentStep = DECISION_TREE_STEPS.ESTIMATE_TIMELINE;
    } else {
      this.resetToWelcome();
    }
  }

  handleTimelineSelection(option) {
    this.userData.timeline = option.value;
    this.currentStep = DECISION_TREE_STEPS.ESTIMATE_CONTACT;
    // This would trigger lead form or contact collection
  }

  // Handle service flow
  handleServiceSelection(option) {
    this.userData.selectedServiceId = option.value;
    this.currentStep = DECISION_TREE_STEPS.SERVICE_DETAILS;
  }

  handleServiceAction(option) {
    switch (option.value) {
      case 'add':
        this.addSelectedServiceToCart();
        this.resetToWelcome();
        break;
      case 'decline':
        this.resetToWelcome();
        break;
      case 'more_info':
        // Stay on current step to show more details
        break;
    }
  }


  // Utility methods
  addToHistory() {
    this.history.push({
      path: this.currentPath,
      step: this.currentStep,
      userData: { ...this.userData }
    });
  }

  goBack() {
    if (this.history.length > 0) {
      const previous = this.history.pop();
      this.currentPath = previous.path;
      this.currentStep = previous.step;
      this.userData = previous.userData;
      return true;
    }
    return false;
  }

  resetToWelcome() {
    this.currentPath = DECISION_TREE_PATHS.ROOT;
    this.currentStep = DECISION_TREE_STEPS.WELCOME;
    this.userData = {};
  }

  getSelectedService() {
    if (!this.userData.selectedServiceId) return null;
    
    // First try dynamic services from database
    if (this.dynamicServices.length > 0) {
      return this.dynamicServices.find(service => service.id === this.userData.selectedServiceId);
    }
    
    // Fallback to config services
    const servicesOption = this.config.mainOptions.find(opt => opt.id === 'our_services');
    return servicesOption?.services?.find(service => service.id === this.userData.selectedServiceId);
  }


  // Load services from API
  async loadServices() {
    if (!this.businessId) {
      console.warn('No business ID provided, using default services');
      return;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/services/${this.businessId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.services) {
        this.dynamicServices = data.services;
        console.log(`✅ Loaded ${data.services.length} services from database`);
      }
    } catch (error) {
      console.error('❌ Error loading services:', error);
      // Continue with default services from config
    }
  }

  addSelectedServiceToCart() {
    const service = this.getSelectedService();
    if (service) {
      this.selectedServices.push({
        id: service.id,
        name: service.name,
        description: service.description,
        basePrice: service.basePrice || service.pricing_info,
        addedAt: new Date()
      });
    }
  }

  // Handle free text input
  handleTextInput(text) {
    switch (this.currentStep) {
      case DECISION_TREE_STEPS.ESTIMATE_DESCRIPTION:
        this.userData.estimateDescription = text;
        this.currentStep = DECISION_TREE_STEPS.ESTIMATE_CONFIRMATION;
        return true; // Indicates we handled the input
      default:
        return false; // Let normal chat flow handle it
    }
  }

  // Check if current step expects text input
  expectsTextInput() {
    return this.currentStep === DECISION_TREE_STEPS.ESTIMATE_DESCRIPTION;
  }

  // Get state for persistence
  getState() {
    return {
      currentPath: this.currentPath,
      currentStep: this.currentStep,
      history: this.history,
      userData: this.userData,
      selectedServices: this.selectedServices,
      dynamicServices: this.dynamicServices
    };
  }

  // Restore state from persistence
  setState(state) {
    this.currentPath = state.currentPath || DECISION_TREE_PATHS.ROOT;
    this.currentStep = state.currentStep || DECISION_TREE_STEPS.WELCOME;
    this.history = state.history || [];
    this.userData = state.userData || {};
    this.selectedServices = state.selectedServices || [];
    this.dynamicServices = state.dynamicServices || [];
  }
}