-- Rollback: Remove tags column from agents table
-- This rollback removes the tagging support from the Chrome Extension Realtor Database

-- Drop indexes first
DROP INDEX IF EXISTS idx_agents_tags_ops;
DROP INDEX IF EXISTS idx_agents_tags;

-- Remove the tags column
ALTER TABLE agents DROP COLUMN IF EXISTS tags;

-- Verify the rollback
SELECT 
  'Rollback completed successfully' as status,
  COUNT(*) as total_agents
FROM agents;

-- Check that tags column is gone
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agents' AND column_name = 'tags';
