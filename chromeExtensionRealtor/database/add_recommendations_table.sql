-- Add recommendations table to store testimonials/reviews
-- This adds the missing functionality for storing individual recommendations

CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author VARCHAR(255),
    date_text VARCHAR(100), -- Store as text since formats vary
    source VARCHAR(50) DEFAULT 'structured', -- structured, text_pattern, generic_page
    extraction_method VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recommendations_agent_id ON recommendations(agent_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_recommendations_updated_at 
    BEFORE UPDATE ON recommendations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE recommendations IS 'Stores individual testimonials/recommendations for real estate agents';
