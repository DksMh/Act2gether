// interestonboarding.js - 관심사 설정 전용 (간소화 버전)

// 전역 변수
let userInterests = {};

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  console.log("관심사 온보딩 페이지 로드 완료");

  // 바로 관심사 선택 화면으로 이동
  showInterestSelection();

  // 이벤트 리스너 초기화
  initializeInterestEventListeners();
});

// 관심사 이벤트 리스너 초기화
function initializeInterestEventListeners() {
  const optionSections = [
    "regionOptions",
    "companionOptions", 
    "themeOptions",
    "activityOptions",
    "placeOptions",
    "needsOptions",
  ];
  
  optionSections.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.addEventListener("click", handleOptionClick);
    }
  });
}

// 관심사 선택 처리
function handleOptionClick(event) {
  if (event.target.classList.contains("option-button")) {
    event.preventDefault();
    event.target.classList.toggle("selected");
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

// 사용자 관심사 업데이트
function updateUserInterests() {
  const sections = {
    regionOptions: "preferredRegions",
    companionOptions: "companions", 
    themeOptions: "themes",
    activityOptions: "activities",
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

// 관심사 선택 화면 표시
function showInterestSelection() {
  const interestSection = document.getElementById("interestSelection");
  if (interestSection) {
    interestSection.classList.add("active");
    console.log("관심사 선택 화면 표시됨");
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
  showLoading();

  // 관심사 정보 서버로 전송
  $.ajax({
    url: "/users/interests",
    type: 'POST',
    contentType: "application/json",
    data: JSON.stringify(userInterests),
    success: function(response, textStatus, jqXHR) {
      hideLoading();
      showSuccess("관심사가 성공적으로 저장되었습니다!");
      
      // 3초 후 메인 페이지로 이동
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    },
    error: function(request, status, error) {
      hideLoading();
      showInterestError("관심사 저장에 실패했습니다. 다시 시도해주세요.");
      console.error("관심사 저장 오류:", error);
    }
  });
}

// 온보딩 건너뛰기
function skipOnboarding() {
  if (confirm('관심사 설정을 건너뛰시겠습니까?\n나중에 마이페이지에서 설정할 수 있습니다.')) {
    console.log('관심사 설정 건너뛰기');
    window.location.href = '/';
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
  if (confirm('관심사 설정을 취소하고 메인으로 이동하시겠습니까?')) {
    window.location.href = '/';
  }
}