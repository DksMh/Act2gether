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
    // 카카오 지도
    currentInfoWindow: null,
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
        //this.renderTourSpots();
        this.renderSpotAccordions();
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
            //const response = await fetch(`/tour/${tourId}`);
            const response = await fetch(`/tour-detail/${tourId}`); // 수정된 API 경로
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
                //this.renderTourSpots();
                this.renderSpotAccordions();
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
     * 실제 카카오맵 생성수정 - 경로 라인 추가)
     */
    createKakaoMap(container) {
        if (!this.currentSpots.length) return;
        
        try {
            const firstSpot = this.currentSpots[0];
            const centerLat = parseFloat(firstSpot.mapy);
            const centerLng = parseFloat(firstSpot.mapx);
            
            if (isNaN(centerLat) || isNaN(centerLng)) {
                throw new Error('유효하지 않은 좌표 정보');
            }
            
            const mapOption = {
                center: new kakao.maps.LatLng(centerLat, centerLng),
                level: this.currentSpots.length > 3 ? 9 : 7 // 관광지 수에 때라 줌레벨 조정
            };
            
            this.kakaoMap = new kakao.maps.Map(container, mapOption);
            
            // 지도 클릭시 인포윈도우 닫기
            kakao.maps.event.addListener(this.kakaoMap, 'click', () => {
                this.closeInfoWindow();
            });
            
            // 관광지별 마커 생성
            this.currentSpots.forEach((spot, index) => {
                this.createSpotMarker(spot, index + 1);
            });
            
            // 투어 경로 라인 그리기
            this.createTourPath();
            
            // 지도 영역 자동 조정
            this.fitMapBounds();
            
            console.log('카카오맵 생성 완료:', this.currentSpots.length + '개 마커 + 경로 라인');
            
        } catch (error) {
            console.error('카카오맵 생성 실패:', error);
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
            console.warn('유효하지 않은 좌표:', spot.title, lat, lng);
            return;
        }
        
        const markerPosition = new kakao.maps.LatLng(lat, lng);
        
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
            content: this.createInfoWindowContent(spot, order),
            removable: false
        });
        
        // 마커 클릭 이벤트
        kakao.maps.event.addListener(marker, 'click', () => {
            // 기존 인포윈도우가 열려있으면 닫기
            if (this.currentInfoWindow) {
                this.currentInfoWindow.close();
            }
            
            // 새로운 인포윈도우 열기
            infoWindow.open(this.kakaoMap, marker);
            this.currentInfoWindow = infoWindow;
            
            // 해당 관광지 섹션으로 스크롤
            //this.scrollToSpot(order);
        });
    },
    /**
     * 인포윈도우 닫기
     */
    closeInfoWindow() {
        if (this.currentInfoWindow) {
            this.currentInfoWindow.close();
            this.currentInfoWindow = null;
        }
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
            <div class="kakao-infowindow">
                <button class="kakao-infowindow-close" onclick="tourDetail.closeInfoWindow()" title="닫기">×</button>
                <h4 class="kakao-infowindow-title">${order}. ${spot.title}</h4>
                <p class="kakao-infowindow-address">${spot.addr1}</p>
            </div>
        `;// ${spot.hasBarrierFreeInfo ? `<div class="kakao-infowindow-accessibility">♿ 편의시설  ${spot.hasBarrierFreeInfo}와  ${spot.accessibilityScore}점</div>` :  ''}*/
    },

    /**
     * 투어 경로 라인 그리기 (마커 순서대로 연결)
     */
    createTourPath() {
        if (!this.kakaoMap || this.currentSpots.length < 2) {
            return; // 지도가 없거나 관광지가 2개 미만이면 라인 불필요
        }

        // 관광지 좌표들을 순서대로 수집
        const pathCoords = [];
        
        for (const spot of this.currentSpots) {
            const lat = parseFloat(spot.mapy);
            const lng = parseFloat(spot.mapx);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                pathCoords.push(new kakao.maps.LatLng(lat, lng));
            }
        }

        if (pathCoords.length < 2) {
            console.warn('유효한 좌표가 2개 미만이라 경로를 그릴 수 없습니다');
            return;
        }

        // Polyline 생성
        const polyline = new kakao.maps.Polyline({
            path: pathCoords,
            strokeWeight: 3,
            strokeColor: '#FF6B35',
            strokeOpacity: 0.7,
            strokeStyle: 'solid'
        });

        // 다양한 스타일 옵션
        // const polyline = new kakao.maps.Polyline({
        //     path: pathCoords,
        //     strokeWeight: 4,           // 선 두께 (기본: 3)
        //     strokeColor: '#FF6B35',    // 선 색상 (기본: #4CAF50)
        //     strokeOpacity: 0.9,        // 투명도 (0~1)
        //     strokeStyle: 'solid'       // 'solid', 'shortdash', 'shortdot', 'dash'
        // });

        // 지도에 라인 표시
        polyline.setMap(this.kakaoMap);
        
        console.log('투어 경로 라인 생성 완료:', pathCoords.length + '개 지점 연결');
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
     * 특정 관광지로 스크롤 -> 미커 클릭시 이동
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
    // renderTourSpots() {
    //     const container = document.getElementById('tourSpotsList');
    //     if (!container || !this.currentSpots.length) {
    //         if (container) {
    //             container.innerHTML = '<p>관광지 정보가 없습니다.</p>';
    //         }
    //         return;
    //     }
        
    //     let html = '';
        
    //     this.currentSpots.forEach((spot, index) => {
    //         const order = index + 1;
    //         const imageUrl = spot.optimizedImage || '/uploads/tour/no-image.png';
            
    //         html += `
    //             <div class="tour-spot-item" data-spot-order="${order}">
    //                 <div class="spot-order">${order}</div>
    //                 <img src="${imageUrl}" alt="${spot.title}" class="spot-image" 
    //                      onerror="this.src='/uploads/tour/no-image.png'">
    //                 <div class="spot-info">
    //                     <h3 class="spot-title">${spot.title}</h3>
    //                     <p class="spot-address">📍 ${spot.addr1}</p>
    //                     ${spot.tel ? `<p class="spot-tel">📞 ${spot.tel}</p>` : ''}
                        
    //                     ${spot.hasBarrierFreeInfo ? `
    //                         <div class="spot-accessibility">
    //                             <span class="accessibility-score">${spot.accessibilityScore}점</span>
    //                             <span class="barrier-free-info">편의시설 정보 포함</span>
    //                         </div>
    //                     ` : ''}
                        
    //                     ${spot.overview ? `
    //                         <p class="spot-overview">${this.truncateText(spot.overview, 150)}</p>
    //                     ` : ''}
    //                 </div>
    //             </div>
    //         `;
    //     });
        
    //     container.innerHTML = html;
    //     console.log('✅ 관광지 상세정보 렌더링 완료:', this.currentSpots.length + '개');
    // },
    /**
     * 📋 관광지별 상세정보를 아코디언 형태로 렌더링 (기존 renderTourSpots 대체)
     */
    renderSpotAccordions() {
    const container = document.getElementById('tourSpotsList');
    if (!container || !this.currentSpots.length) {
        if (container) {
            container.innerHTML = '<p>관광지 정보가 없습니다.</p>';
        }
        return;
    }
    
    let html = '<div class="spot-accordions">';
    
    this.currentSpots.forEach((spot, index) => {
        const order = index + 1;
        const imageUrl = spot.optimizedImage || '/uploads/tour/no-image.png';
        const isFirst = index === 0; // 첫 번째 아코디언은 자동 열기
        
        html += `
            <div class="spot-accordion ${isFirst ? 'active' : ''}" data-spot-order="${order}">
                <!-- 아코디언 헤더 (항상 표시) -->
                <div class="accordion-header" onclick="tourDetail.toggleAccordion(${order})">
                    <div class="spot-number">${order}</div>
                    <div class="spot-header-content">
                        <img src="${imageUrl}" alt="${spot.title}" class="spot-thumb" 
                             onerror="this.src='/uploads/tour/no-image.png'">
                        <div class="spot-header-info">
                            <h3 class="spot-title">${spot.title}</h3>
                            <p class="spot-address">📍 ${spot.addr1}</p>
                            ${spot.hasBarrierFreeInfo ? `
                                <div class="spot-accessibility">
                                    <span class="accessibility-score">${spot.accessibilityScore}점</span>
                                    <span class="barrier-free-info">편의시설 정보 포함</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="accordion-toggle">
                        <span class="toggle-icon">${isFirst ? '▼' : '▶'}</span>
                        <span class="toggle-text">${isFirst ? '접기' : '상세보기'}</span>
                    </div>
                </div>
                
                <!-- 아코디언 콘텐츠 (토글) -->
                <div class="accordion-content" ${isFirst ? 'style="display: block;"' : 'style="display: none;"'}>
                    <div class="accordion-body" id="accordion-body-${order}">
                        ${isFirst ? this.generateLoadingContent() : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // 첫 번째 아코디언 상세정보 자동 로드
    if (this.currentSpots.length > 0) {
        this.loadSpotDetail(this.currentSpots[0].contentid, 1);
    }
    
    console.log('✅ 관광지 아코디언 렌더링 완료:', this.currentSpots.length + '개');
},

    /**
     * 🔄 아코디언 토글 함수
     */
    toggleAccordion(order) {
    const clickedAccordion = document.querySelector(`[data-spot-order="${order}"]`);
    const clickedContent = clickedAccordion.querySelector('.accordion-content');
    const clickedIcon = clickedAccordion.querySelector('.toggle-icon');
    const clickedText = clickedAccordion.querySelector('.toggle-text');
    const clickedBody = document.getElementById(`accordion-body-${order}`);
    
    const isCurrentlyActive = clickedAccordion.classList.contains('active');
    
    // 먼저 모든 아코디언 닫기
    document.querySelectorAll('.spot-accordion').forEach(accordion => {
        const content = accordion.querySelector('.accordion-content');
        const icon = accordion.querySelector('.toggle-icon');
        const text = accordion.querySelector('.toggle-text');
        
        accordion.classList.remove('active');
        content.style.display = 'none';
        icon.textContent = '▶';
        if (text) text.textContent = '상세보기';
    });
    
    // 클릭한 아코디언이 이미 열려있었다면 그대로 닫은 상태 유지
    // 닫혀있었다면 열기
    if (!isCurrentlyActive) {
        clickedAccordion.classList.add('active');
        clickedContent.style.display = 'block';
        clickedIcon.textContent = '▼';
        if (clickedText) clickedText.textContent = '접기';
        
        // 상세정보가 로드되지 않았으면 로드
        if (!clickedBody || clickedBody.innerHTML === '' || clickedBody.innerHTML.includes('상세정보를 불러오고 있습니다')) {
            const spot = this.currentSpots.find(s => s.order === order);
            if (spot) {
                console.log(`🔄 ${order}번째 관광지 상세정보 로드 시작: ${spot.contentid}`);
                this.loadSpotDetail(spot.contentid, order);
            }
        }
        
        // 부드러운 스크롤
        setTimeout(() => {
            clickedAccordion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
},
    /**
 * 📡 관광지 상세정보 AJAX 로드
 */
async loadSpotDetail(contentId, order) {
    const bodyElement = document.getElementById(`accordion-body-${order}`);
    if (!bodyElement) return;
    
    try {
        // 로딩 표시
        bodyElement.innerHTML = this.generateLoadingContent();
        
        const response = await fetch(`/tour-detail/spot-detail/${contentId}`);
        const result = await response.json();
        
        if (result.success) {
            const spotData = result.data;
            bodyElement.innerHTML = this.generateSpotDetailContent(spotData);
            console.log(`✅ ${order}번째 관광지 상세정보 로드 완료: ${contentId}`);
        } else {
            bodyElement.innerHTML = this.generateErrorContent(result.message);
            console.warn(`⚠️ ${order}번째 관광지 상세정보 로드 실패: ${contentId} - ${result.message}`);
        }
        
    } catch (error) {
        console.error(`💥 ${order}번째 관광지 상세정보 로드 오류: ${contentId}`, error);
        bodyElement.innerHTML = this.generateErrorContent('네트워크 오류가 발생했습니다');
    }
},

/**
 * 🎨 상세정보 HTML 생성
 */
generateSpotDetailContent(data) {
    return `
        <div class="spot-detail-grid">
            <!-- 기본 정보 -->
            <div class="detail-section">
                <h4 class="detail-title">📋 기본정보</h4>
                <div class="detail-content">
                    ${data.title ? `<p><strong>명칭:</strong> ${data.title}</p>` : ''}
                    ${data.addr1 ? `<p><strong>주소:</strong> ${data.addr1}</p>` : ''}
                    ${data.tel ? `<p><strong>전화:</strong> <a href="tel:${data.tel}">${data.tel}</a></p>` : ''}
                    ${data.homepage ? `<p><strong>홈페이지:</strong> <a href="${data.homepage}" target="_blank" rel="noopener">바로가기 🔗</a></p>` : ''}
                </div>
            </div>
            
            <!-- 이용 정보 -->
            <div class="detail-section">
                <h4 class="detail-title">🕒 이용정보</h4>
                <div class="detail-content">
                    ${data.usetime ? `<p><strong>이용시간:</strong> ${data.usetime}</p>` : '<p><strong>이용시간:</strong> 정보 없음</p>'}
                    ${data.restdate ? `<p><strong>휴무일:</strong> ${data.restdate}</p>` : '<p><strong>휴무일:</strong> 정보 없음</p>'}
                    ${data.parking ? `<p><strong>주차:</strong> ${data.parking}</p>` : '<p><strong>주차:</strong> 정보 없음</p>'}
                    ${data.admission ? `<p><strong>입장료:</strong> ${data.admission}</p>` : '<p><strong>입장료:</strong> 정보 없음</p>'}
                </div>
            </div>
            
            <!-- 상세 설명 -->
            ${data.overview ? `
                <div class="detail-section overview-section">
                    <h4 class="detail-title">📖 상세설명</h4>
                    <div class="detail-content">
                        <p class="overview-text">${data.overview}</p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
},

/**
 * ⏳ 로딩 콘텐츠 생성
 */
generateLoadingContent() {
    return `
        <div class="loading-content">
            <div class="loading-spinner-small"></div>
            <p>상세정보를 불러오고 있습니다...</p>
        </div>
    `;
},

/**
 * ❌ 에러 콘텐츠 생성
 */
generateErrorContent(message) {
    return `
        <div class="error-content">
            <div class="error-icon">⚠️</div>
            <p>상세정보를 불러올 수 없습니다</p>
            <p class="error-message">${message}</p>
            <button onclick="location.reload()" class="retry-button">페이지 새로고침</button>
        </div>
    `;
},

   /**
     * 🖼️ 이미지 갤러리 렌더링 (수정된 버전)
     */
/**
 * ✅ 최종 JS (옵션 A + 키보드 화살표 이동)
 * - 높이 계산 없음(aspect-ratio로 해결)
 * - 좌우 화살표 키(←/→)로 한 칸씩 이동
 */

renderImageGallery() {
  const carousel   = document.getElementById('tourImageCarousel');
  const indicators = document.getElementById('carouselIndicators');
  const section    = document.getElementById('tourGallerySection');
  if (!carousel || !indicators) return;

  // 유효 이미지 수집
  const items = (this.currentSpots || [])
    .map(spot => {
      const src = spot?.optimizedImage || spot?.firstimage || '';
      const ok  = src && src.trim() !== '' && !src.includes('no-image');
      return ok ? { src, title: spot?.title || '투어 이미지' } : null;
    })
    .filter(Boolean);

  this.totalImages = items.length;

  if (this.totalImages === 0) {
    if (section) section.style.display = 'none';
    return;
  } else if (section) {
    section.style.display = '';
  }

  // 슬라이드 마크업
  let carouselHtml = '';
  items.forEach(({ src, title }) => {
    const safeTitle = String(title).replace(/'/g, "\\'");
    carouselHtml += `
      <div class="carousel-slide">
        <img src="${src}" alt="${title}"
             class="carousel-image"
             onerror="this.src='/uploads/tour/no-image.png'"
             onclick="tourDetail.showFullImage('${src}', '${safeTitle}')">
      </div>
    `;
  });
  carousel.innerHTML = carouselHtml;

  // 인디케이터
  let indicatorsHtml = '';
  for (let i = 0; i < this.totalImages; i++) {
    indicatorsHtml += `
      <div class="indicator ${i === 0 ? 'active' : ''}"
           onclick="tourDetail.goToSlide(${i})"></div>
    `;
  }
  indicators.innerHTML = indicatorsHtml;

  // 초기 위치
  this.currentImageIndex = 0;
  const slides = carousel.querySelectorAll('.carousel-slide');
  slides.forEach((slide, i) => {
    slide.style.transform = `translateX(${i * 100}%)`;
  });

  // 한 장만 있으면 컨트롤/인디케이터 숨김
  const controls = document.querySelector('.carousel-controls');
  if (this.totalImages <= 1) {
    if (controls) controls.style.display = 'none';
    indicators.style.display = 'none';
  } else {
    if (controls) controls.style.display = '';
    indicators.style.display = '';
  }

  // 첫 슬라이드 표시
  this.goToSlide(0);

  // ⌨️ 화살표 키 바인딩(한 번만)
  this._bindKeyboardForCarousel();
},

/**
 * 갤러리 슬라이드 이동
 */
goToSlide(index) {
  if (!Number.isInteger(index)) return;
  if (index < 0 || index >= this.totalImages) return;

  this.currentImageIndex = index;

  const slides = document.querySelectorAll('#tourImageCarousel .carousel-slide');
  slides.forEach((slide, i) => {
    slide.style.transform = `translateX(${(i - index) * 100}%)`;
  });

  document.querySelectorAll('#carouselIndicators .indicator').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
},

/** 이전/다음 */
prevSlide() {
  if (this.totalImages <= 1) return;
  const newIndex = this.currentImageIndex > 0
    ? this.currentImageIndex - 1
    : this.totalImages - 1;
  this.goToSlide(newIndex);
},

nextSlide() {
  if (this.totalImages <= 1) return;
  const newIndex = this.currentImageIndex < this.totalImages - 1
    ? this.currentImageIndex + 1
    : 0;
  this.goToSlide(newIndex);
},

/**
 * ⌨️ 키보드 바인딩 (←/→)
 * - 입력 중엔 방해하지 않도록 form/에디터는 무시
 * - 중복 바인딩 방지 플래그 사용
 */
_bindKeyboardForCarousel() {
  if (this._kbdBound) return;
  this._kbdBound = true;

  // 캐러셀에 포커스도 줄 수 있게(선택)
  const carousel = document.getElementById('tourImageCarousel');
  if (carousel && !carousel.hasAttribute('tabindex')) {
    carousel.setAttribute('tabindex', '0');
  }

  window.addEventListener('keydown', (e) => {
    // 입력 필드/에디터에선 무시
    const t = e.target;
    const tag = (t && t.tagName ? t.tagName.toLowerCase() : '');
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t && t.isContentEditable)) return;
    if (this.totalImages <= 1) return;

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.nextSlide();
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.prevSlide();
    }
  });
},

    /**
     * 이미지 전체화면 표시 (placeholder)
     */
    showFullImage(imageUrl, title) {
        const modal = document.getElementById('imageFullscreenModal');
        const image = document.getElementById('fullscreenImage');
        const titleElement = document.getElementById('fullscreenTitle');
        
        if (modal && image && titleElement) {
            image.src = imageUrl;
            image.alt = title;
            titleElement.textContent = title;
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // 스크롤 방지
            
            console.log('이미지 전체화면 표시:', title);
        }
    },
    /**
     * 이미지 전체화면 닫기
     */
    closeFullImage() {
        const modal = document.getElementById('imageFullscreenModal');
        
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // 스크롤 복원
            
            console.log('이미지 전체화면 닫기');
        }
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
    // async checkWishlistStatus(tourId) {
    //     try {
    //         const response = await fetch(`/api/wishlist/check/${tourId}`);
    //         if (response.ok) {
    //             const result = await response.json();
    //             this.isWishlisted = result.isWishlisted || false;
    //             this.updateWishlistButton();
    //         }
    //     } catch (error) {
    //         console.warn('찜하기 상태 확인 실패:', error);
    //     }
    // },

    /**
     * 찜하기 상태 확인
     */
    async checkWishlistStatus(tourId) {
        try {
            const response = await fetch(`/api/wishlist/check/${tourId}`);
            
            // HTML 응답인지 확인 (로그인 페이지 리다이렉트 등)
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('찜하기 상태 확인 - 비로그인 상태 또는 리다이렉트');
                this.isWishlisted = false;
                this.updateWishlistButton();
                return;
            }
            
            if (response.ok) {
                const result = await response.json();
                this.isWishlisted = result.isWishlisted || false;
                this.updateWishlistButton();
            } else {
                // 401 Unauthorized 등
                console.warn('찜하기 상태 확인 - 인증 필요');
                this.isWishlisted = false;
                this.updateWishlistButton();
            }
        } catch (error) {
            console.warn('찜하기 상태 확인 실패:', error.message);
            this.isWishlisted = false;
            this.updateWishlistButton();
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
        
        // ESC 키로 전체화면 이미지 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeFullImage();
            }
            
            if (this.totalImages > 1) {
                if (e.key === 'ArrowLeft') {
                    this.prevSlide();
                } else if (e.key === 'ArrowRight') {
                    this.nextSlide();
                }
            }
        });
        
        // 모달 배경 클릭시 닫기
        const modal = document.getElementById('imageFullscreenModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeFullImage();
                }
            });
        }

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
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  console.log("path : " +id );
  // URL에서 tourId 추출
//   const pathParts = window.location.pathname.split('/');
//   const tourId = pathParts[pathParts.length - 1];
   const tourId = id;
  
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