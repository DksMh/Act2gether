// 전역 변수
let currentStep = 1;
let userProfile = {};
let userInterests = {};
let accessToken = null;

// 안전한 localStorage 접근
function safeGetItem(key) {
  try {
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      return localStorage.getItem(key);
    }
    return null;
  } catch (e) {
    console.warn("localStorage 접근 실패:", e);
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      localStorage.setItem(key, value);
      return true;
    }
    return false;
  } catch (e) {
    console.warn("localStorage 저장 실패:", e);
    return false;
  }
}

function safeRemoveItem(key) {
  try {
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      localStorage.removeItem(key);
      return true;
    }
    return false;
  } catch (e) {
    console.warn("localStorage 삭제 실패:", e);
    return false;
  }
}

// 초기화
function initializeApp() {
  accessToken = safeGetItem("accessToken") || "temp-token";
}

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  console.log("페이지 로드 완료");

  // 앱 초기화
  initializeApp();

  // 이벤트 리스너 초기화
  initializeEventListeners();

  // 초기 상태 확인
  updateConfirmationInfo();

  // 관심사 데이터 확인
  checkUserInterests();

  // 폼 요소들이 제대로 로드되었는지 확인
  setTimeout(() => {
    const ageSelect = document.getElementById("ageRange");
    const genderSelect = document.getElementById("gender");
    const regionSelect = document.getElementById("region");

    console.log("폼 요소 확인:", {
      age: ageSelect ? "존재" : "없음",
      gender: genderSelect ? "존재" : "없음",
      region: regionSelect ? "존재" : "없음",
    });

    // 진행 상황 복원 (마지막에 실행)
    restoreProgress();
  }, 100);
});

// 사용자 관심사 데이터 확인
function checkUserInterests() {
  // 실제로는 서버에서 사용자 관심사 데이터를 확인해야 합니다
  // 여기서는 localStorage로 시뮬레이션
  const savedInterests = safeGetItem("userInterests");
  if (
    savedInterests &&
    savedInterests !== "null" &&
    savedInterests !== "undefined"
  ) {
    try {
      const interests = JSON.parse(savedInterests);
      if (Object.keys(interests).length > 0) {
        // 관심사가 있으면 메인 페이지로 리다이렉트
        console.log("기존 관심사 발견, 메인 페이지로 이동");
        // window.location.href = '/main.html';
      }
    } catch (e) {
      console.warn("관심사 데이터 파싱 실패:", e);
    }
  }
}

// 이벤트 리스너 초기화
function initializeEventListeners() {
  // 프로필 입력 필드 변경 감지
  const profileInputs = ["ageRange", "gender", "region"];
  profileInputs.forEach((id) => {
    const element = document.getElementById(id);
    element.addEventListener("change", updateConfirmationInfo);
    element.addEventListener("input", updateConfirmationInfo); // input 이벤트도 추가
  });

  // 관심사 옵션 버튼 클릭 이벤트
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
    section.addEventListener("click", handleOptionClick);
  });
}

// 확인 정보 업데이트
function updateConfirmationInfo() {
  const age = document.getElementById("ageRange").value;
  const gender = document.getElementById("gender").value;
  const region = document.getElementById("region").value;

  console.log("현재 선택된 값:", { age, gender, region }); // 디버깅용

  document.getElementById("confirmAge").textContent = age || "-";
  document.getElementById("confirmGender").textContent = gender || "-";
  document.getElementById("confirmRegion").textContent = region || "-";

  // 다음 버튼 활성화/비활성화
  const nextBtn = document.getElementById("nextBtn");
  if (age && gender && region) {
    nextBtn.disabled = false;
    nextBtn.style.opacity = "1";
    nextBtn.style.cursor = "pointer";
    userProfile = { age, gender, region };
    console.log("모든 정보 입력 완료, 버튼 활성화"); // 디버깅용
  } else {
    nextBtn.disabled = true;
    nextBtn.style.opacity = "0.5";
    nextBtn.style.cursor = "not-allowed";
    console.log("정보 부족, 버튼 비활성화"); // 디버깅용
  }
}

