
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