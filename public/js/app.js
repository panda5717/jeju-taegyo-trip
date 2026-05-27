/* ===== State ===== */
let state = { settings: {}, itinerary: [], checklist: [], budget: [] };
let currentDay = null;
let currentTab = 'itinerary';
let editingId = null;
let editingType = null;
let nowBannerInterval = null;
let dayMap = null;

/* ===== Init ===== */
async function init() {
  const data = await api('GET', '/api/trip');
  state = data;
  renderHeader();
  renderDayTabs();
  renderItinerary();
  renderChecklist();
  renderBudget();
  renderFuel();
  updateNowBanner();
  if (!nowBannerInterval) {
    nowBannerInterval = setInterval(updateNowBanner, 60000);
  }
  bindTabs();
  bindFabs();
}

async function refreshApp() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');
  btn.disabled = true;
  await init();
  btn.classList.remove('spinning');
  btn.disabled = false;
}

/* ===== API ===== */
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

/* ===== Header ===== */
function renderHeader() {
  document.getElementById('tripTitle').textContent = state.settings.title;
  const s = state.settings;
  const start = fmtDate(s.startDate);
  const end = fmtDate(s.endDate);
  document.getElementById('tripDates').textContent = `${start} ~ ${end}`;
}

function fmtDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getMonth() + 1}/${dt.getDate()}(${['일','월','화','수','목','금','토'][dt.getDay()]})`;
}

/* ===== Now Banner ===== */
function updateNowBanner() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const { startDate, endDate } = state.settings;
  if (today < startDate || today > endDate) return;

  const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const todayItems = state.itinerary
    .filter(i => i.date === today && i.time && i.endTime)
    .sort((a, b) => a.time.localeCompare(b.time));

  const current = todayItems.find(i => i.time <= hhmm && i.endTime > hhmm);
  const banner = document.getElementById('nowBanner');
  const nowText = document.getElementById('nowText');

  if (current) {
    nowText.textContent = `${current.time}~${current.endTime}  ${current.place}`;
    banner.classList.remove('hidden');
  } else {
    const next = todayItems.find(i => i.time > hhmm);
    if (next) {
      nowText.textContent = `다음: ${next.time} ${next.place}`;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }
}

/* ===== Tabs ===== */
function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
      document.getElementById('tab-' + currentTab).classList.remove('hidden');
    });
  });
}

/* ===== Day Tabs ===== */
function getDays() {
  const dates = [...new Set(state.itinerary.map(i => i.date))].sort();
  return dates;
}

function renderDayTabs() {
  const days = getDays();
  if (!currentDay || !days.includes(currentDay)) {
    const today = new Date().toISOString().slice(0, 10);
    currentDay = days.includes(today) ? today : days[0];
  }

  const container = document.getElementById('dayTabs');
  container.innerHTML = days.map((d, i) => {
    const label = `DAY ${i + 1} · ${fmtDate(d)}`;
    return `<button class="day-tab ${d === currentDay ? 'active' : ''}" data-date="${d}">${label}</button>`;
  }).join('');

  container.querySelectorAll('.day-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDay = btn.dataset.date;
      renderDayTabs();
      renderItinerary();
    });
  });
}

/* ===== Duration helpers ===== */
function parseMins(dur) {
  if (!dur) return 0;
  let m = 0;
  const h = dur.match(/(\d+)\s*시간/);
  const min = dur.match(/(\d+)\s*분/);
  if (h) m += parseInt(h[1]) * 60;
  if (min) m += parseInt(min[1]);
  return m;
}

function buildStats(items) {
  const catMins = {};
  let total = 0;
  items.forEach(i => {
    const m = parseMins(i.duration);
    if (!m) return;
    const cat = i.category || '기타';
    catMins[cat] = (catMins[cat] || 0) + m;
    total += m;
  });
  if (!total) return '';
  const sorted = Object.entries(catMins).sort((a, b) => b[1] - a[1]);
  const segs = sorted.map(([cat, mins]) => {
    const c = getCat(cat);
    const pct = Math.round(mins / total * 100);
    return `<div class="stats-seg" style="flex:${mins};background:${c.border}" title="${cat} ${pct}%"></div>`;
  }).join('');
  const pills = sorted.map(([cat, mins]) => {
    const c = getCat(cat);
    const pct = Math.round(mins / total * 100);
    return `<span class="stat-pill" style="background:${c.bg};color:${c.text}">${cat} ${pct}%</span>`;
  }).join('');
  return `<div class="stats-container"><div class="stats-bar">${segs}</div><div class="stats-legend">${pills}</div></div>`;
}

/* ===== Category map ===== */
const CAT_MAP = {
  '이동': { border: '#94a3b8', bg: '#f1f5f9', text: '#475569' },
  '비행': { border: '#38bdf8', bg: '#e0f2fe', text: '#0369a1' },
  '식사': { border: '#fb923c', bg: '#fff7ed', text: '#c2410c' },
  '카페': { border: '#d97706', bg: '#fef3c7', text: '#92400e' },
  '산책': { border: '#34d399', bg: '#ecfdf5', text: '#065f46' },
  '수영': { border: '#60a5fa', bg: '#eff6ff', text: '#1d4ed8' },
  '사진': { border: '#c084fc', bg: '#faf5ff', text: '#7e22ce' },
  '쉬자': { border: '#a78bfa', bg: '#f5f3ff', text: '#5b21b6' },
  '간식': { border: '#fbbf24', bg: '#fffbeb', text: '#b45309' },
};

function getCat(category) {
  const key = Object.keys(CAT_MAP).find(k => (category || '').includes(k));
  return key ? CAT_MAP[key] : { border: '#d1c9be', bg: '#f5f1eb', text: '#78716c' };
}

/* ===== Itinerary ===== */
function renderItinerary() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

  const items = state.itinerary
    .filter(i => i.date === currentDay)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const cards = items.map(item => {
    let cls = '';
    let nowDot = '';
    if (currentDay === today && item.time && item.endTime) {
      if (item.time <= hhmm && item.endTime > hhmm) {
        cls = 'current';
        nowDot = '<span class="now-dot"></span>';
      } else if (item.endTime <= hhmm) {
        cls = 'past';
      }
    }
    const c = getCat(item.category);
    const timeBase = item.time
      ? (item.endTime ? `${item.time}~${item.endTime}` : item.time)
      : '';
    const timeStr = item.duration ? `${timeBase} · ${item.duration}` : timeBase;
    const costActual = item.costActual != null ? item.costActual : '';
    const showCost = COST_CATS.some(k => (item.category || '').includes(k));

    const metaParts = [];
    if (item.memo) metaParts.push(`<span class="itin-memo-text">📝 ${esc(item.memo)}</span>`);
    if (item.link) metaParts.push(`<a class="itin-link-btn" href="${esc(item.link)}" target="_blank" rel="noopener">🔗 블로그 참조</a>`);

    return `
      <div class="itin-card ${cls}" data-id="${item.id}" style="border-left:4px solid ${c.border}">
        <div class="itin-card-main">
          <div class="itin-card-head">
            ${nowDot}
            <span class="cat-badge" style="background:${c.bg};color:${c.text}">${esc(item.category || '')}</span>
            <span class="itin-time">${timeStr}</span>
            <div class="itin-actions">
              <button class="btn-icon" onclick="openEditItem('${item.id}')">✏️</button>
              <button class="btn-icon" onclick="deleteItem('${item.id}')">🗑</button>
            </div>
          </div>
          <div class="itin-place-name">${esc(item.place)}</div>
          ${metaParts.length ? `<div class="itin-meta">${metaParts.join('')}</div>` : ''}
        </div>
        ${showCost ? `
        <div class="itin-card-cost">
          <div class="cost-field">
            <span class="cost-label">실비</span>
            <input class="cost-input" type="text" inputmode="numeric" value="${fmtNumInput(costActual)}" placeholder="—" oninput="onNumInput(this)" onblur="saveCost('${item.id}','costActual',this.value)">
          </div>
        </div>` : ''}
      </div>`;
  }).join('');

  document.getElementById('itineraryList').innerHTML =
    buildStats(items) +
    `<div class="itin-cards">${cards}</div>`;
  renderDayMap(items);
}

async function saveCost(id, field, value) {
  const num = stripComma(value);
  await api('PUT', `/api/itinerary/${id}`, { [field]: num });
  const item = state.itinerary.find(i => i.id === id);
  if (item) item[field] = num;
  renderBudget();
}

async function deleteItem(id) {
  if (!confirm('삭제할까요?')) return;
  await api('DELETE', `/api/itinerary/${id}`);
  state.itinerary = state.itinerary.filter(i => i.id !== id);
  renderItinerary();
  updateNowBanner();
}

/* ===== Checklist ===== */
function renderChecklist() {
  const total = state.checklist.length;
  const done = state.checklist.filter(i => i.checked).length;
  document.getElementById('checkProgress').textContent = `${done} / ${total} 완료`;

  const groups = {};
  state.checklist.forEach(item => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  });
  const catList = Object.keys(groups);

  // Donut SVG
  const circ = 238.8;
  const filled = total > 0 ? (done / total) * circ : 0;
  const navPills = catList.map((cat, idx) => {
    const items = groups[cat];
    const catDone = items.filter(i => i.checked).length;
    const catPct = items.length > 0 ? Math.round(catDone / items.length * 100) : 0;
    const shortName = cat.replace('준비물', '').trim();
    return `
      <button class="cl-nav-pill" onclick="scrollToGroup(${idx})">
        <span class="cl-nav-name">${shortName}</span>
        <span class="cl-nav-prog">${catDone}/${items.length}</span>
        <div class="cl-nav-bar"><div class="cl-nav-bar-fill" style="width:${catPct}%"></div></div>
      </button>`;
  }).join('');

  const statsHtml = `
    <div class="checklist-stats">
      <div class="donut-wrap">
        <svg class="donut-svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#e8f4fb" stroke-width="12"/>
          <circle cx="50" cy="50" r="38" fill="none" stroke="url(#dg)" stroke-width="12"
            stroke-dasharray="${filled.toFixed(1)} ${circ}" stroke-linecap="round"/>
          <defs>
            <linearGradient id="dg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#0077b6"/>
              <stop offset="100%" stop-color="#48cae4"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="donut-label">
          <span class="donut-done">${done}</span>
          <span class="donut-denom">/${total}</span>
          <span class="donut-text">완료</span>
        </div>
      </div>
      <div class="checklist-nav">${navPills}</div>
    </div>`;

  const container = document.getElementById('checklistContent');
  container.innerHTML = statsHtml + catList.map((cat, idx) => `
    <div class="checklist-group" id="clgroup-${idx}">
      <div class="checklist-group-title">${esc(cat)}</div>
      <div class="checklist-items">
        ${groups[cat].map(item => `
          <div class="checklist-row ${item.checked ? 'checked' : ''}" data-id="${item.id}">
            <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleCheck('${item.id}', this.checked)">
            <span class="item-label">${esc(item.item)}</span>
            <button class="btn-del" onclick="deleteCheck('${item.id}')">×</button>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function scrollToGroup(idx) {
  const el = document.getElementById(`clgroup-${idx}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function toggleCheck(id, checked) {
  await api('PUT', `/api/checklist/${id}`, { checked });
  const item = state.checklist.find(i => i.id === id);
  if (item) item.checked = checked;
  renderChecklist();
}

async function deleteCheck(id) {
  if (!confirm('삭제할까요?')) return;
  await api('DELETE', `/api/checklist/${id}`);
  state.checklist = state.checklist.filter(i => i.id !== id);
  renderChecklist();
}

/* ===== Fuel ===== */
const FUEL_BARS = 8;
const FUEL_TANK_L = 35;
const L_PER_BAR = FUEL_TANK_L / FUEL_BARS;

function buildGauge(selected, key) {
  const bars = Array.from({ length: FUEL_BARS }, (_, i) => {
    const n = i + 1;
    const filled = n <= selected;
    const colorClass = selected >= 6 ? 'green' : selected >= 3 ? 'yellow' : selected > 0 ? 'red' : '';
    return `<button class="fuel-bar ${filled ? 'filled ' + colorClass : ''}" onclick="saveFuelSetting('${key}',${n})" title="${n}칸"></button>`;
  }).join('');
  return `<div class="fuel-bars">${bars}</div>`;
}

function renderFuel() {
  const pickup  = Number(state.settings.fuelPickup)  || 0;
  const current = Number(state.settings.fuelCurrent) || 0;
  const price   = Number(state.settings.fuelPrice)   || 1800;
  const diff    = pickup - current;
  const liters  = Math.max(diff, 0) * L_PER_BAR;
  const cost    = Math.round(liters * price);

  let resultHtml;
  if (pickup === 0) {
    resultHtml = `<div class="fuel-result-card neutral">인수 시 주유량을 먼저 설정해주세요.</div>`;
  } else if (diff <= 0) {
    resultHtml = `<div class="fuel-result-card ok">✅ 반납 가능${diff < 0 ? ' (여유 있음)' : ''}</div>`;
  } else {
    resultHtml = `
      <div class="fuel-result-card need">
        <div class="fuel-result-main">⛽ ${liters.toFixed(1)}리터 주유 필요</div>
        <div class="fuel-result-sub">${diff}칸 차이 · 약 ${cost.toLocaleString('ko-KR')}원</div>
      </div>`;
  }

  document.getElementById('fuelContent').innerHTML = `
    <div class="fuel-card">
      <div class="fuel-car-info">🚗 기아 레이 · 탱크 ${FUEL_TANK_L}L · ${FUEL_BARS}칸 (칸당 ${L_PER_BAR.toFixed(2)}L)</div>
      <div class="fuel-gauges">
        <div class="fuel-gauge-box">
          <div class="fuel-gauge-label">인수 시 주유량</div>
          ${buildGauge(pickup, 'fuelPickup')}
          <div class="fuel-count">${pickup > 0 ? `${pickup} / ${FUEL_BARS} 칸` : '탭하여 설정'}</div>
        </div>
        <div class="fuel-gauge-box">
          <div class="fuel-gauge-label">현재 주유량</div>
          ${buildGauge(current, 'fuelCurrent')}
          <div class="fuel-count">${current > 0 ? `${current} / ${FUEL_BARS} 칸` : '탭하여 설정'}</div>
        </div>
      </div>
      ${resultHtml}
      <div class="fuel-price-row">
        <span class="fuel-price-label">휘발유 단가</span>
        <input class="fuel-price-input" type="text" inputmode="numeric" value="${fmtNumInput(price)}"
          oninput="onNumInput(this)" onblur="saveFuelSetting('fuelPrice', this.value)">
        <span class="fuel-price-unit">원 / L</span>
      </div>
    </div>`;
}

async function saveFuelSetting(key, value) {
  const num = value === '' ? 0 : Number(String(value).replace(/,/g, ''));
  await api('PUT', '/api/settings', { [key]: num });
  state.settings[key] = num;
  renderFuel();
}

/* ===== Budget ===== */
// 실비 입력 가능한 일정 카테고리 (이 목록에 없는 항목은 실비 입력란 미표시)
const COST_CATS = ['이동', '식사', '카페', '디저트'];

const ITIN_TO_BUDGET = {
  '식사': '식비',
  '카페': '카페&디저트',
  '디저트': '카페&디저트',
  '이동': '주유비',
};

const AUTO_SYNC_CATS = ['식비', '카페&디저트', '주유비'];

function getItinByBudgetCat() {
  const result = {};
  state.itinerary.forEach(i => {
    const key = Object.keys(ITIN_TO_BUDGET).find(k => (i.category || '').includes(k));
    if (!key) return;
    const budgetCat = ITIN_TO_BUDGET[key];
    if (!result[budgetCat]) result[budgetCat] = { actual: 0, items: [] };
    const a = Number(i.costActual) || 0;
    result[budgetCat].actual += a;
    if (i.costActual != null) result[budgetCat].items.push(i);
  });
  return result;
}

function itinCostTotals() {
  // 예산 카드로 자동 반영되지 않는 항목(미매핑)만 집계
  let actual = 0;
  state.itinerary.forEach(i => {
    const isMapped = Object.keys(ITIN_TO_BUDGET).some(k => (i.category || '').includes(k));
    if (!isMapped) actual += Number(i.costActual) || 0;
  });
  return { actual };
}

function buildBudgetSummary() {
  const itinByCat = getItinByBudgetCat();
  const cardPlanned = state.budget.reduce((s, b) => s + (Number(b.planned) || 0), 0);
  const cardActual = state.budget.reduce((s, b) => {
    if (AUTO_SYNC_CATS.includes(b.category)) {
      const itinForCard = itinByCat[b.category];
      return s + (itinForCard ? itinForCard.actual : 0);
    }
    return s + (Number(b.actual) || 0);
  }, 0);
  const itin = itinCostTotals();
  const totalPlanned = cardPlanned;
  const totalActual = cardActual + itin.actual;
  const diff = totalActual - totalPlanned;
  const totalBudget = Number(state.settings.totalBudget) || 0;
  const remaining = totalBudget - totalActual;
  return { cardPlanned, cardActual, itin, totalPlanned, totalActual, diff, totalBudget, remaining };
}

function renderBudget() {
  const { cardPlanned, cardActual, itin, totalPlanned, totalActual, diff, totalBudget, remaining } = buildBudgetSummary();

  const usedPct = totalBudget > 0 ? Math.min(totalActual / totalBudget * 100, 100) : 0;
  const barColor = usedPct >= 90 ? '#e53935' : usedPct >= 70 ? '#fb8c00' : '#0096c7';
  const remainPct = totalBudget > 0 ? (remaining / totalBudget) * 100 : 100;
  const remainClass = remaining < 0 ? 'over'
    : remainPct < 10 ? 'critical'
    : remainPct < 30 ? 'warning'
    : remainPct < 60 ? 'safe'
    : 'plenty';

  document.getElementById('budgetSummary').innerHTML = `
    <div class="total-budget-row">
      <span class="total-budget-label">🎯 총 예산</span>
      <input class="total-budget-input" type="text" inputmode="numeric" value="${fmtNumInput(totalBudget)}" placeholder="0"
        oninput="onNumInput(this)" onblur="saveTotalBudget(this.value)">
    </div>
    ${totalBudget > 0 ? `
    <div class="budget-remain-bar">
      <div class="budget-remain-fill" style="width:${usedPct.toFixed(1)}%;background:${barColor}"></div>
    </div>
    <div class="summary-row remaining ${remainClass}">
      <span>${remaining >= 0 ? '💰 잔여 예산' : '⚠️ 예산 초과'}</span>
      <span>${fmtWon(Math.abs(remaining))}</span>
    </div>
    <div class="summary-divider"></div>` : ''}
    <div class="summary-row"><span>계획 예산 합계</span><span>${fmtWon(totalPlanned)}</span></div>
    <div class="summary-row"><span>실제 소요 합계</span><span>${fmtWon(totalActual)}</span></div>
    <div class="summary-row"><span>└ 예산 카드</span><span>${fmtWon(cardActual)}</span></div>
    <div class="summary-row"><span>└ 일정 실비</span><span>${fmtWon(itin.actual)}</span></div>
    <div class="summary-row total ${totalPlanned > 0 ? (diff > 0 ? 'diff over' : 'diff under') : ''}">
      <span>${diff >= 0 ? '계획 대비 초과' : '계획 대비 절약'}</span>
      <span>${diff !== 0 ? fmtWon(Math.abs(diff)) : '-'}</span>
    </div>`;

  const itinWithCost = state.itinerary
    .filter(i => i.costActual != null && i.costActual !== '')
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const itinAllTotal = itinWithCost.reduce((s, i) => s + (Number(i.costActual) || 0), 0);

  const itinSection = itinWithCost.length ? `
    <div class="itin-cost-section">
      <div class="itin-cost-title">📋 일정별 실비</div>
      <div class="itin-cost-table">
        <div class="itin-cost-row itin-cost-header" style="grid-template-columns:60px 1fr 90px"><div>날짜</div><div>장소</div><div>실비</div></div>
        ${itinWithCost.map(i => `
          <div class="itin-cost-row" style="grid-template-columns:60px 1fr 90px">
            <div class="icc-date">${fmtDate(i.date)}</div>
            <div class="icc-place">${esc(i.place)}</div>
            <div class="icc-amt">${fmtWon(i.costActual)}</div>
          </div>`).join('')}
        <div class="itin-cost-row itin-cost-total" style="grid-template-columns:60px 1fr 90px">
          <div></div><div>합계</div>
          <div class="icc-amt">${fmtWon(itinAllTotal)}</div>
        </div>
      </div>
    </div>` : '';

  const itinByCat = getItinByBudgetCat();

  document.getElementById('budgetList').innerHTML = `<div class="budget-list">${
    state.budget.map(b => {
      const itinForCard = itinByCat[b.category];
      const manP = Number(b.planned) || 0;
      const manA = Number(b.actual) || 0;
      const itinA = itinForCard ? itinForCard.actual : 0;
      const isAutoSynced = AUTO_SYNC_CATS.includes(b.category);
      const totalP = manP;
      const totalA = isAutoSynced ? itinA : manA;
      const d = totalA - totalP;
      const hasDiff = totalP > 0 || totalA > 0;
      const diffHtml = hasDiff ? `
        <div class="budget-diff ${d < 0 ? 'save' : d > 0 ? 'over' : 'even'}">
          ${d === 0 ? '± 0원 (딱 맞음)' : d < 0 ? `✅ ${fmtWon(Math.abs(d))} 절약` : `⚠️ ${fmtWon(d)} 초과`}
        </div>` : '';

      const itinHtml = itinForCard && itinForCard.items.length > 0 ? `
        <div class="budget-itin-section">
          <div class="budget-itin-label">📋 일정에서 자동 반영</div>
          ${itinForCard.items.map(i => `
            <div class="budget-itin-row">
              <span>${esc(i.place)}</span>
              <span class="itin-amt-actual">${fmtWon(i.costActual)}</span>
            </div>`).join('')}
          <div class="budget-itin-subtotal">
            <span>소계</span>
            <span class="itin-amt-actual">${fmtWon(itinA)}</span>
          </div>
        </div>` : '';

      return `
      <div class="budget-card" data-id="${b.id}">
        <div class="budget-card-header">
          <span class="budget-category">${esc(b.category)}</span>
          <div class="budget-card-actions">
            <button class="btn-icon" onclick="deleteBudget('${b.id}')">🗑</button>
          </div>
        </div>
        <div class="budget-fields">
          <div class="budget-field">
            <label>계획 예산 (원)</label>
            <input type="text" inputmode="numeric" value="${fmtNumInput(b.planned)}" placeholder="0"
              oninput="onNumInput(this)" onblur="saveBudgetField('${b.id}', 'planned', this.value)">
          </div>
          <div class="budget-field">
            <label>실제 비용 (원)${isAutoSynced ? ' <span class="auto-badge">🔄 일정 자동합산</span>' : ''}</label>
            ${isAutoSynced
              ? `<div class="budget-actual-readonly">${itinA > 0 ? fmtWon(itinA) : '—'}</div>`
              : `<input type="text" inputmode="numeric" value="${fmtNumInput(b.actual)}" placeholder="0"
                  oninput="onNumInput(this)" onblur="saveBudgetField('${b.id}', 'actual', this.value)">`
            }
          </div>
        </div>
        ${diffHtml}
        ${itinHtml}
        ${b.memo ? `<div class="budget-memo">📝 ${esc(b.memo)}</div>` : ''}
      </div>`;
    }).join('')
  }${itinSection}</div>`;
}

async function saveTotalBudget(value) {
  const num = stripComma(value);
  await api('PUT', '/api/settings', { totalBudget: num });
  state.settings.totalBudget = num;
  renderBudget();
}

async function saveBudgetField(id, field, value) {
  const num = stripComma(value);
  await api('PUT', `/api/budget/${id}`, { [field]: num });
  const item = state.budget.find(b => b.id === id);
  if (item) item[field] = num;
  renderBudget();
}

async function deleteBudget(id) {
  if (!confirm('삭제할까요?')) return;
  await api('DELETE', `/api/budget/${id}`);
  state.budget = state.budget.filter(b => b.id !== id);
  renderBudget();
}

/* ===== FABs ===== */
function bindFabs() {
  document.getElementById('addItemBtn').addEventListener('click', () => openAddItem());
  document.getElementById('addCheckBtn').addEventListener('click', () => openAddCheck());
  document.getElementById('addBudgetBtn').addEventListener('click', () => openAddBudget());
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', closeModal);
}

/* ===== Modal: Itinerary Add/Edit ===== */
const CATEGORIES = ['🚗 이동','✈️ 비행','🍽️ 식사','☕ 카페','🚶 산책','🏊 수영','📸 사진','🛋️ 쉬자','🥐 간식','기타'];

function openAddItem() {
  editingId = null;
  editingType = 'itinerary';
  document.getElementById('modalTitle').textContent = '일정 추가';
  document.getElementById('modalBody').innerHTML = itineraryForm({ date: currentDay });
  document.getElementById('modalSave').onclick = saveItineraryItem;
  openModal();
}

function openEditItem(id) {
  editingId = id;
  editingType = 'itinerary';
  const item = state.itinerary.find(i => i.id === id);
  document.getElementById('modalTitle').textContent = '일정 수정';
  document.getElementById('modalBody').innerHTML = itineraryForm(item);
  document.getElementById('modalSave').onclick = saveItineraryItem;
  openModal();
}

function itineraryForm(item = {}) {
  const catOpts = CATEGORIES.map(c => `<option ${item.category === c ? 'selected' : ''}>${c}</option>`).join('');
  return `
    <div class="form-group">
      <label>날짜</label>
      <input id="f_date" type="date" value="${item.date || currentDay}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>시작 시간</label>
        <input id="f_time" type="time" value="${item.time || ''}">
      </div>
      <div class="form-group">
        <label>종료 시간</label>
        <input id="f_endTime" type="time" value="${item.endTime || ''}">
      </div>
    </div>
    <div class="form-group">
      <label>장소 / 항목</label>
      <input id="f_place" type="text" value="${esc(item.place || '')}">
    </div>
    <div class="form-group">
      <label>구분</label>
      <select id="f_category">${catOpts}</select>
    </div>
    <div class="form-group">
      <label>메뉴 / 비고</label>
      <input id="f_memo" type="text" value="${esc(item.memo || '')}">
    </div>`;
}

async function saveItineraryItem() {
  const body = {
    date: document.getElementById('f_date').value,
    time: document.getElementById('f_time').value,
    endTime: document.getElementById('f_endTime').value,
    place: document.getElementById('f_place').value,
    category: document.getElementById('f_category').value,
    memo: document.getElementById('f_memo').value,
  };
  if (!body.place) return alert('장소/항목을 입력해주세요.');

  if (editingId) {
    const updated = await api('PUT', `/api/itinerary/${editingId}`, body);
    const idx = state.itinerary.findIndex(i => i.id === editingId);
    if (idx >= 0) state.itinerary[idx] = updated;
  } else {
    const created = await api('POST', '/api/itinerary', body);
    state.itinerary.push(created);
    currentDay = body.date;
  }
  closeModal();
  renderDayTabs();
  renderItinerary();
  updateNowBanner();
}

/* ===== Modal: Checklist Add ===== */
const CHECK_CATEGORIES = ['🐕 도담', '🤰 현지', '👕 상훈', '🧳 공통'];

function openAddCheck() {
  editingType = 'checklist';
  document.getElementById('modalTitle').textContent = '준비물 추가';
  const catOpts = `<option value="" disabled selected>카테고리 선택</option>` +
    CHECK_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label>카테고리</label>
      <select id="f_cat">${catOpts}</select>
    </div>
    <div class="form-group">
      <label>항목</label>
      <div class="input-clear-wrap">
        <input id="f_item" type="text" placeholder="예: 선크림">
        <button type="button" class="btn-input-clear" onclick="this.previousElementSibling.value='';this.previousElementSibling.focus()">✕</button>
      </div>
    </div>`;
  document.getElementById('modalSave').onclick = async () => {
    const category = document.getElementById('f_cat').value;
    const item = document.getElementById('f_item').value.trim();
    if (!category) return alert('카테고리를 선택해주세요.');
    if (!item) return alert('항목을 입력해주세요.');
    const created = await api('POST', '/api/checklist', { category, item });
    state.checklist.push(created);
    renderChecklist();
    const el = document.getElementById('f_item');
    if (el) { el.value = ''; el.focus(); }
  };
  openModal();
  setTimeout(() => {
    const el = document.getElementById('f_item');
    if (el) el.value = '';
  }, 0);
}

/* ===== Modal: Budget Add ===== */
const BUDGET_CATEGORIES = ['항공권','숙소','렌트카','식비','교통','입장료/체험','기타'];

function openAddBudget() {
  editingType = 'budget';
  document.getElementById('modalTitle').textContent = '예산 항목 추가';
  const catOpts = BUDGET_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label>카테고리</label>
      <select id="f_bcat">${catOpts}</select>
    </div>
    <div class="form-group">
      <label>계획 예산 (원)</label>
      <input id="f_planned" type="number" placeholder="0">
    </div>
    <div class="form-group">
      <label>실제 비용 (원)</label>
      <input id="f_actual" type="number" placeholder="0">
    </div>
    <div class="form-group">
      <label>메모</label>
      <input id="f_bmemo" type="text" placeholder="">
    </div>`;
  document.getElementById('modalSave').onclick = async () => {
    const category = document.getElementById('f_bcat').value;
    const planned = document.getElementById('f_planned').value;
    const actual = document.getElementById('f_actual').value;
    const memo = document.getElementById('f_bmemo').value;
    const created = await api('POST', '/api/budget', {
      category,
      planned: planned ? Number(planned) : null,
      actual: actual ? Number(actual) : null,
      memo
    });
    state.budget.push(created);
    closeModal();
    renderBudget();
  };
  openModal();
}

/* ===== Modal Helpers ===== */
function openModal() {
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modalOverlay').classList.add('hidden');
  document.getElementById('modalBody').innerHTML = '';
  editingId = null;
}

/* ===== Utils ===== */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtWon(n) {
  if (!n && n !== 0) return '-';
  return Number(n).toLocaleString('ko-KR') + '원';
}
function fmtNumInput(val) {
  if (val == null || val === '') return '';
  return Number(val).toLocaleString('ko-KR');
}
function onNumInput(el) {
  const raw = el.value.replace(/[^0-9]/g, '');
  const pos = el.selectionStart;
  const before = el.value.length;
  el.value = raw ? Number(raw).toLocaleString('ko-KR') : '';
  const diff = el.value.length - before;
  try { el.setSelectionRange(pos + diff, pos + diff); } catch(e) {}
}
function stripComma(v) {
  return v === '' ? null : Number(String(v).replace(/,/g, ''));
}

/* ===== Day Map ===== */
const GEO_CACHE_KEY = 'geoCache_v1';
const GEO_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const SKIP_MAP_CATS = ['이동', '비행'];
// 지도에서 제외할 비장소 키워드 (실제 위치 없는 일반 명사)
const SKIP_MAP_NAMES = new Set(['쉬기', '쉬기 &', '본날', '산책']);

function getGeoCache() {
  try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveGeoCache(cache) {
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

async function geocodePlace(name) {
  const cache = getGeoCache();
  const hit = cache[name];
  if (hit && Date.now() - hit.ts < GEO_CACHE_TTL) return { lat: hit.lat, lng: hit.lng };
  try {
    const data = await api('GET', `/api/geocode?q=${encodeURIComponent(name)}`);
    if (data.lat) {
      const c = getGeoCache();
      c[name] = { lat: data.lat, lng: data.lng, ts: Date.now() };
      saveGeoCache(c);
      return { lat: data.lat, lng: data.lng };
    }
  } catch {}
  return { lat: null, lng: null };
}

function extractMapName(place) {
  let name = place.replace(/^\[.*?\]\s*/, '');           // [접두사] 제거
  if (name.includes('→')) name = name.split('→').pop().trim(); // A→B에서 B 추출
  name = name.replace(/\s*(수영|구경|포장|촬영|저녁|점심|아점|아침|일몰|산책|구경&수영|&수영|스팟\s*촬영)\s*$/, '').trim();
  return name;
}

async function renderDayMap(items) {
  const container = document.getElementById('dayMapContainer');
  if (!container) return;

  const mapItems = items.filter(i => {
    if (SKIP_MAP_CATS.some(k => (i.category || '').includes(k))) return false;
    const name = extractMapName(i.place);
    if (!name || name.length <= 1 || SKIP_MAP_NAMES.has(name)) return false;
    return true;
  });
  if (mapItems.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = '<div class="day-map-loading">📍 지도 불러오는 중...</div>';

  const coords = await Promise.all(
    mapItems.map(async item => {
      const name = extractMapName(item.place);
      const { lat, lng } = await geocodePlace(name);
      return { name, lat, lng };
    })
  );
  const valid = coords.filter(c => c.lat && c.lng);

  if (valid.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = '<div id="dayMapEl" class="day-map-el"></div>';

  if (typeof naver === 'undefined' || !naver.maps) { container.innerHTML = ''; return; }

  const centerLat = valid.reduce((s, c) => s + c.lat, 0) / valid.length;
  const centerLng = valid.reduce((s, c) => s + c.lng, 0) / valid.length;

  dayMap = new naver.maps.Map('dayMapEl', {
    center: new naver.maps.LatLng(centerLat, centerLng),
    zoom: 12,
    mapTypeControl: false,
    scaleControl: false,
    logoControl: false,
    mapDataControl: false,
  });

  const path = [];
  valid.forEach((c, idx) => {
    const pos = new naver.maps.LatLng(c.lat, c.lng);
    path.push(pos);

    const marker = new naver.maps.Marker({
      position: pos,
      map: dayMap,
      icon: {
        content: `<div class="map-marker-num">${idx + 1}</div>`,
        anchor: new naver.maps.Point(14, 14),
      },
    });

    const infoWin = new naver.maps.InfoWindow({
      content: `<div class="map-info-win">${esc(c.name)}</div>`,
      borderWidth: 0,
      backgroundColor: 'transparent',
      disableAnchor: true,
    });

    naver.maps.Event.addListener(marker, 'click', () => {
      infoWin.getMap() ? infoWin.close() : infoWin.open(dayMap, marker);
    });
  });

  if (valid.length > 1) {
    new naver.maps.Polyline({
      map: dayMap,
      path,
      strokeColor: '#0077b6',
      strokeOpacity: 0.45,
      strokeWeight: 2,
      strokeStyle: 'shortdash',
    });

    const lats = valid.map(c => c.lat);
    const lngs = valid.map(c => c.lng);
    dayMap.fitBounds(
      new naver.maps.LatLngBounds(
        new naver.maps.LatLng(Math.min(...lats), Math.min(...lngs)),
        new naver.maps.LatLng(Math.max(...lats), Math.max(...lngs))
      ),
      { top: 40, right: 20, bottom: 20, left: 20 }
    );
  }
}

/* ===== Start ===== */
init();
