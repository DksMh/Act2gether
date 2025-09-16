
  //이거 디비 찜목록에서 가져올 것이기 때문에 차후 지워야하고 변경 필요
const sampleWishlist = [
  { title: "[관광 상품] 오로라와 맛의 신세계", summary: "짧은 설명이 들어갑니다. 여행지/상품 안내 등" },
  { title: "[관광 상품] 휴가의 정석", summary: "짧은 설명이 들어갑니다. 여행지/상품 안내 등" },
  { title: "[관광 상품] 오로라와 맛의 신세계", summary: "짧은 설명이 들어갑니다. 여행지/상품 안내 등" },
  { title: "[관광 상품] 어서와요 경주에", summary: "짧은 설명이 들어갑니다. 여행지/상품 안내 등" },
  { title: "[관광 상품] 한국의 스위스", summary: "짧은 설명이 들어갑니다. 여행지/상품 안내 등" }
];
  //이거 디비 모임에서 가져올 것이기 때문에 차후 지워야하고 변경 필요
const trips = [
  {
    title: "강원도 동해로 새벽 새찰하러 가요 서울 출발 당일",
    schedule: "00.00~00.00",
    depart: "서울"
  },
  {
    title: "중년 여성끼리 소박하게 국내 여행 가요",
    schedule: "00.00~00.00",
    depart: "서울"
  },
  {
    title: "모임명",
    schedule: "00.00~00.00",
    depart: "서울"
  },
  {
    title: "강원랜드로 컴온",
    schedule: "00.00~00.00",
    depart: "강원"
  },
  {
    title: "유채꽃과 함께 보내는 봄",
    schedule: "00.00~00.00",
    depart: "제주"
  }
];

  //이거 디비 모임에서 가져올 것이기 때문에 차후 지워야하고 변경 필요
const doneTrips = [
  {
    title: "시원한 계곡으로 오세요",
    schedule: "00.00~00.00",
    depart: "서울"
  },
  {
    title: "메리크리스마스",
    schedule: "00.00~00.00",
    depart: "경기"
  }
];

