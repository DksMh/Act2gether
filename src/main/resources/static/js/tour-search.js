/**
 * 투어 검색 시스템 v3.0 - 가로 카드 레이아웃 (완전 수정)
 * 핵심 기능: 장소 기반 단순 검색 + 편의시설 필터 + 액티브 시니어 맞춤
 * 개선사항: 닉네임 표시 + 가로 카드 레이아웃 + 깔끔한 디자인
 */

let tourSearchManager = {
  // 전역 상태
  userInterests: null,
  filterOptions: null,
  currentFilters: {},
  currentPage: 1,
  totalCount: 0,
  isSearching: false,
  currentUser: null, // 사용자 정보 추가

  // ========================================
  // 1. 초기화
  // ========================================

  async init() {
    // console.log("🚀 투어 검색 매니저 v3.0 투어상품화 시작");

    try {
      await this.loadFilterOptions();
      await this.loadUserInterests();
      this.setupEventListeners();
      this.applyUserInterests();
      this.showEmptyRecommendedSection();

      setTimeout(() => {
        this.updateInterestTags();
      }, 500);

      // console.log("✅ 투어 검색 매니저 v3.0 초기화 완료");
    } catch (error) {
      console.error("❌ 초기화 실패:", error);
      window.tourUtils?.showToast("시스템 초기화에 실패했습니다", "error");
    }
  },

  async loadFilterOptions() {
    try {
      const response = await fetch("/api/tours/filter-options");
      const result = await response.json();

      if (result.success) {
        this.filterOptions = result.data;
        // console.log("✅ v3.0 필터 옵션 로드:", this.filterOptions);
        this.populateFilters();
      }
    } catch (error) {
      console.error("❌ 필터 옵션 로드 실패:", error);
    }
  },

  async loadUserInterests() {
    try {
      const response = await fetch("/api/tours/user-interests");
      const result = await response.json();

      // console.log("API 응답 전체:", result); // 디버깅용

      if (result.success) {
        this.userInterests = result.data;
        this.currentUser = result.user || result.currentUser || null; // 여러 필드 확인
        // console.log("사용자 관심사 로드됨:", this.userInterests);
        // console.log("현재 사용자 정보:", this.currentUser);
        this.showLoginStatus(true);
      } else {
        // 🚨 수정: 로그인하지 않은 경우 명확히 null 설정
        // console.log("❌ 로그인하지 않음 - 사용자 정보 null 설정");
        this.userInterests = null;
        this.currentUser = null;
        this.showLoginStatus(false);
      }
    } catch (error) {
      console.error("❌사용자 관심사 로드 실패:", error);
      this.userInterests = null;
      this.currentUser = null;
      this.showLoginStatus(false);
    }
  },
  // 유저 로그인 상태 체크
  async checkUserLoginStatus() {
    try {
      const response = await fetch("/api/current-user", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        return result.isAuthenticated === true;
      }
      return false;
    } catch (error) {
      console.error("로그인 상태 확인 실패:", error);
      return false;
    }
  },

  // ========================================
  // 2. 필터 생성 (장소 중심 단순화)
  // ========================================

  populateFilters() {
    // 지역 선택기
    const regionSelect = document.getElementById("regionFilter");
    if (regionSelect && this.filterOptions.regions) {
      regionSelect.innerHTML = '<option value="">여행지역</option>';
      this.filterOptions.regions.forEach((region) => {
        const option = document.createElement("option");
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
      });
    }

    // v3.0: 액티브 시니어 맞춤 편의시설
    const needsSelect = document.getElementById("needsFilter");
    if (needsSelect && this.filterOptions.needs) {
      needsSelect.innerHTML = '<option value="">편의시설</option>';
      this.filterOptions.needs.forEach((need) => {
        const option = document.createElement("option");
        option.value = need;
        option.textContent = need;

        // 편의시설별 아이콘 추가
        const icon = this.getAccessibilityIcon(need);
        if (icon) {
          option.textContent = `${icon} ${need}`;
        }

        needsSelect.appendChild(option);
      });
    }

    // 장소 선택만 남김 (6개까지 선택 가능)
    this.createGroupedPlaceDropdown(
      "placeFilterContainer",
      this.filterOptions.placeGroups,
      "가고싶은 장소",
      6 // 최대 6개 선택 가능
    );

    // console.log("✅ v3.0 필터 생성 완료 - 장소 중심 단순화 + 편의시설 지원");
  },

  createGroupedPlaceDropdown(
    containerId,
    placeGroups,
    labelText,
    maxSelections = 6
  ) {
    const container = document.getElementById(containerId);
    if (!container || !placeGroups) {
      console.warn(
        "⚠️ 컨테이너 또는 placeGroups 없음:",
        containerId,
        placeGroups
      );
      return;
    }

    const optionsId = containerId.replace("Container", "Options");
    container.innerHTML = "";

    let optionsHtml = "";
    const groupOrder = [
      "자연관광지",
      "역사관광지",
      "휴양관광지",
      "체험관광지",
      "문화시설",
      "육상레포츠",
      "수상레포츠",
    ];

    groupOrder.forEach((groupName) => {
      if (placeGroups[groupName]) {
        const places = placeGroups[groupName];

        optionsHtml += `
          <div class="place-group-header">
            ${this.getGroupIcon(groupName)} ${groupName}
          </div>
        `;

        places.forEach((place) => {
          optionsHtml += `
            <div class="dropdown-option place-option">
              <label>
                <input type="checkbox" value="${place}" data-filter="${containerId}" data-group="${groupName}" />
                <span class="option-text">${place}</span>
              </label>
            </div>
          `;
        });
      }
    });

    const dropdownHTML = `
      <div class="dropdown-trigger" data-target="${optionsId}">
        <span class="dropdown-label">${labelText}</span>
        <span class="dropdown-arrow">▼</span>
      </div>
      <div class="dropdown-options grouped-options" id="${optionsId}">
        <div class="dropdown-header">
          <span>최대 ${maxSelections}개까지 선택 가능</span>
          <button type="button" class="clear-all-btn" data-target="${containerId}">전체 해제</button>
        </div>
        <div class="place-groups-container">
          ${optionsHtml}
        </div>
      </div>
    `;

    container.innerHTML = dropdownHTML;
    this.setupCustomDropdownEvents(containerId, maxSelections);
  },

  getGroupIcon(groupName) {
    const icons = {
      자연관광지: "🏞️",
      역사관광지: "🏛️",
      휴양관광지: "🛀",
      체험관광지: "🎨",
      문화시설: "🖼️",
      육상레포츠: "🏃",
      수상레포츠: "🏊",
    };
    return icons[groupName] || "📍";
  },

  // 편의시설별 아이콘 반환
  getAccessibilityIcon(need) {
    const icons = {
      "주차 편의": "🅿️",
      "접근 편의": "🛤️",
      "시설 편의": "🚻",
      필요없음: "",
    };
    return icons[need] || "🔧";
  },

  // ========================================
  // 3. 드롭다운 이벤트 처리 (단순화)
  // ========================================

  setupCustomDropdownEvents(containerId, maxSelections) {
    const container = document.getElementById(containerId);
    const trigger = container.querySelector(".dropdown-trigger");
    const options = container.querySelector(".dropdown-options");
    const clearBtn = container.querySelector(".clear-all-btn");

    let hideTimeout;

    // 마우스 호버 이벤트
    container.addEventListener("mouseenter", () => {
      clearTimeout(hideTimeout);
      this.showDropdown(trigger, options);
    });

    container.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(() => {
        this.hideDropdown(trigger, options);
      }, 200);
    });

    // 체크박스 변경 이벤트
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        this.handleDropdownChange(containerId, maxSelections);
      });
    });

    // 전체 해제 버튼
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.clearDropdownSelection(containerId);
    });
  },

  showDropdown(trigger, options) {
    // 다른 드롭다운 모두 닫기
    document.querySelectorAll(".dropdown-options").forEach((dropdown) => {
      if (dropdown !== options) {
        dropdown.classList.remove("show");
        dropdown.parentElement
          .querySelector(".dropdown-trigger")
          .classList.remove("active");
      }
    });

    trigger.classList.add("active");
    options.classList.add("show");
  },

  hideDropdown(trigger, options) {
    trigger.classList.remove("active");
    options.classList.remove("show");
  },

  handleDropdownChange(containerId, maxSelections) {
    const container = document.getElementById(containerId);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');

    // 선택된 항목들
    const selected = Array.from(checkboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    // 최대 선택 수 제한
    if (selected.length > maxSelections) {
      const lastChecked = Array.from(checkboxes).find(
        (cb) =>
          cb.checked && !selected.slice(0, maxSelections).includes(cb.value)
      );
      if (lastChecked) {
        lastChecked.checked = false;

        const containerType = this.getContainerType(containerId);
        window.tourUtils?.showToast(
          `${containerType}는 최대 ${maxSelections}개까지 선택 가능합니다`,
          "warning"
        );
        return;
      }
    }

    // 필터 상태 업데이트
    this.updateCurrentFilters();
    this.updateInterestTags();
  },

  getContainerType(containerId) {
    const types = {
      placeFilterContainer: "장소",
    };
    return types[containerId] || "항목";
  },

  clearDropdownSelection(containerId) {
    const container = document.getElementById(containerId);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((cb) => (cb.checked = false));
    this.updateCurrentFilters();
    this.updateInterestTags();
  },

  getDropdownValues(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];

    const checkboxes = container.querySelectorAll(
      'input[type="checkbox"]:checked'
    );
    return Array.from(checkboxes).map((cb) => cb.value);
  },

  // ========================================
  // 4. 이벤트 리스너 설정
  // ========================================

  setupEventListeners() {
    // 검색 및 초기화 버튼
    const searchBtn = document.getElementById("doSearchBtn");
    const clearBtn = document.getElementById("clearFiltersBtn");

    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.performSearch());
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearFilters());
    }

    // 지역 필터 변경
    const regionFilter = document.getElementById("regionFilter");
    if (regionFilter) {
      regionFilter.addEventListener("change", () => {
        this.handleRegionChange();
        this.updateCurrentFilters();
        this.updateInterestTags();
      });
    }

    // 시군구 필터 변경
    const sigunguFilter = document.getElementById("sigunguFilter");
    if (sigunguFilter) {
      sigunguFilter.addEventListener("change", () => {
        this.updateCurrentFilters();
        this.updateInterestTags();
      });
    }

    // 편의시설 필터 변경
    const needsFilter = document.getElementById("needsFilter");
    if (needsFilter) {
      needsFilter.addEventListener("change", () => {
        this.updateCurrentFilters();
        this.updateInterestTags();
      });
    }

    // 방문지 수 변경
    const curationCount = document.getElementById("curationCount");
    if (curationCount) {
      curationCount.addEventListener("change", () => {
        this.updateCurrentFilters();
        this.updateInterestTags();
      });
    }

    // 엔터키 검색
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !this.isSearching) {
        this.performSearch();
      }
    });

    // 외부 클릭 시 모든 드롭다운 닫기
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".custom-dropdown-container")) {
        document.querySelectorAll(".dropdown-options").forEach((dropdown) => {
          dropdown.classList.remove("show");
          dropdown.parentElement
            .querySelector(".dropdown-trigger")
            .classList.remove("active");
        });
      }
    });
  },

  // ========================================
  // 5. 지역 관련 처리
  // ========================================

  handleRegionChange() {
    const regionFilter = document.getElementById("regionFilter");
    const sigunguFilter = document.getElementById("sigunguFilter");

    if (!regionFilter || !sigunguFilter) return;

    const selectedRegion = regionFilter.value;
    const regionsWithSigungu = [
      "경기",
      "강원",
      "충북",
      "충남",
      "전북",
      "전남",
      "경북",
      "경남",
      "제주",
      "세종",
    ];

    if (selectedRegion && regionsWithSigungu.includes(selectedRegion)) {
      this.loadSigunguOptions(selectedRegion);
      sigunguFilter.style.display = "block";
    } else {
      sigunguFilter.style.display = "none";
      sigunguFilter.value = "";
    }
  },

  async loadSigunguOptions(areaName) {
    const sigunguFilter = document.getElementById("sigunguFilter");
    if (!sigunguFilter) return;

    try {
      const areaCode = this.getAreaCodeByName(areaName);
      if (!areaCode) return;

      const response = await fetch(`/api/tours/sigungu?areaCode=${areaCode}`);
      const result = await response.json();

      if (result.success && result.data) {
        sigunguFilter.innerHTML = '<option value="">시군구 선택</option>';

        const sigunguList = Array.isArray(result.data) ? result.data : [];
        sigunguList.forEach((sigungu) => {
          const option = document.createElement("option");
          option.value = sigungu.code || sigungu.sigungucode;
          option.textContent = sigungu.name || sigungu.name;
          sigunguFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.error("시군구 로드 실패:", error);
      sigunguFilter.innerHTML = '<option value="">시군구 로드 실패</option>';
    }
  },

  getAreaCodeByName(areaName) {
    const areaMap = {
      서울: "1",
      서울특별시: "1",
      인천: "2",
      인천광역시: "2",
      대전: "3",
      대전광역시: "3",
      대구: "4",
      대구광역시: "4",
      광주: "5",
      광주광역시: "5",
      부산: "6",
      부산광역시: "6",
      울산: "7",
      울산광역시: "7",
      세종: "8",
      세종특별자치시: "8",
      경기: "31",
      경기도: "31",
      강원: "32",
      강원특별자치도: "32",
      충북: "33",
      충청북도: "33",
      충남: "34",
      충청남도: "34",
      경북: "35",
      경상북도: "35",
      경남: "36",
      경상남도: "36",
      전북: "37",
      전북특별자치도: "37",
      전남: "38",
      전라남도: "38",
      제주: "39",
      제주특별자치도: "39",
    };

    return areaMap[areaName] || "";
  },

  // ========================================
  // 6. 핵심 검색 메서드 (v3.0 장소 기반 자동 매칭)
  // ========================================

  async performSearch() {
    if (this.isSearching) return;

    this.isSearching = true;
    this.updateCurrentFilters();
    this.showLoading();

    try {
      const searchParams = new URLSearchParams();

      // console.log("🔍 v3.0 현재 필터:", this.currentFilters);

      // 지역 파라미터
      if (this.currentFilters.region) {
        const areaCode = this.getAreaCodeByName(this.currentFilters.region);
        if (areaCode) {
          searchParams.append("areaCode", areaCode);
          // console.log("✅ 지역코드 설정:", {
          //   지역명: this.currentFilters.region,
          //   지역코드: areaCode,
          // });
        }
      }

      // 시군구 파라미터
      if (this.currentFilters.sigungu) {
        searchParams.append("sigunguCode", this.currentFilters.sigungu);
        // console.log("✅ 시군구코드 설정:", this.currentFilters.sigungu);
      }

      // 장소 파라미터 (JSON 배열) - v3.0: 장소에서 테마/활동 자동 매칭
      if (this.currentFilters.places?.length > 0) {
        searchParams.append(
          "places",
          JSON.stringify(this.currentFilters.places)
        );
        // console.log("✅ 장소 설정:", this.currentFilters.places);

        // 장소 기반 자동 테마/활동 매칭
        const mappedThemes = this.mapPlacesToThemes(this.currentFilters.places);
        const mappedActivities = this.mapPlacesToActivities(
          this.currentFilters.places
        );

        if (mappedThemes.length > 0) {
          searchParams.append("themes", JSON.stringify(mappedThemes));
          // console.log("🔄 자동 매칭된 테마:", mappedThemes);
        }

        if (mappedActivities.length > 0) {
          searchParams.append("activities", JSON.stringify(mappedActivities));
          // console.log("🔄 자동 매칭된 활동:", mappedActivities);
        }
      }

      // v3.0: 편의시설 파라미터
      if (
        this.currentFilters.needs &&
        this.currentFilters.needs !== "필요없음"
      ) {
        searchParams.append("needs", this.currentFilters.needs);
        // console.log("✅ 편의시설 설정:", this.currentFilters.needs);
      }

      // 방문지 수
      searchParams.append("numOfRows", this.currentFilters.numOfRows || "6");
      searchParams.append("pageNo", this.currentPage.toString());

      const finalUrl = `/api/tours/search?${searchParams.toString()}`;
      // console.log("🔍 v3.0 최종 검색 URL:", finalUrl);

      const response = await fetch(finalUrl);
      const result = await response.json();

      // 🆕 개수 부족 디버깅 로그 추가
      // console.log("📊 요청 개수:", this.currentFilters.numOfRows);
      // console.log("📊 받은 개수:", result.data?.length);

      if (
        result.data &&
        result.data.length < parseInt(this.currentFilters.numOfRows || "6")
      ) {
        console.warn(
          `⚠️ 부족: 요청 ${this.currentFilters.numOfRows}개 → 받음 ${result.data.length}개`
        );
        console.warn("백엔드 카테고리 배분 알고리즘 확인 필요");
      }

      // console.log("📊 v3.0 검색 결과:", result);

      if (result.success) {
        const actualCount = result.data?.length || 0;
        const requestedCount = parseInt(this.currentFilters.numOfRows || "6");

        // 🔥 개수 부족 시 사용자에게 명확한 안내
        if (actualCount < requestedCount) {
          console.warn(`⚠️ 요청: ${requestedCount}곳, 받음: ${actualCount}곳`);

          // 필터 요약
          const filterSummary = this.getFilterSummary();
          const shortage = requestedCount - actualCount;

          let guidanceMessage = `${filterSummary} 조건에서 ${actualCount}곳만 찾았습니다 (${shortage}곳 부족)`;

          // 구체적인 해결책 제안
          if (
            this.currentFilters.sigungu &&
            this.currentFilters.sigungu !== ""
          ) {
            guidanceMessage += "\n💡 해결책: 시군구 → 전체 지역으로 확대";
          } else if (this.currentFilters.places?.length > 3) {
            guidanceMessage +=
              "\n💡 해결책: 선택 장소 줄이기 (현재 " +
              this.currentFilters.places.length +
              "개)";
          } else if (
            this.currentFilters.needs &&
            this.currentFilters.needs !== "필요없음"
          ) {
            guidanceMessage += "\n💡 해결책: 편의시설 조건 완화";
          } else {
            guidanceMessage += "\n💡 해당 지역은 관광지가 제한적입니다";
          }

          window.tourUtils?.showToast(guidanceMessage, "warning", 5000); // 5초간 표시

          // 콘솔에도 상세 로그
          console.warn("📊 데이터 부족 상황:");
          console.warn("- 요청 조건:", this.currentFilters);
          console.warn("- 실제 결과:", actualCount + "개");
          console.warn("- 부족분:", shortage + "개");
        }
        this.updateRecommendedSection(
          result.data,
          "맞춤 투어 검색 결과",
          result
        );
        this.totalCount = result.totalCount || 0;

        const filterSummary = this.getFilterSummary();

        // v3.0: 투어 상품 생성 완료 알림
        let successMessage = `${filterSummary} 맞춤 투어 상품 생성 완료!`;
        if (result.barrierFreeCount > 0) {
          successMessage += ` (편의시설 정보 포함: ${result.barrierFreeCount}개)`;
        } else if (result.hasAccessibilityFilter) {
          successMessage += ` (편의시설 조건 완화 적용)`;
        }

        window.tourUtils?.showToast(successMessage, "success");

        // 결과가 적을 때 사용자에게 안내
        if (result.finalCount < 3 && result.hasAccessibilityFilter) {
          setTimeout(() => {
            window.tourUtils?.showToast(
              "편의시설 조건을 완화하여 더 많은 결과를 찾았습니다",
              "info"
            );
          }, 2000);
        }
      } else {
        // 개선된 에러 처리
        let errorMessage = result.message || "검색 결과가 없습니다.";

        if (result.message && result.message.includes("무장애")) {
          errorMessage =
            "편의시설 정보 조회 중 일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        } else if (
          this.currentFilters.needs &&
          this.currentFilters.needs !== "필요없음"
        ) {
          errorMessage =
            "선택하신 편의시설 조건에 맞는 관광지를 찾지 못했습니다. 조건을 완화해보세요.";
        }

        this.showNoResults(errorMessage);
        window.tourUtils?.showToast(errorMessage, "warning");
      }
    } catch (error) {
      console.error("💥 v3.0 검색 실패:", error);

      let errorMessage = "검색에 실패했습니다";
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage = "네트워크 연결을 확인해주세요";
      } else if (error.message.includes("JSON")) {
        errorMessage = "검색 결과 처리 중 오류가 발생했습니다";
      }

      this.showNoResults(errorMessage);
      window.tourUtils?.showToast(errorMessage, "error");
    } finally {
      this.hideLoading();
      this.isSearching = false;
    }
  },

  /**
   * v3.0: 장소 기반 테마 자동 매칭
   */
  mapPlacesToThemes(places) {
    const themes = new Set();

    places.forEach((place) => {
      // 자연 관련 장소들
      if (
        [
          "해변",
          "산/공원",
          "계곡/폭포",
          "호수/강",
          "수목원",
          "자연휴양림",
          "자연생태관광지",
        ].includes(place)
      ) {
        themes.add("자연");
      }

      // 문화/역사 관련 장소들
      if (
        [
          "고궁/문",
          "민속마을/가옥",
          "유적지",
          "사찰",
          "종교성지",
          "박물관",
          "미술관",
          "체험",
        ].includes(place)
      ) {
        themes.add("문화/역사");
      }

      // 휴양 관련 장소들
      if (
        [
          "온천",
          "테마파크",
          "관광단지",
          "창질방",
          "유람선/잠수함관광",
        ].includes(place)
      ) {
        themes.add("문화/역사");
      }

      // 레저 관련 장소들
      if (["트래킹", "골프장", "스키장", "캠핑장", "낚시"].includes(place)) {
        themes.add("레포츠");
      }
    });

    return Array.from(themes);
  },

  /**
   * v3.0: 장소 기반 활동 자동 매칭
   */
  mapPlacesToActivities(places) {
    const activities = new Set();

    places.forEach((place) => {
      // 자연관광지 활동
      if (
        [
          "해변",
          "산/공원",
          "계곡/폭포",
          "호수/강",
          "수목원",
          "자연휴양림",
          "자연생태관광지",
        ].includes(place)
      ) {
        activities.add("자연관광지");
      }

      // 역사관광지 활동
      if (
        ["고궁/문", "민속마을/가옥", "유적지", "사찰", "종교성지"].includes(
          place
        )
      ) {
        activities.add("역사관광지");
      }

      // 휴양관광지 활동
      if (
        [
          "온천",
          "테마파크",
          "관광단지",
          "창질방",
          "유람선/잠수함관광",
        ].includes(place)
      ) {
        activities.add("휴양관광지");
      }

      // 체험관광지 활동
      if (["체험"].includes(place)) {
        activities.add("체험관광지");
      }

      // 문화시설 활동
      if (["박물관", "미술관"].includes(place)) {
        activities.add("문화시설");
      }

      // 육상레포츠 활동
      if (["트래킹", "골프장", "스키장", "캠핑장"].includes(place)) {
        activities.add("육상레포츠");
      }

      // 수상레포츠 활동
      if (["낚시"].includes(place)) {
        activities.add("수상레포츠");
      }
    });

    return Array.from(activities);
  },

  // ========================================
  // 7. 필터 상태 관리
  // ========================================

  updateCurrentFilters() {
    const regionFilter = document.getElementById("regionFilter");
    const sigunguFilter = document.getElementById("sigunguFilter");
    const needsFilter = document.getElementById("needsFilter");
    const curationCount = document.getElementById("curationCount");

    this.currentFilters = {
      region: regionFilter?.value || "",
      sigungu: sigunguFilter?.value || "",
      places: this.getDropdownValues("placeFilterContainer"),
      needs: needsFilter?.value || "",
      numOfRows: curationCount?.value || "6",
    };

    // console.log("🔍 v3.0 현재 필터 상태:", this.currentFilters);
  },

  getFilterSummary() {
    const summaryParts = [];

    // 지역 + 시군구 표시 개선
    if (this.currentFilters.region) {
      let regionText = this.currentFilters.region;

      // 시군구가 선택되었고 표시 중인 경우 함께 표시
      const sigunguFilter = document.getElementById("sigunguFilter");
      if (
        this.currentFilters.sigungu &&
        sigunguFilter &&
        sigunguFilter.style.display !== "none" &&
        sigunguFilter.selectedIndex > 0
      ) {
        const sigunguName =
          sigunguFilter.options[sigunguFilter.selectedIndex].text;
        regionText += ` ${sigunguName}`;
      }

      summaryParts.push(`📍 ${regionText}`);
    }

    if (this.currentFilters.places?.length > 0) {
      const placeText =
        this.currentFilters.places.length > 3
          ? `${this.currentFilters.places.slice(0, 3).join(", ")} 외 ${
              this.currentFilters.places.length - 3
            }개`
          : this.currentFilters.places.join(", ");
      summaryParts.push(`🛏️ ${placeText}`);
    }

    if (this.currentFilters.needs && this.currentFilters.needs !== "해당없음") {
      summaryParts.push(`🔧 ${this.currentFilters.needs}`);
    }

    return summaryParts.length > 0 ? summaryParts.join(" • ") : "기본 검색";
  },

  // ========================================
  // 8. 관심사 적용 (장소 중심으로 단순화)
  // ========================================

  applyUserInterests() {
    if (!this.userInterests) {
      this.showLoginPrompt();
      return;
    }

    // console.log("🎯 관심사 자동 적용 시작:", this.userInterests);

    // 지역 적용 (preferredRegions로 수정)
    if (this.userInterests.preferredRegions?.length > 0) {
      const regionFilter = document.getElementById("regionFilter");
      if (regionFilter) {
        const firstRegion =
          this.userInterests.preferredRegions[0].textContent ||
          this.userInterests.preferredRegions[0];
        regionFilter.value = firstRegion;
        this.markAsUserInterest(regionFilter);
        this.handleRegionChange();
      }
    }

    // 선호장소 적용 (최대 6개)
    if (this.userInterests.places?.length > 0) {
      const places = this.userInterests.places
        .map((item) => item.textContent || item)
        .slice(0, 6);
      this.applyDropdownInterests("placeFilterContainer", places);
    }

    // 편의시설 적용
    if (this.userInterests.needs?.length > 0) {
      const needsFilter = document.getElementById("needsFilter");
      if (needsFilter) {
        const firstNeed =
          this.userInterests.needs[0].textContent ||
          this.userInterests.needs[0];
        if (firstNeed !== "필요없음") {
          needsFilter.value = firstNeed;
          this.markAsUserInterest(needsFilter);
        }
      }
    }

    this.displayInterestTags();

    setTimeout(() => {
      this.updateCurrentFilters();
    }, 200);
  },

  applyDropdownInterests(containerId, values) {
    const container = document.getElementById(containerId);
    if (!container || !values || values.length === 0) return;

    values.forEach((value) => {
      const checkbox = container.querySelector(`input[value="${value}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });

    const trigger = container.querySelector(".dropdown-trigger");
    if (trigger) {
      this.markAsUserInterest(trigger);
    }
  },

  markAsUserInterest(element) {
    element.classList.add("user-interest-filter");
    element.style.backgroundColor = "#f5f5f5";
    element.style.borderColor = "#4CAF50";
    element.style.fontWeight = "600";
  },

  // ========================================
  // 9. UI 표시 메서드들
  // ========================================

  updateInterestTags() {
    const tagsContainer = document.getElementById("interestTags");
    if (!tagsContainer) return;

    const currentFilters = this.getCurrentFilterValues();

    if (Object.keys(currentFilters).length === 0) {
      tagsContainer.innerHTML = `
        <div style="text-align: center; color: #666; font-size: 14px; padding: 20px;">
          <div class="placeholder-icon">🎯</div>
          <strong>필터를 선택하면 여기에 표시됩니다</strong>
          <br>
          <small>지역, 가고싶은 장소, 편의시설을 선택해보세요</small>
          <br>
          <small style="color: #888;">🚀 v3.0 투어상품화로 더 쉬워진 투어 검색!</small>
        </div>
      `;
      return;
    }

    let tagHtml = "";
    const filterTypes = [
      { key: "region", icon: "📍" },
      { key: "sigungu", icon: "🏙️" },
      { key: "places", icon: "🛏️" },
      { key: "needs", icon: "🔧" },
      { key: "count", icon: "📊" },
    ];

    filterTypes.forEach(({ key, icon }) => {
      if (currentFilters[key]) {
        let displayValue = currentFilters[key];

        if (Array.isArray(displayValue)) {
          displayValue = displayValue.join(", ");
        }

        if (key === "count") {
          displayValue = `${displayValue}개 방문지`;
        }

        tagHtml += `
          <span class="interest-tag current-filter" data-type="${key}">
            ${icon} ${displayValue}
          </span>
        `;
      }
    });

    if (tagHtml) {
      tagsContainer.innerHTML = `
        <div style="margin-bottom: 15px; text-align: center;">
          <h3 style="color: #333; margin: 0 0 5px 0;">💡 현재 선택된 여행 조건</h3>
          <p style="color: #666; font-size: 14px; margin: 0;">
            아래 조건으로 맞춤 투어를 생성합니다
            <br>
            <small>💡 조건을 변경하고 싶으면 위의 필터를 수정해주세요</small>
          </p>
        </div>
        <div style="text-align: center;">
          ${tagHtml}
        </div>
      `;
    }
  },

  getCurrentFilterValues() {
    const filters = {};

    const regionFilter = document.getElementById("regionFilter");
    if (regionFilter && regionFilter.value) {
      filters.region = regionFilter.value;
    }

    const sigunguFilter = document.getElementById("sigunguFilter");
    if (
      sigunguFilter &&
      sigunguFilter.value &&
      sigunguFilter.style.display !== "none"
    ) {
      filters.sigungu = sigunguFilter.options[sigunguFilter.selectedIndex].text;
    }

    const places = this.getDropdownValues("placeFilterContainer");
    if (places.length > 0) {
      filters.places = places;
    }

    const needsFilter = document.getElementById("needsFilter");
    if (needsFilter && needsFilter.value && needsFilter.value !== "해당없음") {
      filters.needs = needsFilter.value;
    }

    const curationCount = document.getElementById("curationCount");
    if (curationCount && curationCount.value) {
      filters.count = curationCount.value;
    }

    return filters;
  },

  // ========================================
  // 10. 투어 상품 생성 메서드들 (개선된 버전)
  // ========================================

  createTourProduct(tours, tourCount) {
    // 🚨 수정: 실제 받은 개수를 사용 (tourCount가 아닌 tours.length)
    const actualCount = tours.length; // 실제 받은 개수
    const requestedCount = tourCount; // 요청한 개수

    // ⚠️ 개수 부족 경고 로깅
    if (actualCount < requestedCount) {
      console.warn(
        `🚨 개수 부족: 요청 ${requestedCount}개 → 받음 ${actualCount}개`
      );
      console.warn("백엔드에서 부족분 보완 로직 확인 필요");
    }

    // 투어 카테고리 결정 (3,6,9,12,15만 사용)
    const tourCategories = {
      3: "간단한 투어",
      6: "적당한 투어",
      9: "풍성한 투어",
      12: "완전한 투어",
      15: "최대 투어",
    };

    // 🚨 실제 개수로 카테고리 결정
    const tourCategory = tourCategories[actualCount] || `${actualCount}곳 투어`;

    // 지역 정보 추출 (기존과 동일)
    const regions = [
      ...new Set(
        tours
          .map((tour) => {
            if (tour.addr1) {
              const addrParts = tour.addr1.split(" ");
              const region = addrParts[0];
              if (region.includes("서울")) return "서울";
              if (region.includes("부산")) return "부산";
              if (region.includes("대구")) return "대구";
              if (region.includes("인천")) return "인천";
              if (region.includes("광주")) return "광주";
              if (region.includes("대전")) return "대전";
              if (region.includes("울산")) return "울산";
              if (region.includes("세종")) return "세종";
              if (region.includes("경기")) return "경기";
              if (region.includes("강원")) return "강원";
              if (region.includes("충북") || region.includes("충청북"))
                return "충북";
              if (region.includes("충남") || region.includes("충청남"))
                return "충남";
              if (region.includes("전북") || region.includes("전라북"))
                return "전북";
              if (region.includes("전남") || region.includes("전라남"))
                return "전남";
              if (region.includes("경북") || region.includes("경상북"))
                return "경북";
              if (region.includes("경남") || region.includes("경상남"))
                return "경남";
              if (region.includes("제주")) return "제주";
              return region;
            }
            return this.currentFilters.region || "전국";
          })
          .filter(Boolean)
      ),
    ];
    const mainRegion = regions[0] || this.currentFilters.region || "전국";

    // 테마 추출 (기존과 동일)
    const themes = this.extractThemesFromTours(tours);
    const mainTheme =
      themes.length > 1 ? themes.join("+") : themes[0] || "종합";

    // 투어 제목 생성 (개선된 형태)
    //const title = `${mainRegion} ${mainTheme} 투어`;
    // 🎯 백엔드에서 받은 제목 사용 (있으면)
    let title = "투어 상품";
    if (searchResult?.tourTitle) {
      title = searchResult.tourTitle;
    } else {
      // 기존 로직으로 fallback
      const regions = this.extractRegionsFromTours(tours);
      const themes = this.extractRealSelectedThemes(); // 실제 선택한 장소 기반
      const mainRegion = regions[0] || this.currentFilters.region || "전국";
      const mainTheme =
        themes.length > 1 ? themes.join("+") : themes[0] || "종합";
      title = `${mainRegion} ${mainTheme} 투어`;
    }

    // 투어 ID 생성 (contentid들을 연결)
    const tourId = this.generateTourId(tours, actualCount); // 🚨 실제 개수 사용

    // 대표 이미지 선택 (첫 번째 투어의 이미지)
    let mainImage =
      tours[0]?.optimizedImage || tours[0]?.firstimage || tours[0]?.firstimage2;
    if (!mainImage || mainImage.trim() === "") {
      mainImage = "/uploads/tour/no-image.png";
    }

    // 편의시설 정보 집계
    const accessibilityInfo = this.aggregateAccessibilityInfo(tours);

    return {
      id: tourId,
      title: title,
      category: tourCategory,
      region: mainRegion,
      theme: mainTheme,
      mainImage: mainImage,
      tourCount: actualCount, // 🚨 실제 개수 반환
      requestedCount: requestedCount, // 요청 개수도 따로 보관
      tours: tours,
      accessibilityInfo: accessibilityInfo,
      totalAccessibilityScore: this.calculateTotalAccessibilityScore(tours),
      countMismatch: actualCount < requestedCount, // 개수 부족 플래그
    };
  },

  /**
   * 투어들에서 테마 추출
   */
  extractThemesFromTours(tours) {
    const themeMap = new Map();

    tours.forEach((tour) => {
      const contentType = tour.contenttypeid;
      let theme = "종합";

      // 콘텐츠 타입별 테마 분류
      switch (contentType) {
        case "12": // 관광지
          if (tour.categoryName?.includes("자연")) theme = "자연";
          else if (tour.categoryName?.includes("역사")) theme = "역사";
          else if (tour.categoryName?.includes("문화")) theme = "문화";
          else theme = "관광";
          break;
        case "14":
          theme = "문화";
          break;
        case "15":
          theme = "축제";
          break;
        case "28":
          theme = "레포츠";
          break;
        default:
          theme = "관광";
          break;
      }

      themeMap.set(theme, (themeMap.get(theme) || 0) + 1);
    });

    // 가장 많은 테마 순으로 정렬
    return Array.from(themeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme);
  },

  /**
   * 투어 ID 생성 (contentid들을 연결)
   */
  // generateTourId(tours, tourCount) {
  //   const contentIds = tours.slice(0, tourCount).map((tour) => tour.contentid);
  //   return contentIds.join("");
  // },
  generateTourId(tours, tourCount) {
    const contentIds = tours.slice(0, tourCount).map((tour) => tour.contentid);
    return contentIds.join("-"); // 하이픈으로 연결
  },
  /**
   * 편의시설 정보 집계 (사용자 선택 편의시설 기준) - 문자열 데이터 처리
   */
  aggregateAccessibilityInfo(tours) {
    const selectedNeeds = this.currentFilters.needs;

    // 편의시설을 선택하지 않았거나 "필요없음"인 경우 집계 안함
    if (
      !selectedNeeds ||
      selectedNeeds === "" ||
      selectedNeeds === "필요없음"
    ) {
      return {
        features: {},
        validCount: 0,
        totalCount: tours.length,
        selectedNeedsType: null,
        hasAccessibilityFilter: false,
      };
    }

    // 사용자가 선택한 편의시설 타입에 따라 집계할 항목 결정
    let targetFeatures = {};

    if (selectedNeeds === "접근 편의") {
      targetFeatures = {
        exit: 0,
        route: 0,
      };
    } else if (selectedNeeds === "시설 편의") {
      targetFeatures = {
        restroom: 0,
        elevator: 0,
      };
    } else if (selectedNeeds === "주차 편의") {
      targetFeatures = {
        parking: 0,
        publictransport: 0, // 대중교통 추가!
      };
    }

    let validCount = 0;

    tours.forEach((tour) => {
      if (tour.hasBarrierFreeInfo) {
        try {
          const barrierFreeInfo = JSON.parse(tour.barrierFreeInfo || "{}");
          Object.keys(targetFeatures).forEach((key) => {
            // 🔥 핵심 수정: 문자열 존재 여부로 확인 (숫자 비교가 아닌!)
            if (
              barrierFreeInfo[key] &&
              barrierFreeInfo[key] !== "" &&
              barrierFreeInfo[key].trim() !== "" &&
              barrierFreeInfo[key] !== "0" &&
              barrierFreeInfo[key] !== "없음"
            ) {
              targetFeatures[key]++;
            }
          });
          validCount++;
        } catch (e) {
          // JSON 파싱 오류 무시
          console.warn("JSON 파싱 실패:", tour.contentid, e);
        }
      }
    });

    // console.log(
    //   "편의시설 집계 결과:",
    //   targetFeatures,
    //   "validCount:",
    //   validCount
    // );

    return {
      features: targetFeatures,
      validCount: validCount,
      totalCount: tours.length,
      selectedNeedsType: selectedNeeds,
      hasAccessibilityFilter: true,
    };
  },

  /**
   * 전체 접근성 점수 계산
   */
  calculateTotalAccessibilityScore(tours) {
    const scores = tours
      .filter((tour) => tour.accessibilityScore > 0)
      .map((tour) => tour.accessibilityScore);

    if (scores.length === 0) return 0;

    return Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    );
  },

  // ========================================
  // 11. 결과 표시 (v3.0 투어 상품화 - 개선된 버전)
  // ========================================

  updateRecommendedSection(
    tours,
    source = "맞춤 투어 검색 결과",
    searchResult = null
  ) {
    const recommendedContainer = document.getElementById("recommendedTours");
    if (!recommendedContainer) return;

    if (!tours || tours.length === 0) {
      this.showNoResults("검색 조건에 맞는 투어가 없습니다.");
      return;
    }

    const tourCount = parseInt(this.currentFilters.numOfRows) || 6;
    const actualCount = tours.length;
    const displayTours = tours.slice(0, tourCount);

    // console.log("🔍 개수 체크:", {
    //   요청개수: tourCount,
    //   받은개수: actualCount,
    //   표시개수: displayTours.length,
    //   부족여부: actualCount < tourCount,
    // });

    // 투어 상품 생성
    //const tourProduct = this.createTourProduct(displayTours, tourCount, searchResult);

    //recommendedContainer.innerHTML = "";

    // ✅ 섹션 헤더 - 로그인 상태 정확히 체크
    const sectionHeader = document
      .querySelector("#recommendedTours")
      .parentElement.querySelector(".section-header");

    if (sectionHeader) {
      const titleElement = sectionHeader.querySelector(".section-title");
      if (titleElement) {
        let titleHtml;

        // console.log("🔍 사용자 정보 체크:", this.currentUser);

        // ✅ 수정: null 체크 강화
        if (
          this.currentUser &&
          this.currentUser !== null &&
          typeof this.currentUser === "object" &&
          (this.currentUser.nickname || this.currentUser.name)
        ) {
          const userDisplayName =
            this.currentUser.nickname || this.currentUser.name;
          titleHtml = `${userDisplayName}님을 위한 맞춤 투어 상품`;
        } else {
          titleHtml = `검색하신 조건의 투어 상품`;
        }

        // 편의시설 정보 추가
        if (searchResult?.barrierFreeCount > 0) {
          titleHtml += ` <span class="accessibility-badge">편의시설 ${searchResult.barrierFreeCount}개</span>`;
        }

        titleElement.innerHTML = titleHtml;
      }
    }
    recommendedContainer.innerHTML = "";
    // ✅ 부족 상황 안내
    if (actualCount < tourCount) {
      // console.log("⚠️ 부족 상황 감지 - createShortageNotice 호출");
      const shortageInfo = this.createShortageNotice(
        tourCount,
        actualCount,
        searchResult
      );
      recommendedContainer.appendChild(shortageInfo);

      // 🎯 여기서 return - 투어 카드는 아예 생성하지 않음
      return;
    }

    // 투어 상품 카드 생성
    // ✅ 요청한 개수만큼 받은 경우에만 투어 상품 카드 생성
    const tourProduct = this.createTourProduct(
      displayTours,
      tourCount,
      searchResult
    );
    const tourProductCard = this.createTourProductCard(tourProduct);
    recommendedContainer.appendChild(tourProductCard);
    //const tourProductCard = this.createTourProductCard(tourProduct);
    //recommendedContainer.appendChild(tourProductCard);
  },
  // 2. 부족 상황 안내 박스 생성
  createTourProduct(tours, tourCount, searchResult = null) {
    const actualCount = tours.length;
    const requestedCount = tourCount;

    if (actualCount < requestedCount) {
      console.warn(
        `🚨 개수 부족: 요청 ${requestedCount}개 → 받음 ${actualCount}개`
      );
    }

    const tourCategories = {
      3: "간단한 투어",
      6: "적당한 투어",
      9: "풍성한 투어",
      12: "완전한 투어",
      15: "최대 투어",
    };

    const tourCategory = tourCategories[actualCount] || `${actualCount}곳 투어`;

    // ✅ 제목: 백엔드에서 보낸 것 우선, 없으면 기본값
    let title =
      searchResult?.tourTitle || `${this.currentFilters.region} 투어 상품`;

    // 투어 ID 생성
    const tourId = this.generateTourId(tours, actualCount);

    // 대표 이미지 선택
    let mainImage =
      tours[0]?.optimizedImage || tours[0]?.firstimage || tours[0]?.firstimage2;
    if (!mainImage || mainImage.trim() === "") {
      mainImage = "/uploads/tour/no-image.png";
    }

    // 편의시설 정보 집계
    const accessibilityInfo = this.aggregateAccessibilityInfo(tours);

    return {
      id: tourId,
      title: title,
      category: tourCategory,
      region: this.currentFilters.region, // ✅ 사용자가 선택한 지역
      theme: "종합", // ✅ 간단히 고정값 (백엔드 title에 이미 포함됨)
      mainImage: mainImage,
      tourCount: actualCount,
      requestedCount: requestedCount,
      tours: tours,
      accessibilityInfo: accessibilityInfo,
      totalAccessibilityScore: this.calculateTotalAccessibilityScore(tours),
      countMismatch: actualCount < requestedCount,
    };
  },
  // 3️⃣ createShortageNotice 메서드 개선 (신규/수정)
  createShortageNotice(requested, actual, searchResult) {
    const shortage = requested - actual;
    const notice = document.createElement("div");
    notice.className = "shortage-notice";

    const filterSummary = this.getFilterSummary();
    let suggestions = [];

    // 구체적인 제안사항 생성 (액션 버튼 없는 안내만)
    if (this.currentFilters.places?.length > 2) {
      suggestions.push({
        icon: "📍",
        text: `선택 장소가 많습니다 (현재 ${this.currentFilters.places.length}개). 다른 장소로 변경해보세요.`,
      });
    }

    if (this.currentFilters.needs && this.currentFilters.needs !== "필요없음") {
      suggestions.push({
        icon: "🔧",
        text: "편의시설 조건을 완화하면 더 많은 결과를 얻을 수 있습니다.",
        //action: () => this.relaxAccessibilityFilter()
      });
    }

    let suggestionsHtml = "";
    if (suggestions.length > 0) {
      suggestionsHtml = suggestions
        .map((s) => {
          if (s.action) {
            return `<button class="suggestion-btn" onclick="tourSearchManager.relaxAccessibilityFilter()">
                      ${s.icon} ${s.text}
                  </button>`;
          } else {
            return `<div class="suggestion-text">${s.icon} ${s.text}</div>`;
          }
        })
        .join("");
    }

    notice.innerHTML = `
          <div class="shortage-alert">
              <div class="shortage-header">
                  <span class="shortage-icon">⚠️</span>
                  <div class="shortage-text">
                      <h3>${requested}곳 요청 → ${actual}곳 발견 (${shortage}곳 부족)</h3>
                      <p>${filterSummary} 조건에서 관광지가 부족합니다.</p>
                  </div>
              </div>
              ${
                suggestionsHtml
                  ? `
                  <div class="shortage-suggestions">
                      <h4>💡 해결 방법:</h4>
                      <div class="suggestion-content">
                          ${suggestionsHtml}
                      </div>
                  </div>
              `
                  : ""
              }
          </div>
      `;

    return notice;
  },

  /**
   * 투어 상품 카드 생성 (가로 레이아웃으로 수정)
   */
  createTourProductCard(tourProduct) {
    const card = document.createElement("div");
    card.className = "tour-product-card horizontal-layout";

    // 세션 스토리지에 투어 데이터 저장
    this.saveTourDataToSession(tourProduct);
    // 방문지 미리보기 생성
    const previewCount = this.getPreviewCount(tourProduct.tourCount);
    const previewTours = tourProduct.tours.slice(0, previewCount);
    const remainingCount = tourProduct.tourCount - previewCount;

    // 편의시설 배지 제거 (사용자 요청에 따라)
    let accessibilityBadge = "";
    // console.log("편의시설 정보 확인:", tourProduct.accessibilityInfo);

    // 방문지 목록 생성 (가로 레이아웃용)
    let tourListHtml = "";
    previewTours.forEach((tour, index) => {
      tourListHtml += `
        <div class="tour-spot-horizontal">
          <span class="spot-number">${index + 1}</span>
          <span class="spot-name">${tour.cleanTitle || tour.title}</span>
        </div>
      `;
    });

    if (remainingCount > 0) {
      tourListHtml += `
        <div class="tour-spot-horizontal more">
          <span class="spot-number">+</span>
          <span class="spot-name">${remainingCount}곳 더</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="tour-product-image-horizontal">
        <img src="${tourProduct.mainImage}" 
             alt="${tourProduct.title}" 
             onerror="this.src='/uploads/tour/no-image.png'">
        ${accessibilityBadge}
      </div>
      <div class="tour-product-info-horizontal">
        <div class="tour-header-horizontal">
          <h3 class="tour-product-title-horizontal">${tourProduct.title}</h3>
          <div class="tour-meta-horizontal">
            <span class="tour-count">📍 ${tourProduct.tourCount}곳 방문</span>
          </div>
        </div>
        <div class="tour-spots-preview-horizontal">
          ${tourListHtml}
        </div>
        ${this.createTourAccessibilityInfo(tourProduct)}
        <div class="tour-product-actions-horizontal">
          <button class="btn-tour-detail-horizontal" data-tour-id="${
            tourProduct.id
          }">
            투어 상세보기
          </button>
          <button class="btn-tour-favorite-horizontal" data-tour-id="${
            tourProduct.id
          }">
            <i class="heart-icon">♡</i>
          </button>
        </div>
      </div>
    `;

    // 이벤트 리스너 추가
    // 투어 상세보기 버튼
    const detailBtn = card.querySelector(".btn-tour-detail-horizontal");
    // detailBtn.addEventListener("click", () =>
    //   this.openTourDetail(tourProduct.id)
    // );
    detailBtn.addEventListener("click", async () => {
      const isLoggedIn = await this.checkUserLoginStatus();

      if (isLoggedIn) {
        this.openTourDetail(tourProduct.id);
      } else {
        window.tourUtils?.showToast("로그인이 필요한 서비스입니다", "warning");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      }
    });

    // 찜하기 버튼
    const favoriteBtn = card.querySelector(".btn-tour-favorite-horizontal");
    // favoriteBtn.addEventListener("click", () =>
    //   this.toggleTourFavorite(tourProduct.id)
    // );
    favoriteBtn.addEventListener("click", async () => {
      const isLoggedIn = await this.checkUserLoginStatus();

      if (isLoggedIn) {
        this.toggleTourFavorite(tourProduct.id);
      } else {
        window.tourUtils?.showToast("로그인 후 이용 가능합니다", "warning");
      }
    });

    return card;
  },

  // ========================================
  // 🆕 새로운 메서드: 세션 스토리지에 데이터 저장
  // ========================================

  saveTourDataToSession(tourProduct) {
    try {
      // 세션 스토리지에 저장할 데이터 구조
      const tourSessionData = {
        tourId: tourProduct.id,
        title: tourProduct.title,
        region: tourProduct.region,
        theme: tourProduct.theme,
        mainImage: tourProduct.mainImage,
        tourCount: tourProduct.tourCount,
        totalAccessibilityScore: tourProduct.totalAccessibilityScore,
        //accessibilityInfo: tourProduct.accessibilityInfo,
        // 🔥 핵심 수정: accessibilityInfo 완전히 포함
        accessibilityInfo: {
          features: tourProduct.accessibilityInfo?.features || {},
          validCount: tourProduct.accessibilityInfo?.validCount || 0,
          totalCount:
            tourProduct.accessibilityInfo?.totalCount || tourProduct.tourCount,
          selectedNeedsType:
            tourProduct.accessibilityInfo?.selectedNeedsType ||
            this.currentFilters.needs, // 현재 필터에서 직접 가져오기
          hasAccessibilityFilter:
            tourProduct.accessibilityInfo?.hasAccessibilityFilter ||
            (this.currentFilters.needs &&
              this.currentFilters.needs !== "필요없음"),
        },
        // 🔥 핵심: tours 배열에 이미 모든 정보가 다 들어있음!
        spots: tourProduct.tours.map((tour, index) => ({
          order: index + 1,
          contentid: tour.contentid,
          title: tour.cleanTitle || tour.title,
          addr1: tour.addr1,
          addr2: tour.addr2,
          tel: tour.tel,
          homepage: tour.homepage,
          overview: tour.overview,
          firstimage: tour.firstimage,
          firstimage2: tour.firstimage2,
          optimizedImage: tour.optimizedImage,
          mapx: tour.mapx,
          mapy: tour.mapy,
          cat1: tour.cat1,
          cat2: tour.cat2,
          cat3: tour.cat3,
          areacode: tour.areacode,
          sigungucode: tour.sigungucode,
          // 접근성 정보도 이미 있음
          accessibilityScore: tour.accessibilityScore || 0,
          hasBarrierFreeInfo: tour.hasBarrierFreeInfo || false,
          barrierFreeInfo: tour.barrierFreeInfo || "{}",
        })),
        createdAt: new Date().toISOString(),
      };

      // 세션에 저장
      sessionStorage.setItem(
        `tour_${tourProduct.id}`,
        JSON.stringify(tourSessionData)
      );
      // console.log("✅ 완전한 투어 데이터 세션 저장:", tourProduct.id);
    } catch (error) {
      console.error("❌ 세션 저장 실패:", error);
    }
  },
  // ========================================
  // 🆕 새로운 메서드: 세션에서 데이터 로드
  // ========================================

  loadTourDataFromSession(tourId) {
    try {
      const sessionData = sessionStorage.getItem(`tour_${tourId}`);
      if (sessionData) {
        const tourData = JSON.parse(sessionData);
        // console.log("✅ 세션에서 투어 데이터 로드:", tourId);
        return tourData;
      }
      return null;
    } catch (error) {
      console.error("❌ 세션 로드 실패:", error);
      return null;
    }
  },

  /**
   * 미리보기 개수 결정 (2개만 표시하도록 수정)
   */
  getPreviewCount(totalCount) {
    return Math.min(2, totalCount); // 항상 2개만 표시
  },

  /**
   * 투어 상품의 편의시설 정보 표시 (관광지 개수 기준으로 개선)
   */
  createTourAccessibilityInfo(tourProduct) {
    // console.log("편의시설 정보 생성 시작:", tourProduct.accessibilityInfo);

    // 편의시설 필터가 없으면 아예 표시 안함
    if (!tourProduct.accessibilityInfo.hasAccessibilityFilter) {
      // console.log("편의시설 필터 없음");
      return "";
    }

    const selectedNeeds = tourProduct.accessibilityInfo.selectedNeedsType;
    // console.log("선택된 편의시설 타입:", selectedNeeds);

    // 편의시설이 있는 관광지 수 계산 (개별 시설 수가 아닌 관광지 수)
    let facilitySiteCount = 0;
    let displayText = "";

    // 전체 관광지에서 해당 편의시설이 있는 곳의 개수를 계산
    const tours = tourProduct.tours;

    if (selectedNeeds === "주차 편의") {
      facilitySiteCount = tours.filter((tour) => {
        if (tour.hasBarrierFreeInfo) {
          try {
            const info = JSON.parse(tour.barrierFreeInfo || "{}");
            // 🔥 수정: 문자열 존재 여부로 확인 (> 0이 아닌)
            return (
              (info.parking &&
                info.parking !== "" &&
                info.parking !== "0" &&
                info.parking !== "없음") ||
              (info.publictransport &&
                info.publictransport !== "" &&
                info.publictransport !== "0" &&
                info.publictransport !== "없음")
            );
          } catch (e) {
            return false;
          }
        }
        return false;
      }).length;
      displayText = `🅿️ 주차편의 ${facilitySiteCount}/${tours.length}곳`;
    } else if (selectedNeeds === "접근 편의") {
      facilitySiteCount = tours.filter((tour) => {
        if (tour.hasBarrierFreeInfo) {
          try {
            const info = JSON.parse(tour.barrierFreeInfo || "{}");
            return (
              (info.exit &&
                info.exit !== "" &&
                info.exit !== "0" &&
                info.exit !== "없음") ||
              (info.route &&
                info.route !== "" &&
                info.route !== "0" &&
                info.route !== "없음")
            );
          } catch (e) {
            return false;
          }
        }
        return false;
      }).length;
      displayText = `🛤️ 접근시설 ${facilitySiteCount}/${tours.length}곳`;
    } else if (selectedNeeds === "시설 편의") {
      facilitySiteCount = tours.filter((tour) => {
        if (tour.hasBarrierFreeInfo) {
          try {
            const info = JSON.parse(tour.barrierFreeInfo || "{}");
            return (
              (info.restroom &&
                info.restroom !== "" &&
                info.restroom !== "0" &&
                info.restroom !== "없음") ||
              (info.elevator &&
                info.elevator !== "" &&
                info.elevator !== "0" &&
                info.elevator !== "없음")
            );
          } catch (e) {
            return false;
          }
        }
        return false;
      }).length;
      displayText = `🚻 편의시설 ${facilitySiteCount}/${tours.length}곳`;
    }

    // console.log(
    //   `${selectedNeeds} - 시설 보유 관광지:`,
    //   facilitySiteCount,
    //   "/",
    //   tours.length
    // );

    if (facilitySiteCount > 0) {
      const result = `
            <div class="tour-accessibility-info-horizontal">
                <small class="accessibility-summary">
                    ${displayText}
                </small>
            </div>
        `;
      // console.log("편의시설 정보 HTML:", result);
      return result;
    }

    // 편의시설 필터가 적용되었지만 정보가 없는 경우
    // console.log("편의시설 필터 적용되었지만 정보 없음");
    return `
        <div class="tour-accessibility-info-horizontal">
            <small class="accessibility-summary">
                편의시설 정보 확인 중
            </small>
        </div>
    `;
  },

  /**
   * 투어 상세페이지 열기
   */
  openTourDetail(tourId) {
    // window.location.href = `/tour/${tourId}`;
    window.location.href = `/tour-detail?id=${tourId}`;
  },

  /**
   * 투어 즐겨찾기 토글
   */
  toggleTourFavorite(tourId) {
    const favoriteBtn = document.querySelector(
      `[data-tour-id="${tourId}"] .btn-tour-favorite-horizontal`
    );
    if (favoriteBtn) {
      favoriteBtn.classList.toggle("active");
      const isActive = favoriteBtn.classList.contains("active");
      const icon = favoriteBtn.querySelector(".heart-icon");
      if (icon) {
        icon.textContent = isActive ? "♥" : "♡";
      }

      window.tourUtils?.showToast(
        isActive
          ? "투어가 즐겨찾기에 추가되었습니다"
          : "투어가 즐겨찾기에서 제거되었습니다",
        "success"
      );
    }
  },

  showNoResults(message = "검색 결과가 없습니다.") {
    const recommendedContainer = document.getElementById("recommendedTours");
    if (!recommendedContainer) return;

    // 편의시설 필터 관련 구체적인 안내
    let suggestionHtml = "";
    if (this.currentFilters.needs && this.currentFilters.needs !== "필요없음") {
      suggestionHtml = `
        <div class="filter-suggestions">
          <h4>💡 검색 팁</h4>
          <p>편의시설 조건이 적용되어 투어 생성이 제한될 수 있습니다.</p>
          <button class="suggestion-btn" onclick="tourSearchManager.relaxAccessibilityFilter()">
            🔧 편의시설 조건 완화하기
          </button>
          <button class="suggestion-btn" onclick="tourSearchManager.reduceVisitCount()">
            📍 방문지 수 줄이기
          </button>
          <button class="suggestion-btn" onclick="tourSearchManager.clearFilters()">
            🔄 필터 초기화
          </button>
        </div>
      `;
    } else {
      suggestionHtml = `
        <div class="filter-suggestions">
          <button class="suggestion-btn" onclick="tourSearchManager.reduceVisitCount()">
            📍 방문지 수 줄이기
          </button>
          <button class="suggestion-btn" onclick="tourSearchManager.clearFilters()">
            🔄 필터 초기화
          </button>                    
        </div>
      `;
    }

    recommendedContainer.innerHTML = `
      <div class="recommendation-placeholder">
        <div class="placeholder-icon">😅</div>
        <h3>${message}</h3>
        <p>조건을 조정해서 투어를 다시 생성해보세요</p>
        <div class="current-filters-summary">
          <strong>현재 선택:</strong> ${this.getFilterSummary()}
        </div>
        ${suggestionHtml}
      </div>
    `;
  },

  /**
   * 방문지 수 줄이기 헬퍼
   */
  reduceVisitCount() {
    const curationCount = document.getElementById("curationCount");
    if (curationCount) {
      const currentCount = parseInt(curationCount.value) || 6;
      const newCount = Math.max(3, currentCount - 3); // 최소 3개
      curationCount.value = newCount.toString();

      this.updateCurrentFilters();
      this.updateInterestTags();

      window.tourUtils?.showToast(
        `방문지 수를 ${newCount}개로 줄였습니다. 다시 검색해보세요.`,
        "info"
      );
    }
  },

  /**
   * 편의시설 조건 완화
   */
  relaxAccessibilityFilter() {
    const needsFilter = document.getElementById("needsFilter");
    if (needsFilter) {
      needsFilter.value = "필요없음";
      this.updateCurrentFilters();
      this.updateInterestTags();

      window.tourUtils?.showToast(
        "편의시설 조건을 완화했습니다. 다시 검색해보세요.",
        "info"
      );
    }
  },

  // ========================================
  // 12. UI 상태 및 모달
  // ========================================

  showLoading() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) spinner.classList.add("active");
  },

  hideLoading() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) spinner.classList.remove("active");
  },

  showLoginStatus(isLoggedIn) {
    const pageSubtitle = document.querySelector(".page-subtitle");

    if (isLoggedIn) {
      if (pageSubtitle) {
        pageSubtitle.innerHTML = `
          🚀 <strong>v3.0 투어상품화!</strong> 장소만 선택하면 맞춤 투어 상품을 생성해드려요!
          <span style="color: #4caf50; font-weight: 600">가고싶은 장소 최대 6개</span> 선택으로 
          <span style="color: #2196f3; font-weight: 600">1개 투어 상품</span>이 완성됩니다!
          <br><small>🎯 더 단순하고 직관적인 투어 상품 생성으로 액티브 시니어에게 최적화!</small>
        `;
      }
    } else {
      if (pageSubtitle) {
        pageSubtitle.innerHTML = `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 10px 0;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">👤</span>
              <div>
                <strong style="color: #856404;">로그인하면 더 많은 기능을 이용할 수 있습니다!</strong>
                <br>
                <small style="color: #856404;">✨ 개인 맞춤 관심사 설정 ✨ 즐겨찾기 ✨ 추천 투어</small>
                <br>
                <div style="text-align:left;"><a href="/login" style="color: #4CAF50; font-weight: 600; text-decoration: underline;">지금 로그인하기 →</a></div>
              </div>
            </div>
          </div>
        `;
      }
    }
  },

  showEmptyRecommendedSection() {
    const recommendedContainer = document.getElementById("recommendedTours");
    if (!recommendedContainer) return;

    recommendedContainer.innerHTML = `
      <div class="recommendation-placeholder">
        <div class="placeholder-icon">🔍</div>
        <h3>투어 상품 생성을 시작해보세요!</h3>
        <p>가고싶은 장소만 선택하면 맞춤 투어 상품을 만들어드려요.<br>
           필터를 설정한 후 <strong>🔍 투어 찾기</strong> 버튼을 눌러주세요!</p>
        <div class="search-hint">
          <div class="hint-item">
            <span class="hint-number">1</span>
            <span class="hint-text">지역 1개 선택 (17개 광역시도)</span>
          </div>
          <div class="hint-item">
            <span class="hint-number">2</span>
            <span class="hint-text">가고싶은 장소 최대 6개 선택</span>
          </div>
          <div class="hint-item">
            <span class="hint-number">3</span>
            <span class="hint-text">편의시설 필터로 나에게 편한 여행지 찾기</span>
          </div>
          <div class="hint-item">
            <span class="hint-number">4</span>
            <span class="hint-text">🔍 투어 찾기 버튼으로 투어 생성</span>
          </div>
        </div>
      </div>
    `;
  },

  showLoginPrompt() {
    const recommendedContainer = document.getElementById("recommendedTours");
    if (!recommendedContainer) return;

    recommendedContainer.innerHTML = `
      <div class="recommendation-placeholder">
        <div class="placeholder-icon">👤</div>
        <h3>로그인하면 관심사 기반 필터가 자동 설정됩니다</h3>
        <p>현재는 수동으로 필터를 설정해서 검색해주세요</p>
        <div style="margin-top: 20px;">
          <a href="/login" class="btn-primary" style="text-decoration: none; padding: 12px 24px; border-radius: 8px;">
            로그인하고 맞춤 필터 이용하기
          </a>
        </div>
      </div>
    `;
  },

  displayInterestTags() {
    const tagsContainer = document.getElementById("interestTags");
    if (!tagsContainer) return;

    if (!this.userInterests) {
      tagsContainer.innerHTML = `
        <div class="login-prompt">
          <div class="login-prompt-icon">👤</div>
          <div class="login-prompt-text">
            <strong>로그인하면 나의 관심사를 확인할 수 있습니다!</strong>
            <small>관심사 기반으로 필터가 자동 설정됩니다</small>
            <a href="/login" class="login-prompt-link">지금 로그인하기 →</a>
          </div>
        </div>
      `;
      return;
    }

    let tagHtml = "";
    const icons = {
      regions: "📍",
      themes: "🎨",
      activities: "🎯",
      places: "🛏️",
      needs: "🔧",
    };

    Object.entries(this.userInterests).forEach(([category, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((item) => {
          const value = item.textContent || item;
          const icon = icons[category] || "🏷️";
          tagHtml += `
            <span class="interest-tag reference" title="내 관심사: ${category}">
              ${icon} ${value}
            </span>
          `;
        });
      } else if (typeof items === "object" && items !== null) {
        Object.entries(items).forEach(([code, name]) => {
          tagHtml += `
            <span class="interest-tag reference" title="내 관심사: 테마">
              🎨 ${name}
            </span>
          `;
        });
      }
    });

    if (tagHtml) {
      tagsContainer.innerHTML = `
        <div style="margin-bottom: 15px; text-align: center;">
          <h3 style="color: #333; margin: 0 0 5px 0;">💡 나의 관심사 (참조용)</h3>
          <p style="color: #666; font-size: 14px; margin: 0;">
            위의 필터가 이 관심사를 기반으로 미리 설정되어 있습니다
            <br>
            <small>💬 관심사 변경은 <a href="/mypage" style="color: #4CAF50; text-decoration: underline;">마이페이지</a>에서 가능합니다</small>
          </p>
        </div>
        <div style="text-align: center;">
          ${tagHtml}
        </div>
      `;
    }
  },

  // ========================================
  // 13. 필터 관리
  // ========================================

  clearFilters(showToast = true) {
    // 지역 필터 초기화
    const regionFilter = document.getElementById("regionFilter");
    if (regionFilter) {
      regionFilter.value = "";
      regionFilter.classList.remove(
        "user-interest-filter",
        "user-modified-filter"
      );
      regionFilter.style.backgroundColor = "";
      regionFilter.style.borderColor = "";
      regionFilter.style.fontWeight = "";
    }

    // 시군구 필터 숨기기
    const sigunguFilter = document.getElementById("sigunguFilter");
    if (sigunguFilter) {
      sigunguFilter.style.display = "none";
      sigunguFilter.value = "";
    }

    // 장소 필터 초기화
    this.clearDropdownSelection("placeFilterContainer");
    const trigger = document
      .getElementById("placeFilterContainer")
      ?.querySelector(".dropdown-trigger");
    if (trigger) {
      trigger.classList.remove("user-interest-filter", "user-modified-filter");
      trigger.style.backgroundColor = "";
      trigger.style.borderColor = "";
      trigger.style.fontWeight = "";
    }

    // 편의시설 필터 초기화
    const needsFilter = document.getElementById("needsFilter");
    if (needsFilter) {
      needsFilter.value = "";
      needsFilter.classList.remove(
        "user-interest-filter",
        "user-modified-filter"
      );
      needsFilter.style.backgroundColor = "";
      needsFilter.style.borderColor = "";
      needsFilter.style.fontWeight = "";
    }

    // 방문지 수 기본값으로 설정
    const curationCount = document.getElementById("curationCount");
    if (curationCount) {
      curationCount.value = "6";
    }

    this.currentFilters = {};
    this.currentPage = 1;

    // 사용자 관심사 다시 적용
    setTimeout(() => {
      this.applyUserInterests();
      this.updateInterestTags();
    }, 100);

    if (showToast) {
      window.tourUtils?.showToast("필터가 초기화되었습니다", "info");
    }
  },
};

// ========================================
// 페이지 로드 시 초기화
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  // console.log("🚀 투어 검색 페이지 v3.0 투어상품화 로드됨");
  tourSearchManager.init();
});

// tourSearchManager를 전역으로 노출
window.tourSearchManager = tourSearchManager;
