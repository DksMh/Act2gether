// 약관 내용 정의
const termsContent = {
  이용약관: `
                <h3>제1조 (목적)</h3>
                <p>이 약관은 여기부터(이하 "회사")가 제공하는 여행 추천 서비스(이하 "서비스")의 이용에 관한 조건과 절차, 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                
                <h3>제2조 (정의)</h3>
                <p>1. "서비스"란 회사가 제공하는 여행 추천, 예약, 커뮤니티 등 모든 서비스를 의미합니다.</p>
                <p>2. "회원"이란 회사의 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.</p>
                
                <h3>제3조 (약관의 효력 및 변경)</h3>
                <p>1. 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력을 발생합니다.</p>
                <p>2. 회사는 필요한 경우 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내에서 공지합니다.</p>
            `,
  개인정보처리방침: `
                <h3>1. 개인정보의 처리 목적</h3>
                <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다:</p>
                <p>- 서비스 제공 및 계약 이행</p>
                <p>- 회원 식별 및 인증</p>
                <p>- 고객 문의 처리 및 서비스 개선</p>
                
                <h3>2. 개인정보의 처리 및 보유 기간</h3>
                <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
                
                <h3>3. 개인정보의 제3자 제공</h3>
                <p>회사는 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</p>
            `,
  위치정보약관: `
                <h3>제1조 (목적)</h3>
                <p>본 약관은 여기부터가 제공하는 위치정보서비스의 이용과 관련하여 회사와 개인위치정보주체와의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
                
                <h3>제2조 (위치정보의 수집)</h3>
                <p>1. 회사는 다음과 같은 방법으로 개인위치정보를 수집합니다:</p>
                <p>- GPS 위성정보를 이용한 위치정보 수집</p>
                <p>- 기지국 및 와이파이 정보를 이용한 위치정보 수집</p>
                
                <h3>제3조 (위치정보의 이용·제공)</h3>
                <p>1. 회사는 수집된 위치정보를 다음 목적으로 이용합니다:</p>
                <p>- 위치기반 여행지 추천 서비스 제공</p>
                <p>- 주변 관광지 정보 제공</p>
                <p>- 교통정보 및 길찾기 서비스 제공</p>
            `,
  마케팅정보: `
                <h3>마케팅 정보 수신 동의</h3>
                <p>회사는 다음과 같은 마케팅 정보를 제공합니다:</p>
                <p>- 신규 서비스 및 상품 정보</p>
                <p>- 맞춤형 여행 추천 정보</p>
                <p>- 할인 혜택 및 이벤트 정보</p>
                
                <h3>정보 제공 방법</h3>
                <p>- 이메일</p>
                <p>- SMS/MMS</p>
                <p>- 앱 푸시 알림</p>
                
                <h3>동의 철회</h3>
                <p>마케팅 정보 수신에 대한 동의는 언제든지 철회할 수 있으며, 철회 시 해당 정보 제공이 중단됩니다.</p>
            `,
  이벤트정보: `
                <h3>이벤트 및 할인 혜택 알림 동의</h3>
                <p>회사는 다음과 같은 이벤트 정보를 제공합니다:</p>
                <p>- 기간 한정 할인 이벤트</p>
                <p>- 시즌별 특가 상품 정보</p>
                <p>- 회원 대상 특별 혜택</p>
                <p>- 포인트 적립 및 사용 안내</p>
                
                <h3>알림 방법</h3>
                <p>- 앱 푸시 알림</p>
                <p>- 카카오톡 알림톡</p>
                <p>- 이메일 뉴스레터</p>
                
                <h3>동의 철회</h3>
                <p>이벤트 정보 수신 동의는 언제든지 철회 가능하며, 마이페이지에서 설정을 변경할 수 있습니다.</p>
            `,
};

