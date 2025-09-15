// signup.js - 연령층, 성별 추가 버전

// 상태 관리
let currentStep = 1;
let emailVerified = false;
let formData = {};

// 약관 내용 정의 (기존과 동일)
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
        <p>- 맞춤형 여행 추천 (연령층, 성별, 거주지역 기반)</p>
        <p>- 통계 분석 및 서비스 품질 향상</p>
        
        <h3>2. 수집하는 개인정보 항목</h3>
        <p>필수항목: 이메일, 닉네임, 이름, 비밀번호, 연령층, 성별, 거주지역</p>
        <p>선택항목: 여행 관심사, 마케팅 수신 동의</p>
        <p>※ <strong>연령층, 성별</strong>은 맞춤형 서비스 제공을 위한 필수 정보로, 가입 후 변경이 제한됩니다.</p>
        <p>※ <strong>거주지역</strong>은 마이페이지에서 언제든지 수정 가능합니다.</p>
        
        <h3>3. 개인정보의 처리 및 보유 기간</h3>
        <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
        
        <h3>4. 개인정보의 제3자 제공</h3>
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
    `
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    generateBirthYearOptions(); // 출생년도 옵션 생성
    updateNextButton();
});

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 약관 동의 체크박스 이벤트
    const agreeAll = document.getElementById('agreeAll');
    const requiredTerms = document.querySelectorAll('.required-term');
    const optionalTerms = document.querySelectorAll('.optional-term');
    const ageCheck = document.getElementById('ageCheck');

    if (agreeAll) agreeAll.addEventListener('change', toggleAllTerms);
    requiredTerms.forEach(term => term.addEventListener('change', updateAgreeAll));
    optionalTerms.forEach(term => term.addEventListener('change', updateAgreeAll));
    if (ageCheck) ageCheck.addEventListener('change', updateNextButton);

    // 폼 입력 필드 이벤트 - 각각 독립적으로 처리
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const username = document.getElementById('username');
    const realName = document.getElementById('realName');
    const birthYear = document.getElementById('birthYear');
    const gender = document.getElementById('gender');
    const region = document.getElementById('region');

    if (email) email.addEventListener('input', handleEmailInput);
    if (password) password.addEventListener('input', handlePasswordInput);
    if (confirmPassword) confirmPassword.addEventListener('input', handleConfirmPasswordInput);
    if (username) username.addEventListener('input', handleFormInput);
    if (realName) realName.addEventListener('input', handleFormInput);
    if (birthYear) birthYear.addEventListener('change', handleBirthYearChange);
    if (gender) gender.addEventListener('change', handleFormInput);
    if (region) region.addEventListener('change', handleFormInput);
}

// 입력 핸들러들 - 각각 독립적으로 작동
function handleEmailInput() {
    validateEmailFormat();
}

function handlePasswordInput() {
    validatePasswordStrength();
    validatePasswordsMatch();
    checkFormCompletion();
}

function handleConfirmPasswordInput() {
    validatePasswordsMatch();
    checkFormCompletion();
}

function handleFormInput() {
    checkFormCompletion();
}

// 출생년도 변경 핸들러
function handleBirthYearChange() {
    const birthYear = document.getElementById('birthYear').value;
    if (birthYear) {
        const age = new Date().getFullYear() - parseInt(birthYear);
        if (age < 50) {
            showAgeRestrictionNotice();
        } else {
            hideAgeRestrictionNotice();
        }
    }
    checkFormCompletion();
}

// 출생년도 옵션 생성 (50세 이상만)
function generateBirthYearOptions() {
    const birthYearSelect = document.getElementById('birthYear');
    const currentYear = new Date().getFullYear();
    const maxBirthYear = currentYear - 50; // 50세
    const minBirthYear = currentYear - 100; // 100세
    
    // 최근 년도부터 역순으로 추가
    for (let year = maxBirthYear; year >= minBirthYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        birthYearSelect.appendChild(option);
    }
}

// 연령 제한 안내 표시
function showAgeRestrictionNotice() {
    const birthYearGroup = document.getElementById('birthYear').closest('.form-group');
    let notice = birthYearGroup.querySelector('.age-restriction-notice');
    
    if (!notice) {
        notice = document.createElement('div');
        notice.className = 'age-restriction-notice';
        notice.innerHTML = '⚠️ 죄송합니다. 본 서비스는 50세 이상 액티브 시니어를 위한 서비스입니다.';
        birthYearGroup.appendChild(notice);
    }
}

// 연령 제한 안내 숨김
function hideAgeRestrictionNotice() {
    const birthYearGroup = document.getElementById('birthYear').closest('.form-group');
    const notice = birthYearGroup.querySelector('.age-restriction-notice');
    if (notice) {
        notice.remove();
    }
}

// 1단계: 약관 동의 관련 함수들 (기존과 동일)
function toggleAllTerms() {
    const agreeAll = document.getElementById('agreeAll').checked;
    const allTerms = document.querySelectorAll('.terms-checkbox:not(#agreeAll)');
    
    allTerms.forEach(term => {
        term.checked = agreeAll;
    });
    
    updateNextButton();
}

function updateAgreeAll() {
    const requiredTerms = document.querySelectorAll('.required-term');
    const optionalTerms = document.querySelectorAll('.optional-term');
    const agreeAll = document.getElementById('agreeAll');
    
    let allRequiredChecked = Array.from(requiredTerms).every(term => term.checked);
    let allOptionalChecked = Array.from(optionalTerms).every(term => term.checked);
    
    agreeAll.checked = allRequiredChecked && allOptionalChecked;
    agreeAll.indeterminate = allRequiredChecked && !allOptionalChecked;
    
    updateNextButton();
}

function updateNextButton() {
    const ageCheck = document.getElementById('ageCheck');
    const requiredTerms = document.querySelectorAll('.required-term');
    const nextBtn = document.getElementById('nextToInfoBtn');
    
    if (!ageCheck || !nextBtn) return;
    
    const ageChecked = ageCheck.checked;
    const allRequiredChecked = Array.from(requiredTerms).every(term => term.checked);
    
    nextBtn.disabled = !ageChecked || !allRequiredChecked;
}

function showTermsModal(title) {
    const modal = document.getElementById('termsModal');
    const modalTitle = document.getElementById('termsModalTitle');
    const modalBody = document.getElementById('termsModalBody');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = termsContent[title] || '약관 내용을 불러오는 중입니다...';
    
    modal.classList.add('active');
}

function closeTermsModal() {
    document.getElementById('termsModal').classList.remove('active');
}

// 2단계: 정보 입력 관련 함수들
function sendEmailCode() {
    const email = document.getElementById('email').value;
    const emailInputStatus = document.getElementById('emailInputStatus');
    const emailStatus = document.getElementById('emailStatus');
    const sendBtn = document.getElementById('sendCodeBtn');
    const emailCodeInput = document.getElementById('emailCode');
    const verifyBtn = document.getElementById('verifyCodeBtn');
    
    clearEmailMessages();
    
    if (!email) {
        showEmailInputStatus('이메일 주소를 입력해주세요.', 'error');
        return;
    }
    
    if (!isValidEmailFormat(email)) {
        showEmailInputStatus('올바른 이메일 주소를 입력해주세요.', 'error');
        return;
    }
    
    // 먼저 이메일 중복 검사
    sendBtn.disabled = true;
    sendBtn.textContent = '확인중...';
    
    $.ajax({
        url: "/users/checkEmail",
        type: 'post',
        contentType: "text/plain",
        data: email,
        success: function(response, textStatus, jqXHR) {
            if (response.exists) {
                // 이미 가입된 이메일
                showEmailInputStatus('이미 가입된 이메일입니다.', 'error');
                sendBtn.textContent = '인증번호 전송';
                sendBtn.disabled = false;
                
                // 로그인 페이지로 이동 안내
                setTimeout(() => {
                    if (confirm('이미 가입된 이메일입니다. 로그인 페이지로 이동하시겠습니까?')) {
                        window.location.href = '/login';
                    }
                }, 2000);
                
            } else {
                // 사용 가능한 이메일이면 인증번호 전송
                showEmailInputStatus('유효한 이메일 주소입니다.', 'success');
                sendBtn.textContent = '전송중...';
                
                $.ajax({
                    url: "/users/sendCode",
                    type: 'post',
                    contentType: "text/plain",
                    data: email,
                    success: function(data, textStatus, jqXHR) {
                        showEmailStatus('인증번호가 전송되었습니다.', 'success');
                        emailCodeInput.disabled = false;
                        verifyBtn.disabled = false;
                        sendBtn.textContent = '재전송';
                        sendBtn.disabled = false;
                    },
                    error: function(request, status, error) {
                        showEmailStatus('인증번호 전송에 실패했습니다.', 'error');
                        sendBtn.textContent = '인증번호 전송';
                        sendBtn.disabled = false;
                    }
                });
            }
        },
        error: function(request, status, error) {
            showEmailInputStatus('이메일 확인 중 오류가 발생했습니다.', 'error');
            sendBtn.textContent = '인증번호 전송';
            sendBtn.disabled = false;
        }
    });
}

function verifyEmailCode() {
    const email = document.getElementById('email').value;
    const code = document.getElementById('emailCode').value;
    const verifyBtn = document.getElementById('verifyCodeBtn');
    
    if (!code) {
        showEmailStatus('인증번호를 입력해주세요.', 'error');
        return;
    }
    
    verifyBtn.disabled = true;
    verifyBtn.textContent = '확인중...';
    
    const data = {
        email: email,
        code: code
    };
    
    $.ajax({
        url: "/users/verifyCode",
        type: 'post',
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function(response, textStatus, jqXHR) {
            // 인증 성공 - 중복 검사는 이미 sendEmailCode에서 완료됨
            emailVerified = true;
            showEmailStatus('이메일 인증이 완료되었습니다.', 'success');
            
            console.log('이메일 인증 성공!');
            
            // 다른 입력 필드들 활성화
            enableFormInputs();
            
            // 강제로 모든 입력 필드 활성화
            setTimeout(() => {
                ['username', 'realName', 'password', 'confirmPassword', 'birthYear', 'gender', 'region'].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.disabled = false;
                        element.removeAttribute('disabled');
                        element.style.backgroundColor = '#fff';
                        element.style.cursor = element.tagName === 'SELECT' ? 'pointer' : 'text';
                    }
                });
                console.log('강제 활성화 완료');
            }, 100);
            
            checkFormCompletion();
            verifyBtn.textContent = '완료';
        },
        error: function(request, status, error) {
            showEmailStatus('인증번호가 올바르지 않습니다.', 'error');
            verifyBtn.textContent = '확인';
            verifyBtn.disabled = false;
        }
    });
}

// 이메일 중복 확인 함수 추가
function checkEmailDuplicate(email) {
    $.ajax({
        url: "/users/checkEmail",
        type: 'post',
        contentType: "text/plain",
        data: email,
        success: function(response, textStatus, jqXHR) {
            if (response.exists) {
                // 이미 가입된 이메일
                showEmailStatus('이미 가입된 이메일입니다. 로그인을 이용해주세요.', 'error');
                emailVerified = false;
                
                // 다른 필드들 비활성화 유지
                const inputs = ['username', 'realName', 'password', 'confirmPassword', 'birthYear', 'gender', 'region'];
                inputs.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.disabled = true;
                        element.style.backgroundColor = '#f8f9fa';
                    }
                });
                
                // 로그인 페이지로 이동 안내
                setTimeout(() => {
                    if (confirm('이미 가입된 이메일입니다. 로그인 페이지로 이동하시겠습니까?')) {
                        window.location.href = '/login';
                    }
                }, 2000);
                
            } else {
                // 사용 가능한 이메일
                emailVerified = true;
                showEmailStatus('이메일 인증이 완료되었습니다.', 'success');
                
                console.log('이메일 인증 성공!');
                
                // 다른 입력 필드들 활성화
                enableFormInputs();
                
                // 강제로 모든 입력 필드 활성화
                setTimeout(() => {
                    ['username', 'realName', 'password', 'confirmPassword', 'birthYear', 'gender', 'region'].forEach(id => {
                        const element = document.getElementById(id);
                        if (element) {
                            element.disabled = false;
                            element.removeAttribute('disabled');
                            element.style.backgroundColor = '#fff';
                            element.style.cursor = element.tagName === 'SELECT' ? 'pointer' : 'text';
                        }
                    });
                    console.log('강제 활성화 완료');
                }, 100);
                
                checkFormCompletion();
            }
            
            document.getElementById('verifyCodeBtn').textContent = '완료';
        },
        error: function(request, status, error) {
            showEmailStatus('이메일 확인 중 오류가 발생했습니다.', 'error');
            document.getElementById('verifyCodeBtn').textContent = '확인';
            document.getElementById('verifyCodeBtn').disabled = false;
        }
    });
}

function enableFormInputs() {
    const inputs = ['username', 'realName', 'password', 'confirmPassword', 'birthYear', 'gender', 'region'];
    console.log('enableFormInputs 호출됨');
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id} 요소:`, element);
        if (element) {
            element.disabled = false;
            element.style.backgroundColor = '#fff';
            console.log(`${id} 활성화 완료`);
        } else {
            console.error(`${id} 요소를 찾을 수 없습니다`);
        }
    });
}

