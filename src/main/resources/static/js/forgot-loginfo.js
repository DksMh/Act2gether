// forgot-loginfo.js - 이메일/비밀번호 찾기 페이지 전용

let currentStep = 1;
let currentTab = 'find-email'; // 기본값: 이메일 찾기
let timerInterval = null;
let timeLeft = 180; // 3분 = 180초
let currentEmail = '';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeTabs();
    
    // URL 파라미터로 탭 결정
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    
    if (type === 'email') {
        switchTab('find-email');
    } else if (type === 'password') {
        switchTab('find-password');
    } else {
        switchTab('find-password'); // 기본값: 비밀번호 찾기
    }
    
    showPasswordStep(1); // 비밀번호 찾기 초기 단계 설정
});

// 탭 초기화
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

// 탭 전환
function switchTab(tabId) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 모든 탭 콘텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    currentTab = tabId;
    clearAllMessages();
    
    // 탭 변경시 단계 초기화
    if (tabId === 'find-password') {
        showPasswordStep(1);
    } else if (tabId === 'find-email') {
        showEmailStep(1);
    }
}

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 이메일 찾기 폼
    const findEmailForm = document.getElementById('findEmailForm');
    if (findEmailForm) {
        findEmailForm.addEventListener('submit', handleFindEmailSubmit);
    }
    
    // 비밀번호 찾기 폼들
    const emailForm = document.getElementById('emailForm');
    const verifyForm = document.getElementById('verifyForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const resendCodeBtn = document.getElementById('resendCodeBtn');
    
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailSubmit);
    }
    
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerifySubmit);
    }
    
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', handlePasswordResetSubmit);
    }
    
    if (resendCodeBtn) {
        resendCodeBtn.addEventListener('click', handleResendCode);
    }
    
    // 실시간 유효성 검사
    const findName = document.getElementById('findName');
    const findUsername = document.getElementById('findUsername');
    const email = document.getElementById('email');
    const verificationCode = document.getElementById('verificationCode');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (findName) {
        findName.addEventListener('input', () => clearFieldMessage('findName'));
    }
    
    if (findUsername) {
        findUsername.addEventListener('input', () => clearFieldMessage('findUsername'));
    }
    
    if (email) {
        email.addEventListener('input', () => clearFieldMessage('email'));
        email.addEventListener('blur', validateEmail);
    }
    
    if (verificationCode) {
        verificationCode.addEventListener('input', () => {
            clearFieldMessage('verificationCode');
            // 숫자만 입력 허용
            verificationCode.value = verificationCode.value.replace(/[^0-9]/g, '');
        });
    }
    
    if (newPassword) {
        newPassword.addEventListener('input', () => {
            clearFieldMessage('newPassword');
            validatePasswordStrength();
        });
    }
    
    if (confirmPassword) {
        confirmPassword.addEventListener('input', () => {
            clearFieldMessage('confirmPassword');
            validatePasswordMatch();
        });
    }
}

// 이메일 찾기 제출 처리
function handleFindEmailSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('findName').value;
    const username = document.getElementById('findUsername').value;
    
    if (!validateFindEmailForm(name, username)) {
        return;
    }
    
    findEmail(name, username);
}

// 이메일 찾기 폼 검증
function validateFindEmailForm(name, username) {
    clearAllMessages();
    let isValid = true;
    
    // 이름 검증
    if (!name) {
        showFieldMessage('findName', '이름을 입력해주세요.', 'error');
        document.getElementById('findName').focus();
        isValid = false;
    } else if (name.length < 2) {
        showFieldMessage('findName', '이름은 2자 이상 입력해주세요.', 'error');
        document.getElementById('findName').focus();
        isValid = false;
    }
    
    // 닉네임 검증
    if (!username) {
        showFieldMessage('findUsername', '닉네임을 입력해주세요.', 'error');
        if (isValid) {
            document.getElementById('findUsername').focus();
        }
        isValid = false;
    } else if (username.length < 2) {
        showFieldMessage('findUsername', '닉네임은 2자 이상 입력해주세요.', 'error');
        if (isValid) {
            document.getElementById('findUsername').focus();
        }
        isValid = false;
    }
    
    return isValid;
}

