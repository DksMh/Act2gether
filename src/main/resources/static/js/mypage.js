
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

function renderReviews(reviews) {
  const reviewList = document.getElementById("reviewList");
  const seeAllBtn = document.getElementById("seeAllBtn");

  reviewList.innerHTML = ""; // 초기화

  reviews.forEach((r, i) => {
    const div = document.createElement("div");
    div.classList.add("review");
    //r.title은 종료된 모임에서 가져올 예정인데 아직 미완
    div.innerHTML = `
      <div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)} 
        <span class="date">${r.updatedAt}</span>
      </div>
      <div class="rev-title">${r.title}</div>
      <div class="rev-text">${r.reviewText}</div>
    `;
    // 처음 3개만 보이고, 나머지는 hidden
    if (i >= 3) div.style.display = "none";
    reviewList.appendChild(div);
  });

  // 리뷰가 4개 이상일 때만 버튼 보이기
  if (reviews.length > 3) {
    seeAllBtn.style.display = "block";
    seeAllBtn.onclick = () => {
      document.querySelectorAll("#reviewList .review").forEach(el => {
        el.style.display = "block"; // 다 보이게
      });
      seeAllBtn.style.display = "none"; // 버튼 숨김
    };
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