// 관심사 선택 처리
function handleOptionClick(event) {
  if (event.target.classList.contains("option-button")) {
    event.preventDefault(); // 기본 동작 방지
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
    const selectedOptions = section.querySelectorAll(".option-button.selected");
    const values = Array.from(selectedOptions).map((btn) => btn.dataset.value);
    userInterests[sections[sectionId]] = values;
  });
}

// 관심사 페이지로 이동
function proceedToInterests() {
  if (!userProfile.age || !userProfile.gender || !userProfile.region) {
    alert("모든 정보를 입력해주세요.");
    return;
  }

  showLoading();

  // 프로필 정보 서버 전송
  submitProfile()
    .then(() => {
      hideLoading();
      currentStep = 2;
      updateStepIndicator();
      showInterestSelection();
    })
    .catch((error) => {
      hideLoading();
      showError("프로필 정보 저장에 실패했습니다. 다시 시도해주세요.");
    });
}

// 프로필 정보 서버 전송
async function submitProfile() {
  try {
    const response = await fetch("/api/user/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(userProfile),
    });

    if (!response.ok) {
      throw new Error("프로필 저장 실패");
    }

    const data = await response.json();
    console.log("프로필 저장 성공:", data);
    return data;
  } catch (error) {
    console.error("프로필 저장 오류:", error);
    throw error;
  }
}

// 관심사 정보 서버 전송
async function submitInterests() {
  try {
    const response = await fetch("/api/user/interests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(userInterests),
    });

    if (!response.ok) {
      throw new Error("관심사 저장 실패");
    }

    const data = await response.json();
    console.log("관심사 저장 성공:", data);

    // 로컬 스토리지에도 저장 (다음 로그인 시 확인용)
    safeSetItem("userInterests", JSON.stringify(userInterests));

    return data;
  } catch (error) {
    console.error("관심사 저장 오류:", error);
    throw error;
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

  showLoading();

  // 관심사 정보 서버 전송
  submitInterests()
    .then(() => {
      hideLoading();
      showSuccess("관심사가 성공적으로 저장되었습니다!");

      // 3초 후 메인 페이지로 이동
      setTimeout(() => {
        window.location.href = "/main.html";
      }, 3000);
    })
    .catch((error) => {
      hideLoading();
      showInterestError("관심사 저장에 실패했습니다. 다시 시도해주세요.");
    });
}

// 프로필 페이지로 돌아가기
function goBackToProfile() {
  currentStep = 1;
  updateStepIndicator();
  showProfileSetup();
}

// 관심사 선택 화면 표시
function showInterestSelection() {
  document.getElementById("profileSetup").classList.add("hidden");
  document.getElementById("interestSelection").classList.add("active");
}

// 프로필 설정 화면 표시
function showProfileSetup() {
  document.getElementById("interestSelection").classList.remove("active");
  document.getElementById("profileSetup").classList.remove("hidden");
}

// 단계 표시기 업데이트
function updateStepIndicator() {
  const steps = document.querySelectorAll(".step");
  steps.forEach((step, index) => {
    if (index < currentStep - 1) {
      step.classList.add("completed");
      step.classList.remove("active");
    } else if (index === currentStep - 1) {
      step.classList.add("active");
      step.classList.remove("completed");
    } else {
      step.classList.remove("active", "completed");
    }
  });
}

// 로딩 표시
function showLoading() {
  document.getElementById("loadingSpinner").classList.add("active");
}

// 로딩 숨김
function hideLoading() {
  document.getElementById("loadingSpinner").classList.remove("active");
}

// 에러 메시지 표시
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  errorText.textContent = message;
  errorDiv.classList.add("show");

  // 5초 후 자동 숨김
  setTimeout(() => {
    errorDiv.classList.remove("show");
  }, 5000);
}

// 관심사 에러 메시지 표시
function showInterestError(message) {
  const errorDiv = document.getElementById("interestErrorMessage");
  const errorText = document.getElementById("interestErrorText");
  errorText.textContent = message;
  errorDiv.classList.add("show");

  // 5초 후 자동 숨김
  setTimeout(() => {
    errorDiv.classList.remove("show");
  }, 5000);
}