$(document).ready(function() {
  window.currentUser = {
    username: document.getElementById('usernameSpan')?.textContent?.trim() || null,
  };
    let interests = null;

    function applySelected(containerSelector, values) {
        const $scope = $(containerSelector);
        // 먼저 초기화
        $scope.find('.option-button').removeClass('selected');
        if (!Array.isArray(values)) return;
        values.forEach(v => {
        // data-value="..."와 매칭 (따옴표/특수문자 있을 수 있으니 이스케이프 처리 권장)
        $scope.find(`.option-button[data-value="${v}"]`).addClass('selected');
        });
    }

    var emailData = $("#emailSpan").text().trim();
    const data = {
        email: emailData
    };
    console.log(emailData);
    $.ajax({
        url: "/profile/user",
        type: 'post',
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function(res, textStatus, jqXHR) {
            console.log(res);
            $('#nickname').text(res.username);
            $('#ageGroup').text(res.age);
            $('#gender').text(res.gender);
            $('#location').text(res.region);
            const interestsObj = JSON.parse(res.interests);
            interests = (typeof res.interests === "string")
                        ? JSON.parse(res.interests)
                        : (res.interests || {});

            renderPills('#prefRegions', interestsObj.preferredRegions);
            renderPills('#prefPlaces',   interestsObj.places);         // 혹은 destinations 등 실제 키
            renderPills('#prefFacilities', interestsObj.needs);        // 접근성/유아동 등
            renderReviews(res.reviews);
            //데이터 변경 필요
            renderWishlist(sampleWishlist);
            setActive('upcoming');
            renderGathering(trips);
            console.log(interestsObj.preferredRegions); // ["서울"]
            console.log(interestsObj.preferredRegions[0]); // "서울"
            // $('#location').text(res.location);
        },
        error: function(request, status, error) {
            // console.log("Error:", error);
            // console.log("Response:", request.responseText);
        },
        complete: function(jqXHR, textStatus) {
            
        }
    });

    $("#tour").on("click", function() {
        const modal = document.getElementById('interestModal');
        modal.classList.add('is-open');
        document.body.classList.add('modal-open');
        // interests가 준비되어 있으면 선택 반영
        if (interests) {
        // 섹션별 컨테이너 id에 맞춰 적용
        applySelected('#regionOptions', interests.preferredRegions);
        applySelected('#placeOptions',  interests.places);
        applySelected('#needsOptions',  interests.needs);
        }
        // 접근성: 포커스 이동 (필요하면 첫 버튼으로)
        const firstBtn = modal.querySelector('.option-button, .btn');
        if (firstBtn) firstBtn.focus();
    });

    

  // 오버레이(빈 영역) 클릭 시 닫기
  document.addEventListener('click', function(e){
    const modal = document.getElementById('interestModal');
    if (!modal.classList.contains('is-open')) return;
    const dialog = modal.querySelector('.modal__dialog');
    if (e.target === modal) { // 오버레이 영역 직접 클릭
      closeInterestModal();
    }
  });

  // ESC로 닫기
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeInterestModal();
  });

  // (선택) 옵션 버튼 토글 선택 효과 예시
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.option-button');
    if (!btn) return;
    btn.classList.toggle('selected');
  });

  // 모달 DOM이 없으면 생성
  function ensureSettingsModal(){
    let $m = $('#settingsModal');
    if($m.length) return $m;

    const html = `
      <div id="settingsModal" hidden>
        <div class="modal-backdrop" role="presentation"></div>
        <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="settingsTitle" tabindex="-1">
          <div class="modal-header">
            <div class="modal-title" id="settingsTitle">개인정보 설정</div>
            <button class="modal-close" aria-label="닫기">✕</button>
          </div>
          <div class="list">
            <button class="item" data-action="avatar">대표 사진 변경 <span class="chev">›</span></button>
            <button class="item" data-action="profile">닉네임 / 거주지역 변경 <span class="chev">›</span></button>
            <button class="item" data-action="password">비밀번호 변경 <span class="chev">›</span></button>
            <button class="item" data-action="consents">정책 동의 이력 <span class="chev">›</span></button>
            <button class="item danger" data-action="withdraw">서비스 탈퇴 <span class="chev">›</span></button>
          </div>
        </div>
      </div>`;
    $('body').append(html);
    $m = $('#settingsModal');
    return $m;
  }

  function openSettingsModal(){
    const $m = ensureSettingsModal();
    $m.removeAttr('hidden');
    requestAnimationFrame(()=> $m.addClass('open')); // 애니메이션
    $('body').css('overflow','hidden');              // 스크롤 잠금
    // 포커스 이동
    $m.find('.modal-panel').trigger('focus');
  }

  function closeSettingsModal(){
    const $m = $('#settingsModal');
    $m.removeClass('open');
    setTimeout(()=>{ $m.attr('hidden',''); $('body').css('overflow',''); }, 160);
  }

  // 트리거: #settings 클릭 시 오픈
  $('#settings').off('click.openSettings').on('click.openSettings', function(e){
    e.preventDefault();
    openSettingsModal();
  });

  // 닫기(배경/버튼/ESC)
  $(document).on('click', '#settingsModal .modal-close, #settingsModal .modal-backdrop', closeSettingsModal);
  $(document).on('keydown', function(e){
    if(e.key === 'Escape' && $('#settingsModal').is(':visible')) closeSettingsModal();
  });

  // 항목 클릭 핸들러(필요시 실제 화면/모달/페이지로 변경)
  $(document).on('click', '#settingsModal .item', function(){
    const action = $(this).data('action');

    switch(action){
      case 'avatar':
        // TODO: 프로필이미지 변경 모달/페이지 열기
        openAvatarSheet();
        break;
      case 'profile':
        openNickRegionModal();
        break;
      case 'password':
        if (window.showToast) showToast('비밀번호 변경 화면을 여는 중…', 'info');
        break;
      case 'consents':
        if (window.showToast) showToast('정책 동의 이력 조회 화면을 여는 중…', 'info');
        break;
      case 'withdraw':
        // 실제로는 확인 다이얼로그 -> 탈퇴 API 호출 흐름 권장
        if (confirm('정말 서비스에서 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
          // fetch('/api/account/withdraw', { method:'POST' }) …
          if (window.showToast) showToast('탈퇴 요청을 처리했습니다.', 'success');
        }
        break;
    }
    // 필요 시 모달을 닫고 다음 화면으로 전환
    // closeSettingsModal();
  });

  // ==== 열기/닫기 도우미 ====
function openNickRegionModal() {
  closeSettingsModal();
  const m = document.getElementById('nickRegionModal');
  m.hidden = false;
  document.body.style.overflow = 'hidden';
  const targetText = $('#location').text().trim();
  $('#nrRegion').val(targetText).trigger('change');

}
function closeNickRegionModal() {
  const m = document.getElementById('nickRegionModal');
  m.hidden = true;
  document.body.style.overflow = '';
}

// ==== 닉네임/거주지 변경 ====
// POST /profile/updateNR  body: { username, region } -> { username, region }
async function updateProfileBasic(payload) {
  const res = await fetch('/profile/updateNR', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function getUsernames() {
  const res = await fetch('/profile/username', {
    method: 'GET'
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const list = await res.json();
  return Array.isArray(list)
    ? list.map(s => String(s).trim()).filter(Boolean)
    : [];
}

// 2) 닫기 버튼/백드롭
$(document).on('click', '#nickRegionModal .nr-close, #nickRegionModal .nr-backdrop, #nickRegionModal .nr-cancel', function(){
  closeNickRegionModal();
});

// 3) 저장
$(document).on('click', '#nickRegionModal .nr-save', async function(){
  const $btn = $(this);
  if ($btn.data('busy')) return;

  const nickname = $('#nrNickname').val().trim();
  const region   = $('#nrRegion').val();
  const me        = (window.currentUser?.username || '').toLowerCase();

  if (!nickname) { showToast('닉네임을 입력해주세요.', 'warning'); return; }

   try {
    const usernames = await getUsernames();          
    const lowerSet  = new Set(usernames.map(u => u.toLowerCase()));
    console.log("username : " + me);
    // 본인의 기존 닉네임은 통과, 그 외엔 중복 금지
    const isDup = lowerSet.has(nickname.toLowerCase()) && nickname.toLowerCase() !== me;
    if (isDup) {
      showToast('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.', 'warning');
      $('#nrNickname').focus();
      return;
    }
  } catch (e) {
    console.error('username 목록 조회 실패:', e);
    showToast('닉네임 중복 확인에 실패했습니다. 잠시 후 다시 시도해주세요.', 'danger');
    return;
  }

  $btn.data('busy', true).prop('disabled', true).text('저장 중...');

  try {
    const data = {
      username: nickname,
      region: region,
      me: me
    }
    const saved = await updateProfileBasic(data);
    // 화면 동기화 (있을 때만)
    $('#nickname, .js-nickname').text(saved.nickname || nickname);
    $('#location, .js-residence').text(saved.region || region);
    window.currentUser.username = saved.nickname || nickname;

    showToast('변경사항이 저장되었습니다.', 'success');
    closeNickRegionModal();
    // location.reload();
  } catch(err) {
    console.error('프로필 저장 실패:', err);
    showToast('저장 중 오류가 발생했습니다.', 'danger');
  } finally {
    $btn.data('busy', false).prop('disabled', false).text('완료');
  }
});

  /** 아바타 변경 시트 열기 */
function openAvatarSheet(){
  closeSettingsModal();
  const $modal = $('#settingsModal');
  if ($('#avatarSheet').length) { $('#avatarSheet').remove(); }

  const curUrl = getCurrentAvatarUrl();
  const sheet = $(`
    <div id="avatarSheet" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.25); z-index:10001;">
      <div style="width:min(520px, 92vw); background:#fff; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.18); overflow:hidden;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #eee;">
          <strong>대표 사진 변경</strong>
          <button class="as-close" style="border:0;background:transparent;font-size:18px;">✕</button>
        </div>
        <div style="padding:16px;">
          <div style="display:flex; gap:16px; align-items:flex-start;">
            <div style="flex:0 0 120px; height:120px; border-radius:9999px; overflow:hidden; border:1px solid #eee;">
              <img id="avatarPreview" src="${curUrl}" alt="미리보기" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div style="flex:1;">
              <input type="file" id="avatarFile" accept="image/*">
              <p style="color:#6b7280; font-size:12px; margin:8px 0 0;">
                JPG/PNG, 최대 10MB. 정사각형 이미지가 가장 예뻐요 😊
              </p>
            </div>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; padding:12px 16px; border-top:1px solid #eee;">
          <button class="as-cancel" style="padding:8px 14px; border:1px solid #e5e7eb; background:#fff; border-radius:8px;">취소</button>
          <button class="as-save"   style="padding:8px 14px; border:0; background:#2563eb; color:#fff; border-radius:8px;" disabled>저장</button>
        </div>
      </div>
    </div>
  `);

  $modal.append(sheet);

  // 파일 선택 → 미리보기
  let pickedFile = null;
  $('#avatarFile').on('change', function(e){
    const f = (e.target.files||[])[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('이미지 파일만 업로드할 수 있어요.','warning'); return; }
    if (f.size > 10 * 1024 * 1024) { toast('최대 10MB까지 가능합니다.','warning'); return; }

    pickedFile = f;
    const url = URL.createObjectURL(f);
    $('#avatarPreview').attr('src', url);
    sheet.find('.as-save').prop('disabled', false);
  });

  // 닫기
  sheet.on('click', '.as-close, .as-cancel', function(){
    sheet.remove();
  });

  // 저장(업로드)
  sheet.on('click', '.as-save', function(){
    if (!pickedFile) { toast('먼저 이미지를 선택해주세요.','warning'); return; }

    const fd = new FormData();
    console.log("username >>> " + $('#nickname').text().trim());
    fd.append('username', $('#nickname').text().trim());
    fd.append('file', pickedFile);

    const $btn = $(this).prop('disabled', true).text('업로드 중…');
    $.ajax({
      url: '/profile/account/avatar',
      method: 'POST',
      data: fd, processData: false, contentType: false
    }).done(function(resp){
      // 서버가 avatarUrl 반환한다고 가정
      const newUrl = (resp && resp.avatarUrl) ? (resp.avatarUrl + '?v=' + Date.now()) : getCurrentAvatarUrl(true);
      applyAvatarToPage(newUrl);
      toast('대표 사진이 변경되었습니다!','success');
      sheet.remove();
    }).fail(function(xhr){
      console.error(xhr);
      toast('업로드에 실패했습니다.','danger');
      $btn.prop('disabled', false).text('저장');
    });
  });
}

function getCurrentAvatarUrl(useBust){
  // 페이지의 원형 아바타 이미지 셀렉터 맞춰서 사용
  const $img = $('#profileAvatar, .profile-avatar img').eq(0);
  const url = $img.attr('src');
  return useBust ? (url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now()) : url;
}

function applyAvatarToPage(url){
  const $img = $('#profileAvatar, .profile-avatar img').eq(0);
  if ($img.length) $img.attr('src', url);
}

// 토스트 헬퍼(프로젝트의 showToast가 있으면 그걸 사용)
function toast(msg, type){ if (window.showToast) showToast(msg, type||'info'); else alert(msg); }

// 설정 모달의 “대표 사진 변경” 항목 클릭 → 아바타 시트 열기
// $(document).on('click', '#settingsModal .item[data-action="avatar"]', function(){
//   openAvatarSheet();
// });
});

// 사용자 관심사 업데이트
function updateUserInterests() {
  const sections = {
    regionOptions: "preferredRegions",
    placeOptions: "places",
    needsOptions: "needs",
  };

  userInterests = {};

  Object.keys(sections).forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const selectedOptions = section.querySelectorAll(".option-button.selected");
      const values = Array.from(selectedOptions).map((btn) => btn.dataset.value);
      userInterests[sections[sectionId]] = values;
    }
  });
}

