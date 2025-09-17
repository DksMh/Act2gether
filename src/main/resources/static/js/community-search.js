/* =========== 더미 데이터 =========== */
const trips = [
  // 가입중
  {id:'t1', title:'[동해] 강원도 동해로 서핑 체험하러 가요 서울 출발 남자 모임',
   depart:'서울', dest:'동해', start:'2025-08-10', end:'2025-08-15',
   capacity:10, joined:8, tags:['서울 출발'], image:'https://images.unsplash.com/photo-1544551763-473fb27adb96?q=80&w=1600&auto=format&fit=crop'},
  {id:'t2', title:'[동해] 강원도 동해로 서핑 체험하러 가요 서울 출발 남자 모임',
   depart:'서울', dest:'동해', start:'2025-08-20', end:'2025-08-25',
   capacity:10, joined:8, tags:['서울 출발'], image:'https://images.unsplash.com/photo-1526481280698-8fcc13fd949b?q=80&w=1600&auto=format&fit=crop'},

  // 로컬 추천 + 검색 풀
  {id:'t3', title:'[동해] 강원도 동해로 서핑 체험하러 가요 서울 출발 남자 모임',
   depart:'서울', dest:'동해', start:'2025-08-10', end:'2025-08-15',
   capacity:10, joined:8, tags:['동해','산'], image:'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1600&auto=format&fit=crop'},
  {id:'t4', title:'[부산] 로컬 맛집 투어', depart:'서울', dest:'부산',
   start:'2025-08-25', end:'2025-08-27', capacity:12, joined:8, tags:['부산','미식'],
   image:'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1600&auto=format&fit=crop'},
  {id:'t5', title:'[경주] 천년 역사 체험', depart:'서울', dest:'경주',
   start:'2025-08-25', end:'2025-08-28', capacity:20, joined:18, tags:['경주','문화'],
   image:'https://images.unsplash.com/photo-1504610926078-a1611febcad3?q=80&w=1600&auto=format&fit=crop'},
  {id:'t6', title:'[속초] 설악산 단풍 트레킹', depart:'서울', dest:'속초',
   start:'2025-10-05', end:'2025-10-07', capacity:16, joined:10, tags:['속초','자연'],
   image:'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1600&auto=format&fit=crop'},
  // 다른 지역
  {id:'t7', title:'[제주] 올레길 힐링', depart:'부산', dest:'제주',
   start:'2025-09-01', end:'2025-09-04', capacity:20, joined:12, tags:['제주','인기'],
   image:'https://images.unsplash.com/photo-1568378256233-5bdb17618445?q=80&w=1600&auto=format&fit=crop'}
];

