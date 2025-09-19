// interestonboarding.js - 관심사 설정 전용 (간소화 버전)

// 전역 변수
let userInterests = {};
let selectedPlaceCount = 0;
const MAX_PLACE_SELECTION = 6; // 최대 6개 장소 선택

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  // console.log("관심사 온보딩 페이지 로드 완료");

  // 바로 관심사 선택 화면으로 이동
  showInterestSelection();

  // 이벤트 리스너 초기화
  initializeInterestEventListeners();
});

// 관심사 이벤트 리스너 초기화
function initializeInterestEventListeners() {
  // 지역과 편의시설 이벤트 리스너
  const basicSections = [
    "regionOptions",
    //"placeOptions", // 모든 장소 그룹을 포함
    "needsOptions",
  ];

  basicSections.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.addEventListener("click", handleOptionClick);
    }
  });

  // 모든 장소 그룹에 이벤트 리스너 추가 (.place-grid 클래스로 찾기)
  const placeGroups = document.querySelectorAll(".place-grid");
  // console.log("찾은 장소 그룹 개수:", placeGroups.length);

  placeGroups.forEach((group, index) => {
    // console.log(`장소 그룹 ${index + 1} 이벤트 리스너 추가`);
    group.addEventListener("click", handlePlaceGroupClick);
  });
}

// 장소 그룹 클릭 처리 (최대 6개 제한)
function handlePlaceGroupClick(event) {
  if (event.target.classList.contains("option-button")) {
    event.preventDefault();

    const button = event.target;
    const isCurrentlySelected = button.classList.contains("selected");

    // 선택 해제하는 경우
    if (isCurrentlySelected) {
      button.classList.remove("selected");
      selectedPlaceCount--;
      updateUserInterests();
      return;
    }

    // 선택하는 경우 - 최대 개수 체크
    if (selectedPlaceCount >= MAX_PLACE_SELECTION) {
      alert(`장소는 최대 ${MAX_PLACE_SELECTION}개까지 선택 가능합니다.`);
      return;
    }

    // 선택 추가
    button.classList.add("selected");
    selectedPlaceCount++;
    updateUserInterests();

    // 시각적 피드백
    button.style.transform = "scale(0.95)";
    setTimeout(() => {
      button.style.transform = "scale(1)";
    }, 150);
  }
}

// 일반 옵션 클릭 처리 (지역, 편의시설)
function handleOptionClick(event) {
  if (event.target.classList.contains("option-button")) {
    event.preventDefault();

    const section = event.target.closest(".options-grid").id;

    // 편의시설은 단일 선택
    if (section === "needsOptions") {
      // 기존 선택 해제
      const siblings = event.target.parentElement.querySelectorAll(
        ".option-button.selected"
      );
      siblings.forEach((btn) => btn.classList.remove("selected"));

      // 새로운 선택
      event.target.classList.add("selected");
    } else {
      // 지역은 다중 선택
      event.target.classList.toggle("selected");
    }

    updateUserInterests();

    // 시각적 피드백
    if (event.target.classList.contains("selected")) {
      event.target.style.transform = "scale(0.95)";
      setTimeout(() => {
        event.target.style.transform = "scale(1)";
      }, 150);
    }
  }
}

// 사용자 관심사 업데이트 (투어 검색과 동일한 구조)
function updateUserInterests() {
  userInterests = {};

  // 지역 수집
  const regionSection = document.getElementById("regionOptions");
  if (regionSection) {
    const selectedRegions = regionSection.querySelectorAll(
      ".option-button.selected"
    );
    userInterests.preferredRegions = Array.from(selectedRegions).map(
      (btn) => btn.dataset.value
    );
  }

  // 장소 수집 (모든 place-group에서)
  const allPlaceButtons = document.querySelectorAll(
    ".place-group .option-button.selected"
  );
  userInterests.places = Array.from(allPlaceButtons).map(
    (btn) => btn.dataset.value
  );

  // 선택된 장소 개수 업데이트
  selectedPlaceCount = userInterests.places.length;

  // 편의시설 수집 (단일 선택)
  const needsSection = document.getElementById("needsOptions");
  if (needsSection) {
    const selectedNeed = needsSection.querySelector(".option-button.selected");
    userInterests.needs = selectedNeed ? [selectedNeed.dataset.value] : [];
  }

  // console.log("업데이트된 관심사 (투어 검색 호환):", userInterests);

  // 선택 개수 표시 업데이트
  updateSelectionCounter();
}

