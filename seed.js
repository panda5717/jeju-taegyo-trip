require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const trip = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'trip.json'), 'utf8'));

  await pool.query('INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1', [trip.settings]);
  console.log('✓ settings');

  for (const item of trip.itinerary) {
    const { id, ...data } = item;
    await pool.query('INSERT INTO itinerary (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2', [id, data]);
  }
  console.log(`✓ itinerary (${trip.itinerary.length}개)`);

  for (const item of trip.checklist) {
    const { id, ...data } = item;
    await pool.query('INSERT INTO checklist (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2', [id, data]);
  }
  console.log(`✓ checklist (${trip.checklist.length}개)`);

  for (const item of trip.budget) {
    const { id, ...data } = item;
    await pool.query('INSERT INTO budget (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2', [id, data]);
  }
  console.log(`✓ budget (${trip.budget.length}개)`);

  console.log('\n데이터 마이그레이션 완료!');
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
