# 홈 여행 리스트 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 접속 시 여행 카드 목록을 보여주는 홈 페이지를 추가하고, 카드 클릭 시 기존 여행 플랜 페이지로 이동한다.

**Architecture:** 기존 `public/index.html`(여행 플랜)을 `public/trip.html`로 이름 변경하고, 새 `public/index.html`을 홈 페이지로 만든다. 서버/API 변경 없이 순수 정적 파일 변경만으로 구현한다.

**Tech Stack:** Vanilla HTML, CSS (no framework), Express static serving

---

## 파일 구조

| 파일 | 작업 |
|------|------|
| `public/index.html` | 기존 파일 → `public/trip.html`로 이동 후, 새로 홈 페이지 생성 |
| `public/trip.html` | 신규 생성 (기존 index.html 내용 그대로) |
| `public/css/home.css` | 신규 생성 (홈 페이지 전용 스타일) |

---

### Task 1: 기존 index.html을 trip.html로 복사

**Files:**
- Create: `public/trip.html` (기존 index.html 내용 그대로)
- Modify: `public/index.html` (나중에 덮어씀)

- [ ] **Step 1: trip.html 생성 — index.html 내용을 그대로 복사**

`public/trip.html` 파일을 아래 내용으로 생성한다 (기존 index.html과 동일):

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>제주도 태교 여행 🌴</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <header>
    <h1 id="tripTitle">제주도 태교 여행 🌴</h1>
    <p id="tripDates" class="dates"></p>
    <button id="refreshBtn" class="refresh-btn" onclick="refreshApp()">🔄</button>
  </header>

  <div id="nowBanner" class="now-banner hidden">
    <span class="now-label">지금 뭐해? 👀</span>
    <span id="nowText"></span>
  </div>

  <nav class="tab-nav">
    <button class="tab-btn active" data-tab="itinerary">🗓 일정</button>
    <button class="tab-btn" data-tab="checklist">🎒 준비물</button>
    <button class="tab-btn" data-tab="budget">💰 예산</button>
    <button class="tab-btn" data-tab="fuel">⛽ 주유</button>
  </nav>

  <section id="tab-itinerary" class="tab-content active">
    <div class="day-tabs" id="dayTabs"></div>
    <div id="itineraryList" class="schedule-wrap"></div>
    <button class="fab" id="addItemBtn">＋ 일정 추가</button>
  </section>

  <section id="tab-checklist" class="tab-content hidden">
    <div class="checklist-header">
      <span id="checkProgress" class="progress-text"></span>
      <button class="btn-small" id="addCheckBtn">＋ 항목 추가</button>
    </div>
    <div id="checklistContent"></div>
  </section>

  <section id="tab-budget" class="tab-content hidden">
    <div class="budget-summary" id="budgetSummary"></div>
    <div id="budgetList"></div>
    <button class="fab" id="addBudgetBtn">＋ 항목 추가</button>
  </section>

  <section id="tab-fuel" class="tab-content hidden">
    <div id="fuelContent"></div>
  </section>

  <div id="modal" class="modal hidden">
    <div class="modal-box">
      <h3 id="modalTitle">일정 추가</h3>
      <div id="modalBody"></div>
      <div class="modal-actions">
        <button id="modalCancel" class="btn-cancel">취소</button>
        <button id="modalSave" class="btn-save">저장</button>
      </div>
    </div>
  </div>
  <div id="modalOverlay" class="modal-overlay hidden"></div>

  <script src="/js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 브라우저에서 `/trip.html` 접속해 기존 여행 플랜이 정상 동작하는지 확인**

로컬 서버(`node server.js`)를 실행하고 `http://localhost:3000/trip.html` 에 접속.
일정/준비물/예산/주유 탭이 모두 정상 동작하면 OK.

- [ ] **Step 3: 커밋**

```bash
git add public/trip.html
git commit -m "feat: add trip.html as dedicated trip planner page"
```

---

### Task 2: home.css 생성

**Files:**
- Create: `public/css/home.css`

- [ ] **Step 1: `public/css/home.css` 생성**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f8f9fa;
  color: #1a1a1a;
  padding: 16px;
  min-height: 100vh;
}

.page-header {
  text-align: center;
  padding: 32px 16px 24px;
  background: #fff;
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.page-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.3px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 12px;
  padding: 0 2px;
}

.trip-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.trip-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border: 1.5px solid transparent;
  text-decoration: none;
  color: inherit;
  display: block;
}

.trip-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.11);
}

.trip-card.add-card {
  border: 1.5px dashed #e0e0e0;
  box-shadow: none;
  cursor: default;
}

.trip-card.add-card:hover {
  transform: none;
  box-shadow: none;
}

.card-thumb {
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
}

.thumb-jeju {
  background: linear-gradient(135deg, #d4f5e3 0%, #a8e6cf 100%);
}

.thumb-add {
  background: #f3f4f6;
  color: #ccc;
  font-size: 28px;
}

.card-body {
  padding: 12px 14px 14px;
}

.card-body h3 {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
}

.add-card .card-body h3 {
  color: #bbb;
  font-weight: 500;
}

.card-body .meta {
  font-size: 11px;
  color: #aaa;
  margin-top: 4px;
}

.card-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
  margin-top: 8px;
}

.badge-plan {
  background: #e3f2fd;
  color: #1565c0;
}
```

- [ ] **Step 2: 커밋**

```bash
git add public/css/home.css
git commit -m "feat: add home page stylesheet"
```

---

### Task 3: 홈 페이지 index.html 생성

**Files:**
- Modify: `public/index.html` (기존 내용 교체)

- [ ] **Step 1: `public/index.html`을 홈 페이지로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>담패밀리 여행 플랜</title>
  <link rel="stylesheet" href="/css/home.css">
</head>
<body>

  <div class="page-header">
    <h1>담패밀리 여행 플랜 ✈️</h1>
  </div>

  <div class="section-label">여행 목록</div>

  <div class="trip-grid">

    <a href="/trip.html" class="trip-card">
      <div class="card-thumb thumb-jeju">🌴</div>
      <div class="card-body">
        <h3>제주도 태교여행<br>with 도담🩵🐕</h3>
        <div class="meta">26.05.28 ~ 26.05.31</div>
        <span class="card-badge badge-plan">계획중</span>
      </div>
    </a>

    <div class="trip-card add-card">
      <div class="card-thumb thumb-add">＋</div>
      <div class="card-body">
        <h3>새 여행<br>추가하기</h3>
        <div class="meta">다음 여행을 기록해요</div>
      </div>
    </div>

  </div>

</body>
</html>
```

- [ ] **Step 2: 브라우저에서 동작 확인**

`http://localhost:3000` 접속 → 홈 페이지 카드 목록 노출 확인.
제주도 태교여행 카드 클릭 → `/trip.html` 이동 및 여행 플랜 정상 동작 확인.

- [ ] **Step 3: 커밋**

```bash
git add public/index.html
git commit -m "feat: add home travel list page"
```

---

### Task 4: Vercel 배포

- [ ] **Step 1: GitHub push**

```bash
git push origin master
```

- [ ] **Step 2: Vercel 자동 배포 확인**

Vercel 대시보드에서 빌드 완료 후 `https://dam-family-log.vercel.app` 접속해 홈 페이지 및 카드 클릭 동작 확인.