function escapeHtml(s='') {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function setActive(filter) {
  document.querySelectorAll('.pill').forEach(p => {
    const isActive = p.dataset.filter === filter;
    p.classList.toggle('active', isActive);
    p.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  // 현재 선택 pill에 포커스 주기(원치 않으면 이 줄은 빼세요)
  const current = document.querySelector(`.pill[data-filter="${filter}"]`);
  current?.focus();
}

document.addEventListener('keydown', (e) => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    const filter = pill.dataset.filter;
    if (!filterMap[filter]) return;
    filterMap[filter]();
    setActive(filter);
  }
});

// 4) 필터 이벤트
const filterMap = {
  upcoming: () => renderGathering(trips),
  done:     () => renderGathering(doneTrips),
};

document.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  const filter = pill.dataset.filter;        // 'upcoming' | 'done'
  if (!filterMap[filter]) return;
  filterMap[filter]();
  setActive(filter);
});

function renderGathering(items) {
  const listEl = document.getElementById("gathering");
  const seeAllBtn = document.getElementById("seeAllBtn-m");
  const seeShortBtn = document.getElementById("seeShortBtn-m");
  if (!listEl) return;

  listEl.innerHTML = "";

  items.forEach((item, idx) => {
    const card = document.createElement("article");
    card.className = "card";
    if (idx >= 3) card.style.display = "none";
    card.innerHTML = `
      <div class="thumb"></div>
      <div class="card-body">
        <h3 class="card-title">${item.title}</h3>
        <div class="meta">
              <span>${item.schedule}</span>
              <span>${item.depart}</span>
        </div>
      </div>`;
    listEl.appendChild(card);
  });

  if (items.length > 3) {
    seeAllBtn.style.display = "inline-block";
    seeShortBtn.style.display = "none";
    seeAllBtn.onclick = () => {
      listEl.querySelectorAll(".card").forEach(el => el.style.display = "block");
      seeAllBtn.style.display = "none";
      seeShortBtn.style.display = "inline-block";
    };
    seeShortBtn.onclick = () => {
      listEl.querySelectorAll(".card").forEach((el, i) =>
        el.style.display = i < 3 ? "block" : "none"
      );
      seeAllBtn.style.display = "inline-block";
      seeShortBtn.style.display = "none";
    };
  } else {
    seeAllBtn.style.display = "none";
    seeShortBtn.style.display = "none";
  }
}

