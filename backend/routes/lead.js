const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// Mock database fallback for demo purposes
const leads = [];

// Helper function to validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate phone number
function isValidPhone(phone) {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// POST /lead - Save lead information
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      projectType,
      budget,
      timeline,
      notes,
      businessId,
      messages
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: 'Name is required' 
      });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ 
        error: 'Valid email is required' 
      });
    }

    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ 
        error: 'Valid phone number is required' 
      });
    }

    if (!businessId) {
      return res.status(400).json({ 
        error: 'Business ID is required' 
      });
    }

    // Try to save to PostgreSQL database first
    let lead;
    try {
      const result = await query(`
        INSERT INTO leads (business_id, name, email, phone, address, project_type, budget, timeline, notes, status, source, conversation_history)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        businessId,
        name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        address ? address.trim() : null,
        projectType || null,
        budget || null,
        timeline || null,
        notes ? notes.trim() : null,
        'new',
        'chat-widget',
        JSON.stringify(messages || [])
      ]);
      
      lead = result.rows[0];
      
      // Convert database format to API format
      lead = {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        address: lead.address,
        projectType: lead.project_type,
        budget: lead.budget,
        timeline: lead.timeline,
        notes: lead.notes,
        businessId: lead.business_id,
        messages: lead.conversation_history,
        status: lead.status,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
        source: lead.source
      };
      
    } catch (dbError) {
      console.warn('Database save failed, using fallback:', dbError.message);
      
      // Fallback to mock database
      lead = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address ? address.trim() : null,
        projectType: projectType || null,
        budget: budget || null,
        timeline: timeline || null,
        notes: notes ? notes.trim() : null,
        businessId,
        messages: messages || [],
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'chat-widget'
      };
      
      // Save to mock database
      leads.push(lead);
    }

    // Log the lead creation
    console.log(`New lead created for business ${businessId}:`, {
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      projectType: lead.projectType,
      timestamp: lead.createdAt
    });

    // In production, you might want to:
    // 1. Send email notification to business owner
    // 2. Add to CRM system
    // 3. Trigger follow-up workflows
    // 4. Send confirmation email to customer

    res.status(201).json({
      success: true,
      leadId: lead.id,
      message: 'Lead information saved successfully',
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        projectType: lead.projectType,
        status: lead.status,
        createdAt: lead.createdAt
      }
    });

  } catch (error) {
    console.error('Lead creation error:', error);
    res.status(500).json({ 
      error: 'Failed to save lead information',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /lead - Get leads for a business (with pagination)
router.get('/', async (req, res) => {
  try {
    const { businessId, page = 1, limit = 50, status } = req.query;

    if (!businessId) {
      return res.status(400).json({ 
        error: 'Business ID is required' 
      });
    }

    let dbLeads = [];
    
    try {
      // Try to fetch from database first
      let dbQuery = 'SELECT * FROM leads WHERE business_id = $1';
      let queryParams = [businessId];
      
      if (status && status !== 'all') {
        dbQuery += ' AND status = $2';
        queryParams.push(status);
      }
      
      dbQuery += ' ORDER BY created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
      queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
      
      const result = await query(dbQuery, queryParams);
      
      // Convert database format to API format
      dbLeads = result.rows.map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        address: lead.address,
        projectType: lead.project_type,
        budget: lead.budget,
        timeline: lead.timeline,
        notes: lead.notes,
        businessId: lead.business_id,
        messages: lead.conversation_history,
        status: lead.status,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
        source: lead.source
      }));
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) FROM leads WHERE business_id = $1';
      let countParams = [businessId];
      
      if (status && status !== 'all') {
        countQuery += ' AND status = $2';
        countParams.push(status);
      }
      
      const countResult = await query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);
      
      res.json({
        success: true,
        leads: dbLeads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      });
      
    } catch (dbError) {
      console.warn('Database fetch failed, using fallback:', dbError.message);
      
      // Fallback to mock database
      let filteredLeads = leads.filter(lead => lead.businessId === businessId);

      // Filter by status if provided
      if (status && status !== 'all') {
        filteredLeads = filteredLeads.filter(lead => lead.status === status);
      }

      // Sort by creation date (newest first)
      filteredLeads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

      res.json({
        success: true,
        leads: paginatedLeads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredLeads.length,
          totalPages: Math.ceil(filteredLeads.length / parseInt(limit))
        }
      });
    }

  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve leads',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /lead/:id - Get specific lead
router.get('/:id', (req, res) => {
  try {
    const leadId = req.params.id;
    const lead = leads.find(l => l.id === leadId);

    if (!lead) {
      return res.status(404).json({ 
        error: 'Lead not found' 
      });
    }

    res.json({
      success: true,
      lead
    });

  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve lead',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PATCH /lead/:id - Update lead status
router.patch('/:id', async (req, res) => {
  try {
    const leadId = req.params.id;
    const { status, notes } = req.body;

    // Valid statuses
    const validStatuses = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    let updatedLead;

    try {
      // Try to update in database first
      let updateQuery = 'UPDATE leads SET ';
      let updateParams = [];
      let paramCounter = 1;
      
      if (status) {
        updateQuery += `status = $${paramCounter}, `;
        updateParams.push(status);
        paramCounter++;
      }
      
      if (notes !== undefined) {
        updateQuery += `notes = $${paramCounter}, `;
        updateParams.push(notes);
        paramCounter++;
      }
      
      updateQuery += `updated_at = NOW() WHERE id = $${paramCounter} RETURNING *`;
      updateParams.push(leadId);
      
      const result = await query(updateQuery, updateParams);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Lead not found' 
        });
      }
      
      const dbLead = result.rows[0];
      updatedLead = {
        id: dbLead.id,
        name: dbLead.name,
        email: dbLead.email,
        phone: dbLead.phone,
        address: dbLead.address,
        projectType: dbLead.project_type,
        budget: dbLead.budget,
        timeline: dbLead.timeline,
        notes: dbLead.notes,
        businessId: dbLead.business_id,
        messages: dbLead.conversation_history,
        status: dbLead.status,
        createdAt: dbLead.created_at,
        updatedAt: dbLead.updated_at,
        source: dbLead.source
      };
      
    } catch (dbError) {
      console.warn('Database update failed, using fallback:', dbError.message);
      
      // Fallback to mock database
      const leadIndex = leads.findIndex(l => l.id === leadId);
      if (leadIndex === -1) {
        return res.status(404).json({ 
          error: 'Lead not found' 
        });
      }

      // Update lead
      if (status) {
        leads[leadIndex].status = status;
      }
      if (notes !== undefined) {
        leads[leadIndex].notes = notes;
      }
      leads[leadIndex].updatedAt = new Date().toISOString();

      updatedLead = leads[leadIndex];
    }

    res.json({
      success: true,
      message: 'Lead updated successfully',
      lead: updatedLead
    });

  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ 
      error: 'Failed to update lead',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /lead/health - Health check for lead service
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Lead Service',
    totalLeads: leads.length,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
