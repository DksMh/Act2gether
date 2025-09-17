/**
 * header.js - 헤더 기능 JavaScript (수정 버전)
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Header JS 로드됨');

  // ===================================
  // 글자 크기 조절 기능 (개선)
  // ===================================
  function initFontSize() {
    // 글자 크기 변경 함수
    function changeFontSize(size) {
      const htmlElement = document.documentElement;
      
      // 기존 클래스 제거
      htmlElement.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
      
      // 새 클래스 추가
      htmlElement.classList.add(`font-size-${size}`);
      
      // localStorage에 저장
      try {
        localStorage.setItem('globalFontSize', size);
      } catch (e) {
        console.warn('localStorage 저장 실패:', e);
      }
      
      // 모바일 버튼 텍스트 업데이트
      updateMobileButtonText(size);
      
      console.log('폰트 크기 변경:', size);
    }

    // 버튼 상태 업데이트
    function updateButtons(size) {
      // 데스크톱 버튼
      const buttons = document.querySelectorAll('.font-btn');
      buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.size === size) {
          btn.classList.add('active');
        }
      });
      
      // 모바일 버튼
      const mobileBtns = document.querySelectorAll('.font-btn-mobile');
      mobileBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.size === size) {
          btn.classList.add('active');
        }
      });
    }
    
    // 모바일 플로팅 버튼 텍스트 업데이트
    function updateMobileButtonText(size) {
      const indicator = document.querySelector('.font-toggle-btn .size-indicator');
      if (indicator) {
        switch(size) {
          case 'large':
            indicator.style.fontSize = '1.5rem';
            break;
          case 'xlarge':
            indicator.style.fontSize = '1.75rem';
            break;
          default:
            indicator.style.fontSize = '1.25rem';
        }
      }
    }

    // 저장된 설정 로드
    let savedSize = 'normal';
    try {
      savedSize = localStorage.getItem('globalFontSize') || 'normal';
    } catch (e) {
      console.warn('localStorage 읽기 실패:', e);
    }
    
    changeFontSize(savedSize);
    updateButtons(savedSize);

    // 데스크톱 버튼 이벤트
    const fontButtons = document.querySelectorAll('.font-btn');
    fontButtons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const size = this.dataset.size;
        changeFontSize(size);
        updateButtons(size);
      });
    });
    
    // 모바일 버튼 이벤트
    const mobileFontButtons = document.querySelectorAll('.font-btn-mobile');
    mobileFontButtons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const size = this.dataset.size;
        changeFontSize(size);
        updateButtons(size);
        
        // 팝업 닫기
        const popup = document.querySelector('.font-popup');
        if (popup) {
          setTimeout(() => {
            popup.classList.remove('active');
          }, 200);
        }
      });
    });
    
    // 모바일 토글 버튼
    const toggleBtn = document.querySelector('.font-toggle-btn');
    const popup = document.querySelector('.font-popup');
    
    if (toggleBtn && popup) {
      toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        popup.classList.toggle('active');
      });
      
      // 외부 클릭시 닫기
      document.addEventListener('click', function(e) {
        if (!toggleBtn.contains(e.target) && !popup.contains(e.target)) {
          popup.classList.remove('active');
        }
      });
    }
  }

  // ESC로 닫기 + 스크롤 내리면 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const popup = document.querySelector('.font-popup');
    if (popup) popup.classList.remove('active');
  }
});

let lastY = window.scrollY;
window.addEventListener('scroll', () => {
  const down = window.scrollY > lastY;
  lastY = window.scrollY;
  if (down) {
    const popup = document.querySelector('.font-popup');
    if (popup) popup.classList.remove('active');
  }
});


  // ===================================
  // 모바일 메뉴 기능
  // ===================================
  function initMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const close = document.getElementById('mobileMenuClose');
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');

    console.log('모바일 메뉴 요소:', { toggle, close, menu, overlay });

    if (!toggle || !menu) {
      console.warn('모바일 메뉴 요소를 찾을 수 없음');
      return;
    }

    // 메뉴 열기
    function openMenu() {
      console.log('메뉴 열기');
      toggle.classList.add('active');
      menu.classList.add('active');
      overlay.classList.add('active');
      menu.style.display = 'block';
      overlay.style.display = 'block';
      setTimeout(() => {
        menu.style.right = '0';
        overlay.style.opacity = '1';
      }, 10);
      document.body.style.overflow = 'hidden';
    }

    // 메뉴 닫기
    function closeMenu() {
      console.log('메뉴 닫기');
      toggle.classList.remove('active');
      menu.classList.remove('active');
      overlay.classList.remove('active');
      menu.style.right = '-20rem';
      overlay.style.opacity = '0';
      setTimeout(() => {
        menu.style.display = 'none';
        overlay.style.display = 'none';
      }, 300);
      document.body.style.overflow = '';
    }

    // 이벤트 리스너
    toggle.addEventListener('click', openMenu);
    
    if (close) {
      close.addEventListener('click', closeMenu);
    }
    
    if (overlay) {
      overlay.addEventListener('click', closeMenu);
    }

    // ESC 키로 닫기
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && menu.classList.contains('active')) {
        closeMenu();
      }
    });

    // 윈도우 리사이즈 처리
    let resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 768 && menu.classList.contains('active')) {
          closeMenu();
        }
      }, 250);
    });
  }

  // ===================================
  // 서브메뉴 호버 처리 (데스크톱)
  // ===================================
  function initSubmenu() {
    const submenuItems = document.querySelectorAll('.has-submenu');
    
    submenuItems.forEach(item => {
      const submenu = item.querySelector('.submenu');
      if (!submenu) return;

      // 마우스 오버
      item.addEventListener('mouseenter', function() {
        submenu.style.display = 'block';
      });

      // 마우스 아웃
      item.addEventListener('mouseleave', function() {
        submenu.style.display = 'none';
      });

      // 키보드 접근성
      const link = item.querySelector('a');
      if (link) {
        link.addEventListener('focus', function() {
          submenu.style.display = 'block';
        });

        // 서브메뉴의 마지막 링크
        const lastLink = submenu.querySelector('li:last-child a');
        if (lastLink) {
          lastLink.addEventListener('blur', function() {
            setTimeout(() => {
              if (!item.contains(document.activeElement)) {
                submenu.style.display = 'none';
              }
            }, 100);
          });
        }
      }
    });
  }

  // ===================================
  // 글자 크기 조절 컨트롤 보이기/숨기기
  // ===================================
  function initFontControls() {
    const desktopControls = document.getElementById('globalFontControls');
    const mobileControls = document.getElementById('mobileFontControls');
    
    function updateControlsVisibility() {
      if (window.innerWidth <= 768) {
        // 모바일
        if (desktopControls) desktopControls.style.display = 'none';
        if (mobileControls) mobileControls.style.display = 'block';
      } else {
        // 데스크톱
        if (desktopControls) desktopControls.style.display = 'flex';
        if (mobileControls) mobileControls.style.display = 'none';
      }
    }
    
    // 초기 설정
    updateControlsVisibility();
    
    // 리사이즈 이벤트
    window.addEventListener('resize', updateControlsVisibility);
  }

  // ===================================
  // 초기화 실행
  // ===================================
  console.log('초기화 시작');
  
  initFontSize();
  initMobileMenu();
  initSubmenu();
  initFontControls();
  
  console.log('초기화 완료');
});