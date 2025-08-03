// userlogin.js - 로그인 페이지 전용

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    
    // 디버깅을 위해 URL 파라미터 체크도 활성화
    const urlParams = new URLSearchParams(window.location.search);
    console.log("현재 URL 파라미터:", window.location.search); // 디버깅용
    
    if (urlParams.get('error')) {
        console.log("URL 파라미터로 에러 감지"); // 디버깅용
        //showMessage('아이디 또는 비밀번호가 올바르지 않습니다.', 'error');
    }
    if (urlParams.get('logout')) {
        console.log("URL 파라미터로 로그아웃 감지"); // 디버깅용
        //showMessage('로그아웃되었습니다.', 'success');
    }
});


// 이벤트 리스너 초기화
function initializeEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    
    // 폼 제출 이벤트
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 이메일 필드 이벤트
    if (email) {
        email.addEventListener('input', () => clearFieldMessage('email'));
        email.addEventListener('blur', validateEmail);
        email.addEventListener('invalid', (e) => {
            e.preventDefault();
            validateEmail();
        });
    }
    
    // 비밀번호 필드 이벤트
    if (password) {
        password.addEventListener('input', () => clearFieldMessage('password'));
        password.addEventListener('blur', validatePassword);
        password.addEventListener('invalid', (e) => {
            e.preventDefault();
            validatePassword();
        });
    }
    
    // 소셜 로그인 버튼 이벤트
    const googleBtn = document.querySelector('.google-btn');
    const naverBtn = document.querySelector('.naver-btn');
    const kakaoBtn = document.querySelector('.kakao-btn');
    
    if (googleBtn) googleBtn.addEventListener('click', () => handleSocialLogin('google'));
    if (naverBtn) naverBtn.addEventListener('click', () => handleSocialLogin('naver'));
    if (kakaoBtn) kakaoBtn.addEventListener('click', () => handleSocialLogin('kakao'));
}

// 로그인 폼 제출 처리
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // 클라이언트 검증
    if (!validateLoginForm(email, password)) {
        return;
    }
    
    // 검증 통과 시 폼 제출
    event.target.submit();
}

// 로그인 폼 검증
function validateLoginForm(email, password) {
    let isValid = true;
    
    clearAllMessages();
    
    // 이메일 검증
    if (!email) {
        showEmailMessage('이메일을 입력해주세요.', 'error');
        document.getElementById('email').focus();
        isValid = false;
    } else if (!isValidEmailFormat(email)) {
        showEmailMessage('올바른 이메일 형식을 입력해주세요.', 'error');
        document.getElementById('email').focus();
        isValid = false;
    }
    
    // 비밀번호 검증
    if (!password) {
        showPasswordMessage('비밀번호를 입력해주세요.', 'error');
        if (isValid) {
            document.getElementById('password').focus();
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

// 이메일 검증
function validateEmail() {
    const email = document.getElementById('email').value;
    const emailField = document.getElementById('email');
    
    emailField.setCustomValidity('');
    
    if (!email) {
        showEmailMessage('이메일을 입력해주세요.', 'error');
        emailField.style.borderColor = '#dc3545';
    } else if (!isValidEmailFormat(email)) {
        emailField.setCustomValidity('invalid');
        showEmailMessage('올바른 이메일 형식을 입력해주세요.', 'error');
        emailField.style.borderColor = '#dc3545';
    } else {
        emailField.style.borderColor = '';
        clearFieldMessage('email');
    }
}

// 비밀번호 검증
function validatePassword() {
    const password = document.getElementById('password').value;
    const passwordField = document.getElementById('password');
    
    passwordField.setCustomValidity('');
    
    if (!password) {
        showPasswordMessage('비밀번호를 입력해주세요.', 'error');
        passwordField.style.borderColor = '#dc3545';
    } else {
        passwordField.style.borderColor = '';
        clearFieldMessage('password');
    }
}

// 필드 메시지 제거
function clearFieldMessage(fieldType) {
    if (fieldType === 'email') {
        const emailStatus = document.getElementById('emailStatus');
        if (emailStatus) emailStatus.textContent = '';
        document.getElementById('email').style.borderColor = '';
    } else if (fieldType === 'password') {
        const passwordStatus = document.getElementById('passwordStatus');
        if (passwordStatus) passwordStatus.textContent = '';
        document.getElementById('password').style.borderColor = '';
    }
}

// 이메일 필드 아래 메시지 표시
function showEmailMessage(message, type) {
    let emailStatus = document.getElementById('emailStatus');
    if (!emailStatus) {
        emailStatus = document.createElement('div');
        emailStatus.id = 'emailStatus';
        emailStatus.className = 'verification-status';
        
        const emailField = document.getElementById('email');
        const parentDiv = emailField.parentNode;
        parentDiv.insertBefore(emailStatus, emailField.nextSibling);
    }
    
    emailStatus.textContent = message;
    emailStatus.className = `verification-status ${type}`;
}

// 비밀번호 필드 아래 메시지 표시
function showPasswordMessage(message, type) {
    let passwordStatus = document.getElementById('passwordStatus');
    if (!passwordStatus) {
        passwordStatus = document.createElement('div');
        passwordStatus.id = 'passwordStatus';
        passwordStatus.className = 'verification-status';
        
        const passwordField = document.getElementById('password');
        const parentDiv = passwordField.parentNode;
        parentDiv.insertBefore(passwordStatus, passwordField.nextSibling);
    }
    
    passwordStatus.textContent = message;
    passwordStatus.className = `verification-status ${type}`;
}

// 상단 메시지 표시
function showMessage(message, type) {
    let messageDiv = document.getElementById('loginMessage');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'loginMessage';
        const loginForm = document.getElementById('loginForm');
        loginForm.parentNode.insertBefore(messageDiv, loginForm);
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
    const emailStatus = document.getElementById('emailStatus');
    const passwordStatus = document.getElementById('passwordStatus');
    const loginMessage = document.getElementById('loginMessage');
    
    if (emailStatus) emailStatus.textContent = '';
    if (passwordStatus) passwordStatus.textContent = '';
    if (loginMessage) loginMessage.style.display = 'none';
}

// 소셜 로그인 처리
function handleSocialLogin(provider) {
    switch(provider) {
        case 'google':
            console.log('Google 로그인 구현 예정');
            showMessage('Google 로그인 기능은 준비 중입니다.', 'info');
            break;
        case 'naver':
            console.log('Naver 로그인 구현 예정');
            showMessage('네이버 로그인 기능은 준비 중입니다.', 'info');
            break;
        case 'kakao':
            console.log('Kakao 로그인 구현 예정');
            showMessage('카카오 로그인 기능은 준비 중입니다.', 'info');
            break;
        default:
            console.error('Unknown social login provider:', provider);
    }
}

// Enter 키 처리
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement.id === 'email') {
            document.getElementById('password').focus();
        } else if (activeElement.id === 'password') {
            document.getElementById('loginForm').dispatchEvent(new Event('submit'));
        }
    }
});