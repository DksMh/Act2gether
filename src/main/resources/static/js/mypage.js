//이거 디비 찜목록에서 가져올 것이기 때문에 차후 지워야하고 변경 필요
const sampleWishlist = [
  {
    title: "[관광 상품] 오로라와 맛의 신세계",
    summary: "짧은 설명이 들어갑니다. 여행지/상품 안내 등",
  },
  {
    title: "[관광 상품] 휴가의 정석",
    summary: "짧은 설명이 들어갑니다. 여행지/상품 안내 등",
  },
  {
    title: "[관광 상품] 오로라와 맛의 신세계",
    summary: "짧은 설명이 들어갑니다. 여행지/상품 안내 등",
  },
  {
    title: "[관광 상품] 어서와요 경주에",
    summary: "짧은 설명이 들어갑니다. 여행지/상품 안내 등",
  },
  {
    title: "[관광 상품] 한국의 스위스",
    summary: "짧은 설명이 들어갑니다. 여행지/상품 안내 등",
  },
];
//이거 디비 모임에서 가져올 것이기 때문에 차후 지워야하고 변경 필요
const trips = [
  {
    title: "강원도 동해로 새벽 새찰하러 가요 서울 출발 당일",
    schedule: "00.00~00.00",
    depart: "서울",
  },
  {
    title: "중년 여성끼리 소박하게 국내 여행 가요",
    schedule: "00.00~00.00",
    depart: "서울",
  },
  {
    title: "모임명",
    schedule: "00.00~00.00",
    depart: "서울",
  },
  {
    title: "강원랜드로 컴온",
    schedule: "00.00~00.00",
    depart: "강원",
  },
  {
    title: "유채꽃과 함께 보내는 봄",
    schedule: "00.00~00.00",
    depart: "제주",
  },
];

//이거 디비 모임에서 가져올 것이기 때문에 차후 지워야하고 변경 필요
const doneTrips = [
  {
    title: "시원한 계곡으로 오세요",
    schedule: "00.00~00.00",
    depart: "서울",
  },
  {
    title: "메리크리스마스",
    schedule: "00.00~00.00",
    depart: "경기",
  },
];

// 전역 변수
let userInterests = {};
let selectedPlaceCount = 0;
const MAX_PLACE_SELECTION = 6;