function renderWishlist(items) {
  const listEl = document.getElementById("wishlistList");
  const seeAllBtn = document.getElementById("seeAllBtn-w");
  const seeShortBtn = document.getElementById("seeShortBtn-w");
  if (!listEl) return;

  listEl.innerHTML = "";

  items.forEach((item, idx) => {
    const card = document.createElement("article");
    card.className = "card";
    if (idx >= 3) card.style.display = "none";
    card.innerHTML = `
      <div class="thumb"></div>
      <div class="card-body">
        <h3 class="card-title">${item.title}</h3>
        <div class="rev-text">${item.summary}</div>
      </div>`;
    listEl.appendChild(card);
  });

  if (items.length > 3) {
    seeAllBtn.style.display = "inline-block";
    seeShortBtn.style.display = "none";
    seeAllBtn.onclick = () => {
      listEl.querySelectorAll(".card").forEach(el => el.style.display = "block");
      seeAllBtn.style.display = "none";
      seeShortBtn.style.display = "inline-block";
    };
    seeShortBtn.onclick = () => {
      listEl.querySelectorAll(".card").forEach((el, i) =>
        el.style.display = i < 3 ? "block" : "none"
      );
      seeAllBtn.style.display = "inline-block";
      seeShortBtn.style.display = "none";
    };
  } else {
    seeAllBtn.style.display = "none";
    seeShortBtn.style.display = "none";
  }
}

