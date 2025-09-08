const { Pool } = require('pg');

// Local database connection (adjust if needed)
const localPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'realtor_data',
  password: 'password',
  port: 5432,
});

// Neon database connection (same as existing agents migration)
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_vxG5r1kwtuPn@ep-wandering-leaf-adsf4rml-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function buildNeonAgentMap() {
  const { rows } = await neonPool.query('SELECT id, agent_id FROM public.agents');
  const map = new Map();
  for (const r of rows) map.set(r.agent_id, r.id);
  return map;
}

async function migrateProperties(neonAgentMap) {
  console.log('➡️ Migrating properties...');
  const sql = `
    SELECT p.*, a.agent_id AS realtor_agent_id
    FROM properties p
    JOIN agents a ON p.agent_id = a.id
    ORDER BY p.created_at
  `;
  const { rows } = await localPool.query(sql);
  console.log(`Found ${rows.length} properties in local DB`);

  let ok = 0, skip = 0, fail = 0;
  for (const row of rows) {
    try {
      const neonAgentId = neonAgentMap.get(row.realtor_agent_id);
      if (!neonAgentId) {
        skip++;
        if (skip <= 5) console.warn(`Skipping property (no Neon agent): local agent_id=${row.agent_id}, realtor_agent_id=${row.realtor_agent_id}`);
        continue;
      }

      const insert = `
        INSERT INTO public.properties (
          agent_id, property_id, address, city, state, zip_code,
          price, price_formatted, bedrooms, bathrooms, square_feet, lot_size,
          property_type, listing_status, listing_date, days_on_market, mls_number,
          description, features, image_urls, property_url, coordinates, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,
          $18,$19,$20,$21,$22::jsonb,$23,$24
        )
        ON CONFLICT (agent_id, property_id) DO UPDATE SET
          address=EXCLUDED.address,
          city=EXCLUDED.city,
          state=EXCLUDED.state,
          zip_code=EXCLUDED.zip_code,
          price=EXCLUDED.price,
          price_formatted=EXCLUDED.price_formatted,
          bedrooms=EXCLUDED.bedrooms,
          bathrooms=EXCLUDED.bathrooms,
          square_feet=EXCLUDED.square_feet,
          lot_size=EXCLUDED.lot_size,
          property_type=EXCLUDED.property_type,
          listing_status=EXCLUDED.listing_status,
          listing_date=EXCLUDED.listing_date,
          days_on_market=EXCLUDED.days_on_market,
          mls_number=EXCLUDED.mls_number,
          description=EXCLUDED.description,
          features=EXCLUDED.features,
          image_urls=EXCLUDED.image_urls,
          property_url=EXCLUDED.property_url,
          coordinates=EXCLUDED.coordinates,
          updated_at=NOW()
        RETURNING id
      `;

      const values = [
        neonAgentId,
        row.property_id || null,
        row.address || null,
        row.city || null,
        row.state || null,
        row.zip_code || null,
        row.price == null ? null : Number(row.price),
        row.price_formatted || null,
        row.bedrooms == null ? null : Number(row.bedrooms),
        row.bathrooms == null ? null : Number(row.bathrooms),
        row.square_feet == null ? null : Number(row.square_feet),
        row.lot_size || null,
        row.property_type || null,
        row.listing_status || null,
        row.listing_date || null,
        row.days_on_market == null ? null : Number(row.days_on_market),
        row.mls_number || null,
        row.description || null,
        Array.isArray(row.features) ? row.features : (row.features ? [row.features] : []),
        Array.isArray(row.image_urls) ? row.image_urls : (row.image_urls ? [row.image_urls] : []),
        row.property_url || null,
        row.coordinates ? JSON.stringify(row.coordinates) : JSON.stringify({}),
        row.created_at || new Date(),
        row.updated_at || new Date(),
      ];

      await neonPool.query(insert, values);
      ok++;
      if (ok % 200 === 0) console.log(`  • Migrated ${ok} properties...`);
    } catch (e) {
      fail++;
      if (fail <= 10) console.error('Property migrate error:', e.message);
    }
  }

  console.log(`Properties migration done. ok=${ok}, skip=${skip}, fail=${fail}`);
}

async function migrateRecommendations(neonAgentMap) {
  console.log('➡️ Migrating recommendations...');
  const sql = `
    SELECT r.*, a.agent_id AS realtor_agent_id
    FROM recommendations r
    JOIN agents a ON r.agent_id = a.id
    ORDER BY r.created_at
  `;
  const { rows } = await localPool.query(sql);
  console.log(`Found ${rows.length} recommendations in local DB`);

  let ok = 0, dup = 0, skip = 0, fail = 0;
  for (const row of rows) {
    try {
      const neonAgentId = neonAgentMap.get(row.realtor_agent_id);
      if (!neonAgentId) {
        skip++;
        if (skip <= 5) console.warn(`Skipping recommendation (no Neon agent): local agent_id=${row.agent_id}`);
        continue;
      }

      // Avoid obvious duplicates
      const { rows: exist } = await neonPool.query(
        `SELECT id FROM public.recommendations WHERE agent_id=$1 AND text=$2 AND COALESCE(author,'')=COALESCE($3,'') AND COALESCE(date_text,'')=COALESCE($4,'') LIMIT 1`,
        [neonAgentId, row.text, row.author || null, row.date_text || null]
      );
      if (exist.length > 0) { dup++; continue; }

      const insert = `
        INSERT INTO public.recommendations (
          agent_id, text, author, date_text, source, extraction_method, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id
      `;
      const values = [
        neonAgentId,
        row.text,
        row.author || null,
        row.date_text || null,
        row.source || 'structured',
        row.extraction_method || null,
        row.created_at || new Date(),
        row.updated_at || new Date(),
      ];
      await neonPool.query(insert, values);
      ok++;
      if (ok % 200 === 0) console.log(`  • Migrated ${ok} recommendations...`);
    } catch (e) {
      fail++;
      if (fail <= 10) console.error('Recommendation migrate error:', e.message);
    }
  }

  console.log(`Recommendations migration done. ok=${ok}, dup=${dup}, skip=${skip}, fail=${fail}`);
}

async function main() {
  try {
    console.log('Starting migration of properties and recommendations to Neon...');
    const neonAgentMap = await buildNeonAgentMap();
    await migrateProperties(neonAgentMap);
    await migrateRecommendations(neonAgentMap);

    // Report totals
    const [{ rows: propsCount }, { rows: recsCount }] = await Promise.all([
      neonPool.query('SELECT COUNT(*) FROM public.properties'),
      neonPool.query('SELECT COUNT(*) FROM public.recommendations'),
    ]);
    console.log(`Neon totals => properties: ${propsCount[0].count}, recommendations: ${recsCount[0].count}`);
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

if (require.main === module) {
  main();
}
