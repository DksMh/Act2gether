/**
 * tour-detail.js - v3.0 투어 상세페이지 완전판
 * 
 * ✅ tourId로 백엔드 데이터 로딩
 * ✅ 카카오맵 실제 구현 (API 키 받아서) + 플레이스홀더 fallback
 * ✅ 찜하기 AJAX 기능 (POST /api/wishlist/add)
 * ✅ placeholder 버튼들 이벤트 처리
 * ✅ 8개 섹션 모든 데이터 바인딩
 * ✅ 이미지 갤러리 carousel 구현
 * ✅ 맛집 카테고리별 표시
 */

window.tourDetail = {
    // 전역 상태
    currentTour: null,
    currentSpots: [],
    currentRestaurants: {},
    kakaoMap: null,
    kakaoMapApiKey: null,
    isWishlisted: false,
    
    // 갤러리 상태
    currentImageIndex: 0,
    totalImages: 0,

    /**
     * 🎯 메인 진입점: 세션 우선 → API fallback 투어 상세정보 로드
     */
    async loadTourDetail(tourId) {
        console.log('🚀 투어 상세정보 로드 시작 (세션 우선):', tourId);

        this.showLoading();
        
        try {
            // 1단계: 세션에서 데이터 확인
            const sessionData = this.loadFromSession(tourId);
            
            if (sessionData && this.isSessionDataValid(sessionData)) {
                console.log('✅ 세션 데이터 발견 - 세션 데이터 사용:', sessionData);
                
                // 세션 데이터로 UI 구성
                this.loadFromSessionData(sessionData);
                
                // 백엔드에서 추가 데이터 (맛집, API 키) 가져오기
                await this.loadAdditionalData(tourId);
                
                this.showSuccess('투어 정보를 빠르게 불러왔습니다! (세션 활용)');
                
            } else {
                console.log('❌ 세션 데이터 없음 - API 호출 시도');
                
                // 2단계: API fallback
                await this.loadFromApi(tourId);
            }
            
        } catch (error) {
            console.error('💥 투어 정보 로드 실패:', error);
            this.showError('투어 정보를 불러오는데 실패했습니다.');
        } finally {
            this.hideLoading();
        }
    },

    /**
     * 🆕 세션에서 데이터 로드
     */
    loadFromSession(tourId) {
        try {
            const sessionKey = `tour_${tourId}`;
            const sessionData = sessionStorage.getItem(sessionKey);
            
            if (sessionData) {
                const parsedData = JSON.parse(sessionData);
                console.log('📦 세션 데이터 파싱 완료:', parsedData);
                return parsedData;
            }
            
            return null;
        } catch (error) {
            console.error('❌ 세션 데이터 파싱 실패:', error);
            return null;
        }
    },/**
     * 🆕 세션 데이터 유효성 검증
     */
    isSessionDataValid(sessionData) {
        if (!sessionData || !sessionData.tourId || !sessionData.spots) {
            return false;
        }
        
        // 1시간 이내 데이터만 유효
        const createdAt = new Date(sessionData.createdAt);
        const now = new Date();
        const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
        
        if (hoursDiff > 1) {
            console.log('⏰ 세션 데이터가 1시간 이상 경과 - 무효 처리');
            return false;
        }
        
        return true;
    },

    /**
     * 🆕 세션 데이터로 UI 구성
     */
    loadFromSessionData(sessionData) {
        // 현재 상태 설정
        this.currentTour = {
            tourId: sessionData.tourId,
            title: sessionData.title,
            region: sessionData.region,
            spotCount: sessionData.tourCount,
            totalAccessibilityScore: sessionData.totalAccessibilityScore,
            hasBarrierFreeInfo: sessionData.accessibilityInfo?.hasAccessibilityFilter || false,
            sigungu: '', // 세션에 없으면 빈 값
        };
        
        this.currentSpots = sessionData.spots.map((spot, index) => ({
            ...spot,
            order: index + 1
        }));
         // UI 업데이트
        this.updateTourHeader();
        this.renderTourSpots();
        this.renderImageGallery();
        this.setupEventListeners();
        
        // 찜하기 상태 확인
        this.checkWishlistStatus(sessionData.tourId);
        
        console.log('✅ 세션 데이터로 UI 구성 완료');
    },
    /**
     * 🆕 추가 데이터 로드 (맛집, API 키 등)
     */
    async loadAdditionalData(tourId) {
        try {
            const response = await fetch(`/tour/${tourId}`);
            const result = await response.json();
            
            if (result.success) {
                // 맛집 정보와 API 키만 업데이트
                this.currentRestaurants = result.restaurants || {};
                this.kakaoMapApiKey = result.kakaoMapApiKey;
                
                // 지도와 맛집 렌더링
                this.initializeKakaoMap();
                this.renderRestaurants();
                
                console.log('✅ 추가 데이터 로드 완료 (맛집, API 키)');
            }
        } catch (error) {
            console.warn('⚠️ 추가 데이터 로드 실패:', error);
            // 실패해도 세션 데이터로 동작 가능하므로 계속 진행
        }
    },

    /**
     * 🆕 API를 통한 데이터 로드 (fallback)
     */
    async loadFromApi(tourId) {
        try {
            const response = await fetch(`/tour/${tourId}/fallback`);
            const result = await response.json();
            
            console.log('📦 API 응답:', result);
            
            if (result.success) {
                this.currentTour = result.tour;
                this.currentSpots = result.spots || [];
                this.currentRestaurants = result.restaurants || {};
                this.kakaoMapApiKey = result.kakaoMapApiKey;
                
                // UI 업데이트
                this.updateTourHeader();
                this.initializeKakaoMap();
                this.renderTourSpots();
                this.renderImageGallery();
                this.renderRestaurants();
                this.setupEventListeners();
                
                // 찜하기 상태 확인
                this.checkWishlistStatus(tourId);
                
                this.showSuccess('투어 정보를 불러왔습니다! (API 활용)');
                
            } else {
                throw new Error(result.message || 'API 응답 실패');
            }
            
        } catch (error) {
            console.error('💥 API fallback 실패:', error);
            throw error;
        }
    },

    //         const response = await fetch(`/tour/${tourId}`);
    //         const result = await response.json();
            
    //         console.log('📦 백엔드 응답:', result);
            
    //         if (result.success) {
    //             this.currentTour = result.tour;
    //             this.currentSpots = result.spots || [];
    //             this.currentRestaurants = result.restaurants || {};
    //             this.kakaoMapApiKey = result.kakaoMapApiKey;
                
    //             console.log('✅ 데이터 로드 완료:', {
    //                 tour: this.currentTour?.title,
    //                 spots: this.currentSpots.length,
    //                 restaurants: Object.keys(this.currentRestaurants).length,
    //                 hasApiKey: !!this.kakaoMapApiKey
    //             });
                
    //             // UI 업데이트
    //             this.updateTourHeader();
    //             this.initializeKakaoMap();
    //             this.renderTourSpots();
    //             this.renderImageGallery();
    //             this.renderRestaurants();
    //             this.setupEventListeners();
                
    //             // 찜하기 상태 확인
    //             this.checkWishlistStatus(tourId);
                
    //             this.showSuccess('투어 정보를 성공적으로 불러왔습니다!');
                
    //         } else {
    //             console.error('❌ 데이터 로드 실패:', result.message);
    //             this.showError(result.message || '투어 정보를 불러오는데 실패했습니다.');
    //         }
            
    //     } catch (error) {
    //         console.error('💥 API 호출 실패:', error);
    //         this.showError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    //     } finally {
    //         this.hideLoading();
    //     }
    // },

    /**
     * 🏷️ 투어 헤더 업데이트
     */
    updateTourHeader() {
        if (!this.currentTour) return;
        
        // 제목 업데이트
        const titleElement = document.getElementById('tourMainTitle');
        if (titleElement) {
            titleElement.textContent = this.currentTour.title || '투어 상품';
        }
        
        // 메타 정보 업데이트
        const metaElement = document.getElementById('tourMetaInfo');
        if (metaElement) {
            // 접근성 정보
            if (this.currentTour.hasBarrierFreeInfo && this.currentTour.totalAccessibilityScore > 0) {
                const accessibilityBadge = document.getElementById('accessibilityBadge');
                if (accessibilityBadge) {
                    accessibilityBadge.textContent = `♿ 편의시설 ${this.currentTour.totalAccessibilityScore}점`;
                    accessibilityBadge.style.display = 'inline-block';
                }
            }
            
            // 지역 정보
            const regionBadge = document.getElementById('regionBadge');
            if (regionBadge) {
                let regionText = `📍 ${this.currentTour.region}`;
                if (this.currentTour.sigungu && this.currentTour.sigungu.trim() !== '') {
                    regionText += ` ${this.currentTour.sigungu}`;
                }
                regionBadge.textContent = regionText;
            }
            
            // 관광지 수
            const spotsCount = document.getElementById('spotsCount');
            if (spotsCount) {
                spotsCount.textContent = `🎯 ${this.currentSpots.length}개 관광지`;
            }
        }
        
        // 버튼에 tourId 설정
        const wishlistBtn = document.getElementById('wishlistButton');
        if (wishlistBtn) {
            wishlistBtn.setAttribute('data-tour-id', this.currentTour.tourId);
        }
        
        console.log('✅ 헤더 업데이트 완료:', {
            title: this.currentTour.title,
            region: this.currentTour.region,
            sigungu: this.currentTour.sigungu,
            spots: this.currentSpots.length,
            dataSource: '세션/API'
        });
    },

    /**
     * 🗺️ 카카오맵 초기화 (실제 구현 + fallback)
     */
    async initializeKakaoMap() {
        const mapContainer = document.getElementById('tour-kakao-map');
        const mapPlaceholder = document.getElementById('map-placeholder');
        
        if (!mapContainer) {
            console.warn('⚠️ 지도 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        // API 키가 있고 관광지가 있는 경우 실제 카카오맵 로드
        if (this.kakaoMapApiKey && this.currentSpots.length > 0) {
            try {
                console.log('🗺️ 카카오맵 초기화 시작...');
                
                // 카카오맵 SDK 로드
                if (typeof loadKakaoMapSDK === 'function') {
                    loadKakaoMapSDK(this.kakaoMapApiKey);
                }
                
                // SDK 로드 대기
                await this.waitForKakaoMap();
                
                if (window.kakaoMapLoaded && typeof kakao !== 'undefined') {
                    this.createKakaoMap(mapContainer);
                    mapPlaceholder.style.display = 'none';
                    console.log('✅ 카카오맵 초기화 완료');
                } else {
                    throw new Error('카카오맵 SDK 로드 실패');
                }
                
            } catch (error) {
                console.warn('⚠️ 카카오맵 로드 실패, 플레이스홀더 표시:', error.message);
                this.showMapPlaceholder(mapContainer, mapPlaceholder);
            }
        } else {
            console.warn('⚠️ 카카오맵 API 키 없음 또는 관광지 없음, 플레이스홀더 표시');
            this.showMapPlaceholder(mapContainer, mapPlaceholder);
        }
    },

    /**
     * 카카오맵 SDK 로드 대기
     */
    async waitForKakaoMap(timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkLoaded = () => {
                if (window.kakaoMapLoaded && typeof kakao !== 'undefined') {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('카카오맵 SDK 로드 타임아웃'));
                } else {
                    setTimeout(checkLoaded, 100);
                }
            };
            
            checkLoaded();
        });
    },

    /**
     * 실제 카카오맵 생성
     */
    createKakaoMap(container) {
        if (!this.currentSpots.length) return;
        
        try {
            // 첫 번째 관광지를 중심으로 설정
            const firstSpot = this.currentSpots[0];
            const centerLat = parseFloat(firstSpot.mapy);
            const centerLng = parseFloat(firstSpot.mapx);
            
            if (isNaN(centerLat) || isNaN(centerLng)) {
                throw new Error('유효하지 않은 좌표 정보');
            }
            
            const mapOption = {
                center: new kakao.maps.LatLng(centerLat, centerLng),
                level: this.currentSpots.length > 3 ? 9 : 7 // 관광지 수에 따라 줌 레벨 조정
            };
            
            this.kakaoMap = new kakao.maps.Map(container, mapOption);
            
            // 관광지별 마커 생성
            this.currentSpots.forEach((spot, index) => {
                this.createSpotMarker(spot, index + 1);
            });
            
            // 지도 영역 자동 조정
            this.fitMapBounds();
            
            console.log('✅ 카카오맵 생성 완료:', this.currentSpots.length + '개 마커');
            
        } catch (error) {
            console.error('💥 카카오맵 생성 실패:', error);
            throw error;
        }
    },

    /**
     * 관광지 마커 생성
     */
    createSpotMarker(spot, order) {
        const lat = parseFloat(spot.mapy);
        const lng = parseFloat(spot.mapx);
        
        if (isNaN(lat) || isNaN(lng)) {
            console.warn('⚠️ 유효하지 않은 좌표:', spot.title, lat, lng);
            return;
        }
        
        const markerPosition = new kakao.maps.LatLng(lat, lng);
        
        // 커스텀 마커 이미지 (순서 표시)
        const imageSrc = this.createMarkerImageDataURL(order);
        const imageSize = new kakao.maps.Size(30, 30);
        const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize);
        
        const marker = new kakao.maps.Marker({
            position: markerPosition,
            image: markerImage,
            title: `${order}. ${spot.title}`
        });
        
        marker.setMap(this.kakaoMap);
        
        // 인포윈도우 생성
        const infoWindow = new kakao.maps.InfoWindow({
            content: this.createInfoWindowContent(spot, order)
        });
        
        // 마커 클릭 이벤트
        kakao.maps.event.addListener(marker, 'click', () => {
            infoWindow.open(this.kakaoMap, marker);
            // 해당 관광지 섹션으로 스크롤
            this.scrollToSpot(order);
        });
    },

    /**
     * 마커 이미지 생성 (Canvas 사용)
     */
    createMarkerImageDataURL(order) {
        const canvas = document.createElement('canvas');
        canvas.width = 30;
        canvas.height = 30;
        const ctx = canvas.getContext('2d');
        
        // 원형 배경
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(15, 15, 14, 0, 2 * Math.PI);
        ctx.fill();
        
        // 테두리
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 숫자 텍스트
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(order.toString(), 15, 15);
        
        return canvas.toDataURL();
    },

    /**
     * 인포윈도우 내용 생성
     */
    createInfoWindowContent(spot, order) {
        return `
            <div style="padding: 8px; min-width: 200px;">
                <h4 style="margin: 0 0 4px 0; color: #333; font-size: 14px;">
                    ${order}. ${spot.title}
                </h4>
                <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">
                    ${spot.addr1}
                </p>
                ${spot.hasBarrierFreeInfo ? 
                    `<div style="color: #4CAF50; font-size: 11px;">♿ 편의시설 ${spot.accessibilityScore}점</div>` : 
                    ''
                }
            </div>
        `;
    },

    /**
     * 지도 영역 자동 조정
     */
    fitMapBounds() {
        if (!this.kakaoMap || !this.currentSpots.length) return;
        
        const bounds = new kakao.maps.LatLngBounds();
        
        this.currentSpots.forEach(spot => {
            const lat = parseFloat(spot.mapy);
            const lng = parseFloat(spot.mapx);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                bounds.extend(new kakao.maps.LatLng(lat, lng));
            }
        });
        
        this.kakaoMap.setBounds(bounds);
    },

    /**
     * 지도 플레이스홀더 표시
     */
    showMapPlaceholder(mapContainer, placeholderElement) {
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }
        
        if (placeholderElement) {
            placeholderElement.style.display = 'flex';
        } else {
            // 플레이스홀더가 없으면 동적 생성
            const placeholder = document.createElement('div');
            placeholder.className = 'map-placeholder';
            placeholder.style.display = 'flex';
            placeholder.innerHTML = `
                <div class="placeholder-content">
                    <div class="placeholder-icon">🗺️</div>
                    <h3>지도를 불러올 수 없습니다</h3>
                    <p>관광지 위치 정보는 아래에서 확인하실 수 있습니다</p>
                </div>
            `;
            
            mapContainer.parentNode.appendChild(placeholder);
        }
    },

    /**
     * 특정 관광지로 스크롤
     */
    scrollToSpot(order) {
        const spotElement = document.querySelector(`[data-spot-order="${order}"]`);
        if (spotElement) {
            spotElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    /**
     * 📋 관광지별 상세정보 렌더링
     */
    renderTourSpots() {
        const container = document.getElementById('tourSpotsList');
        if (!container || !this.currentSpots.length) {
            if (container) {
                container.innerHTML = '<p>관광지 정보가 없습니다.</p>';
            }
            return;
        }
        
        let html = '';
        
        this.currentSpots.forEach((spot, index) => {
            const order = index + 1;
            const imageUrl = spot.optimizedImage || '/uploads/tour/no-image.png';
            
            html += `
                <div class="tour-spot-item" data-spot-order="${order}">
                    <div class="spot-order">${order}</div>
                    <img src="${imageUrl}" alt="${spot.title}" class="spot-image" 
                         onerror="this.src='/uploads/tour/no-image.png'">
                    <div class="spot-info">
                        <h3 class="spot-title">${spot.title}</h3>
                        <p class="spot-address">📍 ${spot.addr1}</p>
                        ${spot.tel ? `<p class="spot-tel">📞 ${spot.tel}</p>` : ''}
                        
                        ${spot.hasBarrierFreeInfo ? `
                            <div class="spot-accessibility">
                                <span class="accessibility-score">${spot.accessibilityScore}점</span>
                                <span class="barrier-free-info">편의시설 정보 포함</span>
                            </div>
                        ` : ''}
                        
                        ${spot.overview ? `
                            <p class="spot-overview">${this.truncateText(spot.overview, 150)}</p>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        console.log('✅ 관광지 상세정보 렌더링 완료:', this.currentSpots.length + '개');
    },

    /**
     * 🖼️ 이미지 갤러리 렌더링
     */
    renderImageGallery() {
        const carousel = document.getElementById('tourImageCarousel');
        const indicators = document.getElementById('carouselIndicators');
        
        if (!carousel || !indicators) return;
        
        // 이미지 수집 (모든 관광지 이미지)
        const images = this.currentSpots
            .map(spot => spot.optimizedImage || spot.firstimage)
            .filter(img => img && img.trim() !== '' && !img.includes('no-image'));
        
        this.totalImages = images.length;
        
        if (this.totalImages === 0) {
            // 이미지가 없는 경우
            document.getElementById('tourGallerySection').style.display = 'none';
            return;
        }
        
        // 캐러셀 슬라이드 생성
        let carouselHtml = '';
        images.forEach((image, index) => {
            const spot = this.currentSpots[index] || {};
            carouselHtml += `
                <div class="carousel-slide" style="transform: translateX(${index * 100}%)">
                    <img src="${image}" alt="${spot.title || '투어 이미지'}" 
                         class="carousel-image"
                         onerror="this.src='/uploads/tour/no-image.png'"
                         onclick="tourDetail.showFullImage('${image}', '${spot.title || ''}')">
                </div>
            `;
        });
        carousel.innerHTML = carouselHtml;
        
        // 인디케이터 생성
        let indicatorsHtml = '';
        for (let i = 0; i < this.totalImages; i++) {
            indicatorsHtml += `
                <div class="indicator ${i === 0 ? 'active' : ''}" 
                     onclick="tourDetail.goToSlide(${i})"></div>
            `;
        }
        indicators.innerHTML = indicatorsHtml;
        
        // 1개 이미지인 경우 컨트롤 숨김
        if (this.totalImages <= 1) {
            document.querySelector('.carousel-controls').style.display = 'none';
            indicators.style.display = 'none';
        }
        
        console.log('✅ 이미지 갤러리 렌더링 완료:', this.totalImages + '개 이미지');
    },

    /**
     * 갤러리 슬라이드 이동
     */
    goToSlide(index) {
        if (index < 0 || index >= this.totalImages) return;
        
        this.currentImageIndex = index;
        
        // 슬라이드 이동
        const slides = document.querySelectorAll('.carousel-slide');
        slides.forEach((slide, i) => {
            slide.style.transform = `translateX(${(i - index) * 100}%)`;
        });
        
        // 인디케이터 업데이트
        document.querySelectorAll('.indicator').forEach((indicator, i) => {
            indicator.classList.toggle('active', i === index);
        });
    },

    /**
     * 이전/다음 슬라이드
     */
    prevSlide() {
        const newIndex = this.currentImageIndex > 0 ? this.currentImageIndex - 1 : this.totalImages - 1;
        this.goToSlide(newIndex);
    },

    nextSlide() {
        const newIndex = this.currentImageIndex < this.totalImages - 1 ? this.currentImageIndex + 1 : 0;
        this.goToSlide(newIndex);
    },

    /**
     * 이미지 전체화면 표시 (placeholder)
     */
    showFullImage(imageUrl, title) {
        this.showToast('이미지 전체화면 기능은 준비 중입니다', 'info');
        // 향후 구현: 모달로 이미지 확대 표시
    },

    /**
     * 🍽️ 맛집 정보 렌더링 (카테고리별)
     */
    renderRestaurants() {
        const container = document.getElementById('restaurantsByCategory');
        if (!container) return;
        
        const restaurantCategories = Object.keys(this.currentRestaurants);
        
        if (restaurantCategories.length === 0) {
            container.innerHTML = `
                <div class="empty-category">
                    <p>해당 지역의 맛집 정보를 준비 중입니다.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        restaurantCategories.forEach(category => {
            const restaurants = this.currentRestaurants[category] || [];
            
            html += `
                <div class="restaurant-category">
                    <div class="category-header">
                        <h3 class="category-title">${this.getCategoryIcon(category)} ${category}</h3>
                        <span class="category-count">${restaurants.length}</span>
                    </div>
            `;
            
            if (restaurants.length > 0) {
                html += '<div class="restaurant-list">';
                
                restaurants.forEach(restaurant => {
                    html += `
                        <div class="restaurant-item">
                            <div class="restaurant-info">
                                <h4>${restaurant.title}</h4>
                                <p>📍 ${restaurant.addr1}</p>
                                ${restaurant.tel ? `<p>📞 ${restaurant.tel}</p>` : ''}
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
            } else {
                html += `
                    <div class="empty-category">
                        <p>${category} 정보를 준비 중입니다.</p>
                    </div>
                `;
            }
            
            html += '</div>';
        });
        
        container.innerHTML = html;
        
        const totalRestaurants = Object.values(this.currentRestaurants)
            .reduce((total, restaurants) => total + restaurants.length, 0);
        console.log('✅ 맛집 정보 렌더링 완료:', totalRestaurants + '개 맛집');
    },

    /**
     * 카테고리별 아이콘 반환
     */
    getCategoryIcon(category) {
        const icons = {
            '한식': '🍚',
            '서양식': '🍝',
            '일식': '🍣',
            '중식': '🥟',
            '이색음식점': '🍴',
            '카페/전통찻집': '☕'
        };
        return icons[category] || '🍽️';
    },

    /**
     * ❤️ 찜하기 기능 (AJAX)
     */
    async toggleWishlist() {
        if (!this.currentTour?.tourId) {
            this.showToast('투어 정보를 확인할 수 없습니다', 'error');
            return;
        }
        
        // 로그인 상태 확인 (간단한 방법)
        try {
            const checkResponse = await fetch('/api/wishlist/check');
            if (checkResponse.status === 401) {
                this.showToast('로그인이 필요합니다', 'warning');
                window.location.href = '/login';
                return;
            }
        } catch (error) {
            console.warn('로그인 상태 확인 실패:', error);
        }
        
        const button = document.getElementById('wishlistButton');
        if (button) {
            button.classList.add('button-loading');
        }
        
        try {
            const url = this.isWishlisted ? 
                `/api/wishlist/remove/${this.currentTour.tourId}` : 
                '/api/wishlist/add';
            
            const method = this.isWishlisted ? 'DELETE' : 'POST';
            const body = this.isWishlisted ? null : JSON.stringify({
                tourId: this.currentTour.tourId
            });
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: body
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isWishlisted = !this.isWishlisted;
                this.updateWishlistButton();
                
                const message = this.isWishlisted ? '찜 목록에 추가되었습니다!' : '찜 목록에서 제거되었습니다.';
                this.showToast(message, 'success');
            } else {
                throw new Error(result.message || '찜하기 처리 실패');
            }
            
        } catch (error) {
            console.error('💥 찜하기 실패:', error);
            this.showToast('찜하기 처리 중 오류가 발생했습니다', 'error');
        } finally {
            if (button) {
                button.classList.remove('button-loading');
            }
        }
    },

    /**
     * 찜하기 상태 확인
     */
    async checkWishlistStatus(tourId) {
        try {
            const response = await fetch(`/api/wishlist/check/${tourId}`);
            if (response.ok) {
                const result = await response.json();
                this.isWishlisted = result.isWishlisted || false;
                this.updateWishlistButton();
            }
        } catch (error) {
            console.warn('찜하기 상태 확인 실패:', error);
        }
    },

    /**
     * 찜하기 버튼 UI 업데이트
     */
    updateWishlistButton() {
        const button = document.getElementById('wishlistButton');
        const mobileButton = document.querySelector('.mobile-wishlist-btn');
        
        const updateButton = (btn) => {
            if (!btn) return;
            
            const icon = btn.querySelector('.heart-icon');
            const text = btn.querySelector('.wishlist-text') || btn.querySelector('span');
            
            if (this.isWishlisted) {
                btn.classList.add('active');
                if (icon) icon.textContent = '💖';
                if (text) text.textContent = '찜함';
            } else {
                btn.classList.remove('active');
                if (icon) icon.textContent = '❤️';
                if (text) text.textContent = '찜하기';
            }
        };
        
        updateButton(button);
        updateButton(mobileButton);
    },

    /**
     * ✈️ 여행만들기 (placeholder)
     */
    handleTravelCreate() {
        this.showToast('여행만들기 기능은 준비 중입니다', 'info');
        // 향후 구현: 여행 일정 생성 페이지로 이동
    },

    /**
     * 👥 여행참여 (placeholder - 비활성화)
     */
    handleTravelJoin() {
        this.showToast('여행참여 기능은 준비 중입니다', 'info');
        // 향후 구현: 공동 여행 참여 기능
    },

    /**
     * 🔧 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 찜하기 버튼
        const wishlistBtn = document.getElementById('wishlistButton');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', () => this.toggleWishlist());
        }
        
        // 여행만들기 버튼
        const createBtn = document.getElementById('travelCreateButton');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.handleTravelCreate());
        }
        
        // 여행참여 버튼 (비활성화되어 있음)
        const joinBtn = document.getElementById('travelJoinButton');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this.handleTravelJoin());
        }
        
        // 갤러리 컨트롤
        const prevBtn = document.getElementById('carouselPrevBtn');
        const nextBtn = document.getElementById('carouselNextBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevSlide());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextSlide());
        }
        
        // 키보드 네비게이션
        document.addEventListener('keydown', (e) => {
            if (this.totalImages > 1) {
                if (e.key === 'ArrowLeft') {
                    this.prevSlide();
                } else if (e.key === 'ArrowRight') {
                    this.nextSlide();
                }
            }
        });
        
        console.log('✅ 이벤트 리스너 설정 완료');
    },

    // ===========================================
    // 유틸리티 함수들
    // ===========================================

    /**
     * 텍스트 자르기
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * 로딩 스피너 표시/숨김
     */
    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.remove('hidden');
        }
    },

    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }
    },

    /**
     * 에러 메시지 표시
     */
    showError(message) {
        this.showToast(message, 'error');
        
        // 에러 상태 UI 업데이트
        document.body.classList.add('error-state');
        
        const container = document.querySelector('.tour-detail-container');
        if (container && !this.currentTour) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">😞</div>
                    <h2 style="margin-bottom: 8px;">투어 정보를 불러올 수 없습니다</h2>
                    <p style="color: #666; margin-bottom: 20px;">${message}</p>
                    <button onclick="history.back()" style="background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
                        이전 페이지로 돌아가기
                    </button>
                </div>
            `;
        }
    },

    showSuccess(message) {
        this.showToast(message, 'success');
    },

    /**
     * 토스트 메시지 표시
     */
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // 자동 제거
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
        
        console.log(`📢 토스트 [${type}]:`, message);
    }
};

// ========================================
// 페이지 로드 시 자동 초기화 (tour-detail.js 맨 마지막에 추가)
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 투어 상세페이지 v3.0 로드됨");
  
  // URL에서 tourId 추출
  const pathParts = window.location.pathname.split('/');
  const tourId = pathParts[pathParts.length - 1];
  
  // tourId 유효성 검증
  if (tourId && tourId !== 'tour' && tourId.length > 5) {
    console.log('📍 투어 ID 추출 성공:', tourId);
    
    // tourDetail 객체가 준비되면 자동 로드
    if (window.tourDetail && typeof window.tourDetail.loadTourDetail === 'function') {
      console.log('🎯 투어 상세정보 자동 로드 시작');
      window.tourDetail.loadTourDetail(tourId);
    } else {
      console.error('❌ tourDetail 객체가 준비되지 않음');
    }
  } else {
    console.error('❌ 유효하지 않은 투어 ID:', tourId);
    // 에러 페이지 표시
    if (window.tourDetail) {
      window.tourDetail.showError('잘못된 투어 페이지 주소입니다.');
    }
  }
});

// tourDetail을 전역으로 노출 (기존과 동일)
window.tourDetail = window.tourDetail;