/* =========== 공통 유틸 =========== */
const $ = (sel,ctx=document)=>ctx.querySelector(sel);
const $$ = (sel,ctx=document)=>Array.from(ctx.querySelectorAll(sel));
const d = s => new Date(s+"T00:00:00");
const fmt = s => s.replaceAll('-','.');
const daysUntil = s => Math.ceil((d(s)-new Date())/86400000);
const calIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 3v4M17 3v4M3 11h18M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/></svg>`;
const peopleIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M8 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;


/* =========== 렌더러 =========== */

const MS_PER_DAY = 86_400_000;

// 입력을 "로컬 자정"으로 정규화
function toMidnightLocal(input) {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  if (typeof input === 'string') {
    // 'YYYY-MM-DD' 형태는 타임존 흔들림 방지용 수동 생성
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, d] = input.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(input); // ISO 등
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return new Date(NaN);
}

// today(기본: 지금)와 target 사이의 D-day (오늘=0, 내일=1, 어제=-1)
function dday1(target, today = new Date()) {
  const t0 = toMidnightLocal(target);
  const n0 = toMidnightLocal(today);
  return Math.ceil((t0 - n0) / MS_PER_DAY);
}

// ===== 상단 "가입중인 여행" 가로 스크롤 렌더 =====
async function renderEnrolled() {
  const username = (window.currentUser?.username || '').toLowerCase();
  console.log("username >>> " + username);
  let rows = [];
  try {
    const res = await fetch('/profile/gathering', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username })
    });
    rows = await res.json();
    if (!Array.isArray(rows)) rows = [];
  } catch (e) {
    console.error('renderEnrolled fetch error:', e);
    rows = [];
  }

  const wrap = document.getElementById('enrolledScroller');
  // const seeAllBtn = document.getElementById('seeAllBtn-m');
  // const seeShortBtn = document.getElementById('seeShortBtn-m');
  if (!wrap) return;

  wrap.innerHTML = '';

  // 그룹 상세로 이동
  const goGroup = (id) => {
    if (!id) return;
    window.location.href = `/community?groupId=${encodeURIComponent(id)}`;
  };

  rows.forEach((item, idx) => {
    // intro(JSON) 안전 파싱
    let intro = {};
    try { intro = item.intro && typeof item.intro === 'string' ? JSON.parse(item.intro) : (item.intro || {}); }
    catch { intro = {}; }

    const title = intro.title || item.title || '모임';
    const depart = intro.departureRegion || item.departureRegion || '';

    const dday = dday1(item.startDate);
    const badgeText =
      dday > 0 ? `여행 시작까지 <strong style="color:#ff5900">${dday}</strong>일 남았어요!`
      : dday === 0 ? `<strong style="color:#ff5900">오늘 출발!</strong>`
      : `여행 중이거나 종료되었습니다`;

    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;               // 키보드 접근
    if (idx >= 2 && seeAllBtn && seeShortBtn) card.style.display = 'none'; // 목록 축약 모드(버튼 있는 경우만)

    // 상단 섹션 카드 레이아웃 (텍스트형)
    card.innerHTML = `
      <div class="badge-row" style="display:flex;justify-content:space-between;gap:8px;margin-bottom:10px;">
        <span class="badge">${badgeText}</span>
        <span class="badge out">${depart ? `${depart} 출발` : ''}</span>
      </div>
      <h3 style="font-size:15px;margin:6px 0 12px;line-height:1.5;font-weight:800;">${title}</h3>
      <div class="meta" style="display:flex;gap:16px;align-items:center;color:#6b7280;font-size:.9rem;">
        <span>${(item.startDate||'').replaceAll('-', '.')} ~ ${(item.endDate||'').replaceAll('-', '.')}</span>
        <span>${Number(item.maxMembers)||0}명 모집 (현재 ${Number(item.currentMembers)||0}명)</span>
      </div>
    `;

    card.addEventListener('click', () => goGroup(item.groupId));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') goGroup(item.groupId); });

    wrap.appendChild(card);
  });

  // 보기/접기 토글(버튼이 있을 때만 동작)
  // if (rows.length > 2 && seeAllBtn && seeShortBtn) {
  //   seeAllBtn.style.display = 'inline-block';
  //   seeShortBtn.style.display = 'none';

  //   seeAllBtn.onclick = () => {
  //     wrap.querySelectorAll('.card').forEach(el => el.style.display = 'block');
  //     seeAllBtn.style.display = 'none';
  //     seeShortBtn.style.display = 'inline-block';
  //   };
  //   seeShortBtn.onclick = () => {
  //     wrap.querySelectorAll('.card').forEach((el, i) => el.style.display = i < 2 ? 'block' : 'none');
  //     seeAllBtn.style.display = 'inline-block';
  //     seeShortBtn.style.display = 'none';
  //   };
  // } else {
  //   if (seeAllBtn) seeAllBtn.style.display = 'none';
  //   if (seeShortBtn) seeShortBtn.style.display = 'none';
  // }
}


// function renderEnrolled(){
//   const wrap = $('#enrolledScroller');
//   wrap.innerHTML = '';
//   const mine = trips.slice(0,2); // 데모: 상단 2개 고정
//   mine.forEach(t=>{
//     const left = daysUntil(t.start);
//     const el = document.createElement('article');
//     el.className='card';
//     el.innerHTML = `
//       <div class="badge-row">
//         <span class="badge">${left>0?`여행 시작까지 ${left}일 남았어요!`:`오늘 출발!`}</span>
//         <span class="badge out">${t.depart} 출발</span>
//       </div>
//       <h3>${t.title}</h3>
//       <div class="meta">
//         <span>${calIcon}${fmt(t.start)} ~ ${fmt(t.end)}</span>
//         <span>${peopleIcon}${t.capacity}명 모집 (현재 ${t.joined}명)</span>
//       </div>`;
//     wrap.appendChild(el);
//   });
// }

function card(t){
  const el = document.createElement('article');
  el.className='card';
  el.innerHTML = `
    <div class="card-img">
      <img src="${t.image}" alt="${t.dest}"/>
      <span class="chip">${t.dest}</span>
      <span class="chip gray">산</span>
    </div>
    <div class="card-body">
      <div class="kicker">${t.depart} 출발</div>
      <div class="title">${t.title}</div>
      <div class="meta-row">
        <span>${calIcon}${fmt(t.start)} ~ ${fmt(t.end)}</span>
        <span>${peopleIcon}${t.capacity}명 모집 (현재 ${t.joined}명)</span>
      </div>
    </div>`;
  return el;
}

async function renderLocal(){
  const username = (window.currentUser?.username || '').toLowerCase();
  const res = await fetch('/profile/user/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username
        })
      });

      const txt = await res.json();
      console.log(txt);
city = txt.region;
          $('#myCity').textContent = city;
          const list = trips.filter(t=>t.depart===city).slice(0,3);
          const grid = $('#localGrid'); grid.innerHTML='';
          list.forEach(t=>grid.appendChild(card(t)));

  
}

function buildFilters(){
  const froms = [...new Set(trips.map(t=>t.depart))];
  const tos   = [...new Set(trips.map(t=>t.dest))];
  const fFrom = $('#filterFrom'), fTo = $('#filterTo');
  fFrom.innerHTML = `<option value="">출발 지역</option>` + froms.map(v=>`<option>${v}</option>`).join('');
  fTo.innerHTML   = `<option value="">도착 지역</option>`   + tos.map(v=>`<option>${v}</option>`).join('');
  // 기본값
  fFrom.value='서울';
}

function renderSearch(){
  const from = $('#filterFrom').value;
  const to   = $('#filterTo').value;
  const s    = $('#filterStart').value;
  const e    = $('#filterEnd').value;

  let list = trips.slice(0);
  if (from) list = list.filter(t=>t.depart===from);
  if (to)   list = list.filter(t=>t.dest===to);
  if (s)    list = list.filter(t=>d(t.start)>=d(s));
  if (e)    list = list.filter(t=>d(t.end)<=d(e));

  const grid = $('#searchGrid'); grid.innerHTML='';
  list.forEach(t=>grid.appendChild(card(t)));
}

