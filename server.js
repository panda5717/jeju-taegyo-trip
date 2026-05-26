require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 전체 데이터
app.get('/api/trip', async (req, res) => {
  try {
    const [s, i, c, b] = await Promise.all([
      supabase.from('settings').select('data').eq('id', 1).single(),
      supabase.from('itinerary').select('id, data').order('data->date').order('data->time'),
      supabase.from('checklist').select('id, data').order('id'),
      supabase.from('budget').select('id, data').order('id'),
    ]);
    if (s.error && s.error.code !== 'PGRST116') throw s.error;
    if (i.error) throw i.error;
    if (c.error) throw c.error;
    if (b.error) throw b.error;
    res.json({
      settings: s.data?.data ?? {},
      itinerary: (i.data || []).map(r => ({ id: r.id, ...r.data })),
      checklist: (c.data || []).map(r => ({ id: r.id, ...r.data })),
      budget: (b.data || []).map(r => ({ id: r.id, ...r.data })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// settings
app.put('/api/settings', async (req, res) => {
  try {
    const { data: existing } = await supabase.from('settings').select('data').eq('id', 1).single();
    const merged = { ...(existing?.data ?? {}), ...req.body };
    const { data, error } = await supabase.from('settings').upsert({ id: 1, data: merged }).select('data').single();
    if (error) throw error;
    res.json(data.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// itinerary
app.post('/api/itinerary', async (req, res) => {
  try {
    const id = uid();
    const { id: _, ...data } = req.body;
    const { error } = await supabase.from('itinerary').insert({ id, data });
    if (error) throw error;
    res.json({ id, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/itinerary/:id', async (req, res) => {
  try {
    const { id: _, ...updates } = req.body;
    const { data: existing, error: fetchErr } = await supabase.from('itinerary').select('data').eq('id', req.params.id).single();
    if (fetchErr) return res.status(404).json({ error: 'not found' });
    const merged = { ...existing.data, ...updates };
    const { error } = await supabase.from('itinerary').update({ data: merged }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ id: req.params.id, ...merged });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/itinerary/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('itinerary').delete().eq('id', req.params.id);
    if (error) throw error;
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
    const { error } = await supabase.from('checklist').insert({ id, data: { checked: false, ...data } });
    if (error) throw error;
    res.json({ id, checked: false, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/checklist/:id', async (req, res) => {
  try {
    const { id: _, ...updates } = req.body;
    const { data: existing, error: fetchErr } = await supabase.from('checklist').select('data').eq('id', req.params.id).single();
    if (fetchErr) return res.status(404).json({ error: 'not found' });
    const merged = { ...existing.data, ...updates };
    const { error } = await supabase.from('checklist').update({ data: merged }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ id: req.params.id, ...merged });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/checklist/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('checklist').delete().eq('id', req.params.id);
    if (error) throw error;
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
    const { error } = await supabase.from('budget').insert({ id, data: { planned: null, actual: null, memo: '', ...data } });
    if (error) throw error;
    res.json({ id, planned: null, actual: null, memo: '', ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/budget/:id', async (req, res) => {
  try {
    const { id: _, ...updates } = req.body;
    const { data: existing, error: fetchErr } = await supabase.from('budget').select('data').eq('id', req.params.id).single();
    if (fetchErr) return res.status(404).json({ error: 'not found' });
    const merged = { ...existing.data, ...updates };
    const { error } = await supabase.from('budget').update({ data: merged }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ id: req.params.id, ...merged });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/budget/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('budget').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n서버 실행 중: http://localhost:${PORT}`);
  });
}

module.exports = app;
