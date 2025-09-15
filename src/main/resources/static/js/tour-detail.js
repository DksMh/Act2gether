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
  // 카카오 지도 의료시설 관련 추가
  medicalMarkers: [],  // 병원/약국 마커 저장 배열
  showMedical: false,  // 의료시설 표시 상태
  ps: null,  // 카카오 장소 검색 객체

  // 갤러리 상태
  currentImageIndex: 0,
  totalImages: 0,
  currentTravelGroups: [], // 현재 투어의 여행 그룹들
  hasAvailableGroup: false, // 참여 가능한 그룹 유무

  /**
   * 🎯 메인 진입점: 세션 우선 → API fallback 투어 상세정보 로드
   */
  async loadTourDetail(tourId) {
    console.log("🚀 투어 상세정보 로드 시작 (세션 우선):", tourId);
    // 로그인 상태 먼저 확인
    await this.checkLoginStatus();

    this.showLoading();

    try {
      // 1단계: 세션에서 데이터 확인
      const sessionData = this.loadFromSession(tourId);

      if (sessionData && this.isSessionDataValid(sessionData)) {
        console.log("✅ 세션 데이터 발견 - 세션 데이터 사용:", sessionData);

        // 세션 데이터로 UI 구성
        this.loadFromSessionData(sessionData);

        // 백엔드에서 추가 데이터 (맛집, API 키) 가져오기
        await this.loadAdditionalData(tourId);

        this.showSuccess("투어 정보를 빠르게 불러왔습니다! (세션 활용)");
      } else {
        console.log("❌ 세션 데이터 없음 - API 호출 시도");

        // 2단계: API fallback
        await this.loadFromApi(tourId);
      }
    } catch (error) {
      console.error("💥 투어 정보 로드 실패:", error);
      this.showError("투어 정보를 불러오는데 실패했습니다.");
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
        console.log("📦 세션 데이터 파싱 완료:", parsedData);
        return parsedData;
      }

      return null;
    } catch (error) {
      console.error("❌ 세션 데이터 파싱 실패:", error);
      return null;
    }
  },
  /**
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
      console.log("⏰ 세션 데이터가 1시간 이상 경과 - 무효 처리");
      return false;
    }

    return true;
  },

  /**
   * 🆕 세션 데이터로 UI 구성
   */
  loadFromSessionData(sessionData) {
    console.log("📦 세션 데이터 로드 시작:", sessionData);

    // 현재 상태 설정
    this.currentTour = {
      tourId: sessionData.tourId,
      title: sessionData.title,
      region: sessionData.region,
      spotCount: sessionData.tourCount,
      totalAccessibilityScore: sessionData.totalAccessibilityScore,
      hasBarrierFreeInfo:
        sessionData.accessibilityInfo?.hasAccessibilityFilter || false,
      sigungu: "", // 세션에 없으면 빈 값
      // 🔥 핵심: accessibilityInfo 전체 포함
      accessibilityInfo: sessionData.accessibilityInfo || {
        features: {},
        validCount: 0,
        totalCount: sessionData.tourCount,
        selectedNeedsType: null,
        hasAccessibilityFilter: false,
      },
    };
    console.log("✅ 편의시설 정보 확인:", {
      selectedType: this.currentTour.accessibilityInfo.selectedNeedsType,
      hasFilter: this.currentTour.accessibilityInfo.hasAccessibilityFilter,
    });

    this.currentSpots = sessionData.spots.map((spot, index) => ({
      ...spot,
      order: index + 1,
    }));
    // UI 업데이트
    this.updateTourHeader();
    this.renderSpotAccordions();
    this.renderImageGallery();
    this.setupEventListeners();

    // 🆕 지역 특색 정보 로드
    this.loadRegionTips();

    // 찜하기 상태 확인
    this.checkWishlistStatus(sessionData.tourId);

    // 🔥 여행 그룹 상태 확인 추가
    this.checkTravelGroupStatus(sessionData.tourId);

    console.log("✅ 세션 데이터로 UI 구성 완료");
  },
  /**
   * 로그인 상태 확인 (간단한 체크)
   */
  async checkLoginStatus() {
    try {
      const response = await fetch("/api/current-user", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();

        if (result.isAuthenticated) {
          this.currentUser = result.userid;
          this.currentUserName = result.username;
          this.isAdmin = result.isAdmin || false;
          console.log("✅ 로그인 사용자 확인:", {
            userid: this.currentUser,
            username: this.currentUserName,
          });
        } else {
          this.currentUser = null;
        }
      }
    } catch (error) {
      console.error("로그인 상태 확인 오류:", error);
      this.currentUser = null;
    }
  },
  /**
   * 추가 데이터 로드 (맛집, API 키 등) - 관광지 패턴과 동일
   */
  async loadAdditionalData(tourId) {
    try {
      // 1. API 키 가져오기
      const basicResponse = await fetch(`/tour-detail/${tourId}`);
      const basicResult = await basicResponse.json();

      if (basicResult.success && basicResult.kakaoMapApiKey) {
        this.kakaoMapApiKey = basicResult.kakaoMapApiKey;
        this.initializeKakaoMap();
      }

      // 2. 맛집 정보 - 세션 데이터의 좌표를 함께 전송
      const restaurantResponse = await fetch(
        `/tour-detail/${tourId}/restaurants`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            spots: this.currentSpots.map((spot) => ({
              contentid: spot.contentid,
              title: spot.title,
              mapx: spot.mapx,
              mapy: spot.mapy,
            })),
          }),
        }
      );

      const restaurantResult = await restaurantResponse.json();

      if (restaurantResult.success) {
        this.currentRestaurants = restaurantResult.restaurants || {};
        this.renderRestaurants();

        console.log(
          "✅ 맛집 데이터 로드 완료:",
          Object.values(this.currentRestaurants).flat().length + "개 맛집"
        );
      }
    } catch (error) {
      console.warn("⚠️ 추가 데이터 로드 실패:", error);
    }
  },

  /**
   * 🆕 API를 통한 데이터 로드 (fallback)
   */
  async loadFromApi(tourId) {
    try {
      const response = await fetch(`/tour/${tourId}/fallback`);
      const result = await response.json();

      console.log("📦 API 응답:", result);

      if (result.success) {
        this.currentTour = result.tour;
        this.currentSpots = result.spots || [];
        this.currentRestaurants = result.restaurants || {};
        this.kakaoMapApiKey = result.kakaoMapApiKey;

        // UI 업데이트
        this.updateTourHeader();
        this.initializeKakaoMap();
        this.renderSpotAccordions();
        this.renderImageGallery();
        this.renderRestaurants();
        this.setupEventListeners();

        // 찜하기 상태 확인
        this.checkWishlistStatus(tourId);
        // 🔥 여행 그룹 상태 확인 추가
        this.checkTravelGroupStatus(tourId);

        this.showSuccess("투어 정보를 불러왔습니다! (API 활용)");
      } else {
        throw new Error(result.message || "API 응답 실패");
      }
    } catch (error) {
      console.error("💥 API fallback 실패:", error);
      throw error;
    }
  },

  /**
   * 🏷️ 투어 헤더 업데이트
   */
  updateTourHeader() {
    if (!this.currentTour) return;

    const titleElement = document.getElementById("tourMainTitle");
    if (titleElement) {
      titleElement.textContent = this.currentTour.title || "투어 상품";
    }

    const metaElement = document.getElementById("tourMetaInfo");
    if (metaElement) {
      // 편의시설 정보 - 점수 제거, 타입만 표시
      const accessibilityInfo = this.currentTour.accessibilityInfo;
      console.log("헤더 업데이트 - 편의시설 정보:", accessibilityInfo);
      if (
        accessibilityInfo?.hasAccessibilityFilter &&
        accessibilityInfo?.selectedNeedsType
      ) {
        const accessibilityBadge =
          document.getElementById("accessibilityBadge");
        if (accessibilityBadge) {
          let icon = "";
          let text = accessibilityInfo.selectedNeedsType;

          if (accessibilityInfo.selectedNeedsType === "주차 편의") {
            icon = "🅿️";
          } else if (accessibilityInfo.selectedNeedsType === "접근 편의") {
            icon = "🛤️";
          } else if (accessibilityInfo.selectedNeedsType === "시설 편의") {
            icon = "🚻";
          }

          accessibilityBadge.innerHTML = `${icon} <strong>${text}</strong>`;
          accessibilityBadge.style.display = "inline-block";
          accessibilityBadge.style.background =
            "linear-gradient(135deg, #2196F3, #1976D2)";
          accessibilityBadge.style.color = "white";
          accessibilityBadge.style.padding = "6px 16px";
          accessibilityBadge.style.borderRadius = "20px";
          accessibilityBadge.style.fontWeight = "600";
        }
      }

      // 지역 정보
      const regionBadge = document.getElementById("regionBadge");
      if (regionBadge) {
        let regionText = `📍 ${this.currentTour.region}`;
        if (
          this.currentTour.sigungu &&
          this.currentTour.sigungu.trim() !== ""
        ) {
          regionText += ` ${this.currentTour.sigungu}`;
        }
        regionBadge.textContent = regionText;
      }

      // 관광지 수
      const spotsCount = document.getElementById("spotsCount");
      if (spotsCount) {
        spotsCount.textContent = `🎯 ${this.currentSpots.length}개 관광지`;
      }
    }

    // 버튼에 tourId 설정
    const wishlistBtn = document.getElementById("wishlistButton");
    if (wishlistBtn) {
      wishlistBtn.setAttribute("data-tour-id", this.currentTour.tourId);
    }

    console.log("✅ 헤더 업데이트 완료:", {
      title: this.currentTour.title,
      region: this.currentTour.region,
      sigungu: this.currentTour.sigungu,
      spots: this.currentSpots.length,
      accessibilityType: this.currentTour.accessibilityInfo?.selectedNeedsType,
      dataSource: "세션/API",
    });
  },

  /**
   * 🗺️ 카카오맵 초기화 (실제 구현 + fallback)
   */
  async initializeKakaoMap() {
    const mapContainer = document.getElementById("tour-kakao-map");
    const mapPlaceholder = document.getElementById("map-placeholder");

    if (!mapContainer) {
      console.warn("⚠️ 지도 컨테이너를 찾을 수 없습니다");
      return;
    }

    // API 키가 있고 관광지가 있는 경우 실제 카카오맵 로드
    if (this.kakaoMapApiKey && this.currentSpots.length > 0) {
      try {
        console.log("🗺️ 카카오맵 초기화 시작...");

        // 카카오맵 SDK 로드
        if (typeof loadKakaoMapSDK === "function") {
          loadKakaoMapSDK(this.kakaoMapApiKey);
        }

        // SDK 로드 대기
        await this.waitForKakaoMap();

        if (window.kakaoMapLoaded && typeof kakao !== "undefined") {
          this.createKakaoMap(mapContainer);
          mapPlaceholder.style.display = "none";
          console.log("✅ 카카오맵 초기화 완료");
        } else {
          throw new Error("카카오맵 SDK 로드 실패");
        }
      } catch (error) {
        console.warn(
          "⚠️ 카카오맵 로드 실패, 플레이스홀더 표시:",
          error.message
        );
        this.showMapPlaceholder(mapContainer, mapPlaceholder);
      }
    } else {
      console.warn(
        "⚠️ 카카오맵 API 키 없음 또는 관광지 없음, 플레이스홀더 표시"
      );
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
        if (window.kakaoMapLoaded && typeof kakao !== "undefined") {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error("카카오맵 SDK 로드 타임아웃"));
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
  // createKakaoMap(container) {
  //   if (!this.currentSpots.length) return;

  //   try {
  //     const firstSpot = this.currentSpots[0];
  //     const centerLat = parseFloat(firstSpot.mapy);
  //     const centerLng = parseFloat(firstSpot.mapx);

  //     if (isNaN(centerLat) || isNaN(centerLng)) {
  //       throw new Error("유효하지 않은 좌표 정보");
  //     }

  //     const mapOption = {
  //       center: new kakao.maps.LatLng(centerLat, centerLng),
  //       level: this.currentSpots.length > 3 ? 9 : 7, // 관광지 수에 때라 줌레벨 조정
  //     };

  //     this.kakaoMap = new kakao.maps.Map(container, mapOption);

  //     // 지도 클릭시 인포윈도우 닫기
  //     kakao.maps.event.addListener(this.kakaoMap, "click", () => {
  //       this.closeInfoWindow();
  //     });

  //     // 관광지별 마커 생성
  //     this.currentSpots.forEach((spot, index) => {
  //       this.createSpotMarker(spot, index + 1);
  //     });

  //     // 투어 경로 라인 그리기
  //     this.createTourPath();

  //     // 지도 영역 자동 조정
  //     this.fitMapBounds();

  //     console.log(
  //       "카카오맵 생성 완료:",
  //       this.currentSpots.length + "개 마커 + 경로 라인"
  //     );
  //   } catch (error) {
  //     console.error("카카오맵 생성 실패:", error);
  //     throw error;
  //   }
  // },
  /**
   * 실제 카카오맵 생성 (수정된 버전)
   */
  createKakaoMap(container) {
    if (!this.currentSpots.length) return;

    try {
      const firstSpot = this.currentSpots[0];
      const centerLat = parseFloat(firstSpot.mapy);
      const centerLng = parseFloat(firstSpot.mapx);

      if (isNaN(centerLat) || isNaN(centerLng)) {
        throw new Error("유효하지 않은 좌표 정보");
      }

      const mapOption = {
        center: new kakao.maps.LatLng(centerLat, centerLng),
        level: this.currentSpots.length > 3 ? 9 : 7,
      };

      this.kakaoMap = new kakao.maps.Map(container, mapOption);

      // 장소 검색 객체 생성
      this.ps = new kakao.maps.services.Places();

      // 지도 클릭시 인포윈도우 닫기
      kakao.maps.event.addListener(this.kakaoMap, "click", () => {
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

      // 의료시설 토글 버튼 추가
      this.addMedicalToggleButton();

      console.log("카카오맵 생성 완료:", this.currentSpots.length + "개 마커 + 경로 라인");
    } catch (error) {
      console.error("카카오맵 생성 실패:", error);
      throw error;
    }
  },

  /**
   * 의료시설 토글 버튼 추가
   */
  addMedicalToggleButton() {
    const mapContainer = document.getElementById('tour-kakao-map');
    if (!mapContainer) return;

    // 기존 버튼이 있으면 제거
    const existingButton = document.getElementById('medicalToggleBtn');
    if (existingButton) {
      existingButton.remove();
    }

    // 토글 버튼 생성
    const toggleBtn = document.createElement('div');
    toggleBtn.id = 'medicalToggleBtn';
    toggleBtn.className = 'medical-toggle-btn';
    toggleBtn.innerHTML = `
      <button onclick="tourDetail.toggleMedicalFacilities()" class="toggle-medical">
        <span class="medical-icon">🏥</span>
        <span class="toggle-text">병원/약국 ${this.showMedical ? 'OFF' : 'ON'}</span>
      </button>
    `;
    
    mapContainer.appendChild(toggleBtn);
  },

  /**
   * 병원/약국 표시 토글
   */
  toggleMedicalFacilities() {
    this.showMedical = !this.showMedical;
    
    const toggleBtn = document.querySelector('.medical-toggle-btn .toggle-text');
    if (toggleBtn) {
      toggleBtn.textContent = `병원/약국 ${this.showMedical ? 'OFF' : 'ON'}`;
    }

    if (this.showMedical) {
      this.searchMedicalFacilities();
    } else {
      this.clearMedicalMarkers();
    }
  },

  /**
   * 병원과 약국 검색
   */
  searchMedicalFacilities() {
    if (!this.ps || !this.kakaoMap) return;

    // 각 관광지 주변 검색
    this.currentSpots.forEach((spot) => {
      const lat = parseFloat(spot.mapy);
      const lng = parseFloat(spot.mapx);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const position = new kakao.maps.LatLng(lat, lng);
        
        // 병원 검색
        this.ps.categorySearch('HP8', (data, status) => {
          if (status === kakao.maps.services.Status.OK) {
            data.forEach(place => {
              this.createMedicalMarker(place, 'hospital');
            });
          }
        }, {
          location: position,
          radius: 2000, // 2km 반경
          size: 5 // 최대 5개
        });

        // 약국 검색
        this.ps.categorySearch('PM9', (data, status) => {
          if (status === kakao.maps.services.Status.OK) {
            data.forEach(place => {
              this.createMedicalMarker(place, 'pharmacy');
            });
          }
        }, {
          location: position,
          radius: 1000, // 1km 반경
          size: 3 // 최대 3개
        });
      }
    });
  },

  /**
   * 의료시설 마커 생성
   */
  createMedicalMarker(place, type) {
    const position = new kakao.maps.LatLng(place.y, place.x);
    
    // 마커 이미지 설정
    const imageSrc = type === 'hospital' 
      ? this.createMedicalMarkerImage('🏥', '#FF6B6B')
      : this.createMedicalMarkerImage('💊', '#4ECDC4');
    const imageSize = new kakao.maps.Size(25, 25);
    const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize);

    const marker = new kakao.maps.Marker({
      position: position,
      image: markerImage,
      title: place.place_name
    });

    marker.setMap(this.kakaoMap);
    this.medicalMarkers.push(marker);

    // 인포윈도우 생성
    const infoWindow = new kakao.maps.InfoWindow({
      content: `
        <div class="medical-infowindow">
          <strong>${place.place_name}</strong>
          <p>${place.road_address_name || place.address_name}</p>
          ${place.phone ? `<p>📞 ${place.phone}</p>` : ''}
          <p class="medical-distance">거리: ${place.distance ? place.distance + 'm' : '정보없음'}</p>
        </div>
      `,
      removable: true
    });

    // 마커 클릭 이벤트
    kakao.maps.event.addListener(marker, 'click', () => {
      if (this.currentInfoWindow) {
        this.currentInfoWindow.close();
      }
      infoWindow.open(this.kakaoMap, marker);
      this.currentInfoWindow = infoWindow;
    });
  },

  /**
   * 의료시설 마커 이미지 생성
   */
  createMedicalMarkerImage(emoji, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 25;
    canvas.height = 25;
    const ctx = canvas.getContext('2d');

    // 원형 배경
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(12.5, 12.5, 12, 0, 2 * Math.PI);
    ctx.fill();

    // 테두리
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 이모지
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 12.5, 12.5);

    return canvas.toDataURL();
  },

  /**
   * 의료시설 마커 제거
   */
  clearMedicalMarkers() {
    this.medicalMarkers.forEach(marker => {
      marker.setMap(null);
    });
    this.medicalMarkers = [];
  },

  /**
   * 관광지 마커 생성
   */
  createSpotMarker(spot, order) {
    const lat = parseFloat(spot.mapy);
    const lng = parseFloat(spot.mapx);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn("유효하지 않은 좌표:", spot.title, lat, lng);
      return;
    }

    const markerPosition = new kakao.maps.LatLng(lat, lng);

    const imageSrc = this.createMarkerImageDataURL(order);
    const imageSize = new kakao.maps.Size(30, 30);
    const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize);

    const marker = new kakao.maps.Marker({
      position: markerPosition,
      image: markerImage,
      title: `${order}. ${spot.title}`,
    });

    marker.setMap(this.kakaoMap);

    // 인포윈도우 생성
    const infoWindow = new kakao.maps.InfoWindow({
      content: this.createInfoWindowContent(spot, order),
      removable: false,
    });

    // 마커 클릭 이벤트
    kakao.maps.event.addListener(marker, "click", () => {
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
    const canvas = document.createElement("canvas");
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext("2d");

    // 원형 배경
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.arc(15, 15, 14, 0, 2 * Math.PI);
    ctx.fill();

    // 테두리
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 숫자 텍스트
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
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
        `; // ${spot.hasBarrierFreeInfo ? `<div class="kakao-infowindow-accessibility">♿ 편의시설  ${spot.hasBarrierFreeInfo}와  ${spot.accessibilityScore}점</div>` :  ''}*/
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
      console.warn("유효한 좌표가 2개 미만이라 경로를 그릴 수 없습니다");
      return;
    }

    // Polyline 생성
    const polyline = new kakao.maps.Polyline({
      path: pathCoords,
      strokeWeight: 3,
      strokeColor: "#FF6B35",
      strokeOpacity: 0.7,
      strokeStyle: "solid",
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

    console.log(
      "투어 경로 라인 생성 완료:",
      pathCoords.length + "개 지점 연결"
    );
  },

  /**
   * 지도 영역 자동 조정
   */
  fitMapBounds() {
    if (!this.kakaoMap || !this.currentSpots.length) return;

    const bounds = new kakao.maps.LatLngBounds();

    this.currentSpots.forEach((spot) => {
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
      mapContainer.style.display = "none";
    }

    if (placeholderElement) {
      placeholderElement.style.display = "flex";
    } else {
      // 플레이스홀더가 없으면 동적 생성
      const placeholder = document.createElement("div");
      placeholder.className = "map-placeholder";
      placeholder.style.display = "flex";
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
      spotElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  },

  /**
   * 📋 관광지별 상세정보를 아코디언 형태로 렌더링 (기존 renderTourSpots 대체)
   */
  renderSpotAccordions() {
    const container = document.getElementById("tourSpotsList");
    if (!container || !this.currentSpots.length) {
      if (container) {
        container.innerHTML = "<p>관광지 정보가 없습니다.</p>";
      }
      return;
    }

    let html = '<div class="spot-accordions">';

    // 선택한 편의시설 타입 가져오기
    const selectedNeeds =
      this.currentTour?.accessibilityInfo?.selectedNeedsType;

    this.currentSpots.forEach((spot, index) => {
      const order = index + 1;
      const imageUrl = spot.optimizedImage || "/uploads/tour/no-image.png";
      const isFirst = index === 0;

      // 편의시설 정보 HTML 생성
      const accessibilityHtml = this.createAccessibilityInfoHtml(
        spot,
        selectedNeeds
      );

      html += `
                <div class="spot-accordion ${
                  isFirst ? "active" : ""
                }" data-spot-order="${order}">
                    <div class="accordion-header" onclick="tourDetail.toggleAccordion(${order})">
                        <div class="spot-number">${order}</div>
                        <div class="spot-header-content">
                            <img src="${imageUrl}" alt="${
        spot.title
      }" class="spot-thumb" 
                                onerror="this.src='/uploads/tour/no-image.png'">
                            <div class="spot-header-info">
                                <h3 class="spot-title">${spot.title}</h3>
                                <p class="spot-address">📍 ${spot.addr1}</p>
                                ${accessibilityHtml}
                            </div>
                        </div>
                        <div class="accordion-toggle">
                            <span class="toggle-icon">${
                              isFirst ? "▼" : "▶"
                            }</span>
                            <span class="toggle-text">${
                              isFirst ? "접기" : "상세보기"
                            }</span>
                        </div>
                    </div>
                    
                    <div class="accordion-content" ${
                      isFirst
                        ? 'style="display: block;"'
                        : 'style="display: none;"'
                    }>
                        <div class="accordion-body" id="accordion-body-${order}">
                            ${isFirst ? this.generateLoadingContent() : ""}
                        </div>
                    </div>
                </div>
            `;
    });

    html += "</div>";
    container.innerHTML = html;

    if (this.currentSpots.length > 0) {
      this.loadSpotDetail(this.currentSpots[0].contentid, 1);
    }
  },
  /**
   * 편의시설 정보 HTML 생성 (계층적 표시)
   */
  createAccessibilityInfoHtml(spot, selectedNeeds) {
    if (!spot.barrierFreeInfo || !selectedNeeds) {
      return "";
    }

    try {
      const info = JSON.parse(spot.barrierFreeInfo);
      const primaryFacilities = [];
      const secondaryFacilities = [];

      // 편의시설 타입별 아이콘 매핑
      const facilityIcons = {
        parking: "🅿️",
        publictransport: "🚌",
        route: "🛤️",
        exit: "🚪",
        restroom: "🚻",
        elevator: "🛗",
      };

      // 편의시설 타입별 텍스트 매핑
      const facilityTexts = {
        parking: "주차장",
        publictransport: "대중교통 접근 가능",
        route: "경사로",
        exit: "출입통로 접근성",
        restroom: "화장실",
        elevator: "엘리베이터",
      };

      // 선택한 편의시설 타입에 따라 주요/기타 분류
      if (selectedNeeds === "주차 편의") {
        // 주차 편의 관련 시설을 주요로
        if (info.parking && info.parking !== "" && info.parking !== "없음") {
          primaryFacilities.push({
            icon: facilityIcons.parking,
            text: facilityTexts.parking,
          });
        }
        if (
          info.publictransport &&
          info.publictransport !== "" &&
          info.publictransport !== "없음"
        ) {
          primaryFacilities.push({
            icon: facilityIcons.publictransport,
            text: facilityTexts.publictransport,
          });
        }

        // 나머지는 기타로
        if (info.route && info.route !== "" && info.route !== "없음") {
          secondaryFacilities.push(facilityTexts.route);
        }
        if (info.exit && info.exit !== "" && info.exit !== "없음") {
          secondaryFacilities.push(facilityTexts.exit);
        }
        if (info.restroom && info.restroom !== "" && info.restroom !== "없음") {
          secondaryFacilities.push(facilityTexts.restroom);
        }
        if (info.elevator && info.elevator !== "" && info.elevator !== "없음") {
          secondaryFacilities.push(facilityTexts.elevator);
        }
      } else if (selectedNeeds === "접근 편의") {
        // 접근 편의 관련 시설을 주요로
        if (info.route && info.route !== "" && info.route !== "없음") {
          primaryFacilities.push({
            icon: facilityIcons.route,
            text: facilityTexts.route,
          });
        }
        if (info.exit && info.exit !== "" && info.exit !== "없음") {
          primaryFacilities.push({
            icon: facilityIcons.exit,
            text: facilityTexts.exit,
          });
        }

        // 나머지는 기타로
        if (info.parking && info.parking !== "" && info.parking !== "없음") {
          secondaryFacilities.push(facilityTexts.parking);
        }
        if (
          info.publictransport &&
          info.publictransport !== "" &&
          info.publictransport !== "없음"
        ) {
          secondaryFacilities.push(facilityTexts.publictransport);
        }
        if (info.restroom && info.restroom !== "" && info.restroom !== "없음") {
          secondaryFacilities.push(facilityTexts.restroom);
        }
        if (info.elevator && info.elevator !== "" && info.elevator !== "없음") {
          secondaryFacilities.push(facilityTexts.elevator);
        }
      } else if (selectedNeeds === "시설 편의") {
        // 시설 편의 관련 시설을 주요로
        if (info.restroom && info.restroom !== "" && info.restroom !== "없음") {
          primaryFacilities.push({
            icon: facilityIcons.restroom,
            text: facilityTexts.restroom,
          });
        }
        if (info.elevator && info.elevator !== "" && info.elevator !== "없음") {
          primaryFacilities.push({
            icon: facilityIcons.elevator,
            text: facilityTexts.elevator,
          });
        }

        // 나머지는 기타로
        if (info.parking && info.parking !== "" && info.parking !== "없음") {
          secondaryFacilities.push(facilityTexts.parking);
        }
        if (
          info.publictransport &&
          info.publictransport !== "" &&
          info.publictransport !== "없음"
        ) {
          secondaryFacilities.push(facilityTexts.publictransport);
        }
        if (info.route && info.route !== "" && info.route !== "없음") {
          secondaryFacilities.push(facilityTexts.route);
        }
        if (info.exit && info.exit !== "" && info.exit !== "없음") {
          secondaryFacilities.push(facilityTexts.exit);
        }
      }

      // HTML 생성
      let html = '<div class="spot-accessibility-info">';

      // 주요 편의시설이 있는 경우
      if (primaryFacilities.length > 0) {
        html += `
                    <div class="primary-facilities">
                        <span class="primary-facilities-label">선택하신 편의시설</span>
                        <div class="primary-facilities-items">
                `;

        primaryFacilities.forEach((facility) => {
          html += `
                        <span class="facility-item">
                            <span class="facility-icon">${facility.icon}</span>${facility.text}
                        </span>
                    `;
        });

        html += `
                        </div>
                    </div>
                `;
      } else {
        // 주요 편의시설이 없는 경우
        html += `
                    <div class="no-primary-facilities">
                        <span class="warning-icon">⚠️</span>
                        ${this.getNoFacilityMessage(selectedNeeds)}
                    </div>
                `;
      }

      // 기타 편의시설이 있는 경우
      if (secondaryFacilities.length > 0) {
        html += `
                    <div class="secondary-facilities">
                        <span class="secondary-facilities-label">기타:</span>
                        <span class="secondary-facilities-items">${secondaryFacilities.join(
                          ", "
                        )}</span>
                    </div>
                `;
      }

      html += "</div>";

      return html;
    } catch (e) {
      console.error("편의시설 정보 파싱 실패:", e);
      return "";
    }
  },
  /**
   * 편의시설 없음 메시지 생성
   */
  getNoFacilityMessage(selectedNeeds) {
    const messages = {
      "주차 편의": "주차시설 정보가 없습니다. 대중교통 이용을 권장합니다.",
      "접근 편의": "접근 편의시설 정보가 없습니다. 사전 확인을 권장합니다.",
      "시설 편의": "시설 편의정보가 없습니다. 사전 확인을 권장합니다.",
    };
    return messages[selectedNeeds] || "편의시설 정보가 없습니다.";
  },
  /**
   * 🔄 아코디언 토글 함수 (디버깅 강화)
   */
  toggleAccordion(order) {
    console.log(`toggleAccordion 호출됨: order=${order}`);

    try {
      const accordion = document.querySelector(`[data-spot-order="${order}"]`);
      if (!accordion) {
        console.error(`아코디언 요소를 찾을 수 없음: order=${order}`);
        return;
      }

      const content = accordion.querySelector(".accordion-content");
      const icon = accordion.querySelector(".toggle-icon");
      const text = accordion.querySelector(".toggle-text");
      const body = document.getElementById(`accordion-body-${order}`);

      if (!content || !icon || !text || !body) {
        console.error(`아코디언 하위 요소를 찾을 수 없음: order=${order}`);
        return;
      }

      const isActive = accordion.classList.contains("active");
      console.log(`아코디언 ${order} 현재 상태: ${isActive ? "열림" : "닫힘"}`);

      if (isActive) {
        // 닫기
        accordion.classList.remove("active");
        content.style.display = "none";
        icon.textContent = "▶";
        text.textContent = "상세보기";
        console.log(`아코디언 ${order} 닫힘`);
      } else {
        // 열기
        accordion.classList.add("active");
        content.style.display = "block";
        icon.textContent = "▼";
        text.textContent = "접기";
        console.log(`아코디언 ${order} 열림`);

        // 무조건 상세정보 로드 시도 (첫 번째가 아닌 경우)
        // 새 코드 (교체)
        const needsLoad =
          !body.dataset.loaded ||
          !body.textContent.trim() ||
          !body.querySelector(".spot-detail-grid");

        if (needsLoad) {
          console.log(`아코디언 ${order} 상세정보 로드 필요`);
          const spot = this.currentSpots.find((s) => s.order === order);
          if (spot) {
            console.log(
              `API 호출 준비: contentId=${spot.contentid}, order=${order}`
            );
            this.loadSpotDetail(spot.contentid, order);
          }
        } else {
          console.log(`아코디언 ${order} 이미 로드된 상세정보 표시`);
        }
      }

      // 부드러운 스크롤
      setTimeout(() => {
        accordion.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    } catch (error) {
      console.error(`toggleAccordion 오류: order=${order}`, error);
    }
  },
  /**
   * 📡 관광지 상세정보 AJAX 로드
   */
  async loadSpotDetail(contentId, order) {
    // 중복/동시 호출 방지
    this._inflight ??= new Set();
    this._loaded ??= new Set();
    if (this._loaded.has(contentId) || this._inflight.has(contentId)) {
      console.log(
        `⏭️ ${order}번째 관광지 이미 로드됨 또는 로딩중: ${contentId}`
      );
      return;
    }
    this._inflight.add(contentId);

    const bodyElement = document.getElementById(`accordion-body-${order}`);
    if (!bodyElement) {
      this._inflight.delete(contentId);
      return;
    }

    try {
      bodyElement.innerHTML = this.generateLoadingContent();

      const response = await fetch(`/tour-detail/spot-detail/${contentId}`);
      const result = await response.json();

      if (result.success) {
        const spotData = result.data;
        const isFallback = result.fallback === true;

        bodyElement.innerHTML = this.generateSpotDetailContent(
          spotData,
          isFallback
        );
        bodyElement.dataset.loaded = "1"; // ✅ 로드 완료 마킹

        console.log(`✅ ${order}번째 관광지 상세정보 로드 완료: ${contentId}`);
      } else {
        // 세션 데이터 fallback
        const sessionSpot = this.currentSpots.find(
          (s) => s.contentid === contentId
        );
        if (sessionSpot) {
          bodyElement.innerHTML = this.generateSessionBasedContent(sessionSpot);
          bodyElement.dataset.loaded = "1"; // fallback도 로드 완료로 마킹
        }
      }
    } catch (error) {
      console.error(`💥 ${order}번째 관광지 로드 오류: ${contentId}`, error);
      // 에러 시에도 세션 데이터 표시
      const sessionSpot = this.currentSpots.find(
        (s) => s.contentid === contentId
      );
      if (sessionSpot) {
        bodyElement.innerHTML = this.generateSessionBasedContent(sessionSpot);
        bodyElement.dataset.loaded = "1";
      }
    } finally {
      this._inflight.delete(contentId);
      this._loaded.add(contentId);
    }
  },

  /**
   * 🎨 상세정보 HTML 생성
   */
  generateSpotDetailContent(data, isFallback = false) {
    const isSessionBased = isFallback || data.sessionBased;

    // 편의시설 상세 정보 파싱
    let barrierFreeDetailHtml = "";
    if (data.barrierFreeInfo) {
      try {
        const info =
          typeof data.barrierFreeInfo === "string"
            ? JSON.parse(data.barrierFreeInfo)
            : data.barrierFreeInfo;

        const details = [];

        if (info.parking && info.parking !== "" && info.parking !== "없음") {
          details.push(`<p><strong>주차장:</strong> ${info.parking}</p>`);
        }
        if (
          info.publictransport &&
          info.publictransport !== "" &&
          info.publictransport !== "없음"
        ) {
          details.push(
            `<p><strong>대중교통:</strong> ${info.publictransport}</p>`
          );
        }
        if (info.route && info.route !== "" && info.route !== "없음") {
          details.push(`<p><strong>경사로:</strong> ${info.route}</p>`);
        }
        if (info.exit && info.exit !== "" && info.exit !== "없음") {
          details.push(`<p><strong>출입통로:</strong> ${info.exit}</p>`);
        }
        if (info.restroom && info.restroom !== "" && info.restroom !== "없음") {
          details.push(`<p><strong>화장실:</strong> ${info.restroom}</p>`);
        }
        if (info.elevator && info.elevator !== "" && info.elevator !== "없음") {
          details.push(`<p><strong>엘리베이터:</strong> ${info.elevator}</p>`);
        }

        if (details.length > 0) {
          barrierFreeDetailHtml = `
                        <div class="detail-section">
                            <h4 class="detail-title">♿ 편의시설 정보</h4>
                            <div class="detail-content">
                                ${details.join("")}
                            </div>
                        </div>
                    `;
        }
      } catch (e) {
        console.error("편의시설 상세 정보 파싱 실패:", e);
      }
    }

    return `
            <div class="spot-detail-grid ${
              isSessionBased ? "session-based" : ""
            }">
                <div class="detail-section">
                    <h4 class="detail-title">📋 기본정보</h4>
                    <div class="detail-content">
                        ${
                          data.title
                            ? `<p><strong>명칭:</strong> ${data.title}</p>`
                            : ""
                        }
                        ${
                          data.addr1
                            ? `<p><strong>주소:</strong> ${data.addr1}</p>`
                            : ""
                        }
                        ${
                          data.tel
                            ? `<p><strong>전화:</strong> <a href="tel:${data.tel}">${data.tel}</a></p>`
                            : ""
                        }
                        ${
                          data.homepage
                            ? `<p><strong>홈페이지:</strong> <a href="${data.homepage}" target="_blank" rel="noopener">바로가기 🔗</a></p>`
                            : ""
                        }
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4 class="detail-title">🕐 이용정보</h4>
                    <div class="detail-content">
                        ${
                          data.usetime
                            ? `<p><strong>이용시간:</strong> ${data.usetime}</p>`
                            : "<p><strong>이용시간:</strong> 정보 없음</p>"
                        }
                        ${
                          data.restdate
                            ? `<p><strong>휴무일:</strong> ${data.restdate}</p>`
                            : "<p><strong>휴무일:</strong> 정보 없음</p>"
                        }
                        ${
                          data.parking
                            ? `<p><strong>주차:</strong> ${data.parking}</p>`
                            : "<p><strong>주차:</strong> 정보 없음</p>"
                        }
                        ${
                          data.admission
                            ? `<p><strong>입장료:</strong> ${data.admission}</p>`
                            : "<p><strong>입장료:</strong> 정보 없음</p>"
                        }
                    </div>
                </div>
                
                ${barrierFreeDetailHtml}
                
                ${
                  data.overview
                    ? `
                    <div class="detail-section overview-section">
                        <h4 class="detail-title">📖 상세설명</h4>
                        <div class="detail-content">
                            <p class="overview-text">${data.overview}</p>
                        </div>
                    </div>
                `
                    : ""
                }
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
   * ✅ 최종 JS (옵션 A + 키보드 화살표 이동)
   * - 높이 계산 없음(aspect-ratio로 해결)
   * - 좌우 화살표 키(←/→)로 한 칸씩 이동
   */

  renderImageGallery() {
    const carousel = document.getElementById("tourImageCarousel");
    const indicators = document.getElementById("carouselIndicators");
    const section = document.getElementById("tourGallerySection");
    if (!carousel || !indicators) return;

    // 유효 이미지 수집
    const items = (this.currentSpots || [])
      .map((spot) => {
        const src = spot?.optimizedImage || spot?.firstimage || "";
        const ok = src && src.trim() !== "" && !src.includes("no-image");
        return ok ? { src, title: spot?.title || "투어 이미지" } : null;
      })
      .filter(Boolean);

    this.totalImages = items.length;

    if (this.totalImages === 0) {
      if (section) section.style.display = "none";
      return;
    } else if (section) {
      section.style.display = "";
    }

    // 슬라이드 마크업
    let carouselHtml = "";
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
    let indicatorsHtml = "";
    for (let i = 0; i < this.totalImages; i++) {
      indicatorsHtml += `
        <div class="indicator ${i === 0 ? "active" : ""}"
            onclick="tourDetail.goToSlide(${i})"></div>
        `;
    }
    indicators.innerHTML = indicatorsHtml;

    // 초기 위치
    this.currentImageIndex = 0;
    const slides = carousel.querySelectorAll(".carousel-slide");
    slides.forEach((slide, i) => {
      slide.style.transform = `translateX(${i * 100}%)`;
    });

    // 한 장만 있으면 컨트롤/인디케이터 숨김
    const controls = document.querySelector(".carousel-controls");
    if (this.totalImages <= 1) {
      if (controls) controls.style.display = "none";
      indicators.style.display = "none";
    } else {
      if (controls) controls.style.display = "";
      indicators.style.display = "";
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

    const slides = document.querySelectorAll(
      "#tourImageCarousel .carousel-slide"
    );
    slides.forEach((slide, i) => {
      slide.style.transform = `translateX(${(i - index) * 100}%)`;
    });

    document
      .querySelectorAll("#carouselIndicators .indicator")
      .forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
      });
  },

  /** 이전/다음 */
  prevSlide() {
    if (this.totalImages <= 1) return;
    const newIndex =
      this.currentImageIndex > 0
        ? this.currentImageIndex - 1
        : this.totalImages - 1;
    this.goToSlide(newIndex);
  },

  nextSlide() {
    if (this.totalImages <= 1) return;
    const newIndex =
      this.currentImageIndex < this.totalImages - 1
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
    const carousel = document.getElementById("tourImageCarousel");
    if (carousel && !carousel.hasAttribute("tabindex")) {
      carousel.setAttribute("tabindex", "0");
    }

    window.addEventListener("keydown", (e) => {
      // 입력 필드/에디터에선 무시
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toLowerCase() : "";
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (t && t.isContentEditable)
      )
        return;
      if (this.totalImages <= 1) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.nextSlide();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        this.prevSlide();
      }
    });
  },

  /**
   * 이미지 전체화면 표시 (placeholder)
   */
  showFullImage(imageUrl, title) {
    const modal = document.getElementById("imageFullscreenModal");
    const image = document.getElementById("fullscreenImage");
    const titleElement = document.getElementById("fullscreenTitle");

    if (modal && image && titleElement) {
      image.src = imageUrl;
      image.alt = title;
      titleElement.textContent = title;

      modal.classList.add("active");
      document.body.style.overflow = "hidden"; // 스크롤 방지

      console.log("이미지 전체화면 표시:", title);
    }
  },
  /**
   * 이미지 전체화면 닫기
   */
  closeFullImage() {
    const modal = document.getElementById("imageFullscreenModal");

    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = ""; // 스크롤 복원

      console.log("이미지 전체화면 닫기");
    }
  },

  /**
   * 🍽️ 맛집 정보 렌더링 (카테고리별)
   */
  renderRestaurants() {
    const container = document.getElementById("restaurantsByCategory");
    if (!container) return;

    // 관광지별로 맛집 재구성
    const restaurantsBySpot = this.groupRestaurantsBySpot();

    if (Object.keys(restaurantsBySpot).length === 0) {
      container.innerHTML = `
                <div class="empty-category">
                    <p>해당 지역의 맛집 정보를 준비 중입니다.</p>
                </div>
            `;
      return;
    }

    let html = "";

    // 각 관광지별로 섹션 생성
    Object.entries(restaurantsBySpot).forEach(([spotInfo, categories]) => {
      const [spotNumber, spotTitle] = spotInfo.split("|");

      html += `
                <div class="spot-restaurants-section">
                    <div class="spot-restaurant-header">
                        <div class="spot-number-badge">${spotNumber}</div>
                        <h3 class="spot-restaurant-title">${spotTitle} 주변 맛집</h3>
                    </div>
                    
                    <div class="restaurant-categories-grid">
            `;

      // 카테고리별로 맛집 표시
      ["한식", "서양식", "일식", "중식", "이색음식점", "카페/전통찻집"].forEach(
        (category) => {
          const restaurants = categories[category] || [];

          html += `
                    <div class="category-card">
                        <div class="category-card-header">
                            <span class="category-icon">${this.getCategoryIcon(
                              category
                            )}</span>
                            <span class="category-name">${category}</span>
                            <span class="category-count">${
                              restaurants.length
                            }</span>
                        </div>
                        <div class="category-card-body">
                `;

          if (restaurants.length > 0) {
            restaurants.forEach((restaurant) => {
              html += `
                            <div class="restaurant-compact-item">
                                <div class="restaurant-name">${
                                  restaurant.title
                                }</div>
                                <div class="restaurant-address">${
                                  restaurant.addr1
                                }</div>
                                ${
                                  restaurant.tel
                                    ? `<div class="restaurant-tel">📞 ${restaurant.tel}</div>`
                                    : ""
                                }
                            </div>
                        `;
            });
          } else {
            html += `<div class="no-restaurant">정보 없음</div>`;
          }

          html += `
                        </div>
                    </div>
                `;
        }
      );

      html += `
                    </div>
                </div>
            `;
    });

    container.innerHTML = html;

    const totalRestaurants = Object.values(this.currentRestaurants).reduce(
      (total, restaurants) => total + restaurants.length,
      0
    );
    console.log("✅ 맛집 정보 렌더링 완료:", totalRestaurants + "개 맛집");
  },
  /**
   * 맛집을 관광지별로 재그룹화
   */
  groupRestaurantsBySpot() {
    const spotGroups = {};

    // 각 관광지에 대해 처리
    this.currentSpots.forEach((spot, index) => {
      const spotKey = `${index + 1}번|${spot.title}`;
      spotGroups[spotKey] = {
        한식: [],
        서양식: [],
        일식: [],
        중식: [],
        이색음식점: [],
        "카페/전통찻집": [],
      };
    });

    // 맛집을 nearSpot 정보를 기준으로 분류
    Object.entries(this.currentRestaurants).forEach(
      ([category, restaurants]) => {
        restaurants.forEach((restaurant) => {
          // nearSpot 처리 - 문자열로 변환하고 숫자 추출
          if (
            restaurant.nearSpot !== undefined &&
            restaurant.nearSpot !== null
          ) {
            let nearSpotStr = String(restaurant.nearSpot);

            // "3번 관광지명" 또는 "3" 또는 3 형태 모두 처리
            let spotNumber = null;

            // 숫자만 있는 경우
            if (/^\d+$/.test(nearSpotStr)) {
              spotNumber = parseInt(nearSpotStr);
            }
            // "X번" 형태에서 숫자 추출
            else {
              const match = nearSpotStr.match(/(\d+)/);
              if (match) {
                spotNumber = parseInt(match[1]);
              }
            }

            // 유효한 관광지 번호면 해당 그룹에 추가
            if (
              spotNumber &&
              spotNumber > 0 &&
              spotNumber <= this.currentSpots.length
            ) {
              const spot = this.currentSpots[spotNumber - 1];
              const spotKey = `${spotNumber}번|${spot.title}`;

              if (spotGroups[spotKey] && spotGroups[spotKey][category]) {
                spotGroups[spotKey][category].push(restaurant);
              }
            }
          }
        });
      }
    );

    // 맛집이 없는 관광지는 제외 (선택사항)
    const filteredGroups = {};
    Object.entries(spotGroups).forEach(([key, categories]) => {
      const hasRestaurants = Object.values(categories).some(
        (arr) => arr.length > 0
      );
      if (hasRestaurants) {
        filteredGroups[key] = categories;
      }
    });

    console.log(
      "✅ 관광지별 맛집 그룹화 완료:",
      Object.keys(filteredGroups).length + "개 관광지"
    );

    return filteredGroups;
  },
  /**
   * 카테고리별 아이콘 반환
   */
  getCategoryIcon(category) {
    const icons = {
      한식: "🍚",
      서양식: "🍝",
      일식: "🍣",
      중식: "🥟",
      이색음식점: "🍴",
      "카페/전통찻집": "☕",
    };
    return icons[category] || "🍽️";
  },

  /**
   * 지역별 여행 꿀정보 로드
   */
  async loadRegionTips() {
      const tipsSection = document.getElementById('tourTipsSection');
      if (!tipsSection || !this.currentTour) return;
      
      try {
          // 현재 투어의 지역 코드 가져오기
          const areaCode = this.currentTour.areaCode || '1';
          
          const response = await fetch(`/tour-detail/region-tips/${areaCode}`);
          const result = await response.json();
          
          if (result.success && result.hasData && result.data) {
              // 데이터가 있을 때
              this.renderRegionTips(result.data);
          } else {
              // 데이터가 없을 때 - 준비 중 표시
              this.renderPreparingTips(result.regionName || this.currentTour.region);
          }
      } catch (error) {
          console.error('지역 팁 로드 실패:', error);
          this.renderPreparingTips(this.currentTour.region);
      }
  },

  /**
   * 준비 중 표시
   */
  renderPreparingTips(regionName) {
      const tipsSection = document.getElementById('tourTipsSection');
      if (!tipsSection) return;
      
      const html = `
          <h2 class="section-title">💡 여행 꿀정보</h2>
          <div class="tips-placeholder preparing">
              <div class="placeholder-icon">🚧</div>
              <h3>${regionName} 지역 특색 정보 준비 중</h3>
              <p>더 나은 여행 정보를 제공하기 위해 준비하고 있습니다.</p>
              <p class="coming-soon">곧 업데이트 예정입니다!</p>
          </div>
      `;
      
      tipsSection.innerHTML = html;
  },

  /**
   * 지역 특색 정보 렌더링 (데이터가 있을 때)
   */
  renderRegionTips(tipData) {
      const tipsSection = document.getElementById('tourTipsSection');
      if (!tipsSection) return;
      
      let html = `
          <h2 class="section-title">💡 ${tipData.region} 여행 꿀정보</h2>
          <div class="tips-content">
              <div class="region-special-tour">
                  <div class="special-tour-header">
                      <span class="special-icon">🎯</span>
                      <h3>${tipData.title || '지역 특색 체험'}</h3>
                  </div>
                  <p class="special-description">${tipData.description || ''}</p>
                  ${tipData.url ? `
                      <a href="${tipData.url}" target="_blank" class="special-link">
                          자세히 보기 →
                      </a>
                  ` : ''}
              </div>
          </div>
      `;
      
      tipsSection.innerHTML = html;
  },


  /**
   * ❤️ 찜하기 기능 (AJAX)
   */
  async toggleWishlist() {
    if (!this.currentTour?.tourId) {
      this.showToast("투어 정보를 확인할 수 없습니다", "error");
      return;
    }

    // 로그인 상태 확인 (간단한 방법)
    try {
      const checkResponse = await fetch("/api/wishlist/check");
      if (checkResponse.status === 401) {
        this.showToast("로그인이 필요합니다", "warning");
        window.location.href = "/login";
        return;
      }
    } catch (error) {
      console.warn("로그인 상태 확인 실패:", error);
    }

    const button = document.getElementById("wishlistButton");
    if (button) {
      button.classList.add("button-loading");
    }

    try {
      const url = this.isWishlisted
        ? `/api/wishlist/remove/${this.currentTour.tourId}`
        : "/api/wishlist/add";

      const method = this.isWishlisted ? "DELETE" : "POST";
      const body = this.isWishlisted
        ? null
        : JSON.stringify({
            tourId: this.currentTour.tourId,
          });

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body,
      });

      const result = await response.json();

      if (result.success) {
        this.isWishlisted = !this.isWishlisted;
        this.updateWishlistButton();

        const message = this.isWishlisted
          ? "찜 목록에 추가되었습니다!"
          : "찜 목록에서 제거되었습니다.";
        this.showToast(message, "success");
      } else {
        throw new Error(result.message || "찜하기 처리 실패");
      }
    } catch (error) {
      console.error("💥 찜하기 실패:", error);
      this.showToast("찜하기 처리 중 오류가 발생했습니다", "error");
    } finally {
      if (button) {
        button.classList.remove("button-loading");
      }
    }
  },

  /**
   * 찜하기 상태 확인
   */
  async checkWishlistStatus(tourId) {
    try {
      const response = await fetch(`/api/wishlist/check/${tourId}`);

      // HTML 응답인지 확인 (로그인 페이지 리다이렉트 등)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("찜하기 상태 확인 - 비로그인 상태 또는 리다이렉트");
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
        console.warn("찜하기 상태 확인 - 인증 필요");
        this.isWishlisted = false;
        this.updateWishlistButton();
      }
    } catch (error) {
      console.warn("찜하기 상태 확인 실패:", error.message);
      this.isWishlisted = false;
      this.updateWishlistButton();
    }
  },

  /**
   * 찜하기 버튼 UI 업데이트
   */
  updateWishlistButton() {
    const button = document.getElementById("wishlistButton");
    const mobileButton = document.querySelector(".mobile-wishlist-btn");

    const updateButton = (btn) => {
      if (!btn) return;

      const icon = btn.querySelector(".heart-icon");
      const text =
        btn.querySelector(".wishlist-text") || btn.querySelector("span");

      if (this.isWishlisted) {
        btn.classList.add("active");
        if (icon) icon.textContent = "💖";
        if (text) text.textContent = "찜함";
      } else {
        btn.classList.remove("active");
        if (icon) icon.textContent = "❤️";
        if (text) text.textContent = "찜하기";
      }
    };

    updateButton(button);
    updateButton(mobileButton);
  },

  /**
   * 여행 그룹 상태 확인 및 버튼 표시 제어
   */
  async checkTravelGroupStatus(tourId) {
    try {
      const response = await fetch(`/tour-detail/${tourId}/group-status`);
      const result = await response.json();

      console.log("🔍 여행 그룹 상태:", result);

      if (result.success) {
        // 그룹 정보 저장
        this.currentTravelGroups = result.groups || [];
        this.hasAvailableGroup = result.canJoinGroup;

        // 버튼 표시/숨김 처리
        const joinBtn = document.getElementById("travelJoinButton");
        const mobileJoinBtn = document.querySelector(".mobile-join-btn");

        if (result.hasGroup && result.groups.length > 0) {
          // 그룹이 있으면 여행참여 버튼 표시
          if (joinBtn) {
            joinBtn.style.display = "inline-flex";
            joinBtn.disabled = false; // 활성화

            // 버튼 텍스트 업데이트
            const joinText = joinBtn.querySelector(".join-text");
            if (joinText) {
              if (result.canJoinGroup) {
                joinText.textContent = `여행참여 (${result.availableGroups}개 모집중)`;
              } else {
                joinText.textContent = "여행참여 (모집마감)";
              }
            }
          }

          if (mobileJoinBtn) {
            mobileJoinBtn.style.display = "flex";
            mobileJoinBtn.disabled = false;
          }
        } else {
          // 그룹이 없으면 여행참여 버튼 숨김
          if (joinBtn) {
            joinBtn.style.display = "none";
          }
          if (mobileJoinBtn) {
            mobileJoinBtn.style.display = "none";
          }
        }

        return result;
      }
    } catch (error) {
      console.error("💥 여행 그룹 상태 확인 실패:", error);
      // 오류 시 여행참여 버튼 숨김
      const joinBtn = document.getElementById("travelJoinButton");
      const mobileJoinBtn = document.querySelector(".mobile-join-btn");
      if (joinBtn) joinBtn.style.display = "none";
      if (mobileJoinBtn) mobileJoinBtn.style.display = "none";
    }
  },

  /**
   * ✈️ 여행만들기 - 여행 그룹 생성 관련 메서드
   */
  /**
   * 출생연도 옵션 초기화 (액티브 시니어 대상: 1925-1975년생)
   */
  initializeBirthYearOptions() {
    const currentYear = new Date().getFullYear();
    const birthYearStart = document.getElementById("birthYearStart");
    const birthYearEnd = document.getElementById("birthYearEnd");

    // 출생연도 목록 생성 (5년 단위)
    const birthYears = [];
    for (let year = 1975; year >= 1925; year -= 5) {
      const age = currentYear - year;
      birthYears.push({
        year: year,
        age: age,
        label: `${year}년생 (만 ${age}세)`,
      });
    }

    // 시작 연도 셀렉트박스 채우기
    birthYearStart.innerHTML = '<option value="">출생연도 선택 (부터)</option>';
    birthYears.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.year;
      option.textContent = item.label;
      birthYearStart.appendChild(option);
    });

    // 종료 연도 셀렉트박스 채우기
    birthYearEnd.innerHTML = '<option value="">출생연도 선택 (까지)</option>';
    birthYears.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.year;
      option.textContent = item.label;
      birthYearEnd.appendChild(option);
    });
  },

  /**
   * 여행만들기 모달 열기
   */
  openTravelModal() {
    const modal = document.getElementById("travelCreateModal");
    const titleElement = document.getElementById("travelGroupTitle");

    // 현재 투어 제목 설정
    if (this.currentTour && this.currentTour.title) {
      titleElement.textContent = `[${this.currentTour.title}] 여행 모임 만들기`;
    }

    // 출생연도 옵션 초기화
    this.initializeBirthYearOptions();

    // 오늘 날짜를 최소값으로 설정 (과거 날짜 선택 방지)
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("startDate").min = today;
    document.getElementById("endDate").min = today;
    document.getElementById("recruitDeadline").min = today;

    // 연령 제한 체크박스 이벤트 핸들러
    const noAgeLimitCheckbox = document.getElementById("noAgeLimit");
    noAgeLimitCheckbox.removeEventListener("change", this.handleNoAgeLimit); // 중복 방지
    noAgeLimitCheckbox.addEventListener("change", this.handleNoAgeLimit);

    // 모달 표시
    modal.style.display = "block";

    // 에러 메시지 초기화
    document.querySelectorAll(".error-msg").forEach((msg) => {
      msg.style.display = "none";
    });
  },

  /**
   * 연령 제한 체크박스 핸들러
   */
  handleNoAgeLimit(e) {
    const birthYearStart = document.getElementById("birthYearStart");
    const birthYearEnd = document.getElementById("birthYearEnd");

    if (e.target.checked) {
      // 연령 제한 없음 체크시
      birthYearStart.disabled = true;
      birthYearEnd.disabled = true;
      birthYearStart.value = "";
      birthYearEnd.value = "";
    } else {
      // 연령 제한 해제시
      birthYearStart.disabled = false;
      birthYearEnd.disabled = false;
    }
  },

  /**
   * 모달 닫기
   */
  closeTravelModal() {
    const modal = document.getElementById("travelCreateModal");
    modal.style.display = "none";
    this.resetTravelForm();
  },

  /**
   * 폼 초기화
   */
  resetTravelForm() {
    // 모든 입력 필드 초기화
    document.getElementById("groupName").value = "";
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    document.getElementById("recruitDeadline").value = "";
    document.getElementById("maxMembers").value = "";
    document.getElementById("departureRegion").value = "";
    document.getElementById("birthYearStart").value = "";
    document.getElementById("birthYearEnd").value = "";
    document.getElementById("genderLimit").value = "all";
    document.getElementById("groupDescription").value = "";
    document.getElementById("flexible").checked = false;
    document.getElementById("hiddenAfterTrip").checked = false;
    document.getElementById("noAgeLimit").checked = false;

    // 셀렉트박스 활성화
    document.getElementById("birthYearStart").disabled = false;
    document.getElementById("birthYearEnd").disabled = false;
  },

  /**
   * 폼 유효성 검사
   */
  validateTravelForm() {
    let isValid = true;

    // 모임 이름 검사 (10자 이상)
    const groupName = document.getElementById("groupName").value;
    if (groupName.length < 10) {
      document.getElementById("groupNameError").style.display = "block";
      isValid = false;
    } else {
      document.getElementById("groupNameError").style.display = "none";
    }

    // 날짜 검사
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    if (!startDate || !endDate) {
      document.getElementById("dateError").textContent =
        "여행 기간을 선택해주세요.";
      document.getElementById("dateError").style.display = "block";
      isValid = false;
    } else if (new Date(startDate) > new Date(endDate)) {
      document.getElementById("dateError").textContent =
        "종료일은 출발일 이후여야 합니다.";
      document.getElementById("dateError").style.display = "block";
      isValid = false;
    } else {
      document.getElementById("dateError").style.display = "none";
    }

    // 인원 검사
    const maxMembers = document.getElementById("maxMembers").value;
    if (!maxMembers) {
      document.getElementById("maxMembersError").style.display = "block";
      isValid = false;
    } else {
      document.getElementById("maxMembersError").style.display = "none";
    }

    // 출발 지역 검사
    const departureRegion = document.getElementById("departureRegion").value;
    if (!departureRegion) {
      document.getElementById("departureError").style.display = "block";
      isValid = false;
    } else {
      document.getElementById("departureError").style.display = "none";
    }

    return isValid;
  },

  /**
   * 출생연도 범위 유효성 검사
   */
  validateBirthYearRange() {
    const startYear = document.getElementById("birthYearStart").value;
    const endYear = document.getElementById("birthYearEnd").value;
    const noLimit = document.getElementById("noAgeLimit").checked;

    // 연령 제한이 있고 범위가 잘못된 경우
    if (!noLimit && startYear && endYear) {
      if (parseInt(startYear) > parseInt(endYear)) {
        this.showToast("출생연도 범위가 올바르지 않습니다.", "warning");
        return false;
      }
    }
    return true;
  },

  /**
   * 여행 그룹 생성 (API 호출)
   */
  async createTravelGroup() {
    console.log("createTravelGroup 누름!");
    // 유효성 검사
    if (!this.validateTravelForm()) {
      return;
    }

    if (!this.validateBirthYearRange()) {
      return;
    }

    // 폼 데이터 수집
    const noAgeLimit = document.getElementById("noAgeLimit").checked;
    var groupId =crypto.randomUUID();
    const groupData = {
      groupId: groupId,
      tourId: this.currentTour.tourId,
      groupName: document.getElementById("groupName").value,
      startDate: document.getElementById("startDate").value,
      endDate: document.getElementById("endDate").value,
      recruitDeadline:
        document.getElementById("recruitDeadline").value ||
        document.getElementById("startDate").value, // 미입력시 출발일
      maxMembers: parseInt(document.getElementById("maxMembers").value),
      departureRegion: document.getElementById("departureRegion").value,
      birthYearStart: noAgeLimit
        ? null
        : parseInt(document.getElementById("birthYearStart").value) || null,
      birthYearEnd: noAgeLimit
        ? null
        : parseInt(document.getElementById("birthYearEnd").value) || null,
      genderLimit: document.getElementById("genderLimit").value,
      description: document.getElementById("groupDescription").value,
      flexible: document.getElementById("flexible").checked,
      hiddenAfterTrip: document.getElementById("hiddenAfterTrip").checked,
    };

    try {
      // API 호출
const response = await fetch("/api/travel-groups/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(groupData),
  credentials: "include", // 세션 쿠키 포함
});

const result = await response.json();

if (result.success) {
  this.showToast("여행 그룹이 성공적으로 생성되었습니다!", "success");

  // 멤버 추가 payload
  const data = {
    groupId: groupId,
    tourId: this.currentTour.tourId,
    userId: this.currentUser,
    memberType: "owner",
  };

  try {
    const resJoin = await fetch("/community/member/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
      // 실패해도 커뮤니티로 보내고 싶으면 에러만 로그
      if (!resJoin.ok) throw new Error("HTTP " + resJoin.status);
      // 필요하면 const joinResult = await resJoin.json();
      console.log("투어 커뮤니티 생성/참여 성공");
    } catch (err) {
      console.warn("투어 그룹 참여 실패(무시하고 이동):", err);
      this.showToast("이미 참여 중일 수 있어요. 커뮤니티로 이동합니다.", "error");
    }

    this.closeTravelModal();
    setTimeout(() => {
      // 서버가 groupId를 반환해야 함
      window.location.href = `/community?groupId=${encodeURIComponent(result.groupId)}`;
    }, 800);
  } else {
    this.showToast(result.message || "그룹 생성에 실패했습니다.", "error");
  }
    } catch (error) {
      console.error("여행 그룹 생성 오류:", error);
      this.showToast("그룹 생성 중 오류가 발생했습니다.", "error");
    }
  },

  handleTravelCreate() {
    // 로그인 체크
    console.log("여행만들기 버튼 클릭 - 현재 사용자:", this.currentUser);

    if (!this.currentUser) {
      this.showToast("로그인이 필요합니다", "warning");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
      return;
    }

    // 투어 ID가 있는지 확인
    if (!this.currentTour?.tourId) {
      this.showToast("투어 정보를 확인할 수 없습니다", "error");
      return;
    }

    // 모달 열기
    this.openTravelModal();
  },
  /**
   * 👥 여행참여
   */
  handleTravelJoin() {
    // 로그인 체크
    if (!this.currentUser) {
      this.showToast("로그인이 필요합니다", "warning");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
      return;
    }

    // 참여 가능한 그룹이 있는지 확인
    if (!this.hasAvailableGroup) {
      this.showToast("현재 참여 가능한 여행 그룹이 없습니다", "warning");
      return;
    }

    // 참여 가능한 그룹 목록 확인
    if (this.currentTravelGroups && this.currentTravelGroups.length > 0) {
      const availableGroups = this.currentTravelGroups.filter((g) => g.canJoin);

      if (availableGroups.length === 1) {
        // 그룹이 하나면 바로 참여 확인
        const group = availableGroups[0];
        const confirmMessage = `
이 여행 그룹에 참여하시겠습니까?

📅 여행 기간: ${group.startDate} ~ ${group.endDate}
👥 현재 인원: ${group.currentMembers}/${group.maxMembers}명
⏰ 모집 마감: ${group.recruitDeadline}
            `.trim();

        if (confirm(confirmMessage)) {
          // 커뮤니티 페이지로 이동
          window.location.href = `/community?groupId=${group.groupId}`;
        }
      } else if (availableGroups.length > 1) {
        // 여러 그룹이 있으면 커뮤니티 페이지로 이동
        if (
          confirm(
            `${availableGroups.length}개의 여행 그룹이 모집 중입니다.\n커뮤니티 페이지에서 확인하시겠습니까?`
          )
        ) {
          window.location.href = `/community?tourId=${this.currentTour.tourId}`;
        }
      }
    } else {
      this.showToast("여행 그룹 정보를 불러올 수 없습니다", "error");
    }
  },

  /**
   * 🔧 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 찜하기 버튼
    const wishlistBtn = document.getElementById("wishlistButton");
    if (wishlistBtn) {
      wishlistBtn.addEventListener("click", () => this.toggleWishlist());
    }

    // 여행만들기 버튼
    const createBtn = document.getElementById("travelCreateButton");
    if (createBtn) {
      createBtn.addEventListener("click", () => this.handleTravelCreate());
    }

    // 여행참여 버튼 (비활성화되어 있음)
    const joinBtn = document.getElementById("travelJoinButton");
    if (joinBtn) {
      joinBtn.addEventListener("click", () => this.handleTravelJoin());
    }

    // 갤러리 컨트롤
    const prevBtn = document.getElementById("carouselPrevBtn");
    const nextBtn = document.getElementById("carouselNextBtn");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.prevSlide());
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.nextSlide());
    }

    // 키보드 네비게이션
    document.addEventListener("keydown", (e) => {
      if (this.totalImages > 1) {
        if (e.key === "ArrowLeft") {
          this.prevSlide();
        } else if (e.key === "ArrowRight") {
          this.nextSlide();
        }
      }
    });

    // ESC 키로 전체화면 이미지 닫기
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeFullImage();
      }

      if (this.totalImages > 1) {
        if (e.key === "ArrowLeft") {
          this.prevSlide();
        } else if (e.key === "ArrowRight") {
          this.nextSlide();
        }
      }
    });

    // 모달 배경 클릭시 닫기
    const modal = document.getElementById("imageFullscreenModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeFullImage();
        }
      });
    }

    console.log("✅ 이벤트 리스너 설정 완료");
  },

  // ===========================================
  // 유틸리티 함수들
  // ===========================================

  /**
   * 텍스트 자르기
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  },

  /**
   * 로딩 스피너 표시/숨김
   */
  showLoading() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
      spinner.classList.remove("hidden");
    }
  },

  hideLoading() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
      spinner.classList.add("hidden");
    }
  },

  /**
   * 에러 메시지 표시
   */
  showError(message) {
    this.showToast(message, "error");

    // 에러 상태 UI 업데이트
    document.body.classList.add("error-state");

    const container = document.querySelector(".tour-detail-container");
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
    this.showToast(message, "success");
  },

  /**
   * 토스트 메시지 표시
   */
  showToast(message, type = "info", duration = 3000) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
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
  },
};

// ========================================
// 페이지 로드 시 자동 초기화 (tour-detail.js 맨 마지막에 추가)
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 투어 상세페이지 v3.0 로드됨");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  console.log("path : " + id);
  // URL에서 tourId 추출
  //   const pathParts = window.location.pathname.split('/');
  //   const tourId = pathParts[pathParts.length - 1];
  const tourId = id;

  // tourId 유효성 검증
  if (tourId && tourId !== "tour" && tourId.length > 5) {
    console.log("📍 투어 ID 추출 성공:", tourId);

    // tourDetail 객체가 준비되면 자동 로드
    if (
      window.tourDetail &&
      typeof window.tourDetail.loadTourDetail === "function"
    ) {
      console.log("🎯 투어 상세정보 자동 로드 시작");
      window.tourDetail.loadTourDetail(tourId);
    } else {
      console.error("❌ tourDetail 객체가 준비되지 않음");
    }
  } else {
    console.error("❌ 유효하지 않은 투어 ID:", tourId);
    // 에러 페이지 표시
    if (window.tourDetail) {
      window.tourDetail.showError("잘못된 투어 페이지 주소입니다.");
    }
  }
});

// tourDetail을 전역으로 노출 (기존과 동일)
window.tourDetail = window.tourDetail;
