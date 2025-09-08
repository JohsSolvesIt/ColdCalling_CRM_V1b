-- Property Duplication Diagnostic Queries
-- Run these queries against the Chrome Extension database to identify duplicates

-- ==================================================
-- QUERY 1: Cross-Agent Property Duplicates
-- Properties that appear across multiple agents
-- ==================================================

    SELECT 
      property_id, 
      address, 
      price,
      COUNT(DISTINCT agent_id) as agent_count,
      ARRAY_AGG(DISTINCT agent_id) as agents,
      ARRAY_AGG(DISTINCT (SELECT name FROM agents WHERE agents.id = properties.agent_id)) as agent_names
    FROM properties 
    WHERE property_id IS NOT NULL 
    GROUP BY property_id, address, price
    HAVING COUNT(DISTINCT agent_id) > 1
    ORDER BY agent_count DESC;
  

-- ==================================================
-- QUERY 2: Address-Based Duplicates  
-- Same address with different property IDs
-- ==================================================

    SELECT 
      address,
      COUNT(*) as occurrence_count,
      ARRAY_AGG(DISTINCT property_id) as property_ids,
      ARRAY_AGG(DISTINCT agent_id) as agent_ids
    FROM properties 
    WHERE address IS NOT NULL AND address != ''
    GROUP BY LOWER(TRIM(address))
    HAVING COUNT(*) > 1
    ORDER BY occurrence_count DESC;
  

-- ==================================================
-- QUERY 3: BJ Ward Specific Analysis
-- Check BJ Ward's properties for duplicates
-- ==================================================

    SELECT 
      p.property_id,
      p.address,
      p.price,
      a.name as agent_name,
      COUNT(*) OVER (PARTITION BY p.property_id) as duplicate_count
    FROM properties p
    JOIN agents a ON a.id = p.agent_id
    WHERE a.name ILIKE '%BJ Ward%' OR a.name ILIKE '%Ward%'
    ORDER BY p.property_id, p.address;
  

-- ==================================================
-- QUERY 4: Characteristic-Based Duplicates
-- Properties with identical characteristics
-- ==================================================

    SELECT 
      address,
      price,
      bedrooms,
      bathrooms,
      COUNT(*) as duplicate_count,
      ARRAY_AGG(DISTINCT agent_id) as agent_ids,
      ARRAY_AGG(DISTINCT property_id) as property_ids
    FROM properties 
    WHERE address IS NOT NULL 
      AND price IS NOT NULL 
      AND bedrooms IS NOT NULL 
      AND bathrooms IS NOT NULL
    GROUP BY address, price, bedrooms, bathrooms
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC;
  

-- ==================================================
-- QUERY 5: Property Distribution Statistics
-- Overall statistics about property distribution
-- ==================================================

    SELECT 
      COUNT(DISTINCT property_id) as unique_property_ids,
      COUNT(*) as total_property_records,
      COUNT(DISTINCT agent_id) as agents_with_properties,
      AVG(property_count) as avg_properties_per_agent,
      MAX(property_count) as max_properties_per_agent
    FROM (
      SELECT agent_id, COUNT(*) as property_count
      FROM properties 
      GROUP BY agent_id
    ) agent_counts;
  

-- ==================================================
-- QUERY 6: High Property Count Agents
-- Agents with unusually high property counts
-- ==================================================

    SELECT 
      a.name,
      a.company,
      COUNT(p.id) as property_count,
      COUNT(DISTINCT p.property_id) as unique_property_ids,
      COUNT(DISTINCT p.address) as unique_addresses
    FROM agents a
    LEFT JOIN properties p ON a.id = p.agent_id
    GROUP BY a.id, a.name, a.company
    HAVING COUNT(p.id) > 20  -- Agents with more than 20 properties
    ORDER BY property_count DESC;
  

-- ==================================================
-- CLEANUP QUERIES (USE WITH CAUTION)
-- ==================================================

-- Preview duplicate properties before deletion
-- (Run this first to see what would be deleted)
SELECT 
  p1.id as keep_id,
  p2.id as delete_id,
  p1.property_id,
  p1.address,
  a1.name as agent1,
  a2.name as agent2
FROM properties p1
JOIN properties p2 ON p1.property_id = p2.property_id AND p1.id < p2.id
JOIN agents a1 ON p1.agent_id = a1.id
JOIN agents a2 ON p2.agent_id = a2.id
WHERE p1.property_id IS NOT NULL;

-- DANGEROUS: Delete duplicate properties (keep oldest record)
-- DELETE FROM properties 
-- WHERE id IN (
--   SELECT p2.id 
--   FROM properties p1
--   JOIN properties p2 ON p1.property_id = p2.property_id AND p1.id < p2.id
--   WHERE p1.property_id IS NOT NULL
-- );
