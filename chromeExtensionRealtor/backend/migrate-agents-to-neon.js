const { Pool } = require('pg');

// Local database connection
const localPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'realtor_data',
  password: 'password',
  port: 5432,
});

// Neon database connection
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_vxG5r1kwtuPn@ep-wandering-leaf-adsf4rml-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  searchPath: ['public']
});

async function migrateAgents() {
  try {
    console.log('Starting agent migration...');
    
    // Get all agents from local database
    const localResult = await localPool.query('SELECT * FROM agents ORDER BY created_at');
    console.log(`Found ${localResult.rows.length} agents in local database`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const agent of localResult.rows) {
      try {
        // Map local agent fields to Neon schema
        const insertQuery = `
          INSERT INTO public.agents (
            agent_id, name, title, company, phone, email, address, website, bio,
            specializations, languages, experience_years, license_number, license_state,
            profile_image_url, realtor_url, social_media, ratings, certifications,
            service_areas, created_at, updated_at, last_scraped_at,
            crm_notes, crm_status, last_contacted, follow_up_at,
            texts_sent, emails_sent, follow_up_priority, crm_data
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19,
            $20, $21, $22, $23,
            $24, $25, $26, $27,
            $28, $29, $30, $31
          )
          ON CONFLICT (agent_id) DO UPDATE SET
            name = EXCLUDED.name,
            title = EXCLUDED.title,
            company = EXCLUDED.company,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            website = EXCLUDED.website,
            bio = EXCLUDED.bio,
            specializations = EXCLUDED.specializations,
            languages = EXCLUDED.languages,
            experience_years = EXCLUDED.experience_years,
            license_number = EXCLUDED.license_number,
            license_state = EXCLUDED.license_state,
            profile_image_url = EXCLUDED.profile_image_url,
            realtor_url = EXCLUDED.realtor_url,
            social_media = EXCLUDED.social_media,
            ratings = EXCLUDED.ratings,
            certifications = EXCLUDED.certifications,
            service_areas = EXCLUDED.service_areas,
            updated_at = NOW()
        `;
        
        const values = [
          agent.agent_id,
          agent.name,
          agent.title,
          agent.company,
          agent.phone,
          agent.email,
          agent.address,
          agent.website,
          agent.bio,
          agent.specializations,
          agent.languages,
          agent.experience_years,
          agent.license_number,
          agent.license_state,
          agent.profile_image_url,
          agent.realtor_url,
          agent.social_media,
          agent.ratings,
          agent.certifications,
          agent.service_areas || [], // Default empty array if null
          agent.created_at,
          agent.updated_at,
          agent.last_scraped_at,
          '', // crm_notes - default empty
          'New', // crm_status - default New
          null, // last_contacted
          null, // follow_up_at
          0, // texts_sent
          0, // emails_sent
          'normal', // follow_up_priority
          '{}' // crm_data - default empty JSON
        ];
        
        await neonPool.query(insertQuery, values);
        successCount++;
        
        if (successCount % 100 === 0) {
          console.log(`Migrated ${successCount} agents...`);
        }
        
      } catch (error) {
        console.error(`Error migrating agent ${agent.agent_id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`Migration complete! Success: ${successCount}, Errors: ${errorCount}`);
    
    // Verify count in Neon database
    const neonResult = await neonPool.query('SELECT COUNT(*) FROM public.agents');
    console.log(`Total agents in Neon database: ${neonResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

migrateAgents();