$(document).ready(function () {
  window.currentUser = {
    username:
      document.getElementById("usernameSpan")?.textContent?.trim() || null,
  };
  let interests = null;

  function applySelected(containerSelector, values) {
    const $scope = $(containerSelector);
    // 먼저 초기화
    $scope.find(".option-button").removeClass("selected");
    if (!Array.isArray(values)) return;
    values.forEach((v) => {
      // data-value="..."와 매칭 (따옴표/특수문자 있을 수 있으니 이스케이프 처리 권장)
      $scope.find(`.option-button[data-value="${v}"]`).addClass("selected");
    });
  }

  var emailData = $("#emailSpan").text().trim();
  const data = {
    email: emailData,
  };
  console.log(emailData);
  $.ajax({
    url: "/profile/user",
    type: "post",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res, textStatus, jqXHR) {
      console.log(res);
      $("#nickname").text(res.username);
      $("#ageGroup").text(res.age);
      $("#gender").text(res.gender);
      $("#location").text(res.region);
      const interestsObj = JSON.parse(res.interests);
      interests =
        typeof res.interests === "string"
          ? JSON.parse(res.interests)
          : res.interests || {};

      renderPills("#prefRegions", interestsObj.preferredRegions);
      renderPills("#prefPlaces", interestsObj.places); // 혹은 destinations 등 실제 키
      renderPills("#prefFacilities", interestsObj.needs); // 접근성/유아동 등
      // renderReviews(res.reviews);
      //데이터 변경 필요
      renderWishlist(sampleWishlist);
      setActive("upcoming");
      renderGathering();
      console.log(interestsObj.preferredRegions); // ["서울"]
      console.log(interestsObj.preferredRegions[0]); // "서울"
      // $('#location').text(res.location);
    },
    error: function (request, status, error) {
      // console.log("Error:", error);
      // console.log("Response:", request.responseText);
    },
    complete: function (jqXHR, textStatus) {},
  });

  $("#tour").on("click", function () {
    const modal = document.getElementById("interestModal");
    // 250917 모달 열기 전 초기화
    $(".option-button").removeClass("selected");
    selectedPlaceCount = 0;
    userInterests = {};

    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    modal.removeAttribute("aria-hidden");

    // interests가 준비되어 있으면 선택 반영
    if (interests) {
      // 지역
      if (interests.preferredRegions) {
        interests.preferredRegions.forEach((region) => {
          $(`#regionOptions .option-button[data-value="${region}"]`).addClass(
            "selected"
          );
        });
      }

      // 장소
      if (interests.places) {
        interests.places.forEach((place) => {
          $(`#placeOptions .option-button[data-value="${place}"]`).addClass(
            "selected"
          );
        });
        selectedPlaceCount = interests.places.length;
        updateSelectionCounter();
      }

      // 편의시설
      if (interests.needs && interests.needs.length > 0) {
        $(
          `#needsOptions .option-button[data-value="${interests.needs[0]}"]`
        ).addClass("selected");
      }
    }

    // 접근성: 포커스 이동
    const firstBtn = modal.querySelector(".option-button, .btn");
    if (firstBtn) firstBtn.focus();
  });

  // 지역 선택 이벤트
  $(document).on("click", "#regionOptions .option-button", function (e) {
    // 모달이 열려있을 때만 작동
    if (!$("#interestModal").hasClass("is-open")) return;

    e.preventDefault();
    e.stopPropagation();
    if ($(this).hasClass("selected")) {
      $(this).removeClass("selected");
      selectedPlaceCount--;
    } else {
      if (selectedPlaceCount >= MAX_PLACE_SELECTION) {
        showToast("장소는 최대 6개까지 선택 가능합니다.", "warning");
        return;
      }
      $(this).addClass("selected");
      selectedPlaceCount++;
    }

    updateUserInterests();
    updateSelectionCounter();
  });

  // 장소 선택 이벤트 (최대 6개)
  $(document).on("click", "#placeOptions .option-button", function (e) {
    // 모달이 열려있을 때만 작동
    if (!$("#interestModal").hasClass("is-open")) return;

    e.preventDefault();
    e.stopPropagation();

    if ($(this).hasClass("selected")) {
      $(this).removeClass("selected");
      selectedPlaceCount--;
    } else {
      if (selectedPlaceCount >= MAX_PLACE_SELECTION) {
        showToast("장소는 최대 6개까지 선택 가능합니다.", "warning");
        return;
      }
      $(this).addClass("selected");
      selectedPlaceCount++;
    }

    updateUserInterests();
    updateSelectionCounter();
  });

  // 편의시설 선택 이벤트 (단일 선택)
  $(document).on("click", "#needsOptions .option-button", function (e) {
    // 모달이 열려있을 때만 작동
    if (!$("#interestModal").hasClass("is-open")) return;

    e.preventDefault();
    e.stopPropagation();

    // 다른 모든 버튼 선택 해제
    $("#needsOptions .option-button").removeClass("selected");
    // 현재 버튼 선택
    $(this).addClass("selected");
    updateUserInterests();
  });

  // 오버레이(빈 영역) 클릭 시 닫기
  document.addEventListener("click", function (e) {
    // const modal = document.getElementById("interestModal");
    // if (!modal.classList.contains("is-open")) return;
    // const dialog = modal.querySelector(".modal__dialog");
    // if (e.target === modal) {
    //   // 오버레이 영역 직접 클릭
    //   closeInterestModal();
    // }
    // 250917 변경
    const modal = document.getElementById("interestModal");
    if (!modal || !modal.classList.contains("is-open")) return;

    // 모달 바깥 영역 클릭 확인
    if (e.target === modal) {
      closeInterestModal();
    }
  });

  // ESC로 닫기
  document.addEventListener("keydown", function (e) {
    //if (e.key === "Escape") closeInterestModal();
    // 250917 변경
    if (e.key === "Escape" && $("#interestModal").hasClass("is-open")) {
      closeInterestModal();
    }
  });

  // 선택 개수 업데이트 함수 - 261번 줄 근처
  function updateSelectionCounter() {
    const placeOptions = document.querySelector("#placeOptions");
    if (!placeOptions) return; // null 체크 추가

    const subtitleElement = placeOptions
      .closest(".question-section")
      ?.querySelector(".question-subtitle");

    if (subtitleElement) {
      subtitleElement.textContent = `복수 선택 가능 (최대 6개, ${selectedPlaceCount}개 선택됨)`;
    }
  }

  // (선택) 옵션 버튼 토글 선택 효과 예시
  // document.addEventListener("click", function (e) {
  //   const btn = e.target.closest(".option-button");
  //   if (!btn) return;
  //   btn.classList.toggle("selected");
  // });

  // 모달 DOM이 없으면 생성
  function ensureSettingsModal() {
    let $m = $("#settingsModal");
    if ($m.length) return $m;

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
    $("body").append(html);
    $m = $("#settingsModal");
    return $m;
  }

  function openSettingsModal() {
    const $m = ensureSettingsModal();
    $m.removeAttr("hidden");
    requestAnimationFrame(() => $m.addClass("open")); // 애니메이션
    $("body").css("overflow", "hidden"); // 스크롤 잠금
    // 포커스 이동
    $m.find(".modal-panel").trigger("focus");
  }

  function closeSettingsModal() {
    const $m = $("#settingsModal");
    $m.removeClass("open");
    setTimeout(() => {
      $m.attr("hidden", "");
      $("body").css("overflow", "");
    }, 160);
  }

  // 트리거: #settings 클릭 시 오픈
  $("#settings")
    .off("click.openSettings")
    .on("click.openSettings", function (e) {
      e.preventDefault();
      openSettingsModal();
    });

  // 닫기(배경/버튼/ESC)
  $(document).on(
    "click",
    "#settingsModal .modal-close, #settingsModal .modal-backdrop",
    closeSettingsModal
  );
  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && $("#settingsModal").is(":visible"))
      closeSettingsModal();
  });

  // 항목 클릭 핸들러(필요시 실제 화면/모달/페이지로 변경)
  $(document).on("click", "#settingsModal .item", function () {
    const action = $(this).data("action");

    switch (action) {
      case "avatar":
        // TODO: 프로필이미지 변경 모달/페이지 열기
        openAvatarSheet();
        break;
      case "profile":
        openNickRegionModal();
        break;
      case "password":
        openPasswordModal();
        break;
      case "consents":
        openPolicyModal();
        break;
      case "withdraw":
        // // 실제로는 확인 다이얼로그 -> 탈퇴 API 호출 흐름 권장
        // if (confirm('정말 서비스에서 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        //   // fetch('/api/account/withdraw', { method:'POST' }) …
        //   if (window.showToast) showToast('탈퇴 요청을 처리했습니다.', 'success');
        // }
        openWithdrawModal();
        break;
    }
    // 필요 시 모달을 닫고 다음 화면으로 전환
    // closeSettingsModal();
  });

  function openWithdrawModal() {
    closeSettingsModal();
    const $m = $("#withdrawModal");
    // 초기화
    $m.find('input[name="wdReason"]').prop("checked", false);
    $("#wdDetail").val("");
    $("#wdCount").text("0");
    $("#wdAgree").prop("checked", false);
    $("#wdSubmit")
      .prop("disabled", true)
      .text("회원 탈퇴하기")
      .data("busy", false);

    $m.removeAttr("hidden");
    document.body.style.overflow = "hidden";
    // 포커스 이동
    setTimeout(() => $m.find('input[name="wdReason"]').first().focus(), 0);
  }

  // 닫기(배경/✕/취소)
  $(document).on(
    "click",
    '#withdrawModal [data-close="true"]',
    closeWithdrawModal
  );
  $(document).on("keydown", function (e) {
    if (e.key === "Escape") closeWithdrawModal();
  });
  function closeWithdrawModal() {
    $("#withdrawModal").attr("hidden", true);
    document.body.style.overflow = "";
  }

  // 글자수 카운터
  $(document).on("input", "#wdDetail", function () {
    $("#wdCount").text(String($(this).val().length));
    // updateSubmitState();
  });

  // 라디오/체크 변경 시 제출 가능 여부 갱신
  $(document).on(
    "change",
    'input[name="wdReason"], #wdAgree',
    updateSubmitState
  );
  function updateSubmitState() {
    toggleDetailEnable();
    const reasonChecked = $('input[name="wdReason"]:checked').length > 0;
    // const agree = $('#wdAgree').is(':checked');
    $("#wdSubmit").prop("disabled", !reasonChecked);
  }

  // 핵심: 기타 선택 여부로 토글
  function toggleDetailEnable() {
    const isOther = $('input[name="wdReason"]:checked').val() === "OTHER";
    $("#wdDetail")
      .prop("disabled", !isOther)
      .attr(
        "placeholder",
        isOther
          ? "불편했던 점을 자유롭게 적어주세요. (최대 300자)"
          : "‘기타’를 선택하면 입력할 수 있어요. (최대 300자)"
      );
    $(".wd-input").toggleClass("is-disabled", !isOther);

    // 기타가 아니면 내용/카운트 리셋
    if (!isOther) {
      $("#wdDetail").val("");
      $("#wdCount").text("0");
    }
  }

  // 제출
  $(document).on("click", "#wdSubmit", async function () {
    const $btn = $(this);
    if ($btn.data("busy")) return;

    const reason = $('input[name="wdReason"]:checked').val();
    const detail = $("#wdDetail").val().trim();
    const username = (window.currentUser?.username || "").toLowerCase();

    if (!reason) return toast("탈퇴 사유를 선택해주세요.");

    // 2차 확인
    if (
      !confirm(
        "정말 탈퇴하시겠어요?\n계정과 데이터가 삭제되며 복구할 수 없습니다."
      )
    )
      return;

    try {
      $btn.data("busy", true).prop("disabled", true).text("처리 중…");

      // TODO: 백엔드 엔드포인트 맞게 변경
      const res = await fetch("/profile/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username,
          reason, // RARE_VISIT | NO_INFO | TOO_MANY_NOTICES | OTHER
          detail, //기타 내용
        }),
      });

      let data = {};
      const txt = await res.text();
      try {
        data = JSON.parse(txt);
      } catch {
        data = { success: res.ok, message: txt };
      }

      if (!res.ok || data.success === false) {
        toast(data.message || "탈퇴 처리에 실패했습니다. 다시 시도해주세요.");
        $btn.data("busy", false).prop("disabled", false).text("회원 탈퇴하기");
        return;
      }

      toast("회원 탈퇴가 완료되었습니다.", "success");
      // 필요 시: 로그아웃/홈으로 이동
      setTimeout(() => (window.location.href = "/"), 800);
    } catch (err) {
      console.error(err);
      toast("요청 처리 중 오류가 발생했습니다.");
      $btn.data("busy", false).prop("disabled", false).text("회원 탈퇴하기");
    }
  });

  // =================== 정책(약관) 모달 ===================
  (function () {
    // 약관 전문 문자열(예시/샘플) — 필요 시 서버에서 불러와도 됨
    // 약관 내용 정의 (기존과 동일)
    const termsContent = {
      이용약관: `
        <h5>제1조 (목적)</h5>
        <p>이 약관은 여기부터(이하 "회사")가 제공하는 여행 추천 서비스(이하 "서비스")의 이용에 관한 조건과 절차, 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        
        <h5>제2조 (정의)</h5>
        <p>1. "서비스"란 회사가 제공하는 여행 추천, 예약, 커뮤니티 등 모든 서비스를 의미합니다.</p>
        <p>2. "회원"이란 회사의 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.</p>
        
        <h5>제3조 (약관의 효력 및 변경)</h5>
        <p>1. 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력을 발생합니다.</p>
        <p>2. 회사는 필요한 경우 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내에서 공지합니다.</p>
    `,
      개인정보처리방침: `
        <h5>1. 개인정보의 처리 목적</h5>
        <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다:</p>
        <p>- 서비스 제공 및 계약 이행</p>
        <p>- 회원 식별 및 인증</p>
        <p>- 고객 문의 처리 및 서비스 개선</p>
        <p>- 맞춤형 여행 추천 (연령층, 성별, 거주지역 기반)</p>
        <p>- 통계 분석 및 서비스 품질 향상</p>
        
        <h5>2. 수집하는 개인정보 항목</h5>
        <p>필수항목: 이메일, 닉네임, 이름, 비밀번호, 연령층, 성별, 거주지역</p>
        <p>선택항목: 여행 관심사, 마케팅 수신 동의</p>
        <p>※ <strong>연령층, 성별</strong>은 맞춤형 서비스 제공을 위한 필수 정보로, 가입 후 변경이 제한됩니다.</p>
        <p>※ <strong>거주지역</strong>은 마이페이지에서 언제든지 수정 가능합니다.</p>
        
        <h5>3. 개인정보의 처리 및 보유 기간</h5>
        <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
        
        <h5>4. 개인정보의 제3자 제공</h5>
        <p>회사는 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</p>
    `,
      위치정보약관: `
        <h5>제1조 (목적)</h5>
        <p>본 약관은 여기부터가 제공하는 위치정보서비스의 이용과 관련하여 회사와 개인위치정보주체와의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
        
        <h5>제2조 (위치정보의 수집)</h5>
        <p>1. 회사는 다음과 같은 방법으로 개인위치정보를 수집합니다:</p>
        <p>- GPS 위성정보를 이용한 위치정보 수집</p>
        <p>- 기지국 및 와이파이 정보를 이용한 위치정보 수집</p>
        
        <h5>제3조 (위치정보의 이용·제공)</h5>
        <p>1. 회사는 수집된 위치정보를 다음 목적으로 이용합니다:</p>
        <p>- 위치기반 여행지 추천 서비스 제공</p>
        <p>- 주변 관광지 정보 제공</p>
        <p>- 교통정보 및 길찾기 서비스 제공</p>
    `,
      마케팅정보: `
        <h5>마케팅 정보 수신 동의</h5>
        <p>회사는 다음과 같은 마케팅 정보를 제공합니다:</p>
        <p>- 신규 서비스 및 상품 정보</p>
        <p>- 맞춤형 여행 추천 정보</p>
        <p>- 할인 혜택 및 이벤트 정보</p>
        
        <h5>정보 제공 방법</h5>
        <p>- 이메일</p>
        <p>- SMS/MMS</p>
        <p>- 앱 푸시 알림</p>
        
        <h5>동의 철회</h5>
        <p>마케팅 정보 수신에 대한 동의는 언제든지 철회할 수 있으며, 철회 시 해당 정보 제공이 중단됩니다.</p>
    `,
      이벤트정보: `
        <h5>이벤트 및 할인 혜택 알림 동의</h5>
        <p>회사는 다음과 같은 이벤트 정보를 제공합니다:</p>
        <p>- 기간 한정 할인 이벤트</p>
        <p>- 시즌별 특가 상품 정보</p>
        <p>- 회원 대상 특별 혜택</p>
        <p>- 포인트 적립 및 사용 안내</p>
        
        <h5>알림 방법</h5>
        <p>- 앱 푸시 알림</p>
        <p>- 카카오톡 알림톡</p>
        <p>- 이메일 뉴스레터</p>
        
        <h5>동의 철회</h5>
        <p>이벤트 정보 수신 동의는 언제든지 철회 가능하며, 마이페이지에서 설정을 변경할 수 있습니다.</p>
    `,
    };
    const DOCS = termsContent;
    // 모달 열기
    window.openPolicyModal = async function openPolicyModal() {
      // (선택) 설정 모달이 따로 있다면 닫기
      if (typeof closeSettingsModal === "function") closeSettingsModal();

      const $m = $("#policyModal");
      if (!$m.length) {
        console.warn("#policyModal 을 찾을 수 없습니다.");
        return;
      }

      const userData = {
        username: (window.currentUser?.username || "").toLowerCase(),
      };

      const res = await fetch("/profile/agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData),
      });

      let data = {};
      const txt = await res.text();
      try {
        data = JSON.parse(txt);
      } catch {
        data = { success: res.ok, message: txt };
      }
      console.log(data);
      if (!res.ok || data.success === false) {
        toast(data.message || "동의 내역 불러오기에 실패했습니다.");
        return;
      }

      $("#p-terms4").prop("checked", data.marketing);
      $("#p-terms5").prop("checked", data.event);

      // 초기화: 체크/버튼 상태/본문박스 접기
      // $m.find('input[type="checkbox"]').prop('checked', false);
      $m.find(".policy-doc-inline").hide();
      $m.find(".policy-link").text("전문 보기").data("orig", "전문 보기");

      $m.attr("hidden", false);
      document.body.style.overflow = "hidden";
    };

    // 모달 닫기
    function closePolicyModal() {
      $("#policyModal").attr("hidden", true);
      document.body.style.overflow = "";
    }

    // 닫기 트리거(✕ 버튼/백드롭/ESC)
    $(document).on(
      "click",
      "#policyModal .policy-close, #policyModal .policy-backdrop",
      closePolicyModal
    );
    $(document).on("keydown", function (e) {
      if (e.key === "Escape") closePolicyModal();
    });
    $(document).off("click", "#policyModal .policy-link"); // 중복 방지
    // “전문 보기” 링크: 해당 항목 아래에 본문 토글(접기/펼치기)
    $(document).on("click", "#policyModal .policy-link", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const $link = $(this);
      const key = $link.data("doc") || "";
      const html = DOCS[key] || "내용이 준비되지 않았습니다.";

      const $item = $link.closest(".policy-item");
      let $doc = $item.next(".policy-doc-inline");

      if (!$doc.length) {
        $doc = $(
          '<div class="policy-doc-inline" aria-live="polite"></div>'
        ).insertAfter($item);
      }

      // ★ 핵심: HTML 그대로 렌더
      $doc.html(html);

      const willOpen = $doc.is(":hidden");
      // 다른 열린 섹션 닫기 + 다른 링크 원복
      $(".policy-doc-inline").not($doc).slideUp(150);
      $("#policyModal .policy-link")
        .not($link)
        .text("전문 보기")
        .attr("aria-expanded", "false");

      if (willOpen) {
        $doc
          .hide()
          .attr("hidden", false)
          .slideDown(150, () => {
            $doc[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        $link.text("접기").attr("aria-expanded", "true");
      } else {
        $doc.stop(true, true).slideUp(150, () => $doc.attr("hidden", true));
        $link.text("전문 보기").attr("aria-expanded", "false");
      }
    });

    // 저장(확인) — 필요 시 서버로 동의 이력 전송
    $(document).on("click", "#policyConfirmBtn", async function () {
      const $btn = $(this);
      if ($btn.data("busy")) return;

      const consents = {
        age: true,
        terms: true,
        privacy: true,
        location: true,
        marketing: $("#p-terms4").is(":checked"),
        event: $("#p-terms5").is(":checked"),
      };

      const userData = {
        username: (window.currentUser?.username || "").toLowerCase(),
        agreement: JSON.stringify(consents),
      };

      try {
        $btn.data("busy", true).prop("disabled", true).text("저장 중…");

        // 서버 저장이 필요 없으면 아래 fetch는 주석 처리하고 토스트만 띄우세요.
        const res = await fetch("/profile/policy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(userData),
        });

        let data = {};
        const txt = await res.text();
        try {
          data = JSON.parse(txt);
        } catch {
          data = { success: res.ok, message: txt };
        }

        if (!res.ok || data.success === false) {
          toast(data.message || "동의 내역 저장에 실패했습니다.");
          return;
        }

        toast("동의 내역이 저장되었습니다.", "success");
        closePolicyModal();
      } catch (err) {
        console.error(err);
        toast("요청 처리 중 오류가 발생했습니다.");
      } finally {
        $btn.data("busy", false).prop("disabled", false).text("저장");
      }
    });
  })();

  // ==== 비밀번호변경 열기/닫기 도우미 ====
  function openPasswordModal() {
    closeSettingsModal();
    const m = document.getElementById("pwModal");
    m.hidden = false;
    document.body.style.overflow = "hidden";
    $("#pwModal input").val(""); // 초기화
    $("#pwCurrent").focus();
  }

  // 닫기
  $(document).on(
    "click",
    "#pwModal .pw-close, #pwModal .pw-backdrop",
    function () {
      $("#pwModal").attr("hidden", true);
    }
  );
  // ESC로 닫기
  $(document).on("keydown", function (e) {
    if (e.key === "Escape") $("#pwModal").attr("hidden", true);
  });
  // Enter로 제출
  $(document).on("keydown", "#pwModal input", function (e) {
    if (e.key === "Enter") $("#pwModal .pw-submit").click();
  });

  // 저장
  $(document).on("click", "#pwModal .pw-submit", async function () {
    const $btn = $(this);
    if ($btn.data("busy")) return;

    const cur = $("#pwCurrent").val().trim();
    const next = $("#pwNew").val().trim();
    const next2 = $("#pwNew2").val().trim();
    const me = (window.currentUser?.username || "").toLowerCase();

    // 검증
    if (!cur) return toast("현재 비밀번호를 입력해주세요.");
    if (!next) return toast("새 비밀번호를 입력해주세요.");
    if (next.length < 8 || next.length > 12)
      return toast("비밀번호는 8~12자입니다.");
    if (!/[A-Za-z]/.test(next) || !/\d/.test(next))
      return toast("영문과 숫자를 포함해야 합니다.");
    if (next !== next2) return toast("새 비밀번호가 일치하지 않습니다.");

    try {
      $btn.data("busy", true).prop("disabled", true).text("변경 중...");
      const res = await fetch("/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: me,
          rawPassword: cur,
          password: next,
        }),
      });

      // 응답이 text일 수도, json일 수도 있으니 안전 파싱
      let data = {};
      const txt = await res.text();
      try {
        data = JSON.parse(txt);
      } catch {
        data = { success: res.ok, message: txt };
      }

      if (!res.ok || data.success === false) {
        toast(data.message || "비밀번호 변경에 실패했습니다.");
        return;
      }

      toast("비밀번호가 변경되었습니다.", "success");
      $("#pwModal").attr("hidden", true);
      // 필요시: location.href = '/logout';
    } catch (err) {
      console.error(err);
      toast("요청 처리 중 오류가 발생했습니다.");
    } finally {
      $btn.data("busy", false).prop("disabled", false).text("완료");
    }

    function toast(msg, type) {
      if (typeof showToast === "function") showToast(msg, type || "info");
      else alert(msg);
    }
  });

  // ==== 닉네임, 거주지 열기/닫기 도우미 ====
  function openNickRegionModal() {
    closeSettingsModal();
    const m = document.getElementById("nickRegionModal");
    m.hidden = false;
    document.body.style.overflow = "hidden";
    const targetText = $("#location").text().trim();
    $("#nrRegion").val(targetText).trigger("change");
  }
  function closeNickRegionModal() {
    const m = document.getElementById("nickRegionModal");
    m.hidden = true;
    document.body.style.overflow = "";
  }

  // ==== 닉네임/거주지 변경 ====
  // POST /profile/updateNR  body: { username, region } -> { username, region }
  async function updateProfileBasic(payload) {
    const res = await fetch("/profile/updateNR", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  async function getUsernames() {
    const res = await fetch("/profile/username", {
      method: "GET",
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const list = await res.json();
    return Array.isArray(list)
      ? list.map((s) => String(s).trim()).filter(Boolean)
      : [];
  }

  // 2) 닫기 버튼/백드롭
  $(document).on(
    "click",
    "#nickRegionModal .nr-close, #nickRegionModal .nr-backdrop, #nickRegionModal .nr-cancel",
    function () {
      closeNickRegionModal();
    }
  );

  // 3) 저장
  $(document).on("click", "#nickRegionModal .nr-save", async function () {
    const $btn = $(this);
    if ($btn.data("busy")) return;

    const nickname = $("#nrNickname").val().trim();
    const region = $("#nrRegion").val();
    const me = (window.currentUser?.username || "").toLowerCase();

    if (!nickname) {
      showToast("닉네임을 입력해주세요.", "warning");
      return;
    }

    try {
      const usernames = await getUsernames();
      const lowerSet = new Set(usernames.map((u) => u.toLowerCase()));
      console.log("username : " + me);
      // 본인의 기존 닉네임은 통과, 그 외엔 중복 금지
      const isDup =
        lowerSet.has(nickname.toLowerCase()) && nickname.toLowerCase() !== me;
      if (isDup) {
        showToast(
          "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.",
          "warning"
        );
        $("#nrNickname").focus();
        return;
      }
    } catch (e) {
      console.error("username 목록 조회 실패:", e);
      showToast(
        "닉네임 중복 확인에 실패했습니다. 잠시 후 다시 시도해주세요.",
        "danger"
      );
      return;
    }

    $btn.data("busy", true).prop("disabled", true).text("저장 중...");

    try {
      const data = {
        username: nickname,
        region: region,
        me: me,
      };
      const saved = await updateProfileBasic(data);
      // 화면 동기화 (있을 때만)
      $("#nickname, .js-nickname").text(saved.nickname || nickname);
      $("#location, .js-residence").text(saved.region || region);
      window.currentUser.username = saved.nickname || nickname;

      showToast("변경사항이 저장되었습니다.", "success");
      closeNickRegionModal();
      // location.reload();
    } catch (err) {
      console.error("프로필 저장 실패:", err);
      showToast("저장 중 오류가 발생했습니다.", "danger");
    } finally {
      $btn.data("busy", false).prop("disabled", false).text("완료");
    }
  });

  /** 아바타 변경 시트 열기 */
  function openAvatarSheet() {
    const $modal = $("#settingsModal");
    if ($("#avatarSheet").length) {
      $("#avatarSheet").remove();
    }

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
    $("#avatarFile").on("change", function (e) {
      const f = (e.target.files || [])[0];
      if (!f) return;
      if (!f.type.startsWith("image/")) {
        toast("이미지 파일만 업로드할 수 있어요.", "warning");
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast("최대 10MB까지 가능합니다.", "warning");
        return;
      }

      pickedFile = f;
      const url = URL.createObjectURL(f);
      $("#avatarPreview").attr("src", url);
      sheet.find(".as-save").prop("disabled", false);
    });

    // 닫기
    sheet.on("click", ".as-close, .as-cancel", function () {
      sheet.remove();
    });

    // 저장(업로드)
    sheet.on("click", ".as-save", function () {
      if (!pickedFile) {
        toast("먼저 이미지를 선택해주세요.", "warning");
        return;
      }

      const fd = new FormData();
      console.log("username >>> " + $("#nickname").text().trim());
      fd.append("username", $("#nickname").text().trim());
      fd.append("file", pickedFile);

      const $btn = $(this).prop("disabled", true).text("업로드 중…");
      $.ajax({
        url: "/profile/account/avatar",
        method: "POST",
        data: fd,
        processData: false,
        contentType: false,
      })
        .done(function (resp) {
          // 서버가 avatarUrl 반환한다고 가정
          const newUrl =
            resp && resp.avatarUrl
              ? resp.avatarUrl + "?v=" + Date.now()
              : getCurrentAvatarUrl(true);
          applyAvatarToPage(newUrl);
          toast("대표 사진이 변경되었습니다!", "success");
          sheet.remove();
        })
        .fail(function (xhr) {
          console.error(xhr);
          toast("업로드에 실패했습니다.", "danger");
          $btn.prop("disabled", false).text("저장");
        });
    });
  }

  function getCurrentAvatarUrl(useBust) {
    // 페이지의 원형 아바타 이미지 셀렉터 맞춰서 사용
    const $img = $("#profileAvatar, .profile-avatar img").eq(0);
    const url = $img.attr("src");
    return useBust
      ? url + (url.includes("?") ? "&" : "?") + "v=" + Date.now()
      : url;
  }

  function applyAvatarToPage(url) {
    const $img = $("#profileAvatar, .profile-avatar img").eq(0);
    if ($img.length) $img.attr("src", url);
  }

  // 토스트 헬퍼(프로젝트의 showToast가 있으면 그걸 사용)
  function toast(msg, type) {
    if (window.showToast) showToast(msg, type || "info");
    else alert(msg);
  }

  // 설정 모달의 “대표 사진 변경” 항목 클릭 → 아바타 시트 열기
  // $(document).on('click', '#settingsModal .item[data-action="avatar"]', function(){
  //   openAvatarSheet();
  // });
});

// 사용자 관심사 업데이트
function updateUserInterests() {
  // const sections = {
  //   regionOptions: "preferredRegions",
  //   placeOptions: "places",
  //   needsOptions: "needs",
  // };

  // userInterests = {};
  // Object.keys(sections).forEach((sectionId) => {
  //   const section = document.getElementById(sectionId);
  //   if (section) {
  //     const selectedOptions = section.querySelectorAll(
  //       ".option-button.selected"
  //     );
  //     const values = Array.from(selectedOptions).map(
  //       (btn) => btn.dataset.value
  //     );
  //     userInterests[sections[sectionId]] = values;
  //   }
  // });
  // 250917 변경
  userInterests = {
    preferredRegions: [],
    places: [],
    needs: [],
  };

  // 지역 수집
  $("#regionOptions .option-button.selected").each(function () {
    userInterests.preferredRegions.push($(this).data("value"));
  });

  // 장소 수집 - place-group 내의 모든 선택된 버튼
  $(".place-group .option-button.selected").each(function () {
    userInterests.places.push($(this).data("value"));
  });

  // 편의시설 수집
  $("#needsOptions .option-button.selected").each(function () {
    userInterests.needs.push($(this).data("value"));
  });

  console.log("Updated interests:", userInterests);
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setActive(filter) {
  document.querySelectorAll(".pill").forEach((p) => {
    const isActive = p.dataset.filter === filter;
    p.classList.toggle("active", isActive);
    p.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  // 현재 선택 pill에 포커스 주기(원치 않으면 이 줄은 빼세요)
  const current = document.querySelector(`.pill[data-filter="${filter}"]`);
  current?.focus();
}

document.addEventListener("keydown", (e) => {
  const pill = e.target.closest(".pill");
  if (!pill) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    const filter = pill.dataset.filter;
    if (!filterMap[filter]) return;
    filterMap[filter]();
    setActive(filter);
  }
});

// 4) 필터 이벤트
const filterMap = {
  upcoming: () => renderGathering(),
  done: () => renderGatheringDone(),
};

document.addEventListener("click", (e) => {
  const pill = e.target.closest(".pill");
  if (!pill) return;
  const filter = pill.dataset.filter; // 'upcoming' | 'done'
  if (!filterMap[filter]) return;
  filterMap[filter]();
  setActive(filter);
});

const MS_PER_DAY = 86_400_000;

// 입력을 "로컬 자정"으로 정규화
function toMidnightLocal(input) {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  if (typeof input === "string") {
    // 'YYYY-MM-DD'면 타임존 흔들림을 피하려고 직접 생성
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, d] = input.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(input); // ISO 등
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return new Date(NaN);
}

// today(기본: 지금)와 target 사이의 D-day (오늘이면 0, 내일이면 1, 어제면 -1)
function dday1(target, today = new Date()) {
  const t0 = toMidnightLocal(target);
  const n0 = toMidnightLocal(today);
  return Math.ceil((t0 - n0) / MS_PER_DAY);
}

async function renderGathering() {
  const username = (window.currentUser?.username || "").toLowerCase();
  const res = await fetch("/profile/gathering", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      username,
    }),
  });

  const txt = await res.json();
  console.log("txt>>>> " + JSON.stringify(txt));

  const listEl = document.getElementById("gathering");
  const seeAllBtn = document.getElementById("seeAllBtn-m");
  const seeShortBtn = document.getElementById("seeShortBtn-m");
  if (!listEl) return;

  listEl.innerHTML = "";

  // 이동 함수
  const goGroup = (id) => {
    if (!id) return;
    window.location.href = `/community?groupId=${encodeURIComponent(id)}`;
  };

  txt.forEach((item, idx) => {
    const intro = JSON.parse(item.intro);
    const dday = dday1(item.startDate);
    let badgeText = `여행 시작까지 <strong style="color: #ff5900;">${dday}</strong>일 남았어요!`;
    const card = document.createElement("article");
    card.dataset.groupId = item.groupId;
    card.className = "card";
    if (idx >= 2) card.style.display = "none";
    card.innerHTML = `
      <div class="card-body">
        <div class="jg-badge">⏱️ ${badgeText}</div>
        <span style="float:right;"><strong style="color: #ff5900;">${intro.departureRegion} 출발</strong></span>
        <h3 class="card-title">${intro.title}</h3>
        <div class="meta">
              <span>${item.startDate} ~ ${item.endDate}</span>
        </div>
        <div class="jg-stats">👥 ${item.maxMembers}명 모집 (현재 ${item.currentMembers}명)</div>
      </div>`;

    // ✅ 클릭/Enter로 이동
    card.addEventListener("click", () => goGroup(item.groupId));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") goGroup(item.groupId);
    });

    listEl.appendChild(card);
  });

  if (txt.length > 2) {
    seeAllBtn.style.display = "inline-block";
    seeShortBtn.style.display = "none";
    seeAllBtn.onclick = () => {
      listEl
        .querySelectorAll(".card")
        .forEach((el) => (el.style.display = "block"));
      seeAllBtn.style.display = "none";
      seeShortBtn.style.display = "inline-block";
    };
    seeShortBtn.onclick = () => {
      listEl
        .querySelectorAll(".card")
        .forEach((el, i) => (el.style.display = i < 2 ? "block" : "none"));

      seeAllBtn.style.display = "inline-block";
      seeShortBtn.style.display = "none";
    };
  } else {
    seeAllBtn.style.display = "none";
    seeShortBtn.style.display = "none";
  }
}

