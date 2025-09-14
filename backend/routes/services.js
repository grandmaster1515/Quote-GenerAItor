const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// GET /services/:businessId - Get all services for a business
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    if (!businessId) {
      return res.status(400).json({ 
        error: 'Business ID is required' 
      });
    }

    const result = await query(`
      SELECT id, name, description, pricing_info, required_info, is_active, display_order, created_at, updated_at
      FROM services
      WHERE business_id = $1 AND is_active = true
      ORDER BY display_order ASC, name ASC
    `, [businessId]);

    res.json({
      success: true,
      services: result.rows
    });

  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ 
      error: 'Failed to fetch services',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /services/:businessId - Create a new service
router.post('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { name, description, pricing_info, required_info, display_order } = req.body;
    
    if (!businessId || !name) {
      return res.status(400).json({ 
        error: 'Business ID and service name are required' 
      });
    }

    // Check if service name already exists for this business
    const existingService = await query(`
      SELECT id FROM services 
      WHERE business_id = $1 AND LOWER(name) = LOWER($2) AND is_active = true
    `, [businessId, name]);

    if (existingService.rows.length > 0) {
      return res.status(400).json({
        error: 'Service name already exists for this business'
      });
    }

    // Get the next display order if not provided
    let finalDisplayOrder = display_order;
    if (!finalDisplayOrder) {
      const maxOrderResult = await query(`
        SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
        FROM services 
        WHERE business_id = $1
      `, [businessId]);
      finalDisplayOrder = maxOrderResult.rows[0].next_order;
    }

    // Validate and prepare required_info
    let processedRequiredInfo = [];
    if (required_info && Array.isArray(required_info)) {
      processedRequiredInfo = required_info.filter(req => req.key && req.prompt);
    }

    const result = await query(`
      INSERT INTO services (business_id, name, description, pricing_info, required_info, display_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, description, pricing_info, required_info, is_active, display_order, created_at, updated_at
    `, [businessId, name, description, pricing_info, JSON.stringify(processedRequiredInfo), finalDisplayOrder]);

    res.status(201).json({
      success: true,
      service: result.rows[0],
      message: 'Service created successfully'
    });

  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ 
      error: 'Failed to create service',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /services/:businessId/:serviceId - Update a service
router.put('/:businessId/:serviceId', async (req, res) => {
  try {
    const { businessId, serviceId } = req.params;
    const { name, description, pricing_info, required_info, display_order, is_active } = req.body;
    
    if (!businessId || !serviceId) {
      return res.status(400).json({ 
        error: 'Business ID and Service ID are required' 
      });
    }

    // Check if service exists and belongs to business
    const existingService = await query(`
      SELECT id FROM services 
      WHERE id = $1 AND business_id = $2
    `, [serviceId, businessId]);

    if (existingService.rows.length === 0) {
      return res.status(404).json({
        error: 'Service not found'
      });
    }

    // If name is being updated, check for duplicates
    if (name) {
      const duplicateCheck = await query(`
        SELECT id FROM services 
        WHERE business_id = $1 AND LOWER(name) = LOWER($2) AND id != $3 AND is_active = true
      `, [businessId, name, serviceId]);

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'Service name already exists for this business'
        });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }
    if (pricing_info !== undefined) {
      updateFields.push(`pricing_info = $${paramCount++}`);
      updateValues.push(pricing_info);
    }
    if (required_info !== undefined) {
      // Validate and prepare required_info
      let processedRequiredInfo = [];
      if (Array.isArray(required_info)) {
        processedRequiredInfo = required_info.filter(req => req.key && req.prompt);
      }
      updateFields.push(`required_info = $${paramCount++}`);
      updateValues.push(JSON.stringify(processedRequiredInfo));
    }
    if (display_order !== undefined) {
      updateFields.push(`display_order = $${paramCount++}`);
      updateValues.push(display_order);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      updateValues.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      });
    }

    // Add WHERE clause parameters
    updateValues.push(serviceId, businessId);

    const result = await query(`
      UPDATE services
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount++} AND business_id = $${paramCount++}
      RETURNING id, name, description, pricing_info, required_info, is_active, display_order, created_at, updated_at
    `, updateValues);

    res.json({
      success: true,
      service: result.rows[0],
      message: 'Service updated successfully'
    });

  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ 
      error: 'Failed to update service',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /services/:businessId/:serviceId - Delete (deactivate) a service
router.delete('/:businessId/:serviceId', async (req, res) => {
  try {
    const { businessId, serviceId } = req.params;
    
    if (!businessId || !serviceId) {
      return res.status(400).json({ 
        error: 'Business ID and Service ID are required' 
      });
    }

    // Check if service exists and belongs to business
    const existingService = await query(`
      SELECT id FROM services 
      WHERE id = $1 AND business_id = $2
    `, [serviceId, businessId]);

    if (existingService.rows.length === 0) {
      return res.status(404).json({
        error: 'Service not found'
      });
    }

    // Soft delete by setting is_active to false
    await query(`
      UPDATE services 
      SET is_active = false
      WHERE id = $1 AND business_id = $2
    `, [serviceId, businessId]);

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ 
      error: 'Failed to delete service',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /services/:businessId/reorder - Reorder services
router.post('/:businessId/reorder', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { serviceIds } = req.body; // Array of service IDs in new order
    
    if (!businessId || !Array.isArray(serviceIds)) {
      return res.status(400).json({ 
        error: 'Business ID and array of service IDs are required' 
      });
    }

    // Update display_order for each service
    const promises = serviceIds.map((serviceId, index) => {
      return query(`
        UPDATE services 
        SET display_order = $1
        WHERE id = $2 AND business_id = $3
      `, [index + 1, serviceId, businessId]);
    });

    await Promise.all(promises);

    // Fetch updated services
    const result = await query(`
      SELECT id, name, description, pricing_info, required_info, is_active, display_order, created_at, updated_at
      FROM services
      WHERE business_id = $1 AND is_active = true
      ORDER BY display_order ASC
    `, [businessId]);

    res.json({
      success: true,
      services: result.rows,
      message: 'Services reordered successfully'
    });

  } catch (error) {
    console.error('Error reordering services:', error);
    res.status(500).json({ 
      error: 'Failed to reorder services',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /services/:businessId/health - Health check for services
router.get('/:businessId/health', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const result = await query(`
      SELECT COUNT(*) as total_services,
             COUNT(CASE WHEN is_active = true THEN 1 END) as active_services
      FROM services 
      WHERE business_id = $1
    `, [businessId]);

    res.json({
      status: 'OK',
      businessId,
      timestamp: new Date().toISOString(),
      ...result.rows[0]
    });

  } catch (error) {
    console.error('Error in services health check:', error);
    res.status(500).json({ 
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;