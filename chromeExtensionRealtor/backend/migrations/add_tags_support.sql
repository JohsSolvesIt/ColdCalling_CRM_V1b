-- Migration: Add tags column to agents table
-- This migration adds tagging support to the Chrome Extension Realtor Database

-- Add tags column to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Create index for better performance on tag searches
CREATE INDEX IF NOT EXISTS idx_agents_tags ON agents USING GIN (tags);

-- Create index for tag searches with specific operators
CREATE INDEX IF NOT EXISTS idx_agents_tags_ops ON agents USING GIN (tags jsonb_path_ops);

-- Add comment to the tags column
COMMENT ON COLUMN agents.tags IS 'JSON array of tags for categorizing and organizing agents';

-- Update existing agents to have empty tags array if null
UPDATE agents 
SET tags = '[]'::jsonb 
WHERE tags IS NULL;

-- Sample data migration (uncomment if you want to add sample tags)
/*
-- Add sample tags to existing agents based on their data
UPDATE agents 
SET tags = CASE 
  WHEN company ILIKE '%luxury%' OR bio ILIKE '%luxury%' THEN '["luxury"]'::jsonb
  WHEN company ILIKE '%remax%' THEN '["remax", "franchise"]'::jsonb
  WHEN company ILIKE '%coldwell%' THEN '["coldwell-banker", "franchise"]'::jsonb
  WHEN company ILIKE '%keller%' THEN '["keller-williams", "franchise"]'::jsonb
  WHEN experience_years > 10 THEN '["experienced"]'::jsonb
  WHEN experience_years > 5 THEN '["mid-level"]'::jsonb
  ELSE '["new-agent"]'::jsonb
END
WHERE tags = '[]'::jsonb;
*/

-- Verify the migration
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_agents,
  COUNT(*) FILTER (WHERE tags IS NOT NULL) as agents_with_tags_column,
  COUNT(*) FILTER (WHERE jsonb_array_length(tags) > 0) as agents_with_actual_tags
FROM agents;

-- Show sample of agents with their tags
SELECT 
  name, 
  company, 
  tags,
  jsonb_array_length(tags) as tag_count
FROM agents 
WHERE jsonb_array_length(tags) > 0
LIMIT 5;
