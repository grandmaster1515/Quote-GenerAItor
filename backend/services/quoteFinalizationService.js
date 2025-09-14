const { query } = require('../config/database');
// const axios = require('axios'); // Commented out to allow testing without dependency

class QuoteFinalizationService {
  constructor() {
    this.initialized = false;
    this.aiApiUrl = process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Quote Finalization Service...');
      this.initialized = true;
      console.log('✅ Quote Finalization Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Quote Finalization Service:', error);
      throw error;
    }
  }

  // Main method to handle quote finalization
  async finalizeQuote(session, businessContext, chatSessionService) {
    try {
      console.log(`🎯 Finalizing quote for session ${session.sessionId}`);

      const cartItems = session.cartItems || [];

      if (cartItems.length === 0) {
        return {
          response: "It looks like your cart is empty. Would you like to add some services to get a quote?",
          nextAction: 'CONTINUE_CONVERSATION',
          error: 'Empty cart'
        };
      }

      // Step 1: Generate AI estimate
      console.log('🤖 Generating AI estimate...');
      const aiEstimate = await this.generateAIEstimate(cartItems, businessContext);

      // Step 2: Create comprehensive summary
      const quoteSummary = this.createQuoteSummary(cartItems, aiEstimate);

      // Step 3: Check if we need lead information
      const needsLeadCapture = !session.leadData || this.isLeadDataIncomplete(session.leadData);

      if (needsLeadCapture) {
        // Move to lead capture state
        await chatSessionService.updateSessionState(
          session.sessionId,
          'AWAITING_LEAD_DETAILS',
          null,
          {
            pendingQuoteData: {
              aiEstimate,
              quoteSummary,
              generatedAt: new Date().toISOString()
            }
          }
        );

        return {
          response: `${quoteSummary.presentation}\n\nTo complete your quote request, I'll need a few contact details. What's your name?`,
          nextAction: 'AWAIT_LEAD_DETAILS',
          aiEstimate,
          quoteSummary,
          needsLeadCapture: true
        };
      } else {
        // Lead data is complete, create quote request immediately
        const quoteRequest = await this.createQuoteRequest(session, aiEstimate, quoteSummary);

        if (quoteRequest.success) {
          await chatSessionService.updateSessionState(session.sessionId, 'QUOTE_COMPLETED');

          return {
            response: `${quoteSummary.presentation}\n\n🎉 Your quote request has been submitted successfully! Reference ID: ${quoteRequest.quoteId}\n\nOur team will review your request and provide an official quote within 24 hours. You'll receive it at ${session.leadData.email}.`,
            nextAction: 'QUOTE_COMPLETED',
            aiEstimate,
            quoteSummary,
            quoteRequest,
            quoteId: quoteRequest.quoteId
          };
        } else {
          return {
            response: "I'm sorry, there was an issue submitting your quote request. Please try again or contact us directly.",
            nextAction: 'ERROR_RECOVERY',
            error: quoteRequest.error
          };
        }
      }

    } catch (error) {
      console.error('❌ Error finalizing quote:', error);
      return {
        response: "I'm sorry, I encountered an issue while preparing your quote. Please try again.",
        nextAction: 'ERROR_RECOVERY',
        error: error.message
      };
    }
  }

  // Generate AI-powered estimate using LLM
  async generateAIEstimate(cartItems, businessContext = null) {
    try {
      // Construct detailed prompt for AI estimation
      const estimatePrompt = this.buildEstimatePrompt(cartItems, businessContext);

      // Try to use advanced AI if available, fallback to basic calculation
      let aiResponse;
      try {
        aiResponse = await this.callLLMForEstimate(estimatePrompt);
      } catch (aiError) {
        console.warn('⚠️ AI estimation failed, using fallback logic:', aiError.message);
        aiResponse = this.generateFallbackEstimate(cartItems);
      }

      // Parse and structure the AI response
      const structuredEstimate = this.parseAIEstimateResponse(aiResponse, cartItems);

      return {
        ...structuredEstimate,
        generatedAt: new Date().toISOString(),
        disclaimer: 'This is a preliminary AI-generated estimate. Final pricing will be determined by our team after site evaluation and may vary based on specific requirements, local regulations, and material costs.',
        isAIGenerated: true
      };

    } catch (error) {
      console.error('❌ Error generating AI estimate:', error);
      return this.generateFallbackEstimate(cartItems);
    }
  }

  // Build comprehensive prompt for LLM estimation
  buildEstimatePrompt(cartItems, businessContext) {
    let prompt = `You are a professional contractor providing preliminary cost estimates. Please analyze the following service request and provide a helpful but non-binding estimate.

IMPORTANT: Always include a clear disclaimer that this is a preliminary estimate and final pricing will be determined after site evaluation.

SERVICE DETAILS:
`;

    // Add each cart item with details
    cartItems.forEach((item, index) => {
      prompt += `\n${index + 1}. SERVICE: ${item.serviceName}\n`;

      if (item.collectedDetails) {
        Object.entries(item.collectedDetails).forEach(([key, detail]) => {
          const value = detail.value || detail;
          if (value) {
            prompt += `   - ${key.replace(/_/g, ' ')}: ${value}\n`;
          }
        });
      }

      if (item.estimatedPrice) {
        prompt += `   - Current estimate: $${item.estimatedPrice}\n`;
      }
    });

    // Add business context if available
    if (businessContext) {
      prompt += `\nBUSINESS CONTEXT:\n${businessContext}\n`;
    }

    // Add pricing guidelines
    prompt += `\nPRICING GUIDELINES:
- HVAC services typically range $100-500 for repairs, $3000-8000 for installations
- Plumbing services range $125-300 for basic repairs, $2000-5000 for major work
- Kitchen remodeling ranges $15000-50000 depending on scope and materials
- Bathroom remodeling ranges $8000-25000 depending on scope
- Electrical work ranges $100-300 for basic tasks, $2000-8000 for major projects
- Roofing ranges $300-1000 for repairs, $8000-20000 for replacement

RESPONSE FORMAT:
Provide your response in this exact format:

PRELIMINARY ESTIMATE BREAKDOWN:
[Service Name]: $[amount] - [brief justification]
[Service Name]: $[amount] - [brief justification]

TOTAL ESTIMATED RANGE: $[low] - $[high]

ESTIMATE EXPLANATION:
[2-3 sentences explaining the estimate and key factors affecting pricing]

IMPORTANT DISCLAIMER:
This is a preliminary AI-generated estimate. Final pricing will be determined by our professional team after a thorough site evaluation and may vary based on specific requirements, local building codes, material costs, and project complexity. Please schedule a consultation for an accurate, binding quote.

Please provide a helpful but conservative estimate that protects both the customer's expectations and the business's profitability.`;

    return prompt;
  }

  // Call LLM API for estimate generation
  async callLLMForEstimate(prompt) {
    try {
      // For demo purposes, we'll use a simplified approach
      // In production, this would call the actual LLM API
      if (!this.apiKey) {
        throw new Error('LLM API key not available');
      }

      // Dynamic import for axios to allow testing without installation
      const axios = require('axios');

      const response = await axios.post(this.aiApiUrl, {
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          do_sample: true
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      return response.data[0]?.generated_text || response.data.generated_text || '';

    } catch (error) {
      console.error('❌ LLM API call failed:', error.message);
      throw error;
    }
  }

  // Parse AI response into structured format
  parseAIEstimateResponse(aiResponse, cartItems) {
    try {
      // Extract sections from AI response
      const sections = this.extractResponseSections(aiResponse);

      const breakdown = this.parseBreakdownSection(sections.breakdown || '', cartItems);
      const totalRange = this.parseTotalRange(sections.totalRange || '');
      const explanation = sections.explanation || 'Estimate based on typical industry pricing for similar projects.';

      return {
        breakdown,
        totalEstimate: {
          low: totalRange.low || this.calculateFallbackTotal(cartItems) * 0.8,
          high: totalRange.high || this.calculateFallbackTotal(cartItems) * 1.2,
          currency: 'USD'
        },
        explanation,
        confidence: 'preliminary'
      };

    } catch (error) {
      console.error('❌ Error parsing AI response:', error);
      return this.generateFallbackEstimate(cartItems);
    }
  }

  // Extract sections from AI response
  extractResponseSections(response) {
    const sections = {};

    // Extract breakdown section
    const breakdownMatch = response.match(/PRELIMINARY ESTIMATE BREAKDOWN:(.*?)(?=TOTAL ESTIMATED RANGE:|$)/s);
    if (breakdownMatch) {
      sections.breakdown = breakdownMatch[1].trim();
    }

    // Extract total range
    const totalMatch = response.match(/TOTAL ESTIMATED RANGE:\s*\$?(\d+(?:,\d{3})*)\s*-\s*\$?(\d+(?:,\d{3})*)/);
    if (totalMatch) {
      sections.totalRange = `$${totalMatch[1]} - $${totalMatch[2]}`;
    }

    // Extract explanation
    const explanationMatch = response.match(/ESTIMATE EXPLANATION:(.*?)(?=IMPORTANT DISCLAIMER:|$)/s);
    if (explanationMatch) {
      sections.explanation = explanationMatch[1].trim();
    }

    return sections;
  }

  // Parse breakdown section into structured data
  parseBreakdownSection(breakdownText, cartItems) {
    const breakdown = [];

    cartItems.forEach(item => {
      // Try to find this service in the breakdown
      const servicePattern = new RegExp(`${item.serviceName}.*?\\$([\\d,]+)(?:\\s*-\\s*\\$([\\d,]+))?\\s*-\\s*(.+?)(?=\\n|$)`, 'i');
      const match = breakdownText.match(servicePattern);

      if (match) {
        const amount = parseInt(match[1].replace(/,/g, ''));
        const highAmount = match[2] ? parseInt(match[2].replace(/,/g, '')) : amount;
        const justification = match[3]?.trim() || 'Based on typical industry pricing';

        breakdown.push({
          serviceName: item.serviceName,
          estimate: {
            low: amount,
            high: highAmount,
            currency: 'USD'
          },
          justification
        });
      } else {
        // Fallback to basic calculation if AI didn't include this service
        const fallbackAmount = item.estimatedPrice || this.calculateServiceBasePrice(item);
        breakdown.push({
          serviceName: item.serviceName,
          estimate: {
            low: Math.round(fallbackAmount * 0.8),
            high: Math.round(fallbackAmount * 1.2),
            currency: 'USD'
          },
          justification: 'Estimated based on service type and provided details'
        });
      }
    });

    return breakdown;
  }

  // Parse total range from AI response
  parseTotalRange(rangeText) {
    const rangeMatch = rangeText.match(/\$?(\d+(?:,\d{3})*)\s*-\s*\$?(\d+(?:,\d{3})*)/);
    if (rangeMatch) {
      return {
        low: parseInt(rangeMatch[1].replace(/,/g, '')),
        high: parseInt(rangeMatch[2].replace(/,/g, ''))
      };
    }
    return {};
  }

  // Generate fallback estimate when AI is unavailable
  generateFallbackEstimate(cartItems) {
    const breakdown = cartItems.map(item => {
      const basePrice = this.calculateServiceBasePrice(item);
      const adjustedPrice = this.adjustPriceForDetails(basePrice, item.collectedDetails || {});

      return {
        serviceName: item.serviceName,
        estimate: {
          low: Math.round(adjustedPrice * 0.8),
          high: Math.round(adjustedPrice * 1.2),
          currency: 'USD'
        },
        justification: 'Estimated based on service type and provided details'
      };
    });

    const totalLow = breakdown.reduce((sum, item) => sum + item.estimate.low, 0);
    const totalHigh = breakdown.reduce((sum, item) => sum + item.estimate.high, 0);

    return {
      breakdown,
      totalEstimate: {
        low: totalLow,
        high: totalHigh,
        currency: 'USD'
      },
      explanation: 'This estimate is based on typical industry pricing for similar services. Actual costs may vary based on specific requirements and local market conditions.',
      confidence: 'basic',
      isAIGenerated: false,
      generatedAt: new Date().toISOString(),
      disclaimer: 'This is a preliminary estimate. Final pricing will be determined by our team after site evaluation and may vary based on specific requirements, local regulations, and material costs.'
    };
  }

  // Calculate base price for a service
  calculateServiceBasePrice(item) {
    const servicePricing = {
      'HVAC Services': 300,
      'Plumbing Services': 200,
      'Kitchen Remodeling': 25000,
      'Bathroom Remodeling': 15000,
      'Electrical Services': 250,
      'Roofing Services': 400,
      'Lawn Mowing': 100,
      'Tree Trimming': 300
    };

    return item.estimatedPrice || servicePricing[item.serviceName] || 200;
  }

  // Adjust price based on collected details
  adjustPriceForDetails(basePrice, details) {
    let adjustedPrice = basePrice;

    // Square footage adjustments
    if (details.square_footage) {
      const sqft = parseInt(details.square_footage.value || details.square_footage);
      if (sqft > 2000) {
        adjustedPrice *= 1.3;
      } else if (sqft > 1500) {
        adjustedPrice *= 1.2;
      } else if (sqft > 1000) {
        adjustedPrice *= 1.1;
      }
    }

    // Urgency adjustments
    if (details.urgency) {
      const urgencyValue = (details.urgency.value || details.urgency).toLowerCase();
      if (urgencyValue.includes('emergency') || urgencyValue.includes('urgent')) {
        adjustedPrice *= 1.4;
      }
    }

    // Size adjustments
    if (details.kitchen_size) {
      const size = (details.kitchen_size.value || details.kitchen_size).toLowerCase();
      if (size.includes('large')) {
        adjustedPrice *= 1.2;
      } else if (size.includes('small')) {
        adjustedPrice *= 0.8;
      }
    }

    return Math.round(adjustedPrice);
  }

  // Calculate fallback total
  calculateFallbackTotal(cartItems) {
    return cartItems.reduce((sum, item) => {
      const basePrice = this.calculateServiceBasePrice(item);
      return sum + this.adjustPriceForDetails(basePrice, item.collectedDetails || {});
    }, 0);
  }

  // Create comprehensive quote summary
  createQuoteSummary(cartItems, aiEstimate) {
    const serviceCount = cartItems.length;
    const totalLow = aiEstimate.totalEstimate.low;
    const totalHigh = aiEstimate.totalEstimate.high;

    // Create detailed breakdown text
    const breakdownText = aiEstimate.breakdown.map(item =>
      `• ${item.serviceName}: $${item.estimate.low.toLocaleString()} - $${item.estimate.high.toLocaleString()}`
    ).join('\n');

    // Create presentation text
    const presentation = `📋 **Your Quote Summary**

**Services Requested:** ${serviceCount} service${serviceCount !== 1 ? 's' : ''}

**Preliminary Estimate Breakdown:**
${breakdownText}

**Total Estimated Range:** $${totalLow.toLocaleString()} - $${totalHigh.toLocaleString()}

**${aiEstimate.explanation}**

⚠️ **Important:** ${aiEstimate.disclaimer}`;

    return {
      presentation,
      serviceCount,
      totalRange: { low: totalLow, high: totalHigh },
      breakdown: aiEstimate.breakdown,
      generatedAt: new Date().toISOString()
    };
  }

  // Check if lead data is incomplete
  isLeadDataIncomplete(leadData) {
    if (!leadData) return true;

    const requiredFields = ['name', 'email', 'phone'];
    return requiredFields.some(field => !leadData[field] || !leadData[field].trim());
  }

  // Handle lead capture process
  async handleLeadCapture(session, userResponse, chatSessionService) {
    try {
      const leadData = session.leadData || {};

      // Determine what information we're collecting
      if (!leadData.name) {
        leadData.name = userResponse.trim();
        await this.updateSessionLeadData(session, leadData, chatSessionService);

        return {
          response: "Thank you! What's the best email address to send your quote to?",
          nextAction: 'AWAIT_LEAD_EMAIL',
          leadProgress: 'name_collected'
        };

      } else if (!leadData.email) {
        const email = this.extractEmailFromResponse(userResponse);
        if (!email) {
          return {
            response: "I didn't catch a valid email address. Could you please provide your email again?",
            nextAction: 'AWAIT_LEAD_EMAIL',
            error: 'Invalid email format'
          };
        }

        leadData.email = email;
        await this.updateSessionLeadData(session, leadData, chatSessionService);

        return {
          response: "Perfect! And what's the best phone number to reach you at?",
          nextAction: 'AWAIT_LEAD_PHONE',
          leadProgress: 'email_collected'
        };

      } else if (!leadData.phone) {
        const phone = this.extractPhoneFromResponse(userResponse);
        if (!phone) {
          return {
            response: "I didn't catch a valid phone number. Could you please provide your phone number again?",
            nextAction: 'AWAIT_LEAD_PHONE',
            error: 'Invalid phone format'
          };
        }

        leadData.phone = phone;
        await this.updateSessionLeadData(session, leadData, chatSessionService);

        // Lead data is now complete, create quote request
        const pendingQuote = session.pendingQuoteData;
        const quoteRequest = await this.createQuoteRequest(session, pendingQuote.aiEstimate, pendingQuote.quoteSummary);

        if (quoteRequest.success) {
          await chatSessionService.updateSessionState(session.sessionId, 'QUOTE_COMPLETED');

          return {
            response: `🎉 Thank you ${leadData.name}! Your quote request has been submitted successfully!\n\n**Reference ID:** ${quoteRequest.quoteId}\n\nOur team will review your request and provide an official quote within 24 hours. You'll receive it at ${leadData.email}.\n\nIs there anything else I can help you with today?`,
            nextAction: 'QUOTE_COMPLETED',
            quoteRequest,
            quoteId: quoteRequest.quoteId,
            leadComplete: true
          };

        } else {
          return {
            response: "I'm sorry, there was an issue submitting your quote request. Please try again or contact us directly.",
            nextAction: 'ERROR_RECOVERY',
            error: quoteRequest.error
          };
        }
      }

    } catch (error) {
      console.error('❌ Error handling lead capture:', error);
      return {
        response: "I'm sorry, I encountered an issue while collecting your information. Could you please try again?",
        nextAction: 'ERROR_RECOVERY',
        error: error.message
      };
    }
  }

  // Update session lead data
  async updateSessionLeadData(session, leadData, chatSessionService) {
    await chatSessionService.updateSessionState(
      session.sessionId,
      session.state,
      null,
      { leadData }
    );
  }

  // Extract email from user response
  extractEmailFromResponse(response) {
    const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/;
    const match = response.match(emailPattern);
    return match ? match[1] : null;
  }

  // Extract phone from user response
  extractPhoneFromResponse(response) {
    // Remove all non-digit characters
    const digitsOnly = response.replace(/\D/g, '');

    // Check for valid US phone number (10 or 11 digits)
    if (digitsOnly.length === 10) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
      return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
    }

    return null;
  }

  // Create formal quote request record
  async createQuoteRequest(session, aiEstimate, quoteSummary) {
    try {
      const leadData = session.leadData;
      const cartItems = session.cartItems || [];

      // First, ensure we have a lead record
      const leadResult = await this.ensureLeadRecord(session.businessId, leadData);

      if (!leadResult.success) {
        throw new Error('Failed to create lead record');
      }

      // Create quote request
      const quoteRequestData = {
        business_id: session.businessId,
        lead_id: leadResult.leadId,
        request_type: 'ai-assisted-cart',
        cart_items: cartItems,
        ai_estimate: aiEstimate,
        quote_summary: quoteSummary,
        total_estimate: aiEstimate.totalEstimate.high, // Use high estimate for business planning
        status: 'pending',
        session_id: session.sessionId,
        created_at: new Date()
      };

      const result = await query(`
        INSERT INTO quote_requests (business_id, lead_id, request_type, cart_items, total_estimate, status, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at
      `, [
        quoteRequestData.business_id,
        quoteRequestData.lead_id,
        quoteRequestData.request_type,
        JSON.stringify(quoteRequestData.cart_items),
        quoteRequestData.total_estimate,
        quoteRequestData.status,
        JSON.stringify({
          ai_estimate: quoteRequestData.ai_estimate,
          quote_summary: quoteRequestData.quote_summary,
          session_id: quoteRequestData.session_id
        }),
        quoteRequestData.created_at
      ]);

      const quoteId = `Q${Date.now().toString().slice(-8)}-${result.rows[0].id.toString().slice(-4)}`;

      // Update lead status
      await query(`
        UPDATE leads
        SET status = 'quote-requested',
            notes = COALESCE(notes || ' | ', '') || 'AI-assisted quote request with ' || $1 || ' services. Estimated: $' || $2,
            updated_at = NOW()
        WHERE id = $3
      `, [cartItems.length, aiEstimate.totalEstimate.high, leadResult.leadId]);

      console.log(`✅ Quote request created: ${quoteId}`);

      return {
        success: true,
        quoteId,
        quoteRequestId: result.rows[0].id,
        leadId: leadResult.leadId,
        createdAt: result.rows[0].created_at
      };

    } catch (error) {
      console.error('❌ Error creating quote request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Ensure lead record exists
  async ensureLeadRecord(businessId, leadData) {
    try {
      // Check if lead already exists
      const existingLead = await query(`
        SELECT id FROM leads
        WHERE email = $1 AND business_id = $2
      `, [leadData.email, businessId]);

      if (existingLead.rows.length > 0) {
        // Update existing lead
        await query(`
          UPDATE leads
          SET name = $1, phone = $2, updated_at = NOW()
          WHERE id = $3
        `, [leadData.name, leadData.phone, existingLead.rows[0].id]);

        return {
          success: true,
          leadId: existingLead.rows[0].id,
          isNew: false
        };
      } else {
        // Create new lead
        const result = await query(`
          INSERT INTO leads (business_id, name, email, phone, source, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id
        `, [businessId, leadData.name, leadData.email, leadData.phone, 'ai-chat', 'new']);

        return {
          success: true,
          leadId: result.rows[0].id,
          isNew: true
        };
      }

    } catch (error) {
      console.error('❌ Error ensuring lead record:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = QuoteFinalizationService;