const express = require('express');
const router = express.Router();

// Mock database for demo purposes
// In production, this would use PostgreSQL
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

    // Create lead object
    const lead = {
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

    // Save to mock database (in production, save to PostgreSQL)
    leads.push(lead);

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
router.get('/', (req, res) => {
  try {
    const { businessId, page = 1, limit = 10, status } = req.query;

    if (!businessId) {
      return res.status(400).json({ 
        error: 'Business ID is required' 
      });
    }

    // Filter leads by business ID
    let filteredLeads = leads.filter(lead => lead.businessId === businessId);

    // Filter by status if provided
    if (status) {
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
router.patch('/:id', (req, res) => {
  try {
    const leadId = req.params.id;
    const { status, notes } = req.body;

    const leadIndex = leads.findIndex(l => l.id === leadId);
    if (leadIndex === -1) {
      return res.status(404).json({ 
        error: 'Lead not found' 
      });
    }

    // Valid statuses
    const validStatuses = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
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

    res.json({
      success: true,
      message: 'Lead updated successfully',
      lead: leads[leadIndex]
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
