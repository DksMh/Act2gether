/**
 * 투어 검색 페이지 유틸리티 함수들
 * 공통으로 사용되는 헬퍼 함수들을 모아둔 파일
 */

window.tourUtils = {
    /**
     * 숫자 포맷팅 (한국어 콤마)
     * @param {number} num - 포맷할 숫자
     * @returns {string} 포맷된 숫자 문자열
     */
    formatNumber: (num) => {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        return new Intl.NumberFormat('ko-KR').format(num);
    },
    
    /**
     * 날짜 포맷팅 (한국어)
     * @param {string} dateStr - 날짜 문자열
     * @returns {string} 포맷된 날짜
     */
    formatDate: (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return '';
        }
    },
    
    /**
     * 텍스트 자르기
     * @param {string} text - 자를 텍스트
     * @param {number} maxLength - 최대 길이 (기본값: 50)
     * @returns {string} 잘린 텍스트
     */
    truncateText: (text, maxLength = 50) => {
        if (!text || typeof text !== 'string') return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },
    
    /**
     * 토스트 알림 표시
     * @param {string} message - 알림 메시지
     * @param {string} type - 알림 타입 (info, success, error, warning)
     * @param {number} duration - 표시 시간 (기본값: 3000ms)
     */
    showToast: (message, type = 'info', duration = 3000) => {
        // 기존 토스트 제거
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        });

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 타입별 색상 설정
        let bgColor = '#2196F3'; // info
        let icon = 'ℹ️';
        
        switch (type) {
            case 'success':
                bgColor = '#4CAF50';
                icon = '✅';
                break;
            case 'error':
                bgColor = '#f44336';
                icon = '❌';
                break;
            case 'warning':
                bgColor = '#ff9800';
                icon = '⚠️';
                break;
        }
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-weight: 500;
            max-width: 300px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        // 아이콘 추가
        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        
        document.body.appendChild(toast);
        
        // 자동 제거
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }
        }, duration);
    },

    /**
     * 로딩 상태 관리
     */
    loading: {
        show: () => {
            const spinner = document.getElementById('loadingSpinner');
            if (spinner) {
                spinner.classList.add('active');
            }
        },
        
        hide: () => {
            const spinner = document.getElementById('loadingSpinner');
            if (spinner) {
                spinner.classList.remove('active');
            }
        }
    },

    /**
     * 이미지 URL 유효성 검증 및 fallback 처리 (개선)
     * @param {string} imageUrl - 검증할 이미지 URL
     * @param {string} fallbackUrl - fallback 이미지 URL
     * @returns {Promise<string>} 유효한 이미지 URL
     */
    validateImageUrl: async (imageUrl, fallbackUrl = null) => {
        if (!imageUrl || imageUrl.trim() === '') {
            return fallbackUrl;
        }

        // SVG 데이터 URL은 즉시 반환
        if (imageUrl.startsWith('data:image/svg+xml')) {
            return imageUrl;
        }

        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                // 이미지가 너무 작으면 fallback 사용
                if (img.naturalWidth < 50 || img.naturalHeight < 50) {
                    resolve(fallbackUrl);
                } else {
                    resolve(imageUrl);
                }
            };
            
            img.onerror = () => resolve(fallbackUrl);
            
            // CORS 문제 방지
            img.crossOrigin = 'anonymous';
            img.src = imageUrl;
            
            // 3초 타임아웃
            setTimeout(() => resolve(fallbackUrl), 3000);
        });
    },

    /**
     * 이미지 요소에 onerror 핸들러 설정 - 개선된 fallback 설정
     * @param {HTMLImageElement} imgElement - 이미지 요소
     * @param {string} fallbackUrl - fallback 이미지 URL
     */
    setupImageFallback: (imgElement, category = '', title = '') => {
        if (!imgElement) return;
        
        imgElement.onerror = function() {
            this.onerror = null; // 무한 루프 방지
            
            // 부모 컨테이너에 fallback 스타일 적용
            const container = this.parentElement;
            if (container && container.classList.contains('tour-image')) {
                tourUtils.createCssFallback(container, category, title);
            } else {
                // 일반적인 fallback
                this.src = tourUtils.createSvgFallback(category, title);
                this.alt = '이미지를 불러올 수 없습니다';
            }
        };

        // 로딩 시작 표시
        imgElement.addEventListener('loadstart', function() {
            const container = this.parentElement;
            if (container) {
                container.classList.add('loading');
            }
        });

        // 로딩 완료 표시
        imgElement.addEventListener('load', function() {
            const container = this.parentElement;
            if (container) {
                container.classList.remove('loading');
                this.classList.add('loaded');
            }
        });
    },
     /**
     * 🆕 CSS 기반 fallback 이미지 생성
     */
    createCssFallback: (container, category, title) => {
        const categoryMap = {
            'A01': { class: 'nature', icon: '🌿', text: '자연 관광지' },
            'A02': { class: 'culture', icon: '🏛️', text: '문화 시설' },
            'A03': { class: 'sports', icon: '🏃‍♂️', text: '레포츠' },
            'A05': { class: 'food', icon: '🍽️', text: '음식점' },
            'C01': { class: 'course', icon: '🎯', text: '추천 코스' }
        };

        const info = categoryMap[category] || { 
            class: 'default', 
            icon: '📷', 
            text: '이미지 없음' 
        };

        container.className = `tour-image no-image ${info.class}`;
        container.innerHTML = `
            <div class="fallback-icon">${info.icon}</div>
            <div class="fallback-text">${info.text}</div>
            <div class="fallback-text" style="font-size: 12px; opacity: 0.8;">
                ${tourUtils.truncateText(title, 20)}
            </div>
            <div class="no-image-indicator">이미지 없음</div>
        `;
    },

    /**
     * 🆕 SVG 기반 fallback 이미지 생성
     */
    createSvgFallback: (category = '', title = '이미지 없음') => {
        const categoryMap = {
            'A01': { color: '#4CAF50', emoji: '🌿', text: '자연 관광지' },
            'A02': { color: '#2196F3', emoji: '🏛️', text: '문화 시설' },
            'A03': { color: '#FF9800', emoji: '🏃‍♂️', text: '레포츠' },
            'A05': { color: '#F44336', emoji: '🍽️', text: '음식점' },
            'C01': { color: '#607D8B', emoji: '🎯', text: '추천 코스' }
        };

        const info = categoryMap[category] || { 
            color: '#9E9E9E', 
            emoji: '📷', 
            text: '이미지 없음' 
        };

        const truncatedTitle = tourUtils.truncateText(title, 15);
        
        const svg = `
            <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad-${category}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${info.color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${info.color};stop-opacity:0.7" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#grad-${category})"/>
                <text x="50%" y="40%" text-anchor="middle" font-size="32" fill="white">${info.emoji}</text>
                <text x="50%" y="60%" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="white" font-weight="bold">${info.text}</text>
                <text x="50%" y="80%" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" fill="white" opacity="0.8">${truncatedTitle}</text>
            </svg>
        `;

        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    },

    /**
     * 콘텐츠 타입별 카테고리 이름 반환
     * @param {string} contentTypeId - 콘텐츠 타입 ID
     * @returns {string} 카테고리 이름
     */
    getCategoryName: (contentTypeId) => {
        const categories = {
            '12': '관광지',
            '14': '문화시설',
            '15': '축제공연행사',
            '25': '여행코스',
            '28': '레포츠',
            '32': '숙박',
            '38': '쇼핑',
            '39': '음식점'
        };
        return categories[contentTypeId] || '기타';
    },

    /**
     * URL 파라미터 파싱
     * @param {string} url - 파싱할 URL (기본값: 현재 URL)
     * @returns {Object} 파라미터 객체
     */
    parseUrlParams: (url = window.location.href) => {
        const params = {};
        try {
            const urlObj = new URL(url);
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } catch (e) {
            console.warn('URL 파싱 실패:', e);
        }
        return params;
    },

    /**
     * 로컬 스토리지 안전 사용
     */
    storage: {
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('로컬 스토리지 저장 실패:', e);
                return false;
            }
        },
        
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('로컬 스토리지 읽기 실패:', e);
                return defaultValue;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('로컬 스토리지 삭제 실패:', e);
                return false;
            }
        }
    },

    /**
     * 디바운스 함수
     * @param {Function} func - 디바운스할 함수
     * @param {number} wait - 대기 시간 (ms)
     * @returns {Function} 디바운스된 함수
     */
    debounce: (func, wait = 300) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 쓰로틀 함수
     * @param {Function} func - 쓰로틀할 함수
     * @param {number} limit - 제한 시간 (ms)
     * @returns {Function} 쓰로틀된 함수
     */
    throttle: (func, limit = 300) => {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 요소가 뷰포트에 보이는지 확인
     * @param {HTMLElement} element - 확인할 요소
     * @returns {boolean} 보이는지 여부
     */
    isElementInViewport: (element) => {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * 부드러운 스크롤
     * @param {HTMLElement|string} target - 타겟 요소 또는 셀렉터
     * @param {number} offset - 오프셋 (기본값: 0)
     */
    smoothScrollTo: (target, offset = 0) => {
        let element;
        
        if (typeof target === 'string') {
            element = document.querySelector(target);
        } else {
            element = target;
        }
        
        if (!element) {
            console.warn('스크롤 타겟을 찾을 수 없습니다:', target);
            return;
        }
        
        const targetPosition = element.offsetTop - offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    },

    /**
     * 폼 데이터를 객체로 변환
     * @param {HTMLFormElement} form - 폼 요소
     * @returns {Object} 폼 데이터 객체
     */
    formToObject: (form) => {
        if (!form) return {};
        
        const formData = new FormData(form);
        const obj = {};
        
        for (let [key, value] of formData.entries()) {
            if (obj[key]) {
                // 이미 존재하는 키인 경우 배열로 변환
                if (Array.isArray(obj[key])) {
                    obj[key].push(value);
                } else {
                    obj[key] = [obj[key], value];
                }
            } else {
                obj[key] = value;
            }
        }
        
        return obj;
    },

    /**
     * 객체를 쿼리 스트링으로 변환
     * @param {Object} obj - 변환할 객체
     * @returns {string} 쿼리 스트링
     */
    objectToQueryString: (obj) => {
        if (!obj || typeof obj !== 'object') return '';
        
        const params = new URLSearchParams();
        
        Object.entries(obj).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, v));
                } else {
                    params.append(key, value);
                }
            }
        });
        
        return params.toString();
    },

    /**
     * 랜덤 ID 생성
     * @param {number} length - ID 길이 (기본값: 8)
     * @returns {string} 랜덤 ID
     */
    generateRandomId: (length = 8) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * 이메일 유효성 검증
     * @param {string} email - 검증할 이메일
     * @returns {boolean} 유효성 여부
     */
    validateEmail: (email) => {
        if (!email || typeof email !== 'string') return false;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    },

    /**
     * 한국 전화번호 유효성 검증
     * @param {string} phone - 검증할 전화번호
     * @returns {boolean} 유효성 여부
     */
    validateKoreanPhone: (phone) => {
        if (!phone || typeof phone !== 'string') return false;
        
        // 숫자만 추출
        const numbers = phone.replace(/[^\d]/g, '');
        
        // 010, 011, 016, 017, 018, 019로 시작하는 11자리 또는
        // 02, 031~064로 시작하는 9~11자리
        const mobileRegex = /^01[016789]\d{7,8}$/;
        const landlineRegex = /^(02|0[3-6]\d)\d{6,8}$/;
        
        return mobileRegex.test(numbers) || landlineRegex.test(numbers);
    },

    /**
     * 문자열을 안전한 HTML로 이스케이프
     * @param {string} str - 이스케이프할 문자열
     * @returns {string} 이스케이프된 문자열
     */
    escapeHtml: (str) => {
        if (!str || typeof str !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * 콘솔 로깅 래퍼 (개발 환경에서만 출력)
     */
    logger: {
        log: (...args) => {
            if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
                console.log('[TOUR]', ...args);
            }
        },
        
        warn: (...args) => {
            if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
                console.warn('[TOUR WARNING]', ...args);
            }
        },
        
        error: (...args) => {
            console.error('[TOUR ERROR]', ...args);
        }
    },

    /**
     * API 호출 래퍼
     * @param {string} url - API URL
     * @param {Object} options - fetch 옵션
     * @returns {Promise} API 응답
     */
    apiCall: async (url, options = {}) => {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        // 요청 헤더에 CSRF 토큰 추가 (필요한 경우)
        const csrfToken = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
        const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');
        
        if (csrfToken && csrfHeader) {
            finalOptions.headers[csrfHeader] = csrfToken;
        }

        try {
            tourUtils.logger.log('API 호출:', url, finalOptions);
            
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            tourUtils.logger.log('API 응답:', data);
            
            return data;
        } catch (error) {
            tourUtils.logger.error('API 호출 실패:', error);
            throw error;
        }
    },

    /**
     * 관광지 이미지 최적화(개선)
     * @param {Object} tour - 관광지 데이터
     * @returns {string} 최적화된 이미지 URL
     */
    getOptimizedTourImage: (tour) => {
        if (!tour) return tourUtils.createSvgFallback();

        // 우선순위: optimizedImage > firstimage > firstimage2
        let imageUrl = tour.optimizedImage || tour.firstimage || tour.firstimage2;
        
        if (!imageUrl || imageUrl.trim() === '') {
            return tourUtils.createSvgFallback(tour.cat1, tour.title);
        }

        // 이미지 URL이 상대 경로인 경우 절대 경로로 변환
        if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/') && !imageUrl.startsWith('/images/') && !imageUrl.startsWith('data:')) {
            imageUrl = 'https://tong.visitkorea.or.kr' + imageUrl;
        }

        return imageUrl;
    },
    /**
     * 🆕 이미지 로딩 상태 관리
     */
    imageLoadingManager: {
        loadingImages: new Set(),
        
        startLoading: (imageUrl) => {
            tourUtils.imageLoadingManager.loadingImages.add(imageUrl);
        },
        
        finishLoading: (imageUrl) => {
            tourUtils.imageLoadingManager.loadingImages.delete(imageUrl);
        },
        
        isLoading: (imageUrl) => {
            return tourUtils.imageLoadingManager.loadingImages.has(imageUrl);
        },
        
        getLoadingCount: () => {
            return tourUtils.imageLoadingManager.loadingImages.size;
        }
    },
    /**
     * 🆕 이미지 배치 로딩 (성능 최적화)
     */
    batchLoadImages: async (imageUrls, batchSize = 5) => {
        if (!Array.isArray(imageUrls)) return [];

        const results = [];
        
        for (let i = 0; i < imageUrls.length; i += batchSize) {
            const batch = imageUrls.slice(i, i + batchSize);
            const batchPromises = batch.map(async (url) => {
                try {
                    return await tourUtils.validateImageUrl(url);
                } catch (error) {
                    console.warn('이미지 로딩 실패:', url, error);
                    return null;
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // 배치 간 딜레이 (서버 부하 방지)
            if (i + batchSize < imageUrls.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    },
    /**
     * 🆕 이미지 캐싱 관리
     */
    imageCache: {
        cache: new Map(),
        maxSize: 100,
        
        set: (url, data) => {
            if (tourUtils.imageCache.cache.size >= tourUtils.imageCache.maxSize) {
                const firstKey = tourUtils.imageCache.cache.keys().next().value;
                tourUtils.imageCache.cache.delete(firstKey);
            }
            tourUtils.imageCache.cache.set(url, {
                data,
                timestamp: Date.now()
            });
        },
        
        get: (url) => {
            const cached = tourUtils.imageCache.cache.get(url);
            if (!cached) return null;
            
            // 1시간 후 만료
            if (Date.now() - cached.timestamp > 3600000) {
                tourUtils.imageCache.cache.delete(url);
                return null;
            }
            
            return cached.data;
        },
        
        clear: () => {
            tourUtils.imageCache.cache.clear();
        }
    },
        /**
     * 🆕 Intersection Observer를 이용한 지연 로딩
     */
    setupLazyLoading: () => {
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver를 지원하지 않는 브라우저입니다.');
            return;
        }

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const dataSrc = img.getAttribute('data-src');
                    
                    if (dataSrc) {
                        tourUtils.imageLoadingManager.startLoading(dataSrc);
                        
                        img.src = dataSrc;
                        img.removeAttribute('data-src');
                        
                        img.onload = () => {
                            tourUtils.imageLoadingManager.finishLoading(dataSrc);
                            img.classList.add('loaded');
                        };
                        
                        img.onerror = () => {
                            tourUtils.imageLoadingManager.finishLoading(dataSrc);
                            const container = img.closest('.tour-image');
                            if (container) {
                                const category = container.getAttribute('data-category') || '';
                                const title = img.getAttribute('alt') || '';
                                tourUtils.createCssFallback(container, category, title);
                            }
                        };
                    }
                    
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });

        // 기존 이미지들에 observer 적용
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });

        // 동적으로 추가되는 이미지들을 위한 MutationObserver
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        const lazyImages = node.querySelectorAll ? 
                            node.querySelectorAll('img[data-src]') : [];
                        
                        lazyImages.forEach(img => {
                            imageObserver.observe(img);
                        });
                        
                        // 추가된 노드 자체가 img[data-src]인 경우
                        if (node.matches && node.matches('img[data-src]')) {
                            imageObserver.observe(node);
                        }
                    }
                });
            });
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        return { imageObserver, mutationObserver };
    },
    /**
     * 🆕 WebP 지원 감지 및 이미지 포맷 최적화
     */
    checkWebPSupport: () => {
        return new Promise((resolve) => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                resolve(webP.height === 2);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    },
     /**
     * 🆕 이미지 크기 최적화
     */
    optimizeImageSize: (imageUrl, maxWidth = 300, maxHeight = 200) => {
        if (!imageUrl || imageUrl.startsWith('data:')) {
            return imageUrl;
        }

        // 한국관광공사 API 이미지인 경우 크기 파라미터 추가
        if (imageUrl.includes('visitkorea.or.kr')) {
            const url = new URL(imageUrl);
            url.searchParams.set('w', maxWidth.toString());
            url.searchParams.set('h', maxHeight.toString());
            url.searchParams.set('q', '80'); // 품질 80%
            return url.toString();
        }

        return imageUrl;
    },

    /**
     * 기본 이미지 URL 반환
     * @param {string} category - 카테고리 코드
     * @returns {string} 기본 이미지 URL
     */
    getDefaultTourImage: (category = '') => {
        const defaultImages = {
            'A01': 'https://via.placeholder.com/300x200/4CAF50/white?text=자연+관광지',
            'A02': 'https://via.placeholder.com/300x200/2196F3/white?text=문화+시설',
            'A03': 'https://via.placeholder.com/300x200/FF9800/white?text=레포츠',
            'A04': 'https://via.placeholder.com/300x200/9C27B0/white?text=쇼핑',
            'A05': 'https://via.placeholder.com/300x200/F44336/white?text=음식점',
            'C01': 'https://via.placeholder.com/300x200/607D8B/white?text=추천+코스'
        };

        return defaultImages[category] || 'https://via.placeholder.com/300x200/9E9E9E/white?text=이미지+없음';
    },

    /**
     * 모바일 디바이스 감지
     * @returns {boolean} 모바일 여부
     */
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    },

    /**
     * 화면 크기별 반응형 처리
     * @returns {string} 화면 크기 ('mobile', 'tablet', 'desktop')
     */
    getScreenSize: () => {
        const width = window.innerWidth;
        
        if (width <= 480) return 'mobile';
        if (width <= 768) return 'tablet';
        return 'desktop';
    },

    /**
     * 관심사 데이터 검증 및 정규화
     * @param {Object} interests - 관심사 데이터
     * @returns {Object} 정규화된 관심사 데이터
     */
    normalizeInterests: (interests) => {
        if (!interests || typeof interests !== 'object') {
            return {
                regions: [],
                themes: {},
                companions: [],
                activities: [],
                places: [],
                needs: []
            };
        }

        return {
            regions: Array.isArray(interests.regions) ? interests.regions : [],
            themes: interests.themes && typeof interests.themes === 'object' ? interests.themes : {},
            companions: Array.isArray(interests.companions) ? interests.companions : [],
            activities: Array.isArray(interests.activities) ? interests.activities : [],
            places: Array.isArray(interests.places) ? interests.places : [],
            needs: Array.isArray(interests.needs) ? interests.needs : []
        };
    }
};

// DOM이 로드된 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    tourUtils.logger.log('Tour Utils 초기화 완료');
    
    // 전역 에러 핸들러 설정
    window.addEventListener('error', (event) => {
        tourUtils.logger.error('전역 에러:', event.error);
    });
    
    // Promise rejection 핸들러 설정
    window.addEventListener('unhandledrejection', (event) => {
        tourUtils.logger.error('처리되지 않은 Promise 거부:', event.reason);
    });
});