function showEmailStatus(message, type) {
    const emailStatus = document.getElementById('emailStatus');
    if (emailStatus) {
        emailStatus.textContent = message;
        emailStatus.className = `verification-status ${type}`;
    }
}

// 이메일 입력 필드 아래 상태 메시지
function showEmailInputStatus(message, type) {
    const emailInputStatus = document.getElementById('emailInputStatus');
    if (emailInputStatus) {
        emailInputStatus.textContent = message;
        emailInputStatus.className = `verification-status ${type}`;
    }
}

// 모든 이메일 관련 메시지 초기화
function clearEmailMessages() {
    const emailInputStatus = document.getElementById('emailInputStatus');
    const emailStatus = document.getElementById('emailStatus');
    
    if (emailInputStatus) {
        emailInputStatus.textContent = '';
        emailInputStatus.className = 'verification-status';
    }
    if (emailStatus) {
        emailStatus.textContent = '';
        emailStatus.className = 'verification-status';
    }
}

// 독립적인 검증 함수들
function validateEmailFormat() {
    const email = document.getElementById('email').value;
    return isValidEmailFormat(email);
}

function isValidEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePasswordStrength() {
    const password = document.getElementById('password').value;
    
    const hasMinLength = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    const isValid = hasMinLength && hasLetter && hasNumber;
    
    // 비밀번호 힌트 업데이트
    const hintDiv = document.querySelector('.password-hint');
    if (hintDiv) {
        if (password.length === 0) {
            hintDiv.textContent = '8자 이상, 영문과 숫자를 포함해주세요';
            hintDiv.style.color = '#6c757d';
        } else if (!isValid) {
            let missing = [];
            if (!hasMinLength) missing.push('8자 이상');
            if (!hasLetter) missing.push('영문');
            if (!hasNumber) missing.push('숫자');
            hintDiv.textContent = `${missing.join(', ')}이 필요합니다`;
            hintDiv.style.color = '#dc3545';
        } else {
            hintDiv.textContent = '비밀번호가 조건을 만족합니다';
            hintDiv.style.color = '#28a745';
        }
    }
    
    console.log('비밀번호 검증:', {
        password: password,
        length: password.length,
        hasMinLength,
        hasLetter,
        hasNumber,
        isValid
    });
    
    return isValid;
}

function validatePasswordsMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchDiv = document.getElementById('passwordMatch');
    
    if (!matchDiv) return false;
    
    if (confirmPassword === '') {
        matchDiv.textContent = '';
        matchDiv.className = 'password-match';
        return false;
    } else if (password === confirmPassword) {
        matchDiv.textContent = '비밀번호가 일치합니다.';
        matchDiv.className = 'password-match valid';
        return true;
    } else {
        matchDiv.textContent = '비밀번호가 일치하지 않습니다.';
        matchDiv.className = 'password-match invalid';
        return false;
    }
}

// 폼 완성도 체크 - 출생년도, 성별, 거주지역 검증 추가
function checkFormCompletion() {
    const email = document.getElementById('email');
    const username = document.getElementById('username');
    const realName = document.getElementById('realName');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const birthYear = document.getElementById('birthYear');
    const gender = document.getElementById('gender');
    const region = document.getElementById('region');
    const completeBtn = document.getElementById('completeSignupBtn');
    
    console.log('checkFormCompletion 호출됨');
    
    if (!completeBtn) {
        console.log('completeSignupBtn 버튼을 찾을 수 없습니다');
        return;
    }
    
    const isEmailValid = emailVerified;
    const isUsernameValid = username && username.value.length >= 2;
    const isRealNameValid = realName && realName.value.length >= 2;
    const isPasswordValid = validatePasswordStrength();
    const isPasswordMatch = validatePasswordsMatch();
    const isBirthYearValid = birthYear && birthYear.value !== '';
    const isGenderValid = gender && gender.value !== '';
    const isRegionValid = region && region.value !== '';
    
    // 연령 검증 (50세 이상)
    let isAgeValid = false;
    if (birthYear && birthYear.value) {
        const age = new Date().getFullYear() - parseInt(birthYear.value);
        isAgeValid = age >= 50;
    }
    
    // 각 검증 결과 로그 출력
    console.log('검증 결과:', {
        emailVerified: isEmailValid,
        username: username?.value,
        usernameValid: isUsernameValid,
        realName: realName?.value,
        realNameValid: isRealNameValid,
        passwordValid: isPasswordValid,
        passwordMatch: isPasswordMatch,
        birthYear: birthYear?.value,
        birthYearValid: isBirthYearValid,
        ageValid: isAgeValid,
        gender: gender?.value,
        genderValid: isGenderValid,
        region: region?.value,
        regionValid: isRegionValid
    });
    
    const allValid = isEmailValid && isUsernameValid && isRealNameValid && 
                     isPasswordValid && isPasswordMatch && isBirthYearValid && 
                     isAgeValid && isGenderValid && isRegionValid;
    
    console.log('전체 유효성:', allValid);
    
    completeBtn.disabled = !allValid;
    
    // 버튼 상태 시각적 표시
    if (allValid) {
        completeBtn.style.opacity = '1';
        completeBtn.style.cursor = 'pointer';
    } else {
        completeBtn.style.opacity = '0.5';
        completeBtn.style.cursor = 'not-allowed';
    }
}