// 성공 메시지 표시
function showSuccess(message) {
  const successDiv = document.getElementById("successMessage");
  successDiv.querySelector("p").textContent = message;
  successDiv.classList.add("show");
}

// 프로필 제출 재시도
function retryProfileSubmission() {
  document.getElementById("errorMessage").classList.remove("show");
  proceedToInterests();
}

// 관심사 제출 재시도
function retryInterestSubmission() {
  document.getElementById("interestErrorMessage").classList.remove("show");
  completeOnboarding();
}

// 페이지 언로드 시 진행 상황 저장 (선택사항)
window.addEventListener("beforeunload", function () {
  if (currentStep === 2) {
    updateUserInterests();
    safeSetItem(
      "onboardingProgress",
      JSON.stringify({
        step: currentStep,
        profile: userProfile,
        interests: userInterests,
      })
    );
  }
});

// 페이지 로드 시 진행 상황 복원 (선택사항)
function restoreProgress() {
  const savedProgress = safeGetItem("onboardingProgress");
  if (savedProgress) {
    try {
      const progress = JSON.parse(savedProgress);
      if (progress.step === 2) {
        currentStep = 2;
        userProfile = progress.profile || {};
        userInterests = progress.interests || {};

        // UI 복원
        if (userProfile.age)
          document.getElementById("ageRange").value = userProfile.age;
        if (userProfile.gender)
          document.getElementById("gender").value = userProfile.gender;
        if (userProfile.region)
          document.getElementById("region").value = userProfile.region;

        updateConfirmationInfo();
        updateStepIndicator();
        showInterestSelection();

        // 관심사 선택 복원
        Object.keys(userInterests).forEach((category) => {
          if (Array.isArray(userInterests[category])) {
            userInterests[category].forEach((value) => {
              const button = document.querySelector(`[data-value="${value}"]`);
              if (button) {
                button.classList.add("selected");
              }
            });
          }
        });

        // 진행 상황 삭제
        safeRemoveItem("onboardingProgress");
      }
    } catch (e) {
      console.warn("진행 상황 복원 실패:", e);
      safeRemoveItem("onboardingProgress");
    }
  }
}

// 초기화 시 진행 상황 복원
// DOMContentLoaded에서 처리하므로 이 부분은 제거

// SNS 로그인 사용자 정보 처리 (참고용)
function handleSNSUserData(snsData) {
  // 네이버/카카오 로그인에서 받은 데이터 처리
  if (snsData.age) {
    // 연령대 매핑
    const ageMapping = {
      "40-49": "50대", // 가장 가까운 연령대로 매핑
      "50-59": "50대",
      "60-69": "60대",
      "70-79": "70대",
      "80+": "80대 이상",
    };

    const mappedAge = ageMapping[snsData.age];
    if (mappedAge) {
      document.getElementById("ageRange").value = mappedAge;
    }
  }

  if (snsData.gender) {
    // 성별 매핑
    const genderMapping = {
      M: "남성",
      F: "여성",
      male: "남성",
      female: "여성",
    };

    const mappedGender = genderMapping[snsData.gender];
    if (mappedGender) {
      document.getElementById("gender").value = mappedGender;
    }
  }

  // 확인 정보 업데이트
  updateConfirmationInfo();
}

// 키보드 네비게이션 지원
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    if (currentStep === 1 && !document.getElementById("nextBtn").disabled) {
      proceedToInterests();
    } else if (currentStep === 2) {
      completeOnboarding();
    }
  }
});

// 접근성 개선을 위한 포커스 관리
function manageFocus() {
  if (currentStep === 2) {
    document.querySelector(".interest-selection h1").focus();
  }
}

// 단계 전환 시 포커스 이동
const originalShowInterestSelection = showInterestSelection;
showInterestSelection = function () {
  originalShowInterestSelection();
  setTimeout(manageFocus, 100);
};