function renderReviews(reviews) {
  const reviewList = document.getElementById("reviewList");
  const seeAllBtn = document.getElementById("seeAllBtn-r");
  const seeShortBtn = document.getElementById("seeShortBtn-r");

  reviewList.innerHTML = ""; // 초기화

  reviews.forEach((r, i) => {
    const div = document.createElement("div");
    div.classList.add("review");
    div.innerHTML = `
      <div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)} 
        <span class="date">${r.updatedAt}</span>
      </div>
      <div class="rev-title">${r.title}</div>
      <div class="rev-text">${r.reviewText}</div>
    `;
    // 처음 3개만 보이고, 나머지는 hidden
    if (i >= 3){
      div.style.display = "none";
    }
    reviewList.appendChild(div);
  });

  // 리뷰가 4개 이상일 때만 버튼 보이기
  if (reviews.length > 3) {
    seeAllBtn.style.display = "block";
    seeShortBtn.style.display = "none"; // 처음엔 안보임

    seeAllBtn.onclick = () => {
      document.querySelectorAll("#reviewList .review").forEach(el => {
        el.style.display = "block"; // 전부 보이기
      });
      seeAllBtn.style.display = "none"; 
      seeShortBtn.style.display = "block"; 
    };

    seeShortBtn.onclick = () => {
      document.querySelectorAll("#reviewList .review").forEach((el, i) => {
        el.style.display = (i < 3) ? "block" : "none"; // 처음 3개만 보이기
      });
      seeAllBtn.style.display = "block"; 
      seeShortBtn.style.display = "none"; 
    };
  } else {
    // 리뷰가 3개 이하라면 버튼 숨기기
    seeAllBtn.style.display = "none";
    seeShortBtn.style.display = "none";
  }

}