// 단계 이동 함수들
function nextToInfo() {
    if (!checkTermsAgreement()) {
        alert('필수 약관에 동의해주세요.');
        return;
    }
    
    updateProgressBar(2);
    showStep('infoStep');
}

function prevToTerms() {
    updateProgressBar(1);
    showStep('termsStep');
}

function completeSignup() {
    if (!validateAllInputs()) {
        alert('모든 정보를 올바르게 입력해주세요.');
        return;
    }
    
    // 회원가입 데이터 준비 - 백엔드가 기대하는 필드명으로 맞춤
    const birthYear = document.getElementById('birthYear').value;
    const age = birthYear ? new Date().getFullYear() - parseInt(birthYear) : 0;
    const agreement = {
        age: $("#ageCheck").is(":checked"),
        terms: $("#terms1").is(":checked"),
        privacy: $("#terms2").is(":checked"),
        location: $("#terms3").is(":checked"),
        marketing: $("#terms4").is(":checked"),
        event: $("#terms5").is(":checked"),
    }  
    const userData = {
        email: document.getElementById('email').value,
        username: document.getElementById('username').value,
        realname: document.getElementById('realName').value, // realName → realname
        password: document.getElementById('password').value,
        age: age.toString(), // birthYear에서 age 계산
        gender: document.getElementById('gender').value,
        region: document.getElementById('region').value, 
        interests: null, // 관심사는 나중에 설정
        status: "active",
        agreement: JSON.stringify(agreement)
    };
    
    console.log('회원가입 데이터:', userData);
    
    // 서버로 회원가입 요청 (자동 로그인 포함)
    $.ajax({
        url: "/users/create",
        type: 'post',
        contentType: "application/json",
        data: JSON.stringify(userData),
        success: function(response, textStatus, jqXHR) {
            // 세션 스토리지에 사용자 정보 저장 (관심사 설정용)
            sessionStorage.setItem("signupSuccess", "true");
            sessionStorage.setItem("userEmail", userData.email);
            sessionStorage.setItem("username", userData.username);
            sessionStorage.setItem("autoLoggedIn", "true"); // 자동 로그인 플래그
            
            console.log('회원가입 성공 및 자동 로그인 완료');
            
            updateProgressBar(3);
            showStep('completeStep');
        },
        error: function(request, status, error) {
            alert("회원가입에 실패했습니다. 다시 시도해주세요.");
            console.error("Error:", error);
        }
    });
}

