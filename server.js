require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 전체 데이터
app.get('/api/trip', async (req, res) => {
  try {
    const [s, i, c, b] = await Promise.all([
      pool.query('SELECT data FROM settings WHERE id = 1'),
      pool.query("SELECT id, data FROM itinerary ORDER BY data->>'date', data->>'time'"),
      pool.query('SELECT id, data FROM checklist ORDER BY id'),
      pool.query('SELECT id, data FROM budget ORDER BY id'),
    ]);
    res.json({
      settings: s.rows[0]?.data ?? {},
      itinerary: i.rows.map(r => ({ id: r.id, ...r.data })),
      checklist: c.rows.map(r => ({ id: r.id, ...r.data })),
      budget: b.rows.map(r => ({ id: r.id, ...r.data })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// settings
app.put('/api/settings', async (req, res) => {
  try {
    const result = await pool.query(
      'INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = settings.data || $1 RETURNING data',
      [req.body]
    );
    res.json(result.rows[0].data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// itinerary
app.post('/api/itinerary', async (req, res) => {
  try {
    const id = uid();
    const { id: _, ...data } = req.body;
    await pool.query('INSERT INTO itinerary (id, data) VALUES ($1, $2)', [id, data]);
    res.json({ id, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/itinerary/:id', async (req, res) => {
  try {
    const { id: _, ...updates } = req.body;
    const result = await pool.query(
      'UPDATE itinerary SET data = data || $1 WHERE id = $2 RETURNING id, data',
      [updates, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not found' });
    const r = result.rows[0];
    res.json({ id: r.id, ...r.data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/itinerary/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM itinerary WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// checklist
app.post('/api/checklist', async (req, res) => {
  try {
    const id = uid();
    const { id: _, ...data } = req.body;
    await pool.query('INSERT INTO checklist (id, data) VALUES ($1, $2)', [id, { checked: false, ...data }]);
    res.json({ id, checked: false, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/checklist/:id', async (req, res) => {
  try {
    const { id: _, ...updates } = req.body;
    const result = await pool.query(
      'UPDATE checklist SET data = data || $1 WHERE id = $2 RETURNING id, data',
      [updates, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not found' });
    const r = result.rows[0];
    res.json({ id: r.id, ...r.data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/checklist/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM checklist WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// budget
app.post('/api/budget', async (req, res) => {
  try {
    const id = uid();
    const { id: _, ...data } = req.body;
    await pool.query('INSERT INTO budget (id, data) VALUES ($1, $2)', [id, { planned: null, actual: null, memo: '', ...data }]);
    res.json({ id, planned: null, actual: null, memo: '', ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/budget/:id', async (req, res) => {
  try {
    const { id: _, ...updates } = req.body;
    const result = await pool.query(
      'UPDATE budget SET data = data || $1 WHERE id = $2 RETURNING id, data',
      [updates, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'not found' });
    const r = result.rows[0];
    res.json({ id: r.id, ...r.data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/budget/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM budget WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n서버 실행 중: http://localhost:${PORT}`);

    const token = process.env.NGROK_AUTHTOKEN;
    if (!token) {
      console.log('\n[ngrok] .env 파일에 NGROK_AUTHTOKEN을 입력하면 공개 URL이 생성됩니다.\n');
      return;
    }

    try {
      const ngrok = require('@ngrok/ngrok');
      const opts = { addr: PORT, authtoken: token };
      if (process.env.NGROK_DOMAIN) opts.domain = process.env.NGROK_DOMAIN;
      const listener = await ngrok.forward(opts);
      console.log('\n========================================');
      console.log(`  공개 URL: ${listener.url()}`);
      console.log('  위 주소를 모바일에서 열어주세요!');
      console.log('========================================\n');
    } catch (e) {
      console.error('\n[ngrok 오류]', e.message, '\n');
    }
  });
}

module.exports = app;