// 온보딩 완료
function completeOnboarding() {
  updateUserInterests();

  // 최소 하나의 관심사는 선택해야 함
  const hasInterests = Object.values(userInterests).some((arr) => arr.length > 0);
  if (!hasInterests) {
    alert("최소 하나의 관심사를 선택해주세요.");
    return;
  }

  console.log("선택된 관심사:", userInterests);

  // 로딩 표시
//   showLoading();

  // 관심사 정보 서버로 전송
  $.ajax({
    url: "/users/interests",
    type: 'POST',
    contentType: "application/json",
    data: JSON.stringify(userInterests),
    success: function(response, textStatus, jqXHR) {
        console.log("관심사 저장 성공");
        closeInterestModal();
        location.reload();
      
    },
    error: function(request, status, error) {
      
      console.error("관심사 저장 오류:", error);
    }
  });
}

function closeInterestModal() {
    const modal = document.getElementById('interestModal');
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
}

// 선호 데이터 넣는 함수
function renderPills(containerSelector, items) {
  const $wrap = $(containerSelector);
  $wrap.empty();

  if (!items || items.length === 0) {
    // 없으면 표시를 생략하거나 기본 텍스트
    // $wrap.append('<span class="pill">없음</span>');
    return;
  }

  items.forEach((txt) => {
    $wrap.append($('<span/>', { class: 'pill', text: txt }));
  });
}

// 토스트 메시지 표시
function showToast(message, type = "success") {
  const types = {
    success: { icon: "✅", color: "var(--success-color)" },
    error: { icon: "❌", color: "var(--accent-color)" },
    warning: { icon: "⚠️", color: "var(--warning-color)" },
    info: { icon: "ℹ️", color: "var(--secondary-color)" },
  };

  const config = types[type] || types["success"];

  const toastHtml = `
        <div class="toast" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${config.color};
            color: white;
            padding: 16px 20px;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-medium);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 400px;
            font-size: 16px;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.4s ease;
        ">
            <span>${config.icon}</span>
            <span>${message}</span>
        </div>
    `;

  $("body").append(toastHtml);

  const $toast = $(".toast").last();

  // 애니메이션으로 토스트 표시
  setTimeout(() => $toast.css("transform", "translateX(0)"), 100);

  // 4초 후 자동 제거
  setTimeout(() => {
    $toast.css("transform", "translateX(100%)");
    setTimeout(() => $toast.remove(), 400);
  }, 4000);

  // 클릭으로 수동 제거
  $toast.on("click", function () {
    $(this).css("transform", "translateX(100%)");
    setTimeout(() => $(this).remove(), 400);
  });
}