function checkTermsAgreement() {
    const ageCheck = document.getElementById('ageCheck');
    const requiredTerms = document.querySelectorAll('.required-term');
    
    if (!ageCheck) return false;
    
    const ageChecked = ageCheck.checked;
    const allRequiredChecked = Array.from(requiredTerms).every(term => term.checked);
    
    return ageChecked && allRequiredChecked;
}

function validateAllInputs() {
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const realName = document.getElementById('realName').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const birthYear = document.getElementById('birthYear').value;
    const gender = document.getElementById('gender').value;
    const region = document.getElementById('region').value;
    
    // 연령 검증
    const age = birthYear ? new Date().getFullYear() - parseInt(birthYear) : 0;
    const isAgeValid = age >= 50;
    
    return emailVerified && 
           username.length >= 2 && 
           realName.length >= 2 && 
           validatePasswordStrength() && 
           password === confirmPassword &&
           birthYear !== '' &&
           isAgeValid &&
           gender !== '' &&
           region !== '';
}

// UI 유틸리티 함수들
function updateProgressBar(step) {
    currentStep = step;
    
    document.querySelectorAll('.progress-step').forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        
        if (index < step - 1) {
            stepEl.classList.add('completed');
        } else if (index === step - 1) {
            stepEl.classList.add('active');
        }
    });
}

function showStep(stepId) {
    document.querySelectorAll('.signup-step').forEach(step => {
        step.classList.remove('active');
    });
    
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.classList.add('active');
    }
}

// 완료 후 이동 함수들
function goToMain() {
    window.location.href = '/';
}

function goToInterests() {
    window.location.href = '/onboarding';
}

function goToLogin() {
    window.location.href = '/login';
}

// 모달 이벤트 리스너
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('terms-modal')) {
        closeTermsModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeTermsModal();
    }
});