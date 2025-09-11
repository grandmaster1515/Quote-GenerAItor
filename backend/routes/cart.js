const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// POST /cart/sync - Sync cart data with backend
router.post('/sync', async (req, res) => {
  try {
    const { sessionId, businessId, leadId, cartItems, totalEstimate, itemCount } = req.body;
    
    if (!businessId || !cartItems) {
      return res.status(400).json({ 
        error: 'Business ID and cart items are required' 
      });
    }

    // Insert or update cart session
    const cartResult = await query(`
      INSERT INTO cart_sessions (session_id, business_id, lead_id, cart_data, total_estimate, item_count, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (session_id) 
      DO UPDATE SET 
        cart_data = $4,
        total_estimate = $5,
        item_count = $6,
        updated_at = NOW()
      RETURNING id, session_id, created_at, updated_at
    `, [sessionId, businessId, leadId, JSON.stringify(cartItems), totalEstimate, itemCount]);

    res.json({
      success: true,
      cartSession: cartResult.rows[0],
      message: 'Cart synced successfully'
    });

  } catch (error) {
    console.error('Error syncing cart:', error);
    res.status(500).json({ 
      error: 'Failed to sync cart',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /cart/:sessionId - Get cart data by session ID
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await query(`
      SELECT session_id, business_id, lead_id, cart_data, total_estimate, item_count, created_at, updated_at
      FROM cart_sessions 
      WHERE session_id = $1
    `, [sessionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Cart session not found'
      });
    }

    const cartSession = result.rows[0];
    
    res.json({
      success: true,
      cartSession: {
        sessionId: cartSession.session_id,
        businessId: cartSession.business_id,
        leadId: cartSession.lead_id,
        cartItems: cartSession.cart_data,
        totalEstimate: cartSession.total_estimate,
        itemCount: cartSession.item_count,
        createdAt: cartSession.created_at,
        updatedAt: cartSession.updated_at
      }
    });

  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ 
      error: 'Failed to fetch cart',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /cart/:sessionId - Clear cart session
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await query(`
      DELETE FROM cart_sessions 
      WHERE session_id = $1
      RETURNING session_id
    `, [sessionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Cart session not found'
      });
    }

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ 
      error: 'Failed to clear cart',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /cart/quote-request - Submit cart as quote request
router.post('/quote-request', async (req, res) => {
  try {
    const { businessId, leadData, cartItems, totalEstimate, requestType } = req.body;
    
    if (!businessId || !leadData || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ 
        error: 'Business ID, lead data, and cart items are required' 
      });
    }

    // Create quote request record
    const quoteRequest = await query(`
      INSERT INTO quote_requests (business_id, lead_id, request_type, cart_items, total_estimate, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, created_at
    `, [businessId, leadData.leadId, requestType || 'service-cart', JSON.stringify(cartItems), totalEstimate, 'pending']);

    // Update lead with quote request
    await query(`
      UPDATE leads 
      SET status = 'quote-requested',
          notes = COALESCE(notes || ' | ', '') || 'Quote requested via service cart with ' || $1 || ' items',
          updated_at = NOW()
      WHERE email = $2 AND business_id = $3
    `, [cartItems.length, leadData.email, businessId]);

    res.json({
      success: true,
      quoteRequest: {
        id: quoteRequest.rows[0].id,
        createdAt: quoteRequest.rows[0].created_at,
        itemCount: cartItems.length,
        totalEstimate
      },
      message: 'Quote request submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting quote request:', error);
    res.status(500).json({ 
      error: 'Failed to submit quote request',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /cart/business/:businessId - Get all cart sessions for a business (admin view)
router.get('/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await query(`
      SELECT 
        cs.session_id,
        cs.lead_id,
        cs.cart_data,
        cs.total_estimate,
        cs.item_count,
        cs.created_at,
        cs.updated_at,
        l.name as lead_name,
        l.email as lead_email
      FROM cart_sessions cs
      LEFT JOIN leads l ON cs.lead_id = l.id
      WHERE cs.business_id = $1
      ORDER BY cs.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [businessId, limit, offset]);

    const cartSessions = result.rows.map(session => ({
      sessionId: session.session_id,
      leadId: session.lead_id,
      leadName: session.lead_name,
      leadEmail: session.lead_email,
      cartItems: session.cart_data,
      totalEstimate: session.total_estimate,
      itemCount: session.item_count,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    }));

    res.json({
      success: true,
      cartSessions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: cartSessions.length
      }
    });

  } catch (error) {
    console.error('Error fetching business cart sessions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch cart sessions',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;