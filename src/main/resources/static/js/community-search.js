
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

  if (!wrap) return;

  // 스크롤러 뼈대
  wrap.classList.add('enrolled-scroller');
  wrap.innerHTML = `
    <button class="sc-nav prev" aria-label="이전" hidden>‹</button>
    <div class="sc-viewport"><div class="sc-track"></div></div>
    <button class="sc-nav next" aria-label="다음" hidden>›</button>
  `;

  const viewport = wrap.querySelector('.sc-viewport');
  const track    = wrap.querySelector('.sc-track');
  const prevBtn  = wrap.querySelector('.sc-nav.prev');
  const nextBtn  = wrap.querySelector('.sc-nav.next');
track.innerHTML = '';
  rows.forEach((item) => {
    let intro = {};
    try { intro = typeof item.intro === 'string' ? JSON.parse(item.intro) : (item.intro || {}); } catch {}
    const title  = intro.title || item.title || '모임';
    const depart = intro.departureRegion || item.departureRegion || '';

    const d = dday1(item.startDate);
    const badgeText =
      d > 0   ? `여행 시작까지 <strong style="color:#ff5900">${d}</strong>일 남았어요!`
      : d === 0 ? `<strong style="color:#ff5900">오늘 출발!</strong>`
      : `여행 중이거나 종료되었습니다`;

    const card = document.createElement('article');
    card.className = 'enrolled-card';
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="badge-row">
        <span class="badge">${badgeText}</span>
        ${depart ? `<span class="badge out">${depart} 출발</span>` : ''}
      </div>
      <h3 class="card-title">${title}</h3>
      <div class="meta">
        <span>${(item.startDate||'').replaceAll('-', '.')} ~ ${(item.endDate||'').replaceAll('-', '.')}</span>
        <span>${Number(item.maxMembers)||0}명 모집 (현재 ${Number(item.currentMembers)||0}명)</span>
      </div>
    `;
    card.addEventListener('click', () => {
      if (item.groupId) location.href = `/community?groupId=${encodeURIComponent(item.groupId)}`;
    });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') card.click(); });
    track.appendChild(card);
  });

  // 2개 초과일 때만 스크롤/버튼 노출
  const enableScroll = rows.length > 2;
  viewport.style.overflowX = enableScroll ? 'auto' : 'hidden';

  function updateNav() {
    const canScroll = enableScroll && track.scrollWidth > viewport.clientWidth + 2;
    prevBtn.hidden = nextBtn.hidden = !canScroll;
    prevBtn.disabled = viewport.scrollLeft <= 0;
    nextBtn.disabled = viewport.scrollLeft + viewport.clientWidth >= track.scrollWidth - 1;
  }

  const step = () => Math.max(280, Math.round(viewport.clientWidth * 0.9)); // 스크롤 한 번에 이동량
  prevBtn.onclick = () => viewport.scrollBy({ left: -step(), behavior: 'smooth' });
  nextBtn.onclick = () => viewport.scrollBy({ left:  step(), behavior: 'smooth' });

  // 마우스 휠을 가로 스크롤로 전환(트랙패드/휠)
  viewport.addEventListener('wheel', (e) => {
    if (!enableScroll) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      viewport.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  viewport.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav);

  // 최초 상태 동기화
  updateNav();
}


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

/* ---- 카드 템플릿 ---- */
function buildLocalCard(item) {
  // intro(JSON) 파싱
  let intro = {};
  try {
    intro = typeof item.intro === 'string' ? JSON.parse(item.intro) : (item.intro || {});
  } catch {}

  const title  = intro.title || item.title || '모임';
  const depart = intro.departureRegion || item.departureRegion || '';

  const kStart = (item.startDate || '').replaceAll('-', '.');
  const kEnd   = (item.endDate   || '').replaceAll('-', '.');

  const n = dday1(item.startDate);
  const pillText =
    n > 0  ? `여행 시작까지 <span class="num">${n}</span>일 남았어요!`
  : n === 0 ? `<span class="num">오늘</span> 출발!`
            : `여행 중이거나 종료`;

  const el = document.createElement('article');
  el.className = 'tg-card';
  el.setAttribute('role', 'button');  // 접근성
  el.tabIndex = 0;

  // ✅ 여기서 data-group-id / data-enrolled 세팅
  if (item.groupId) el.dataset.groupId = item.groupId;
  // 서버가 가입여부를 내려줄 경우 true로 세팅(없으면 생략)
  if (item.enrolled === true || item.isMember === true) {
    el.dataset.enrolled = 'true';
  }

  el.innerHTML = `
    <div class="pill-row">
      <span class="pill">${pillText}</span>
      ${depart ? `<span class="pill out">${depart} 출발</span>` : ''}
    </div>
    <div class="title">${title}</div>
    <div class="meta">
      <span>${kStart} ~ ${kEnd}</span>
      <span>${Number(item.maxMembers) || 0}명 모집 (현재 ${Number(item.currentMembers) || 0}명)</span>
    </div>
  `;

  // ⛔️ 직접 이동은 제거 — 전역 클릭 핸들러가 처리
  // el.addEventListener('click', () => { ... });

  // 키보드 Enter로도 클릭 동작
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.click();
  });

  return el;
}

/* ---- 렌더러 ----
-------------------------------------------------- */
async function renderLocal() {
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

  const grid  = document.getElementById('localGrid');
  const more  = document.getElementById('localMoreBtn');
  const less  = document.getElementById('localLessBtn');
  const region = document.getElementById("myCity").textContent.trim();
  if (!grid) return;

  // 데이터 로드
  let rows = [];
  try {
    const res = await fetch(`/community/gathering/${encodeURIComponent(region)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    rows = await res.json();
    if (!Array.isArray(rows)) rows = [];
  } catch (e) {
    console.error('renderLocal fetch error:', e);
    rows = [];
  }

  // 비우고 채우기
  grid.innerHTML = '';
  rows.forEach((row) => grid.appendChild(buildLocalCard(row)));

  // 최초 3개만 보이기
  const CARDS_TO_SHOW = 3;
  const cards = Array.from(grid.children);
  const hideRest = () => cards.forEach((c, i) => { c.style.display = (i < CARDS_TO_SHOW) ? '' : 'none'; });
  const showAll  = () => cards.forEach((c) => { c.style.display = ''; });

  if (cards.length > CARDS_TO_SHOW) {
    hideRest();
    more.hidden = false;
    less.hidden = true;

    more.onclick = () => { showAll();  more.hidden = true; less.hidden = false; };
    less.onclick = () => { hideRest(); more.hidden = false; less.hidden = true;  };
  } else {
    more.hidden = true;
    less.hidden = true;
  }

  // 빈 상태
  if (!cards.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; color:#6b7280; padding:28px 0;">
        이 지역의 출발 모임이 아직 없어요.
      </div>`;
  }
}

function renderSearchResults(data){
  let rows = [];
  const grid  = document.getElementById('searchGrid');
  const more  = document.getElementById('searchMoreBtn');
  const less  = document.getElementById('searchLessBtn');
  rows = data;
  if (!Array.isArray(rows)) rows = [];

  // 비우고 채우기
  grid.innerHTML = '';
  rows.forEach((row) => grid.appendChild(buildLocalCard(row)));

  // 최초 3개만 보이기
  const CARDS_TO_SHOW = 3;
  const cards = Array.from(grid.children);
  const hideRest = () => cards.forEach((c, i) => { c.style.display = (i < CARDS_TO_SHOW) ? '' : 'none'; });
  const showAll  = () => cards.forEach((c) => { c.style.display = ''; });

  if (cards.length > CARDS_TO_SHOW) {
    hideRest();
    more.hidden = false;
    less.hidden = true;

    more.onclick = () => { showAll();  more.hidden = true; less.hidden = false; };
    less.onclick = () => { hideRest(); more.hidden = false; less.hidden = true;  };
  } else {
    more.hidden = true;
    less.hidden = true;
  }

  // 빈 상태
  if (!cards.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; color:#6b7280; padding:28px 0;">
        해당 조건의 모임이 없습니다.
      </div>`;
  }
}

/// ✅ DOM 로드 이후 바인딩
document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('allToggle');
  if (!box) return;

  const targetIds = ['filterFrom','filterTo','filterStart','filterEnd'];

  const setDisabled = (on) => {
    targetIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;                  // 없으면 건너뜀
      el.disabled = on;
      if (on) el.value = '';            // 전체보기일 때 값 초기화
      // 시각적 처리(선택)
      el.closest('.select-pill')?.classList.toggle('is-disabled', on);
    });
  };

  // 초기 상태 반영 + 변경 시 반영
  setDisabled(box.checked);
  box.addEventListener('change', () => setDisabled(box.checked));

  const btn = document.getElementById('searchBtn');
  if (!btn) return;
  btn.addEventListener('click', onSearchClick);
});

