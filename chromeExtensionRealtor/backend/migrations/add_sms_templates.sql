-- Migration to add SMS templates table to the Chrome Extension database

-- Create SMS templates table
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  category VARCHAR(100) DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100) DEFAULT 'system'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_templates_name ON sms_templates(name);
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);
CREATE INDEX IF NOT EXISTS idx_sms_templates_is_active ON sms_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_templates_created_at ON sms_templates(created_at);

-- Add comments for documentation
COMMENT ON TABLE sms_templates IS 'SMS message templates for the CRM system';
COMMENT ON COLUMN sms_templates.name IS 'Human-readable name for the template';
COMMENT ON COLUMN sms_templates.content IS 'The actual SMS message content with variable placeholders';
COMMENT ON COLUMN sms_templates.variables IS 'Array of variable names used in the template (e.g., firstName, company)';
COMMENT ON COLUMN sms_templates.category IS 'Template category for organization (e.g., marketing, follow_up, general)';
COMMENT ON COLUMN sms_templates.is_active IS 'Whether this template is active and available for use';
COMMENT ON COLUMN sms_templates.usage_count IS 'Number of times this template has been used';
COMMENT ON COLUMN sms_templates.created_by IS 'Who created this template (system, user, etc.)';

-- Insert default templates (only if they don't exist)
DO $$
BEGIN
  -- Check if we have any existing templates
  IF NOT EXISTS (SELECT 1 FROM sms_templates LIMIT 1) THEN
    INSERT INTO sms_templates (name, content, variables, category, created_by) VALUES
    (
      'AI Video Offer',
      'Hey {firstName}, it''s Joshua Willey. I help agents like you stand out with high-converting AI Listing Videos. Normally they''re $500, but I''m offering your first one for just $100 to show you the value. Are you cool with AI doing your listing videos',
      ARRAY['firstName'],
      'marketing',
      'system'
    ),
    (
      'Follow Up - General',
      'Hello {firstName}, I wanted to reach out about the opportunity we discussed. Are you still interested?',
      ARRAY['firstName'],
      'follow_up',
      'system'
    ),
    (
      'Follow Up - Information',
      'Hi {firstName}, thanks for your time earlier. I have some additional information that might interest you.',
      ARRAY['firstName'],
      'follow_up',
      'system'
    ),
    (
      'Check In - Questions',
      'Hello {firstName}, just checking in to see if you had any questions about our previous discussion.',
      ARRAY['firstName'],
      'check_in',
      'system'
    ),
    (
      'General Greeting',
      'Hi {firstName}, I hope you''re doing well. Do you have a few minutes to continue our conversation?',
      ARRAY['firstName'],
      'general',
      'system'
    );
    
    RAISE NOTICE 'Inserted % default SMS templates', (SELECT COUNT(*) FROM sms_templates WHERE created_by = 'system');
  ELSE
    RAISE NOTICE 'SMS templates already exist, skipping default inserts';
  END IF;
END $$;

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_sms_templates_updated_at ON sms_templates;
CREATE TRIGGER update_sms_templates_updated_at 
    BEFORE UPDATE ON sms_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