// 이메일 찾기 API 호출
async function findEmail(name, username) {
    const findBtn = document.getElementById('findEmailBtn');
    setButtonLoading(findBtn, true);
    
    try {
        // 백엔드 개발자가 구현할 API 엔드포인트
        const response = await fetch('/users/findEmail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                username: username
            })
        });
        
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                displayEmailResult(result.email);
                showEmailStep(2);
            } else {
                showMessage('서버에서 올바르지 않은 응답을 받았습니다.', 'error');
            }
        } else {
            const contentType = response.headers.get('content-type');
            let errorMessage = '일치하는 계정을 찾을 수 없습니다.';
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // JSON 파싱 실패시 기본 메시지 사용
                }
            } else {
                // HTML 응답인 경우
                if (response.status === 404) {
                    errorMessage = 'API 엔드포인트를 찾을 수 없습니다. 백엔드 개발자에게 문의하세요.';
                } else if (response.status === 500) {
                    errorMessage = '서버 내부 오류가 발생했습니다.';
                }
            }
            
            showMessage(errorMessage, 'error');
        }
    } catch (error) {
        console.error('이메일 찾기 오류:', error);
        if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
            showMessage('서버에서 올바르지 않은 응답을 받았습니다. API가 구현되지 않았을 수 있습니다.', 'error');
        } else {
            showMessage('이메일 찾기 중 오류가 발생했습니다.', 'error');
        }
    } finally {
        setButtonLoading(findBtn, false);
    }
}

// 이메일 결과 표시
function displayEmailResult(email) {
    const emailResult = document.getElementById('emailResult');
    if (emailResult) {
        // 이메일 마스킹 처리 (예: user***@example.com)
        const maskedEmail = maskEmail(email);
        emailResult.innerHTML = `<strong>${maskedEmail}</strong>`;
    }
}

// 이메일 마스킹
function maskEmail(email) {
    const [username, domain] = email.split('@');
    if (username.length <= 3) {
        return username[0] + '*'.repeat(username.length - 1) + '@' + domain;
    }
    return username.slice(0, 3) + '*'.repeat(username.length - 3) + '@' + domain;
}

// 이메일 찾기 단계 전환
function showEmailStep(step) {
    if (currentTab !== 'find-email') return;
    
    // 이메일 찾기 단계 숨기기
    for (let i = 1; i <= 2; i++) {
        const stepElement = document.getElementById(`email-step${i}`);
        if (stepElement) {
            stepElement.style.display = 'none';
        }
    }
    
    // 현재 단계 보이기
    const currentStepElement = document.getElementById(`email-step${step}`);
    if (currentStepElement) {
        currentStepElement.style.display = 'block';
    }
    
    clearAllMessages();
}

// 1단계: 이메일 제출 처리
function handleEmailSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    
    if (!validateEmailForm(email)) {
        return;
    }
    
    currentEmail = email;
    sendVerificationCode(email);
}

// 2단계: 인증번호 확인 처리
function handleVerifySubmit(event) {
    event.preventDefault();
    
    const code = document.getElementById('verificationCode').value;
    
    if (!validateVerificationCode(code)) {
        return;
    }
    
    verifyCode(currentEmail, code);
}

// 3단계: 비밀번호 재설정 처리
function handlePasswordResetSubmit(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!validatePasswordForm(newPassword, confirmPassword)) {
        return;
    }
    
    resetPassword(currentEmail, newPassword);
}

// 이메일 폼 검증
function validateEmailForm(email) {
    clearAllMessages();
    
    if (!email) {
        showFieldMessage('email', '이메일 주소를 입력해주세요.', 'error');
        document.getElementById('email').focus();
        return false;
    }
    
    if (!isValidEmailFormat(email)) {
        showFieldMessage('email', '올바른 이메일 형식을 입력해주세요.', 'error');
        document.getElementById('email').focus();
        return false;
    }
    
    return true;
}

// 인증번호 검증
function validateVerificationCode(code) {
    clearAllMessages();
    
    if (!code) {
        showFieldMessage('verificationCode', '인증번호를 입력해주세요.', 'error');
        document.getElementById('verificationCode').focus();
        return false;
    }
    
    if (code.length !== 6) {
        showFieldMessage('verificationCode', '6자리 인증번호를 입력해주세요.', 'error');
        document.getElementById('verificationCode').focus();
        return false;
    }
    
    return true;
}

// 비밀번호 폼 검증
function validatePasswordForm(newPassword, confirmPassword) {
    clearAllMessages();
    let isValid = true;
    
    // 새 비밀번호 검증
    if (!newPassword) {
        showFieldMessage('newPassword', '새 비밀번호를 입력해주세요.', 'error');
        document.getElementById('newPassword').focus();
        isValid = false;
    } else if (newPassword.length < 8) {
        showFieldMessage('newPassword', '비밀번호는 8자 이상이어야 합니다.', 'error');
        document.getElementById('newPassword').focus();
        isValid = false;
    } else if (!isValidPasswordFormat(newPassword)) {
        showFieldMessage('newPassword', '영문과 숫자를 포함해야 합니다.', 'error');
        document.getElementById('newPassword').focus();
        isValid = false;
    }
    
    // 비밀번호 확인 검증
    if (!confirmPassword) {
        showFieldMessage('confirmPassword', '비밀번호 확인을 입력해주세요.', 'error');
        if (isValid) {
            document.getElementById('confirmPassword').focus();
        }
        isValid = false;
    } else if (newPassword !== confirmPassword) {
        showFieldMessage('confirmPassword', '비밀번호가 일치하지 않습니다.', 'error');
        if (isValid) {
            document.getElementById('confirmPassword').focus();
        }
        isValid = false;
    }
    
    return isValid;
}

