/**
 * 투어 검색 시스템 v2.1 - 지역 파라미터 누락 문제 수정
 * 핵심 수정: performSearch() 메서드에서 areaCode, sigunguCode 올바르게 전달
 */

let tourSearchManager = {
  // 전역 상태
  userInterests: null,
  filterOptions: null,
  currentFilters: {},
  currentPage: 1,
  totalCount: 0,
  isSearching: false,

  // ========================================
  // 1. 초기화 및 기본 설정
  // ========================================

  async init() {
    console.log("🚀 투어 검색 매니저 v2.1 초기화 시작 - 지역 파라미터 수정");

    try {
      await this.loadFilterOptions();
      await this.loadUserInterests();

      this.setupEventListeners();
      this.applyUserInterests();
      this.showEmptyRecommendedSection();

      // 초기 관심사 태그 표시
      setTimeout(() => {
        this.updateInterestTags();
      }, 500);

      console.log("✅ 투어 검색 매니저 v2.1 초기화 완료");
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
        this.populateFilters();
      }
    } catch (error) {
      console.error("필터 옵션 로드 실패:", error);
    }
  },

  async loadUserInterests() {
    try {
      const response = await fetch("/api/tours/user-interests");
      const result = await response.json();

      if (result.success) {
        this.userInterests = result.data;
        console.log("사용자 관심사 로드됨:", this.userInterests);
        this.showLoginStatus(true);
      } else {
        this.userInterests = null;
        this.showLoginStatus(false);
      }
    } catch (error) {
      console.error("사용자 관심사 로드 실패:", error);
      this.userInterests = null;
      this.showLoginStatus(false);
    }
  },

  populateFilters() {
    // 1. 지역 선택기 (17개 광역시도, 단일 선택)
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

    // 2. 편의시설 단일선택
    const needsSelect = document.getElementById("needsFilter");
    if (needsSelect && this.filterOptions.needs) {
      needsSelect.innerHTML = '<option value="">편의시설</option>';
      this.filterOptions.needs.forEach((need) => {
        const option = document.createElement("option");
        option.value = need;
        option.textContent = need;
        needsSelect.appendChild(option);
      });
    }

    // 3. 커스텀 드롭다운 생성
    this.createCustomDropdown(
      "themeFilterContainer",
      this.filterOptions.themes,
      "선호테마",
      3
    );
    this.createCustomDropdown(
      "activityFilterContainer",
      this.filterOptions.activities,
      "선호활동",
      3
    );
    this.createCustomDropdown(
      "placeFilterContainer",
      this.filterOptions.places,
      "장소",
      3
    );
  },

  // ========================================
  // 커스텀 드롭다운 관련 메서드들 (기존과 동일)
  // ========================================

  createCustomDropdown(containerId, options, labelText, maxSelections = 3) {
    const container = document.getElementById(containerId);
    if (!container || !options) return;

    const optionsId = containerId.replace("Container", "Options");

    // 기존 내용 제거
    container.innerHTML = "";

    // 드롭다운 구조 생성
    const dropdownHTML = `
            <div class="dropdown-trigger" data-target="${optionsId}">
                <span class="dropdown-label">${labelText}</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="dropdown-options" id="${optionsId}">
                <div class="dropdown-header">
                    <span>최대 ${maxSelections}개까지 선택 가능</span>
                    <button type="button" class="clear-all-btn" data-target="${containerId}">전체 해제</button>
                </div>
                ${options
                  .map(
                    (option) => `
                    <div class="dropdown-option">
                        <label>
                            <input type="checkbox" value="${option}" data-filter="${containerId}" />
                            ${option}
                        </label>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;

    container.innerHTML = dropdownHTML;

    // 이벤트 리스너 설정
    this.setupCustomDropdownEvents(containerId, maxSelections);
  },

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
      // 마지막 선택된 것을 해제
      const lastChecked = Array.from(checkboxes).find(
        (cb) =>
          cb.checked && !selected.slice(0, maxSelections).includes(cb.value)
      );
      if (lastChecked) {
        lastChecked.checked = false;
        window.tourUtils?.showToast(
          `최대 ${maxSelections}개까지만 선택 가능합니다`,
          "warning"
        );
        return;
      }
    }

    // 필터 상태 업데이트
    this.updateCurrentFilters();
    this.updateInterestTags();
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
  // 2. 이벤트 리스너 설정
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

  /**
   * 지역 변경 처리 및 시군구 표시
   */
  handleRegionChange() {
    const regionFilter = document.getElementById("regionFilter");
    const sigunguFilter = document.getElementById("sigunguFilter");

    if (!regionFilter || !sigunguFilter) return;

    const selectedRegion = regionFilter.value;

    // 시군구를 표시해야 하는 지역들 (서울,인천,대전,대구,광주,부산,울산 제외)
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

  /**
   * 시군구 옵션 로드
   */
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

        // result.data가 배열인지 확인
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

  // ========================================
  // 🔧 핵심 수정: 검색 파라미터 전달 (지역 파라미터 누락 해결)
  // ========================================

  /**
   * ✅ 수정된 검색 메서드 - 지역 파라미터 올바르게 전달
   */
  async performSearch() {
    if (this.isSearching) return;

    this.isSearching = true;
    this.updateCurrentFilters();
    this.showLoading();

    try {
      const searchParams = new URLSearchParams();

      console.log("🔍 현재 필터:", this.currentFilters);

      // ✅ 1. 지역 파라미터 - 지역명을 지역코드로 변환
      if (this.currentFilters.region) {
        const areaCode = this.getAreaCodeByName(this.currentFilters.region);
        if (areaCode) {
          searchParams.append("areaCode", areaCode);
          console.log("✅ 지역코드 설정:", {
            지역명: this.currentFilters.region,
            지역코드: areaCode,
          });
        } else {
          console.warn("⚠️ 지역코드 변환 실패:", this.currentFilters.region);
        }
      } else {
        console.warn("⚠️ 지역이 선택되지 않음");
      }

      // ✅ 2. 시군구 파라미터 - 시군구 코드 직접 사용
      if (this.currentFilters.sigungu) {
        searchParams.append("sigunguCode", this.currentFilters.sigungu);
        console.log("✅ 시군구코드 설정:", this.currentFilters.sigungu);
      }

      // ✅ 3. 테마 파라미터 (첫 번째 테마를 메인 카테고리로 매핑)
      if (this.currentFilters.themes?.length > 0) {
        const firstTheme = this.currentFilters.themes[0];
        const themeCode = this.mapThemeToCategory(firstTheme);
        if (themeCode) {
          searchParams.append("cat1", themeCode);
          console.log("✅ 카테고리 설정:", {
            테마: firstTheme,
            카테고리코드: themeCode,
          });
        }
      }

      // ✅ 4. 활동 파라미터 (JSON 배열 형태로 전달)
      if (this.currentFilters.activities?.length > 0) {
        searchParams.append(
          "activities",
          JSON.stringify(this.currentFilters.activities)
        );
        console.log("✅ 활동 설정:", this.currentFilters.activities);
      }

      // ✅ 5. 장소 파라미터 (JSON 배열 형태로 전달)
      if (this.currentFilters.places?.length > 0) {
        searchParams.append(
          "places",
          JSON.stringify(this.currentFilters.places)
        );
        console.log("✅ 장소 설정:", this.currentFilters.places);
      }

      // ✅ 6. 편의시설 파라미터
      if (
        this.currentFilters.needs &&
        this.currentFilters.needs !== "해당없음"
      ) {
        searchParams.append("needs", this.currentFilters.needs);
        console.log("✅ 편의시설 설정:", this.currentFilters.needs);
      }

      // ✅ 7. 방문지 수
      searchParams.append("numOfRows", this.currentFilters.numOfRows || "6");
      searchParams.append("pageNo", this.currentPage.toString());

      const finalUrl = `/api/tours/search?${searchParams.toString()}`;
      console.log("🔍 최종 검색 URL:", finalUrl);

      const response = await fetch(finalUrl);
      const result = await response.json();

      console.log("🔍 검색 결과:", result);

      if (result.success) {
        this.updateRecommendedSection(result.data, "맞춤 검색 결과");
        this.totalCount = result.totalCount || 0;

        const filterSummary = this.getFilterSummary();
        window.tourUtils?.showToast(
          `${filterSummary} 맞춤 투어 검색 완료!`,
          "success"
        );

        // ✅ 디버깅 정보 표시
        if (result.searchParams && result.apiUrl) {
          console.log("🔍 서버에서 받은 파라미터:", result.searchParams);
          console.log("🔍 서버에서 호출한 API URL:", result.apiUrl);
        }
      } else {
        this.showNoResults(result.message);
        window.tourUtils?.showToast("검색 결과가 없습니다", "warning");
      }
    } catch (error) {
      console.error("💥 검색 실패:", error);
      this.showNoResults("검색 중 오류가 발생했습니다.");
      window.tourUtils?.showToast("검색에 실패했습니다", "error");
    } finally {
      this.hideLoading();
      this.isSearching = false;
    }
  },

  /**
   * ✅ 테마를 API 카테고리 코드로 매핑
   */
  mapThemeToCategory(theme) {
    const themeMapping = {
      자연: "A01",
      "문화/역사": "A02",
      문화: "A02",
      역사: "A02",
      체험: "A03",
      액티비티: "A03",
      레포츠: "A03",
      힐링: "A01", // 자연으로 매핑
      "축제/공연": "A02", // 문화로 매핑
      축제: "A02",
      공연: "A02",
    };

    return themeMapping[theme] || "";
  },

  /**
   * ✅ 지역명을 지역코드로 변환
   */
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
  // 4. 현재 필터 상태 관리
  // ========================================

  updateCurrentFilters() {
    const regionFilter = document.getElementById("regionFilter");
    const sigunguFilter = document.getElementById("sigunguFilter");
    const needsFilter = document.getElementById("needsFilter");
    const curationCount = document.getElementById("curationCount");

    this.currentFilters = {
      // 지역 (단일 선택)
      region: regionFilter?.value || "",
      sigungu: sigunguFilter?.value || "",

      // 다중 선택 필터들
      themes: this.getDropdownValues("themeFilterContainer"),
      activities: this.getDropdownValues("activityFilterContainer"),
      places: this.getDropdownValues("placeFilterContainer"),

      // 편의시설 (단일 선택)
      needs: needsFilter?.value || "",

      // 방문지 수
      numOfRows: curationCount?.value || "6",
    };

    console.log("현재 필터:", this.currentFilters);
  },

  // ========================================
  // 나머지 메서드들은 기존과 동일하게 유지
  // ========================================

  // 관심사 적용 관련 메서드들
  applyUserInterests() {
    if (!this.userInterests) {
      this.showLoginPrompt();
      return;
    }

    console.log("🎯 관심사 자동 적용 시작:", this.userInterests);

    // 1. 지역 적용 (첫 번째 지역만)
    if (this.userInterests.regions?.length > 0) {
      const regionFilter = document.getElementById("regionFilter");
      if (regionFilter) {
        const firstRegion =
          this.userInterests.regions[0].textContent ||
          this.userInterests.regions[0];
        regionFilter.value = firstRegion;
        this.markAsUserInterest(regionFilter);
        this.handleRegionChange(); // 시군구 로드
      }
    }

    // 2. 선호테마 적용 (최대 3개)
    if (
      this.userInterests.themes &&
      Object.keys(this.userInterests.themes).length > 0
    ) {
      const themeNames = Object.values(this.userInterests.themes);
      this.applyDropdownInterests(
        "themeFilterContainer",
        themeNames.slice(0, 3)
      );
    }

    // 3. 선호활동 적용 (최대 3개)
    if (this.userInterests.activities?.length > 0) {
      const activities = this.userInterests.activities
        .map((item) => item.textContent || item)
        .slice(0, 3);
      this.applyDropdownInterests("activityFilterContainer", activities);
    }

    // 4. 선호장소 적용 (최대 3개)
    if (this.userInterests.places?.length > 0) {
      const places = this.userInterests.places
        .map((item) => item.textContent || item)
        .slice(0, 3);
      this.applyDropdownInterests("placeFilterContainer", places);
    }

    // 5. 편의시설 적용
    if (this.userInterests.needs?.length > 0) {
      const needsFilter = document.getElementById("needsFilter");
      if (needsFilter) {
        const firstNeed =
          this.userInterests.needs[0].textContent ||
          this.userInterests.needs[0];
        if (firstNeed !== "해당없음") {
          needsFilter.value = firstNeed;
          this.markAsUserInterest(needsFilter);
        }
      }
    }

    // 관심사 태그 표시
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

    // 관심사 표시
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

  // UI 관련 메서드들 (기존과 동일)
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
                    <small>지역, 테마, 활동, 장소, 편의시설을 선택해보세요</small>
                </div>
            `;
      return;
    }

    let tagHtml = "";
    const filterTypes = [
      { key: "region", icon: "📍" },
      { key: "sigungu", icon: "🏘️" },
      { key: "themes", icon: "🎨" },
      { key: "activities", icon: "🎯" },
      { key: "places", icon: "🏛️" },
      { key: "needs", icon: "🔧" },
      { key: "count", icon: "📊" },
    ];

    filterTypes.forEach(({ key, icon }) => {
      if (currentFilters[key]) {
        let displayValue = currentFilters[key];

        // 배열인 경우 합치기
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
                        아래 조건으로 맞춤 투어를 검색합니다
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

    // 지역
    const regionFilter = document.getElementById("regionFilter");
    if (regionFilter && regionFilter.value) {
      filters.region = regionFilter.value;
    }

    // 시군구
    const sigunguFilter = document.getElementById("sigunguFilter");
    if (
      sigunguFilter &&
      sigunguFilter.value &&
      sigunguFilter.style.display !== "none"
    ) {
      filters.sigungu = sigunguFilter.options[sigunguFilter.selectedIndex].text;
    }

    // 테마들
    const themes = this.getDropdownValues("themeFilterContainer");
    if (themes.length > 0) {
      filters.themes = themes;
    }

    // 활동들
    const activities = this.getDropdownValues("activityFilterContainer");
    if (activities.length > 0) {
      filters.activities = activities;
    }

    // 장소들
    const places = this.getDropdownValues("placeFilterContainer");
    if (places.length > 0) {
      filters.places = places;
    }

    // 편의시설
    const needsFilter = document.getElementById("needsFilter");
    if (needsFilter && needsFilter.value && needsFilter.value !== "해당없음") {
      filters.needs = needsFilter.value;
    }

    // 방문지 수
    const curationCount = document.getElementById("curationCount");
    if (curationCount && curationCount.value) {
      filters.count = curationCount.value;
    }

    return filters;
  },

  // 결과 표시 관련 메서드들 (기존과 동일)
  updateRecommendedSection(tours, source = "맞춤 검색 결과") {
    const recommendedContainer = document.getElementById("recommendedTours");
    if (!recommendedContainer) return;

    if (!tours || tours.length === 0) {
      recommendedContainer.innerHTML = `
                <div class="recommendation-placeholder">
                    <div class="placeholder-icon">😅</div>
                    <h3>검색 조건에 맞는 투어가 없습니다</h3>
                    <p>필터를 조정해서 다시 검색해보세요</p>
                    <div class="current-filters-summary">
                        현재 검색 조건: ${this.getFilterSummary()}
                    </div>
                </div>
            `;
      return;
    }

    const displayTours = tours.slice(
      0,
      parseInt(this.currentFilters.numOfRows) || 6
    );
    recommendedContainer.innerHTML = "";

    // 섹션 헤더 업데이트
    const sectionHeader = document
      .querySelector("#recommendedTours")
      .parentElement.querySelector(".section-header");
    if (sectionHeader) {
      const titleElement = sectionHeader.querySelector(".section-title");
      if (titleElement) {
        titleElement.innerHTML = `🎯 회원님을 위한 맞춤 투어 <span class="tour-count">(${displayTours.length}개)</span>`;
      }
    }

    displayTours.forEach((tour, index) => {
      const tourCard = this.createTourCard(tour);
      tourCard.classList.add("recommended-tour-card");
      tourCard.style.animationDelay = `${index * 100}ms`;
      tourCard.classList.add("fade-in-up");

      recommendedContainer.appendChild(tourCard);
    });
  },

  createTourCard(tour) {
    const card = document.createElement("div");
    card.className = "tour-card";

    // 이미지 URL 처리
    let imageUrl = tour.optimizedImage || tour.firstimage || tour.firstimage2;
    if (!imageUrl || imageUrl.trim() === "") {
      imageUrl = "/uploads/tour/no-image.png";
    }

    card.innerHTML = `
            <div class="tour-image">
                <img src="${imageUrl}" 
                     alt="${tour.cleanTitle || tour.title}" 
                     onerror="this.src='/uploads/tour/no-image.png'">
            </div>
            <div class="tour-info">
                <span class="tour-category">${
                  tour.categoryName || "관광지"
                }</span>
                <h3 class="tour-title">${
                  tour.cleanTitle || tour.title || "제목 없음"
                }</h3>
                <p class="tour-description">${
                  tour.fullAddress || tour.addr1 || "주소 정보 없음"
                }</p>
                <div class="tour-meta">
                    <span class="tour-location">${tour.areaname || ""} ${
      tour.sigunguname || ""
    }</span>
                    <span class="tour-type">${this.getCategoryName(
                      tour.contenttypeid
                    )}</span>
                </div>
                <div class="tour-actions">
                    <button class="btn-favorite" data-contentid="${
                      tour.contentid
                    }">
                        <i class="heart-icon">♡</i>
                    </button>
                    <button class="btn-detail" data-contentid="${
                      tour.contentid
                    }">
                        상세보기
                    </button>
                </div>
            </div>
        `;

    // 이벤트 리스너
    const favoriteBtn = card.querySelector(".btn-favorite");
    favoriteBtn.addEventListener("click", () =>
      this.toggleFavorite(tour.contentid)
    );

    const detailBtn = card.querySelector(".btn-detail");
    detailBtn.addEventListener("click", () => this.openModal(tour.contentid));

    return card;
  },

  getCategoryName(contentTypeId) {
    const categories = {
      12: "관광지",
      14: "문화시설",
      15: "축제공연행사",
      25: "여행코스",
      28: "레포츠",
      32: "숙박",
      38: "쇼핑",
      39: "음식점",
    };
    return categories[contentTypeId] || "기타";
  },

  getFilterSummary() {
    const summaryParts = [];

    if (this.currentFilters.region) {
      summaryParts.push(this.currentFilters.region);
    }

    if (this.currentFilters.themes?.length > 0) {
      summaryParts.push(this.currentFilters.themes.join(", "));
    }

    if (this.currentFilters.activities?.length > 0) {
      summaryParts.push(this.currentFilters.activities.join(", "));
    }

    if (this.currentFilters.places?.length > 0) {
      summaryParts.push(this.currentFilters.places.join(", "));
    }

    return summaryParts.length > 0 ? summaryParts.join(" • ") : "기본 검색";
  },

  // UI 상태 관리 메서드들 (기존과 동일)
  showLoading() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) spinner.classList.add("active");
  },

  hideLoading() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) spinner.classList.remove("active");
  },

  showNoResults(message = "검색 결과가 없습니다.") {
    const recommendedContainer = document.getElementById("recommendedTours");
    if (!recommendedContainer) return;

    recommendedContainer.innerHTML = `
            <div class="recommendation-placeholder">
                <div class="placeholder-icon">😅</div>
                <h3>${message}</h3>
                <p>필터 조건을 조정해보세요</p>
                <div class="filter-suggestions">
                    <button class="suggestion-btn" onclick="tourSearchManager.applyQuickFilter('nature')">🌿 자연 여행</button>
                    <button class="suggestion-btn" onclick="tourSearchManager.applyQuickFilter('culture')">🏛️ 문화 여행</button>
                    <button class="suggestion-btn" onclick="tourSearchManager.applyQuickFilter('activity')">🏃‍♂️ 레포츠</button>
                </div>
            </div>
        `;
  },

  showLoginStatus(isLoggedIn) {
    const pageSubtitle = document.querySelector(".page-subtitle");

    if (isLoggedIn) {
      if (pageSubtitle) {
        pageSubtitle.innerHTML = `
                    ✨ <strong>v2.1 개선됨!</strong> 5개 질문 구조로 더 간단해졌습니다. 
                    <span style="color: #4CAF50; font-weight: 600;">회색 박스</span>는 회원님의 관심사, 
                    <span style="color: #2196F3; font-weight: 600;">파란 박스</span>는 직접 변경하신 값입니다!
                    <br><small>🎯 지역 1개 + 테마/활동/장소 각각 최대 3개까지 선택 가능</small>
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
                                <a href="/login" style="color: #4CAF50; font-weight: 600; text-decoration: underline;">지금 로그인하기 →</a>
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
                <h3>5개 질문 기반 필터를 확인해보세요!</h3>
                <p>간단해진 필터들이 회원님의 관심사로 미리 설정되어 있습니다.<br>
                   원하는 대로 조정한 후 <strong>🔍 검색하기</strong> 버튼을 눌러주세요!</p>
                <div class="search-hint">
                    <div class="hint-item">
                        <span class="hint-number">1</span>
                        <span class="hint-text">지역 1개 선택 (17개 광역시도)</span>
                    </div>
                    <div class="hint-item">
                        <span class="hint-number">2</span>
                        <span class="hint-text">테마, 활동, 장소 각각 최대 3개씩 선택</span>
                    </div>
                    <div class="hint-item">
                        <span class="hint-number">3</span>
                        <span class="hint-text">편의시설 1개 선택 (필요시)</span>
                    </div>
                    <div class="hint-item">
                        <span class="hint-number">4</span>
                        <span class="hint-text">🔍 검색하기 버튼으로 맞춤 투어 확인</span>
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
      places: "🏛️",
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

  // 모달 및 상호작용 메서드들
  openModal(contentId) {
    const modal = document.getElementById("tourDetailModal");
    if (modal) {
      modal.style.display = "flex";
      this.loadTourDetail(contentId);
    }
  },

  closeModal() {
    const modal = document.getElementById("tourDetailModal");
    if (modal) modal.style.display = "none";
  },

  async loadTourDetail(contentId) {
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");

    try {
      if (modalTitle) modalTitle.textContent = "투어 상세 정보 로딩 중...";
      if (modalBody)
        modalBody.innerHTML =
          '<div style="text-align: center; padding: 40px;"><div class="spinner"></div></div>';

      const response = await fetch(`/api/tours/detail/${contentId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const tour = result.data;

        if (modalTitle) modalTitle.textContent = tour.title || "투어 상세 정보";
        if (modalBody) {
          // 이미지 URL 처리
          let imageUrl =
            tour.optimizedImage || tour.firstimage || tour.firstimage2;
          if (!imageUrl || imageUrl.trim() === "") {
            imageUrl = "/uploads/tour/no-image.png";
          }

          modalBody.innerHTML = `
                        <div class="tour-detail-content">
                            <div class="tour-detail-image">
                                <img src="${imageUrl}" 
                                     alt="${tour.title}" 
                                     style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px;"
                                     onerror="this.src='/uploads/tour/no-image.png'">
                            </div>
                            <div class="tour-detail-info">
                                <h3>${tour.title}</h3>
                                <p><strong>주소:</strong> ${
                                  tour.addr1 || "주소 정보 없음"
                                }</p>
                                <p><strong>카테고리:</strong> ${
                                  tour.categoryName || "기타"
                                }</p>
                                ${
                                  tour.overview
                                    ? `<div class="tour-overview"><strong>소개:</strong><br>${tour.overview}</div>`
                                    : ""
                                }
                            </div>
                        </div>
                    `;
        }
      } else {
        if (modalTitle) modalTitle.textContent = "오류";
        if (modalBody)
          modalBody.innerHTML =
            '<div style="text-align: center; padding: 20px;">상세 정보를 불러올 수 없습니다.</div>';
      }
    } catch (error) {
      console.error("상세 정보 로드 실패:", error);
      if (modalTitle) modalTitle.textContent = "오류";
      if (modalBody)
        modalBody.innerHTML =
          '<div style="text-align: center; padding: 20px;">상세 정보를 불러올 수 없습니다.</div>';
    }
  },

  toggleFavorite(contentId) {
    const favoriteBtn = document.querySelector(
      `[data-contentid="${contentId}"] .btn-favorite`
    );
    if (favoriteBtn) {
      favoriteBtn.classList.toggle("active");
      const isActive = favoriteBtn.classList.contains("active");
      const icon = favoriteBtn.querySelector(".heart-icon");
      if (icon) {
        icon.textContent = isActive ? "♥" : "♡";
      }

      window.tourUtils?.showToast(
        isActive ? "즐겨찾기에 추가되었습니다" : "즐겨찾기에서 제거되었습니다",
        "success"
      );
    }
  },

  // 필터 관리 메서드들
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

    // 드롭다운 필터들 초기화
    [
      "themeFilterContainer",
      "activityFilterContainer",
      "placeFilterContainer",
    ].forEach((containerId) => {
      this.clearDropdownSelection(containerId);
      const trigger = document
        .getElementById(containerId)
        ?.querySelector(".dropdown-trigger");
      if (trigger) {
        trigger.classList.remove(
          "user-interest-filter",
          "user-modified-filter"
        );
        trigger.style.backgroundColor = "";
        trigger.style.borderColor = "";
        trigger.style.fontWeight = "";
      }
    });

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

  applyQuickFilter(filterType) {
    this.clearFilters(false);

    // 빠른 필터 적용
    switch (filterType) {
      case "nature":
        this.applyDropdownInterests("themeFilterContainer", ["자연"]);
        break;
      case "culture":
        this.applyDropdownInterests("themeFilterContainer", ["문화/역사"]);
        break;
      case "activity":
        this.applyDropdownInterests("themeFilterContainer", ["체험"]);
        break;
    }

    setTimeout(() => {
      this.performSearch();
    }, 500);

    window.tourUtils?.showToast(
      `${filterType} 빠른 검색이 적용되었습니다`,
      "info"
    );
  },
};

// ========================================
// 페이지 로드 시 초기화
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 투어 검색 페이지 v2.1 로드됨 (지역 파라미터 수정)");
  tourSearchManager.init();
});

// 모달 외부 클릭 시 닫기
document.addEventListener("click", (e) => {
  const modal = document.getElementById("tourDetailModal");
  if (e.target === modal && tourSearchManager) {
    tourSearchManager.closeModal();
  }
});

// ========================================
// 전역 함수 노출 (HTML에서 호출용)
// ========================================

// tourSearchManager를 전역으로 노출
window.tourSearchManager = tourSearchManager;
