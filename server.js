require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'data', 'trip.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 전체 데이터
app.get('/api/trip', (req, res) => {
  res.json(readData());
});

// settings
app.put('/api/settings', (req, res) => {
  const data = readData();
  data.settings = { ...data.settings, ...req.body };
  writeData(data);
  res.json(data.settings);
});

// itinerary
app.post('/api/itinerary', (req, res) => {
  const data = readData();
  const item = { id: uid(), ...req.body };
  data.itinerary.push(item);
  writeData(data);
  res.json(item);
});

app.put('/api/itinerary/:id', (req, res) => {
  const data = readData();
  const idx = data.itinerary.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  data.itinerary[idx] = { ...data.itinerary[idx], ...req.body };
  writeData(data);
  res.json(data.itinerary[idx]);
});

app.delete('/api/itinerary/:id', (req, res) => {
  const data = readData();
  data.itinerary = data.itinerary.filter(i => i.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

// checklist
app.post('/api/checklist', (req, res) => {
  const data = readData();
  const item = { id: uid(), checked: false, ...req.body };
  data.checklist.push(item);
  writeData(data);
  res.json(item);
});

app.put('/api/checklist/:id', (req, res) => {
  const data = readData();
  const idx = data.checklist.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  data.checklist[idx] = { ...data.checklist[idx], ...req.body };
  writeData(data);
  res.json(data.checklist[idx]);
});

app.delete('/api/checklist/:id', (req, res) => {
  const data = readData();
  data.checklist = data.checklist.filter(i => i.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

// budget
app.post('/api/budget', (req, res) => {
  const data = readData();
  const item = { id: uid(), planned: null, actual: null, memo: '', ...req.body };
  data.budget.push(item);
  writeData(data);
  res.json(item);
});

app.put('/api/budget/:id', (req, res) => {
  const data = readData();
  const idx = data.budget.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  data.budget[idx] = { ...data.budget[idx], ...req.body };
  writeData(data);
  res.json(data.budget[idx]);
});

app.delete('/api/budget/:id', (req, res) => {
  const data = readData();
  data.budget = data.budget.filter(i => i.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n서버 실행 중: http://localhost:${PORT}`);

  const token = process.env.NGROK_AUTHTOKEN;
  if (!token) {
    console.log('\n[ngrok] .env 파일에 NGROK_AUTHTOKEN을 입력하면 공개 URL이 생성됩니다.');
    console.log('  설정 방법: https://dashboard.ngrok.com/get-started/your-authtoken\n');
    return;
  }

  try {
    const ngrok = require('@ngrok/ngrok');
    const opts = { addr: PORT, authtoken: token };
    if (process.env.NGROK_DOMAIN) opts.domain = process.env.NGROK_DOMAIN;
    const listener = await ngrok.forward(opts);
    const url = listener.url();
    console.log('\n========================================');
    console.log(`  공개 URL: ${url}`);
    console.log('  위 주소를 모바일에서 열어주세요!');
    console.log('========================================\n');
  } catch (e) {
    console.error('\n[ngrok 오류]', e.message, '\n');
  }
});