async function renderGatheringDone() {
  const username = (window.currentUser?.username || "").toLowerCase();
  const res = await fetch("/profile/gathering", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      username,
    }),
  });

  const txt = await res.json();

  const listEl = document.getElementById("gathering");
  const seeAllBtn = document.getElementById("seeAllBtn-m");
  const seeShortBtn = document.getElementById("seeShortBtn-m");
  if (!listEl) return;

  listEl.innerHTML = "";
  // 이동 함수
  const goGroup = (id) => {
    if (!id) return;
    window.location.href = `/community?groupId=${encodeURIComponent(id)}`;
  };

  txt.forEach((item, idx) => {
    let badgeText = `여행이 종료되었습니다!`;
    const intro = JSON.parse(item.intro);
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.groupId = item.groupId;
    if (idx >= 2) card.style.display = "none";
    card.innerHTML = `
      <div class="card-body">
        <div class="jg-badge">⏱️ ${badgeText}</div>
        <span style="float:right;"><strong style="color: #ff5900;">${intro.departureRegion} 출발</strong></span>
        <h3 class="card-title">${intro.title}</h3>
        <div class="meta">
              <span>${item.startDate} ~ ${item.endDate}</span>
        </div>
        <div class="jg-stats">👥 ${item.maxMembers}명 모집 (현재 ${item.currentMembers}명)</div>
      </div>`;

    // ✅ 클릭/Enter로 이동
    card.addEventListener("click", () => goGroup(item.groupId));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") goGroup(item.groupId);
    });
    const end = parseEndDate(item.endDate);
    const isPast = end && end.getTime() < Date.now();
    if (isPast) {
      listEl.appendChild(card);
    }
  });

  if (txt.length > 2) {
    seeAllBtn.style.display = "inline-block";
    seeShortBtn.style.display = "none";
    seeAllBtn.onclick = () => {
      listEl
        .querySelectorAll(".card")
        .forEach((el) => (el.style.display = "block"));
      seeAllBtn.style.display = "none";
      seeShortBtn.style.display = "inline-block";
    };
    seeShortBtn.onclick = () => {
      listEl
        .querySelectorAll(".card")
        .forEach((el, i) => (el.style.display = i < 2 ? "block" : "none"));
      seeAllBtn.style.display = "inline-block";
      seeShortBtn.style.display = "none";
    };
  } else {
    seeAllBtn.style.display = "none";
    seeShortBtn.style.display = "none";
  }
}