async function onSearchClick() {
  const from  = (document.getElementById('filterFrom')?.value || '').trim();
  const to    = (document.getElementById('filterTo')?.value || '').trim();
  const start = (document.getElementById('filterStart')?.value || '').trim(); // yyyy-mm-dd
  const end   = (document.getElementById('filterEnd')?.value || '').trim();   // yyyy-mm-dd
  const all   = !!document.getElementById('allToggle')?.checked;

  // 전체보기 아니면 최소 1개는 선택해야 함
  if (!all && !from && !to && !start && !end) {
    alert('검색 조건을 최소 1개 이상 선택해주세요.');
    return;
  }

  // 날짜 검증(전체보기 아닐 때만)
  if (!all && start && end) {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(+s) || isNaN(+e)) {
      alert('날짜 형식이 올바르지 않습니다. (예: 2025-10-05)');
      return;
    }
    if (s > e) {
      alert('여행 시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
  }

  // 쿼리 구성
  const qs = new URLSearchParams();
  qs.set('all', String(all));                // 컨트롤러에서 @RequestParam boolean all 로 받기
  if (!all) {
    if (from)  qs.set('from', from);
    if (to)    qs.set('to', to);
    if (start) qs.set('start', start);
    if (end)   qs.set('end', end);
  }

  // 버튼 상태 변경(선택)
  const btn = document.getElementById('searchBtn');
  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = '검색 중…';

  try {
    // 컨트롤러: GET /community/search?from=..&to=..&start=..&end=..&all=true|false
    const res = await fetch(`/community/search?${qs.toString()}`, {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || '검색 요청 실패');
    }
    const data = await res.json();

    // 화면 반영: 필요한 렌더 함수가 있으면 사용, 없으면 콘솔 확인
    if (typeof renderSearchResults === 'function') {
      renderSearchResults(data); // ex) 그리드에 그려주는 함수
    } else {
      console.log('검색결과:', data);
      alert(`총 ${Array.isArray(data) ? data.length : 0}건을 찾았습니다.`);
    }
  } catch (err) {
    console.error(err);
    alert('검색 중 오류가 발생했습니다.\n' + (err?.message || ''));
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

// 공통 토스트(있으면 사용, 없으면 alert)
function toast(msg, type){ 
  if (typeof showToast === 'function') showToast(msg, type || 'info'); 
  else alert(msg);
}

// 카드 클릭 위임: 페이지 어디서든 [data-group-id] 요소 클릭을 잡음
document.addEventListener('click', async (e) => {
  const card = e.target.closest('[data-group-id]');
  if (!card) return;

  const groupId   = card.dataset.groupId;
  const enrolledH = card.dataset.enrolled === 'true';
  await handleGroupCardClick(groupId, enrolledH);
});

async function handleGroupCardClick(groupId, enrolledHint = false) {
  // 1) 로그인 체크
  const username = (window.currentUser?.username || '').toLowerCase();
  if (!username) {
    if (confirm('로그인이 필요합니다. 로그인 하시겠어요?')) {
      const redirect = `/community?groupId=${encodeURIComponent(groupId)}`;
      window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
    }
    return;
  }

  // 2) 가입 여부 확인(힌트가 없으면 서버에 한번 확인)
  let isMember = enrolledHint;
  if (!isMember) {
    try {
      const r = await fetch(`/community/member/me?groupId=${encodeURIComponent(groupId)}`, {
        credentials: 'include'
      });
      if (r.ok) {
        const j = await r.json();
        isMember = !!j.member;
      }
    } catch (err) {
      console.warn('가입 여부 확인 실패(무시):', err);
    }
  }

  // 3) 이미 가입 → 바로 이동
  if (isMember) {
    window.location.href = `/community?groupId=${encodeURIComponent(groupId)}`;
    return;
  }

  // 4) 미가입 → 가입 확인
  if (!confirm('아직 가입하지 않은 모임입니다. 지금 가입하시겠어요?')) return;

  // 5) 가입 시도 (너가 쓰던 API에 맞춰 전달)
  try {
    const payload = {
      groupId,                     // 커뮤니티 그룹 ID
      username: username,                    // 현재 사용자
      memberType: 'member'         // 기본 member (필요에 맞게)
    };

    const r = await fetch('/community/only/member/save', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const msg = await r.text();
      throw new Error(msg || '가입 실패');
    }

    toast('가입이 완료되었습니다. 커뮤니티로 이동합니다.', 'success');
    window.location.href = `/community?groupId=${encodeURIComponent(groupId)}`;
  } catch (err) {
    console.error(err);
    toast('가입 중 오류가 발생했습니다.');
  }
}