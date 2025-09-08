-- Migration to add CRM fields to the Chrome Extension database
-- This adds the necessary fields for CRM status tracking that don't persist after refresh

-- Add CRM tracking fields to the agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS crm_notes TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS crm_status VARCHAR(50) DEFAULT 'New',
ADD COLUMN IF NOT EXISTS last_contacted TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS texts_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS follow_up_priority VARCHAR(20) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS crm_data JSONB DEFAULT '{}';

-- Create index for CRM fields for better performance
CREATE INDEX IF NOT EXISTS idx_agents_crm_status ON agents(crm_status);
CREATE INDEX IF NOT EXISTS idx_agents_last_contacted ON agents(last_contacted);
CREATE INDEX IF NOT EXISTS idx_agents_follow_up_at ON agents(follow_up_at);

-- Update the agent_stats view to include CRM data
CREATE OR REPLACE VIEW agent_stats AS
SELECT 
    a.id,
    a.agent_id,
    a.name,
    a.company,
    COUNT(p.id) as total_properties,
    AVG(p.price) as avg_property_price,
    MIN(p.price) as min_property_price,
    MAX(p.price) as max_property_price,
    COUNT(DISTINCT p.city) as cities_served,
    a.last_scraped_at,
    a.created_at,
    -- CRM fields
    a.crm_status,
    a.crm_notes,
    a.last_contacted,
    a.follow_up_at,
    a.texts_sent,
    a.emails_sent,
    a.follow_up_priority
FROM agents a
LEFT JOIN properties p ON a.id = p.agent_id
GROUP BY a.id, a.agent_id, a.name, a.company, a.last_scraped_at, a.created_at,
         a.crm_status, a.crm_notes, a.last_contacted, a.follow_up_at, 
         a.texts_sent, a.emails_sent, a.follow_up_priority;

COMMENT ON COLUMN agents.crm_notes IS 'CRM notes for this agent/contact';
COMMENT ON COLUMN agents.crm_status IS 'Current CRM status (New, No Answer, Interested, etc.)';
COMMENT ON COLUMN agents.last_contacted IS 'Last time this contact was reached out to';
COMMENT ON COLUMN agents.follow_up_at IS 'When to follow up with this contact';
COMMENT ON COLUMN agents.texts_sent IS 'Number of text messages sent to this contact';
COMMENT ON COLUMN agents.emails_sent IS 'Number of emails sent to this contact';
COMMENT ON COLUMN agents.follow_up_priority IS 'Priority level for follow-up (low, normal, high)';
COMMENT ON COLUMN agents.crm_data IS 'Additional CRM data stored as JSON';
