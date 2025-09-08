-- PostgreSQL Database Schema for Realtor Data Extractor
-- Creates tables for agents, properties, and extraction logs

-- Create database (run this manually first)
-- CREATE DATABASE realtor_data;

-- Connect to the database and run the following:

-- Enable UUID extension for unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(100) UNIQUE, -- Realtor.com agent ID from URL
    name VARCHAR(255),
    title VARCHAR(255),
    company VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    website VARCHAR(500),
    bio TEXT,
    specializations TEXT[],
    languages TEXT[],
    experience_years INTEGER,
    license_number VARCHAR(100),
    license_state VARCHAR(10),
    profile_image_url TEXT,
    realtor_url TEXT,
    social_media JSONB, -- Store social media links as JSON
    ratings JSONB, -- Store ratings data as JSON
    certifications TEXT[],
    service_areas TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    property_id VARCHAR(100), -- Realtor.com property ID
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(10),
    zip_code VARCHAR(20),
    price DECIMAL(12,2),
    price_formatted VARCHAR(50),
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    lot_size VARCHAR(50),
    property_type VARCHAR(100),
    listing_status VARCHAR(50),
    listing_date DATE,
    days_on_market INTEGER,
    mls_number VARCHAR(100),
    description TEXT,
    features TEXT[],
    image_urls TEXT[],
    property_url TEXT,
    coordinates JSONB, -- Store lat/lng as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, property_id) -- Prevent duplicate property entries per agent
);

-- Create extraction_logs table to track all scraping activities
CREATE TABLE IF NOT EXISTS extraction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    page_type VARCHAR(50),
    extraction_status VARCHAR(20) DEFAULT 'success', -- success, error, partial
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    properties_found INTEGER DEFAULT 0,
    error_message TEXT,
    extraction_data JSONB, -- Store the full extracted data as JSON
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recommendations table to store testimonials/reviews
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
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company);
CREATE INDEX IF NOT EXISTS idx_agents_last_scraped ON agents(last_scraped_at);

CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_property_id ON properties(property_id);
CREATE INDEX IF NOT EXISTS idx_properties_city_state ON properties(city, state);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_listing_status ON properties(listing_status);

CREATE INDEX IF NOT EXISTS idx_extraction_logs_url ON extraction_logs(url);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_created_at ON extraction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_status ON extraction_logs(extraction_status);

CREATE INDEX IF NOT EXISTS idx_recommendations_agent_id ON recommendations(agent_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON agents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON properties 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at 
    BEFORE UPDATE ON recommendations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for agent statistics
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
    a.created_at
FROM agents a
LEFT JOIN properties p ON a.id = p.agent_id
GROUP BY a.id, a.agent_id, a.name, a.company, a.last_scraped_at, a.created_at;

-- Create view for recent extractions
CREATE OR REPLACE VIEW recent_extractions AS
SELECT 
    el.id,
    el.url,
    el.page_type,
    el.extraction_status,
    a.name as agent_name,
    a.company as agent_company,
    el.properties_found,
    el.created_at
FROM extraction_logs el
LEFT JOIN agents a ON el.agent_id = a.id
ORDER BY el.created_at DESC;

COMMENT ON TABLE agents IS 'Stores real estate agent information extracted from Realtor.com';
COMMENT ON TABLE properties IS 'Stores property listings associated with agents';
COMMENT ON TABLE extraction_logs IS 'Logs all data extraction activities for monitoring and debugging';
COMMENT ON TABLE recommendations IS 'Stores individual testimonials/recommendations for real estate agents';
COMMENT ON VIEW agent_stats IS 'Provides statistics for each agent including property counts and pricing';
COMMENT ON VIEW recent_extractions IS 'Shows recent data extraction activities';