// 선택 개수 표시 업데이트
function updateSelectionCounter() {
  const subtitle = document
    .querySelector("#placeOptions")
    .closest(".question-section")
    .querySelector(".question-subtitle");
  if (subtitle) {
    subtitle.textContent = `복수 선택 가능 (${selectedPlaceCount}/${MAX_PLACE_SELECTION}개 선택됨)`;
  }
}

// 관심사 선택 화면 표시
function showInterestSelection() {
  const interestSection = document.getElementById("interestSelection");
  if (interestSection) {
    interestSection.classList.add("active");
    // console.log("관심사 선택 화면 표시됨 - 투어 검색 호환 버전");
  }
}

// 온보딩 완료 (투어 검색과 동일한 데이터 구조로 전송)
function completeOnboarding() {
  updateUserInterests();

  // 최소 검증
  const hasRegion =
    userInterests.preferredRegions && userInterests.preferredRegions.length > 0;
  const hasPlace = userInterests.places && userInterests.places.length > 0;

  if (!hasRegion && !hasPlace) {
    alert("지역 또는 장소 중 하나는 반드시 선택해주세요.");
    return;
  }

  // console.log("전송할 관심사 데이터:", userInterests);

  // 로딩 표시
  showLoading();

  // 🔥 핵심: 투어 검색과 동일한 키 이름으로 전송
  const interestData = {
    preferredRegions: userInterests.preferredRegions || [],
    places: userInterests.places || [],
    needs: userInterests.needs || [],
  };

  // 관심사 정보 서버로 전송
  $.ajax({
    url: "/users/interests",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(interestData),
    success: function (response, textStatus, jqXHR) {
      hideLoading();
      showSuccess("관심사가 성공적으로 저장되었습니다!");

      // console.log("서버 응답:", response);

      // 3초 후 메인 페이지로 이동
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    },
    error: function (request, status, error) {
      hideLoading();
      showInterestError("관심사 저장에 실패했습니다. 다시 시도해주세요.");
      console.error("관심사 저장 오류:", error);
      console.error("요청 데이터:", interestData);
    },
  });
}

// 온보딩 건너뛰기
function skipOnboarding() {
  if (
    confirm(
      "관심사 설정을 건너뛰시겠습니까?\n나중에 마이페이지에서 설정할 수 있습니다."
    )
  ) {
    // console.log("관심사 설정 건너뛰기");
    window.location.href = "/";
  }
}

// 관심사 제출 재시도
function retryInterestSubmission() {
  const errorDiv = document.getElementById("interestErrorMessage");
  if (errorDiv) {
    errorDiv.classList.remove("show");
  }
  completeOnboarding();
}

// 로딩 표시/숨김
function showLoading() {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) {
    spinner.classList.add("active");
  }
}

function hideLoading() {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) {
    spinner.classList.remove("active");
  }
}

// 성공 메시지 표시
function showSuccess(message) {
  const successDiv = document.getElementById("successMessage");
  if (successDiv) {
    const messageP = successDiv.querySelector("p");
    if (messageP) {
      messageP.textContent = message;
    }
    successDiv.classList.add("show");
  }
}

// 관심사 에러 메시지 표시
function showInterestError(message) {
  const errorDiv = document.getElementById("interestErrorMessage");
  const errorText = document.getElementById("interestErrorText");
  if (errorDiv && errorText) {
    errorText.textContent = message;
    errorDiv.classList.add("show");

    // 5초 후 자동 숨김
    setTimeout(() => {
      errorDiv.classList.remove("show");
    }, 5000);
  }
}

// 기존 HTML에서 호출되는 함수들 (호환성 유지)
function goBackToProfile() {
  if (confirm("관심사 설정을 취소하고 메인으로 이동하시겠습니까?")) {
    window.location.href = "/";
  }
}