// endDate 문자열을 Date로 안전 파싱
function parseEndDate(v) {
  if (!v) return null;

  // 1) YYYY-MM-DD -> 로컬 "하루의 끝(23:59:59.999)"로 해석
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }

  // 2) "YYYY-MM-DD HH:mm:ss" 같은 경우 -> ISO로 보정
  const iso = v.includes(" ") ? v.replace(" ", "T") : v;
  const d = new Date(iso);
  return isNaN(d) ? null : d;
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
      listEl
        .querySelectorAll(".card")
        .forEach((el) => (el.style.display = "block"));
      seeAllBtn.style.display = "none";
      seeShortBtn.style.display = "inline-block";
    };
    seeShortBtn.onclick = () => {
      listEl
        .querySelectorAll(".card")
        .forEach((el, i) => (el.style.display = i < 3 ? "block" : "none"));
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
      <div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} 
        <span class="date">${r.updatedAt}</span>
      </div>
      <div class="rev-title">${r.title}</div>
      <div class="rev-text">${r.reviewText}</div>
    `;
    // 처음 3개만 보이고, 나머지는 hidden
    if (i >= 3) {
      div.style.display = "none";
    }
    reviewList.appendChild(div);
  });

  // 리뷰가 4개 이상일 때만 버튼 보이기
  if (reviews.length > 3) {
    seeAllBtn.style.display = "block";
    seeShortBtn.style.display = "none"; // 처음엔 안보임

    seeAllBtn.onclick = () => {
      document.querySelectorAll("#reviewList .review").forEach((el) => {
        el.style.display = "block"; // 전부 보이기
      });
      seeAllBtn.style.display = "none";
      seeShortBtn.style.display = "block";
    };

    seeShortBtn.onclick = () => {
      document.querySelectorAll("#reviewList .review").forEach((el, i) => {
        el.style.display = i < 3 ? "block" : "none"; // 처음 3개만 보이기
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
  const hasInterests = Object.values(userInterests).some(
    (arr) => arr.length > 0
  );

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
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(userInterests),
    success: function (response, textStatus, jqXHR) {
      console.log("관심사 저장 성공");
      closeInterestModal();
      // location.reload();
      // 250917 페이지 새로고침으로 변경사항 반영
      setTimeout(() => location.reload(), 1000);
    },
    error: function (request, status, error) {
      console.error("관심사 저장 오류:", error);
      alert("관심사 저장에 실패했습니다. 다시 시도해주세요.", "error");
    },
  });
}

function closeInterestModal() {
  const modal = document.getElementById("interestModal");
  modal.classList.remove("is-open");
  document.body.classList.remove("modal-open");

  // 250917 선택 초기화
  $(".option-button").removeClass("selected");
  selectedPlaceCount = 0;
  userInterests = {};
}
// 250917 기존 함수들 유지
function applySelected(containerSelector, values) {
  const $scope = $(containerSelector);
  $scope.find(".option-button").removeClass("selected");
  if (!Array.isArray(values)) return;
  values.forEach((v) => {
    $scope.find(`.option-button[data-value="${v}"]`).addClass("selected");
  });
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
    $wrap.append($("<span/>", { class: "pill", text: txt }));
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