function openModal(type) {
  const modal = document.getElementById(type + "Modal");
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal(type) {
  const modal = document.getElementById(type + "Modal");
  modal.classList.remove("active");
  document.body.style.overflow = "auto";
}

function switchModal(from, to) {
  closeModal(from);
  setTimeout(() => {
    openModal(to);
  }, 300);
}

function selectOption(element) {
  document.querySelectorAll(".signup-option").forEach((option) => {
    option.classList.remove("active");
  });
  element.classList.add("active");
}

function checkAge() {
  updateSignupButton();
}

function toggleAll() {
  const agreeAll = document.getElementById("agreeAll").checked;
  const allTerms = document.querySelectorAll(".terms-checkbox");

  allTerms.forEach((term) => {
    if (term.id !== "agreeAll") {
      term.checked = agreeAll;
    }
  });

  updateSignupButton();
}

function updateAgreeAll() {
  const requiredTerms = document.querySelectorAll(".required-term");
  const optionalTerms = document.querySelectorAll(".optional-term");
  const agreeAll = document.getElementById("agreeAll");

  let allRequiredChecked = true;
  let allOptionalChecked = true;

  requiredTerms.forEach((term) => {
    if (!term.checked) {
      allRequiredChecked = false;
    }
  });

  optionalTerms.forEach((term) => {
    if (!term.checked) {
      allOptionalChecked = false;
    }
  });

  agreeAll.checked = allRequiredChecked && allOptionalChecked;
  agreeAll.indeterminate = allRequiredChecked && !allOptionalChecked;

  updateSignupButton();
}

function updateSignupButton() {
  const ageCheck = document.getElementById("ageCheck").checked;
  const requiredTerms = document.querySelectorAll(".required-term");
  const signupBtn = document.getElementById("signupBtn");

  let allRequiredChecked = true;
  requiredTerms.forEach((term) => {
    if (!term.checked) {
      allRequiredChecked = false;
    }
  });

  signupBtn.disabled = !ageCheck || !allRequiredChecked;
}

function showTermsModal(title) {
  const modal = document.getElementById("termsModal");
  const modalTitle = document.getElementById("termsModalTitle");
  const modalBody = document.getElementById("termsModalBody");

  modalTitle.textContent = title;
  modalBody.innerHTML =
    termsContent[title] || "약관 내용을 불러오는 중입니다...";

  modal.classList.add("active");
}

function closeTermsModal() {
  const modal = document.getElementById("termsModal");
  modal.classList.remove("active");
}

function proceedSignup() {
  const ageCheck = document.getElementById("ageCheck").checked;
  const requiredTerms = document.querySelectorAll(".required-term");

  if (!ageCheck) {
    alert("연령 확인이 필요합니다.");
    return;
  }

  let allRequiredChecked = true;
  requiredTerms.forEach((term) => {
    if (!term.checked) {
      allRequiredChecked = false;
    }
  });

  if (!allRequiredChecked) {
    alert("필수 약관에 동의해주세요.");
    return;
  }

  // alert("회원가입이 진행됩니다.");
  // 실제 회원가입 로직 구현

  emailModal();
}

function emailModal(){
  switchModal('signup', 'email');

}

// 이메일 코드 전송
function sendCode() {
  var email = $('#email').val();
  // console.log(email);
  $.ajax({
        url: "/users/sendCode",
        type: 'post',
        contentType: "text/plain",
        data: email,
        success: function(data, textStatus, jqXHR) {
            alert(data);
        },
        error: function(request, status, error) {
            // console.log("Error:", error);
            // console.log("Response:", request.responseText);
        },
        complete: function(jqXHR, textStatus) {
            
        }
    });
};

//이메일 코드 검증버튼
function verifyCode() {
  var emailData = $('#email').val();
  const data = {
    email: emailData,
    code: $('#code').val()
  };

  $.ajax({
        url: "/users/verifyCode",
        type: 'post',
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function(response, textStatus, jqXHR) {
          sessionStorage.setItem("signupemail", emailData);
          location.href = "/onboarding";
        },
        error: function(request, status, error) {
            // console.log("Error:", error);
            // console.log("Response:", request.responseText);
            alert("인증 실패");
        },
        complete: function(jqXHR, textStatus) {
            
        }
    });
}

function login() {
  // var email = $('#emailLogin').val();
  // var password = $('#passwordLogin').val();

  // const data = {
  //   email: $('#emailLogin').val(),
  //   password: $('#passwordLogin').val()
  // };

  const formData = new URLSearchParams();
  formData.append('email', $('#emailLogin').val());
  formData.append('password', $('#passwordLogin').val());

  $.ajax({
        url: "/users/login",
        type: 'post',
        contentType: "application/x-www-form-urlencoded",
        data: formData.toString(),
        success: function(response, textStatus, jqXHR) {
            // alert("로그인 성공");
            // 로그인 성공 시 페이지 이동
            window.location.href = "/";
        },
        error:function(xhr) {
          if (xhr.status === 401) {
            alert("아이디 또는 비밀번호가 올바르지 않습니다.");
          } else {
            alert("로그인 중 오류 발생");
          }
        },
        complete: function(jqXHR, textStatus) {
            
        }
    });
}

// 모달 외부 클릭 시 닫기
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", function (e) {
    if (e.target === this) {
      this.classList.remove("active");
      document.body.style.overflow = "auto";
    }
  });
});

// 약관 모달 외부 클릭 시 닫기
document.getElementById("termsModal").addEventListener("click", function (e) {
  if (e.target === this) {
    this.classList.remove("active");
  }
});

// ESC 키로 모달 닫기
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.active").forEach((modal) => {
      modal.classList.remove("active");
    });
    document.querySelectorAll(".terms-modal.active").forEach((modal) => {
      modal.classList.remove("active");
    });
    document.body.style.overflow = "auto";
  }
});

// 페이지 로드 시 초기 상태 설정
document.addEventListener("DOMContentLoaded", function () {
  updateSignupButton();
});
