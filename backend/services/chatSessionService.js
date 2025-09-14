const { pool } = require('../config/database');

class ChatSessionService {
  constructor() {
    this.sessions = new Map(); // In-memory cache for active sessions
  }

  async createSession(businessId, initialMessage = null) {
    try {
      const sessionId = this.generateSessionId();
      const initialState = 'AWAITING_USER_INTENT';

      const session = {
        sessionId,
        businessId,
        state: initialState,
        messages: [],
        userIntent: null,
        leadData: null,
        serviceQueue: [], // Queue of services to process
        currentService: null, // Service currently being processed
        serviceDetails: {}, // Collected details for each service
        collected_details: {}, // Session-wide storage for all collected information
        cartItems: [], // Items added to cart
        createdAt: new Date(),
        lastActivity: new Date()
      };

      // Store in memory cache
      this.sessions.set(sessionId, session);

      // Store in database for persistence (if database is available)
      try {
        const query = `
          INSERT INTO chat_sessions (id, business_id, state, user_intent, session_data, created_at, last_activity)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await pool.query(query, [
          sessionId,
          businessId,
          initialState,
          null,
          JSON.stringify(session),
          session.createdAt,
          session.lastActivity
        ]);

        console.log(`✅ Chat session ${sessionId} created and persisted`);
      } catch (dbError) {
        console.warn('⚠️ Could not persist session to database:', dbError.message);
      }

      return session;
    } catch (error) {
      console.error('❌ Error creating chat session:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      // First check memory cache
      if (this.sessions.has(sessionId)) {
        return this.sessions.get(sessionId);
      }

      // Try to load from database
      try {
        const query = 'SELECT * FROM chat_sessions WHERE id = $1';
        const result = await pool.query(query, [sessionId]);

        if (result.rows.length > 0) {
          const dbSession = result.rows[0];
          const sessionData = JSON.parse(dbSession.session_data || '{}');
          const session = {
            sessionId: dbSession.id,
            businessId: dbSession.business_id,
            state: dbSession.state,
            userIntent: dbSession.user_intent,
            messages: sessionData.messages || [],
            leadData: sessionData.leadData || null,
            serviceQueue: sessionData.serviceQueue || [],
            currentService: sessionData.currentService || null,
            serviceDetails: sessionData.serviceDetails || {},
            collected_details: sessionData.collected_details || {},
            cartItems: sessionData.cartItems || [],
            createdAt: dbSession.created_at,
            lastActivity: dbSession.last_activity
          };

          // Update memory cache
          this.sessions.set(sessionId, session);
          return session;
        }
      } catch (dbError) {
        console.warn('⚠️ Could not load session from database:', dbError.message);
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting chat session:', error);
      return null;
    }
  }

  async updateSessionState(sessionId, newState, userIntent = null, additionalData = {}) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Update session data
      session.state = newState;
      session.lastActivity = new Date();

      if (userIntent) {
        session.userIntent = userIntent;
      }

      // Merge additional data
      Object.assign(session, additionalData);

      // Update memory cache
      this.sessions.set(sessionId, session);

      // Update database
      try {
        const query = `
          UPDATE chat_sessions
          SET state = $1, user_intent = $2, session_data = $3, last_activity = $4
          WHERE id = $5
        `;

        await pool.query(query, [
          session.state,
          session.userIntent,
          JSON.stringify(session),
          session.lastActivity,
          sessionId
        ]);

        console.log(`✅ Session ${sessionId} updated to state: ${newState}`);
      } catch (dbError) {
        console.warn('⚠️ Could not update session in database:', dbError.message);
      }

      return session;
    } catch (error) {
      console.error('❌ Error updating session state:', error);
      throw error;
    }
  }

  async addMessage(sessionId, message, sender = 'user') {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const messageData = {
        content: message,
        sender,
        timestamp: new Date()
      };

      session.messages.push(messageData);
      session.lastActivity = new Date();

      // Update memory cache
      this.sessions.set(sessionId, session);

      // Update database
      try {
        const query = `
          UPDATE chat_sessions
          SET session_data = $1, last_activity = $2
          WHERE id = $3
        `;

        await pool.query(query, [
          JSON.stringify(session),
          session.lastActivity,
          sessionId
        ]);
      } catch (dbError) {
        console.warn('⚠️ Could not update session messages in database:', dbError.message);
      }

      return session;
    } catch (error) {
      console.error('❌ Error adding message to session:', error);
      throw error;
    }
  }

  async addServicesToQueue(sessionId, services) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Add services to queue (avoiding duplicates)
      for (const service of services) {
        const exists = session.serviceQueue.some(s => s.id === service.id);
        if (!exists) {
          session.serviceQueue.push({
            ...service,
            addedAt: new Date(),
            status: 'pending' // pending, in_progress, completed
          });
        }
      }

      // Update session
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);

      // Persist to database
      try {
        const query = `
          UPDATE chat_sessions
          SET session_data = $1, last_activity = $2
          WHERE id = $3
        `;

        await pool.query(query, [
          JSON.stringify(session),
          session.lastActivity,
          sessionId
        ]);
      } catch (dbError) {
        console.warn('⚠️ Could not update service queue in database:', dbError.message);
      }

      console.log(`✅ Added ${services.length} services to queue for session ${sessionId}`);
      return session;
    } catch (error) {
      console.error('❌ Error adding services to queue:', error);
      throw error;
    }
  }

  async startProcessingNextService(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Find the next pending service in the queue
      const nextService = session.serviceQueue.find(s => s.status === 'pending');

      if (!nextService) {
        console.log(`No pending services in queue for session ${sessionId}`);
        return { hasNextService: false, session };
      }

      // Set current service and update its status
      session.currentService = nextService;
      nextService.status = 'in_progress';
      nextService.startedAt = new Date();

      // Initialize service details if not exists
      if (!session.serviceDetails[nextService.id]) {
        session.serviceDetails[nextService.id] = {
          serviceId: nextService.id,
          serviceName: nextService.name,
          collectedDetails: {},
          isComplete: false
        };
      }

      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);

      // Persist to database
      try {
        const query = `
          UPDATE chat_sessions
          SET session_data = $1, last_activity = $2
          WHERE id = $3
        `;

        await pool.query(query, [
          JSON.stringify(session),
          session.lastActivity,
          sessionId
        ]);
      } catch (dbError) {
        console.warn('⚠️ Could not update current service in database:', dbError.message);
      }

      console.log(`✅ Started processing service: ${nextService.name} for session ${sessionId}`);
      return { hasNextService: true, currentService: nextService, session };
    } catch (error) {
      console.error('❌ Error starting next service processing:', error);
      throw error;
    }
  }

  async completeCurrentService(sessionId, serviceDetails = {}) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (!session.currentService) {
        console.log(`No current service to complete for session ${sessionId}`);
        return session;
      }

      const currentService = session.currentService;

      // Mark current service as completed
      const queuedService = session.serviceQueue.find(s => s.id === currentService.id);
      if (queuedService) {
        queuedService.status = 'completed';
        queuedService.completedAt = new Date();
      }

      // Update service details
      if (session.serviceDetails[currentService.id]) {
        session.serviceDetails[currentService.id].collectedDetails = {
          ...session.serviceDetails[currentService.id].collectedDetails,
          ...serviceDetails
        };
        session.serviceDetails[currentService.id].isComplete = true;
      }

      // Clear current service
      session.currentService = null;
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);

      // Persist to database
      try {
        const query = `
          UPDATE chat_sessions
          SET session_data = $1, last_activity = $2
          WHERE id = $3
        `;

        await pool.query(query, [
          JSON.stringify(session),
          session.lastActivity,
          sessionId
        ]);
      } catch (dbError) {
        console.warn('⚠️ Could not update completed service in database:', dbError.message);
      }

      console.log(`✅ Completed service: ${currentService.name} for session ${sessionId}`);
      return session;
    } catch (error) {
      console.error('❌ Error completing current service:', error);
      throw error;
    }
  }

  getQueueStatus(session) {
    if (!session.serviceQueue || session.serviceQueue.length === 0) {
      return {
        totalServices: 0,
        pendingServices: 0,
        inProgressServices: 0,
        completedServices: 0,
        hasMore: false
      };
    }

    const pending = session.serviceQueue.filter(s => s.status === 'pending').length;
    const inProgress = session.serviceQueue.filter(s => s.status === 'in_progress').length;
    const completed = session.serviceQueue.filter(s => s.status === 'completed').length;

    return {
      totalServices: session.serviceQueue.length,
      pendingServices: pending,
      inProgressServices: inProgress,
      completedServices: completed,
      hasMore: pending > 0
    };
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Store a piece of information in session-wide collected_details
  async storeSessionDetail(sessionId, key, value, source = 'user_input') {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Store the detail with metadata
      session.collected_details[key] = {
        value,
        source,
        collectedAt: new Date(),
        sessionId
      };

      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);

      // Persist to database
      try {
        const query = `
          UPDATE chat_sessions
          SET session_data = $1, last_activity = $2
          WHERE id = $3
        `;

        await pool.query(query, [
          JSON.stringify(session),
          session.lastActivity,
          sessionId
        ]);
      } catch (dbError) {
        console.warn('⚠️ Could not persist session detail in database:', dbError.message);
      }

      console.log(`✅ Stored session detail: ${key} = ${value} for session ${sessionId}`);
      return session;
    } catch (error) {
      console.error('❌ Error storing session detail:', error);
      throw error;
    }
  }

  // Get previously collected details for a list of requirements
  getCollectedDetails(session, requirements) {
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

  // Generate intelligent question based on missing requirements and conversation context
  generateNextQuestion(missingRequirements, serviceName, conversationContext = {}) {
    if (missingRequirements.length === 0) {
      return null;
    }

    // Prioritize required fields first
    const requiredMissing = missingRequirements.filter(req => req.required);
    const optionalMissing = missingRequirements.filter(req => !req.required);

    // Get the next requirement to ask about
    const nextRequirement = requiredMissing.length > 0 ? requiredMissing[0] : optionalMissing[0];

    // Generate a natural question
    let question = nextRequirement.prompt;

    // Add context if it's the first question for this service
    if (conversationContext.isFirstQuestionForService) {
      question = `Great! Now I need a few details about your ${serviceName.toLowerCase()} needs. ${question}`;
    }

    // Add information about progress if there are multiple questions
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

  // Parse user response and extract relevant details based on current requirement
  extractDetailFromResponse(userResponse, currentRequirement, serviceName) {
    const extractedDetails = {};

    // Basic extraction logic - this could be enhanced with NLP
    const response = userResponse.toLowerCase().trim();

    // Handle different requirement types
    switch (currentRequirement.type) {
      case 'number':
      case 'text':
        // For text/number fields, use the entire response as the value
        extractedDetails[currentRequirement.key] = userResponse.trim();
        break;

      case 'select':
        // For select fields, try to match with options
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

      case 'textarea':
        extractedDetails[currentRequirement.key] = userResponse.trim();
        break;

      default:
        extractedDetails[currentRequirement.key] = userResponse.trim();
    }

    // Also look for common details that might be mentioned
    this._extractCommonDetails(userResponse, extractedDetails);

    return extractedDetails;
  }

  // Helper method to extract common details from any user response
  _extractCommonDetails(userResponse, extractedDetails) {
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

    // Extract email patterns
    const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/;
    const emailMatch = userResponse.match(emailPattern);
    if (emailMatch) {
      extractedDetails.email = emailMatch[1];
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
  }

  // Clean up old sessions (called periodically)
  cleanupOldSessions() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoffTime) {
        this.sessions.delete(sessionId);
        console.log(`🧹 Cleaned up old session: ${sessionId}`);
      }
    }
  }
}

module.exports = ChatSessionService;