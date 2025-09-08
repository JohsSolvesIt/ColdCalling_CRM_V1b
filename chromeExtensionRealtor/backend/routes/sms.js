const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const logger = require('../utils/logger');

// Get all SMS templates
router.get('/sms/templates', async (req, res) => {
  try {
    logger.info('Fetching SMS templates');
    
    const query = `
      SELECT id, name, content, variables, category, is_active, usage_count, 
             created_at, updated_at, created_by
      FROM sms_templates 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      templates: result.rows
    });
    
  } catch (error) {
    logger.error('Error fetching SMS templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS templates',
      message: error.message
    });
  }
});

// Add new SMS template
router.post('/sms/templates', async (req, res) => {
  try {
    const { name, content, variables = [], category = 'general', created_by = 'user' } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name and content are required'
      });
    }
    
    logger.info(`Adding new SMS template: ${name}`);
    
    const query = `
      INSERT INTO sms_templates (name, content, variables, category, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, content, variables, category, is_active, usage_count, 
                created_at, updated_at, created_by
    `;
    
    const result = await db.query(query, [name, content, variables, category, created_by]);
    
    res.status(201).json({
      success: true,
      template: result.rows[0]
    });
    
  } catch (error) {
    logger.error('Error adding SMS template:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Template with this name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to add SMS template',
      message: error.message
    });
  }
});

// Update SMS template
router.put('/sms/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, variables, category } = req.body;
    
    if (!name && !content && !variables && !category) {
      return res.status(400).json({
        success: false,
        error: 'At least one field must be provided for update'
      });
    }
    
    logger.info(`Updating SMS template: ${id}`);
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }
    
    if (content) {
      updateFields.push(`content = $${paramIndex++}`);
      updateValues.push(content);
    }
    
    if (variables) {
      updateFields.push(`variables = $${paramIndex++}`);
      updateValues.push(variables);
    }
    
    if (category) {
      updateFields.push(`category = $${paramIndex++}`);
      updateValues.push(category);
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id); // Add ID as last parameter
    
    const query = `
      UPDATE sms_templates 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND is_active = true
      RETURNING id, name, content, variables, category, is_active, usage_count, 
                created_at, updated_at, created_by
    `;
    
    const result = await db.query(query, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found or already deleted'
      });
    }
    
    res.json({
      success: true,
      template: result.rows[0]
    });
    
  } catch (error) {
    logger.error('Error updating SMS template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update SMS template',
      message: error.message
    });
  }
});

// Delete SMS template (soft delete)
router.delete('/sms/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Deleting SMS template: ${id}`);
    
    const query = `
      UPDATE sms_templates 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND is_active = true
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found or already deleted'
      });
    }
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
    
  } catch (error) {
    logger.error('Error deleting SMS template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete SMS template',
      message: error.message
    });
  }
});

// Get template by ID
router.get('/sms/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Fetching SMS template: ${id}`);
    
    const query = `
      SELECT id, name, content, variables, category, is_active, usage_count, 
             created_at, updated_at, created_by
      FROM sms_templates 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      template: result.rows[0]
    });
    
  } catch (error) {
    logger.error('Error fetching SMS template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS template',
      message: error.message
    });
  }
});

// Increment usage count for a template
router.post('/sms/templates/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      UPDATE sms_templates 
      SET usage_count = usage_count + 1, updated_at = NOW()
      WHERE id = $1 AND is_active = true
      RETURNING usage_count
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      usage_count: result.rows[0].usage_count
    });
    
  } catch (error) {
    logger.error('Error updating template usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template usage',
      message: error.message
    });
  }
});

module.exports = router;