// 이메일 형식 검증
function isValidEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 비밀번호 형식 검증
function isValidPasswordFormat(password) {
    // 영문, 숫자 포함 8자 이상
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]/;
    return passwordRegex.test(password);
}

// 이메일 검증
function validateEmail() {
    const email = document.getElementById('email').value;
    const emailField = document.getElementById('email');
    
    if (!email) {
        showFieldMessage('email', '이메일 주소를 입력해주세요.', 'error');
        emailField.style.borderColor = '#dc3545';
    } else if (!isValidEmailFormat(email)) {
        showFieldMessage('email', '올바른 이메일 형식을 입력해주세요.', 'error');
        emailField.style.borderColor = '#dc3545';
    } else {
        emailField.style.borderColor = '';
        clearFieldMessage('email');
    }
}

// 비밀번호 강도 검증
function validatePasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const passwordField = document.getElementById('newPassword');
    
    if (!password) {
        return;
    }
    
    if (password.length < 8) {
        showFieldMessage('newPassword', '비밀번호는 8자 이상이어야 합니다.', 'error');
        passwordField.style.borderColor = '#dc3545';
    } else if (!isValidPasswordFormat(password)) {
        showFieldMessage('newPassword', '영문과 숫자를 포함해야 합니다.', 'error');
        passwordField.style.borderColor = '#dc3545';
    } else {
        passwordField.style.borderColor = '#28a745';
        showFieldMessage('newPassword', '사용 가능한 비밀번호입니다.', 'success');
    }
}

// 비밀번호 일치 검증
function validatePasswordMatch() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmField = document.getElementById('confirmPassword');
    
    if (!confirmPassword) {
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showFieldMessage('confirmPassword', '비밀번호가 일치하지 않습니다.', 'error');
        confirmField.style.borderColor = '#dc3545';
    } else {
        confirmField.style.borderColor = '#28a745';
        showFieldMessage('confirmPassword', '비밀번호가 일치합니다.', 'success');
    }
}

// 인증번호 발송
async function sendVerificationCode(email) {
    const sendBtn = document.getElementById('sendCodeBtn');
    setButtonLoading(sendBtn, true);
    
    try {
        const response = await fetch('/users/sendCode', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: email
        });
        
        if (response.ok) {
            showMessage('인증번호가 이메일로 전송되었습니다.', 'success');
            showPasswordStep(2);
            startTimer();
        } else {
            const errorText = await response.text();
            showMessage(errorText || '인증번호 발송에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('인증번호 발송 오류:', error);
        showMessage('인증번호 발송 중 오류가 발생했습니다.', 'error');
    } finally {
        setButtonLoading(sendBtn, false);
    }
}

// 인증번호 확인
async function verifyCode(email, code) {
    const verifyBtn = document.getElementById('verifyCodeBtn');
    setButtonLoading(verifyBtn, true);
    
    try {
        const response = await fetch('/users/verifyCode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                code: code
            })
        });
        
        if (response.ok) {
            stopTimer();
            showMessage('인증이 완료되었습니다.', 'success');
            showPasswordStep(3);
        } else {
            const errorText = await response.text();
            showFieldMessage('verificationCode', errorText || '인증번호가 올바르지 않습니다.', 'error');
        }
    } catch (error) {
        console.error('인증번호 확인 오류:', error);
        showFieldMessage('verificationCode', '인증번호 확인 중 오류가 발생했습니다.', 'error');
    } finally {
        setButtonLoading(verifyBtn, false);
    }
}

// 비밀번호 재설정
async function resetPassword(email, newPassword) {
    const resetBtn = document.getElementById('resetPasswordBtn');
    setButtonLoading(resetBtn, true);
    
    try {
        // 백엔드 개발자가 구현할 API 엔드포인트
        const response = await fetch('/users/resetPassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                newPassword: newPassword
            })
        });
        
        if (response.ok) {
            showPasswordStep(4);
        } else {
            const contentType = response.headers.get('content-type');
            let errorMessage = '비밀번호 재설정에 실패했습니다.';
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // JSON 파싱 실패시 기본 메시지 사용
                }
            } else {
                // HTML 응답인 경우
                if (response.status === 404) {
                    errorMessage = 'API 엔드포인트를 찾을 수 없습니다. 백엔드 개발자에게 문의하세요.';
                } else if (response.status === 500) {
                    errorMessage = '서버 내부 오류가 발생했습니다.';
                }
            }
            
            showMessage(errorMessage, 'error');
        }
    } catch (error) {
        console.error('비밀번호 재설정 오류:', error);
        if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
            showMessage('서버에서 올바르지 않은 응답을 받았습니다. API가 구현되지 않았을 수 있습니다.', 'error');
        } else {
            showMessage('비밀번호 재설정 중 오류가 발생했습니다.', 'error');
        }
    } finally {
        setButtonLoading(resetBtn, false);
    }
}

// 인증번호 재발송
function handleResendCode() {
    if (currentEmail) {
        sendVerificationCode(currentEmail);
    }
}

// 비밀번호 찾기 단계별 화면 전환
function showPasswordStep(step) {
    if (currentTab !== 'find-password') return;
    
    // 모든 단계 숨기기
    for (let i = 1; i <= 4; i++) {
        const stepElement = document.getElementById(`password-step${i}`);
        if (stepElement) {
            stepElement.style.display = 'none';
        }
    }
    
    // 현재 단계 보이기
    const currentStepElement = document.getElementById(`password-step${step}`);
    if (currentStepElement) {
        currentStepElement.style.display = 'block';
    }
    
    currentStep = step;
    clearAllMessages();
}

// 타이머 시작
function startTimer() {
    timeLeft = 180; // 3분 리셋
    updateTimerDisplay();
    
    const resendBtn = document.getElementById('resendCodeBtn');
    resendBtn.disabled = true;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            stopTimer();
            resendBtn.disabled = false;
            showFieldMessage('verificationCode', '인증번호가 만료되었습니다. 재발송을 클릭해주세요.', 'error');
        }
    }, 1000);
}

// 타이머 정지
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// 타이머 표시 업데이트
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timerElement = document.getElementById('timer');
    
    if (timerElement) {
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 30) {
            timerElement.style.color = '#dc3545';
        } else {
            timerElement.style.color = '#ffc107';
        }
    }
}

// 버튼 로딩 상태 설정
function setButtonLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        button.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        button.disabled = false;
    }
}

// 필드별 메시지 표시
function showFieldMessage(fieldType, message, type) {
    let statusElement = document.getElementById(`${fieldType}Status`);
    
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = `${fieldType}Status`;
        statusElement.className = 'verification-status';
        
        const field = document.getElementById(fieldType);
        const parentDiv = field.parentNode;
        parentDiv.insertBefore(statusElement, field.nextSibling);
    }
    
    statusElement.textContent = message;
    statusElement.className = `verification-status ${type}`;
}

// 필드 메시지 제거
function clearFieldMessage(fieldType) {
    const statusElement = document.getElementById(`${fieldType}Status`);
    if (statusElement) {
        statusElement.textContent = '';
    }
    
    const field = document.getElementById(fieldType);
    if (field) {
        field.style.borderColor = '';
    }
}

// 상단 메시지 표시
function showMessage(message, type) {
    let messageDiv = document.getElementById('globalMessage');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'globalMessage';
        const container = document.querySelector('.login-container');
        const header = container.querySelector('.login-header');
        container.insertBefore(messageDiv, header.nextSibling);
    }
    
    messageDiv.className = `${type}-message`;
    messageDiv.innerHTML = `<p>${message}</p>`;
    messageDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

// 모든 메시지 제거
function clearAllMessages() {
    const globalMessage = document.getElementById('globalMessage');
    if (globalMessage) {
        globalMessage.style.display = 'none';
    }
    
    // 모든 필드 상태 메시지 제거
    const statusElements = document.querySelectorAll('.verification-status');
    statusElements.forEach(element => {
        element.textContent = '';
    });
    
    // 모든 필드 테두리 리셋
    const inputFields = document.querySelectorAll('input');
    inputFields.forEach(field => {
        field.style.borderColor = '';
    });
}

// Enter 키 처리
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (currentTab === 'find-email') {
            if (activeElement.id === 'findName') {
                document.getElementById('findUsername').focus();
            } else if (activeElement.id === 'findUsername') {
                document.getElementById('findEmailForm').dispatchEvent(new Event('submit'));
            }
        } else if (currentTab === 'find-password') {
            if (currentStep === 1 && activeElement.id === 'email') {
                document.getElementById('emailForm').dispatchEvent(new Event('submit'));
            } else if (currentStep === 2 && activeElement.id === 'verificationCode') {
                document.getElementById('verifyForm').dispatchEvent(new Event('submit'));
            } else if (currentStep === 3) {
                if (activeElement.id === 'newPassword') {
                    document.getElementById('confirmPassword').focus();
                } else if (activeElement.id === 'confirmPassword') {
                    document.getElementById('resetPasswordForm').dispatchEvent(new Event('submit'));
                }
            }
        }
    }
});