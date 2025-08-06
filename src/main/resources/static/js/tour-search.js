// tour-search.js

class TourSearchManager {
  constructor() {
    this.currentPage = 1;
    this.totalPages = 1;
    this.itemsPerPage = 6;
    this.userInterests = null;
    this.currentFilters = {
      region: "",
      companion: "",
      theme: "",
      activity: "",
      place: "",
      needs: "",
    };
    this.tours = [];
    this.filteredTours = [];

    this.init();
  }

  async init() {
    this.showLoading();
    try {
      await this.loadUserInterests();
      this.setupEventListeners();
      this.renderInterestTags();
      await this.loadTours();
      this.renderTours();
    } catch (error) {
      console.error("초기화 중 오류 발생:", error);
    } finally {
      this.hideLoading();
    }
  }

  // 로딩 스피너 표시/숨김
  showLoading() {
    document.getElementById("loadingSpinner").style.display = "flex";
  }

  hideLoading() {
    document.getElementById("loadingSpinner").style.display = "none";
  }

  // 사용자 관심사 로드
  async loadUserInterests() {
    try {
      const response = await fetch("/api/user/interests");
      if (response.ok) {
        this.userInterests = await response.json();
        this.applyUserInterestsToFilters();
      }
    } catch (error) {
      console.error("관심사 로드 실패:", error);
    }
  }

  // 사용자 관심사를 필터에 적용
  applyUserInterestsToFilters() {
    if (!this.userInterests) return;

    // 관심사가 있는 경우 필터에 자동 설정
    Object.keys(this.userInterests).forEach((key) => {
      const value = this.userInterests[key];
      if (Array.isArray(value) && value.length > 0) {
        // 첫 번째 값을 기본값으로 설정
        const filterElement = document.getElementById(key + "Filter");
        if (filterElement && value[0]) {
          filterElement.value = value[0];
          this.currentFilters[key] = value[0];
        }
      }
    });
  }

  // 관심사 태그 렌더링
  renderInterestTags() {
    const container = document.getElementById("interestTags");
    container.innerHTML = "";

    if (!this.userInterests) {
      container.innerHTML =
        '<p class="no-interests">관심사를 설정하면 맞춤 추천을 받을 수 있습니다.</p>';
      return;
    }

    Object.keys(this.userInterests).forEach((category) => {
      const interests = this.userInterests[category];
      if (Array.isArray(interests)) {
        interests.forEach((interest) => {
          const tag = this.createInterestTag(category, interest);
          container.appendChild(tag);
        });
      }
    });
  }

  // 관심사 태그 생성
  createInterestTag(category, interest) {
    const tag = document.createElement("div");
    tag.className = "interest-tag";
    tag.setAttribute(
      "data-tooltip",
      `${this.getCategoryName(category)}: ${interest}`
    );
    tag.innerHTML = `
            ${interest}
            <button class="remove-btn" onclick="tourSearch.removeInterestTag('${category}', '${interest}')">&times;</button>
        `;

    tag.addEventListener("click", (e) => {
      if (!e.target.classList.contains("remove-btn")) {
        this.applyInterestFilter(category, interest);
      }
    });

    return tag;
  }

  // 카테고리 이름 매핑
  getCategoryName(category) {
    const nameMap = {
      region: "지역",
      companion: "동행",
      theme: "테마",
      activity: "활동",
      place: "장소",
      needs: "편의시설",
    };
    return nameMap[category] || category;
  }

  // 관심사 필터 적용
  applyInterestFilter(category, interest) {
    const filterElement = document.getElementById(category + "Filter");
    if (filterElement) {
      filterElement.value = interest;
      this.currentFilters[category] = interest;
      this.filterTours();
    }
  }

  // 관심사 태그 제거
  removeInterestTag(category, interest) {
    // 여기서는 UI에서만 제거 (실제 데이터 삭제는 별도 구현)
    this.renderInterestTags();
  }

  // 이벤트 리스너 설정
  setupEventListeners() {
    // 필터 변경 이벤트
    Object.keys(this.currentFilters).forEach((key) => {
      const element = document.getElementById(key + "Filter");
      if (element) {
        element.addEventListener("change", (e) => {
          this.currentFilters[key] = e.target.value;
          this.filterTours();
        });
      }
    });

    // 페이지네이션 이벤트
    document.getElementById("prevBtn").addEventListener("click", () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderTours();
        this.updatePagination();
      }
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.renderTours();
        this.updatePagination();
      }
    });
  }

  // 투어 데이터 로드 (더미 데이터 - 실제로는 API 호출)
  async loadTours() {
    try {
      // 실제 구현에서는 관광공사 API 호출
      // const response = await fetch('/api/tours');
      // this.tours = await response.json();

      // 더미 데이터
      this.tours = this.generateDummyTours();
      this.filteredTours = [...this.tours];
      this.calculatePagination();
    } catch (error) {
      console.error("투어 데이터 로드 실패:", error);
    }
  }

  // 더미 투어 데이터 생성
  generateDummyTours() {
    const regions = ["서울", "부산", "제주", "강원", "경기"];
    const themes = ["자연", "역사", "체험", "힐링", "축제"];
    const activities = ["맛집 탐방", "문화체험", "자연감상", "액티비티"];

    return Array.from({ length: 24 }, (_, i) => ({
      id: i + 1,
      title: `[경북 안동] 유무치원 역사 산책`,
      description: "지키게 인물 역사자 흐름, 부산샵~아이리스 융합점 동대",
      region: regions[i % regions.length],
      theme: themes[i % themes.length],
      activity: activities[i % activities.length],
      image: "/images/tour-placeholder.jpg",
      author: "역사탐험가",
      views: Math.floor(Math.random() * 1000) + 100,
      likes: Math.floor(Math.random() * 100) + 10,
      badge: "역사탐험가",
      companion: ["가족과", "친구와"][i % 2],
      place: ["도시관광", "역사"][i % 2],
      needs: i % 3 === 0 ? "접근성" : "",
    }));
  }

  // 투어 필터링 (지역+테마/활동 조합으로 일반 투어 검색)
  filterTours() {
    this.filteredTours = this.tours.filter((tour) => {
      return Object.keys(this.currentFilters).every((key) => {
        const filterValue = this.currentFilters[key];
        if (!filterValue) return true;

        return tour[key] === filterValue;
      });
    });

    console.log("필터 조건:", this.currentFilters);
    console.log("필터링된 투어 수:", this.filteredTours.length);

    // 지역+테마/활동 조합으로 연관 투어 우선 표시
    if (
      this.currentFilters.region ||
      this.currentFilters.theme ||
      this.currentFilters.activity
    ) {
      this.filteredTours = this.getRegionBasedTours();
    }

    this.currentPage = 1;
    this.calculatePagination();
    this.renderTours();
  }

  // 지역+테마/활동 기반 연관 투어 가져오기
  getRegionBasedTours() {
    const region = this.currentFilters.region;
    const theme = this.currentFilters.theme;
    const activity = this.currentFilters.activity;

    console.log("연관 투어 검색:", { region, theme, activity });

    // 1. 지역+선호테마로 연관 투어 찾기
    let regionThemeTours = [];
    if (region && theme) {
      regionThemeTours = this.tours.filter(
        (tour) => tour.region === region && tour.theme === theme
      );
    }

    // 2. 지역+선호활동으로 연관 투어 찾기
    let regionActivityTours = [];
    if (region && activity) {
      regionActivityTours = this.tours.filter(
        (tour) => tour.region === region && tour.activity === activity
      );
    }

    // 3. 지역만 맞는 투어 (backup)
    let regionOnlyTours = [];
    if (region) {
      regionOnlyTours = this.tours.filter(
        (tour) =>
          tour.region === region &&
          !regionThemeTours.includes(tour) &&
          !regionActivityTours.includes(tour)
      );
    }

    // 우선순위: 지역+테마 → 지역+활동 → 지역만 → 나머지
    const prioritizedTours = [
      ...regionThemeTours,
      ...regionActivityTours,
      ...regionOnlyTours,
      ...this.tours.filter(
        (tour) =>
          !regionThemeTours.includes(tour) &&
          !regionActivityTours.includes(tour) &&
          !regionOnlyTours.includes(tour) &&
          this.matchesOtherFilters(tour)
      ),
    ];

    // 중복 제거
    const uniqueTours = prioritizedTours.filter(
      (tour, index, self) => index === self.findIndex((t) => t.id === tour.id)
    );

    console.log("연관 투어 결과:", {
      "지역+테마": regionThemeTours.length,
      "지역+활동": regionActivityTours.length,
      지역만: regionOnlyTours.length,
      전체: uniqueTours.length,
    });

    return uniqueTours;
  }

  // 다른 필터 조건 매칭 확인
  matchesOtherFilters(tour) {
    return Object.keys(this.currentFilters).every((key) => {
      if (key === "region" || key === "theme" || key === "activity")
        return true;

      const filterValue = this.currentFilters[key];
      if (!filterValue) return true;

      return tour[key] === filterValue;
    });
  }

  // 페이지네이션 계산
  calculatePagination() {
    this.totalPages = Math.ceil(this.filteredTours.length / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  // 투어 렌더링
  renderTours() {
    const recommendedContainer = document.getElementById("recommendedTours");
    const searchResultsContainer = document.getElementById("searchResults");
    const noResultsElement = document.getElementById("noResults");

    // 맞춤 투어 1개 렌더링
    const recommendedTours = this.getRecommendedTours();
    recommendedContainer.innerHTML = "";

    if (recommendedTours.length > 0) {
      console.log("맞춤 투어 표시:", recommendedTours[0]);
      const card = this.createTourCard(recommendedTours[0], true);
      recommendedContainer.appendChild(card);
    } else {
      recommendedContainer.innerHTML = `
                <div class="no-personalized-tour">
                    <p>💡 관심사를 설정하면 맞춤 투어를 추천받을 수 있습니다.</p>
                    <button onclick="window.location.href='/interest-setting'" class="btn-primary">
                        관심사 설정하기
                    </button>
                </div>
            `;
    }

    // 검색 결과가 없는 경우
    if (this.filteredTours.length === 0) {
      noResultsElement.style.display = "block";
      searchResultsContainer.innerHTML = "";
      return;
    }

    noResultsElement.style.display = "none";

    // 검색 결과 투어 (페이지네이션 적용)
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentPageTours = this.filteredTours.slice(startIndex, endIndex);

    searchResultsContainer.innerHTML = "";
    currentPageTours.forEach((tour) => {
      const card = this.createTourCard(tour, false);
      searchResultsContainer.appendChild(card);
    });

    console.log("검색 결과 투어 수:", currentPageTours.length);
    this.updatePagination();
  }

  // 관심사 기반 맞춤 투어 1개 가져오기 (촘촘한 매칭)
  getRecommendedTours() {
    if (!this.userInterests) return [];

    // 사용자 관심사에서 첫 번째 값들 추출
    const userRegion =
      this.userInterests.region && this.userInterests.region[0];
    const userTheme = this.userInterests.theme && this.userInterests.theme[0];
    const userActivity =
      this.userInterests.activity && this.userInterests.activity[0];
    const userCompanion =
      this.userInterests.companion && this.userInterests.companion[0];

    console.log("사용자 관심사:", {
      userRegion,
      userTheme,
      userActivity,
      userCompanion,
    });

    // 정확한 매칭 점수 계산
    const scoredTours = this.tours.map((tour) => {
      let score = 0;
      let matchDetails = [];

      // 지역 매칭 (가장 중요)
      if (userRegion && tour.region === userRegion) {
        score += 40;
        matchDetails.push(`지역: ${userRegion}`);
      }

      // 테마 매칭
      if (userTheme && tour.theme === userTheme) {
        score += 30;
        matchDetails.push(`테마: ${userTheme}`);
      }

      // 활동 매칭
      if (userActivity && tour.activity === userActivity) {
        score += 20;
        matchDetails.push(`활동: ${userActivity}`);
      }

      // 동행 매칭
      if (userCompanion && tour.companion === userCompanion) {
        score += 10;
        matchDetails.push(`동행: ${userCompanion}`);
      }

      return {
        ...tour,
        matchScore: score,
        matchDetails: matchDetails,
        isPersonalized: score >= 40, // 최소 지역이 맞아야 맞춤 투어
      };
    });

    // 점수 순으로 정렬하고 맞춤 투어만 필터링
    const personalizedTours = scoredTours
      .filter((tour) => tour.isPersonalized && tour.matchScore >= 40)
      .sort((a, b) => b.matchScore - a.matchScore);

    console.log("맞춤 투어 후보:", personalizedTours.slice(0, 3));

    // 가장 높은 점수의 투어 1개만 반환
    return personalizedTours.length > 0 ? [personalizedTours[0]] : [];
  }

  // 투어 카드 생성 (맞춤 투어와 일반 투어 구분)
  createTourCard(tour, isRecommended = false) {
    const card = document.createElement("div");
    card.className = "tour-card";
    card.onclick = () => this.openTourDetail(tour.id);

    // 맞춤 투어인 경우 특별 표시
    let badgeHtml = `<span class="tour-badge">${tour.badge}</span>`;
    let matchInfoHtml = "";

    if (isRecommended && tour.matchDetails && tour.matchDetails.length > 0) {
      badgeHtml = `<span class="tour-badge personalized">맞춤 추천</span>`;
      matchInfoHtml = `
                <div class="match-info">
                    <small>🎯 ${tour.matchDetails.join(", ")}</small>
                </div>
            `;
    }

    card.innerHTML = `
            <img src="${tour.image}" alt="${tour.title}" class="tour-image" 
                 onerror="this.src='/images/default-tour.jpg'">
            <div class="tour-content">
                ${badgeHtml}
                <h3 class="tour-title">${tour.title}</h3>
                <p class="tour-description">${tour.description}</p>
                ${matchInfoHtml}
                <div class="tour-meta">
                    <div class="tour-author">
                        <div class="author-avatar"></div>
                        <div class="author-info">${tour.author}</div>
                    </div>
                    <div class="tour-stats">
                        <div class="tour-stat">
                            <span>👁</span>
                            <span>${tour.views}</span>
                        </div>
                        <div class="tour-stat">
                            <span>❤</span>
                            <span>${tour.likes}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    return card;
  }

  // 투어 상세 페이지 열기
  openTourDetail(tourId) {
    window.location.href = `/tours/${tourId}`;
  }

  // 페이지네이션 업데이트
  updatePagination() {
    const paginationNumbers = document.getElementById("paginationNumbers");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    // 이전/다음 버튼 상태 업데이트
    prevBtn.disabled = this.currentPage === 1;
    nextBtn.disabled = this.currentPage === this.totalPages;

    // 페이지 번호 생성
    paginationNumbers.innerHTML = "";
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    // 시작 페이지 조정
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `pagination-number ${
        i === this.currentPage ? "active" : ""
      }`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        this.currentPage = i;
        this.renderTours();
      };
      paginationNumbers.appendChild(pageBtn);
    }
  }

  // 필터 초기화
  resetFilters() {
    Object.keys(this.currentFilters).forEach((key) => {
      this.currentFilters[key] = "";
      const element = document.getElementById(key + "Filter");
      if (element) {
        element.value = "";
      }
    });
    this.filterTours();
  }

  // API 호출 관련 메서드들
  async callTourismAPI(params) {
    try {
      // 실제 관광공사 API 호출 구현
      const apiKey = "YOUR_API_KEY";
      const baseUrl = "http://apis.data.go.kr/B551011/KorService1/";

      const queryParams = new URLSearchParams({
        serviceKey: apiKey,
        numOfRows: 12,
        pageNo: this.currentPage,
        MobileOS: "WEB",
        MobileApp: "YeogiButeo",
        _type: "json",
        ...params,
      });

      const response = await fetch(`${baseUrl}areaBasedList1?${queryParams}`);
      const data = await response.json();

      return this.processTourismAPIData(data);
    } catch (error) {
      console.error("관광공사 API 호출 실패:", error);
      return [];
    }
  }

  // API 데이터 처리
  processTourismAPIData(apiData) {
    try {
      const items = apiData.response?.body?.items?.item || [];
      return items.map((item) => ({
        id: item.contentid,
        title: item.title,
        description: item.overview || "상세 설명이 없습니다.",
        region: this.getRegionFromAreaCode(item.areacode),
        image: item.firstimage || "/images/default-tour.jpg",
        address: item.addr1,
        tel: item.tel,
        contentTypeId: item.contenttypeid,
        mapX: item.mapx,
        mapY: item.mapy,
        views: Math.floor(Math.random() * 1000) + 100,
        likes: Math.floor(Math.random() * 100) + 10,
        author: "관광공사",
        badge: this.getContentTypeName(item.contenttypeid),
      }));
    } catch (error) {
      console.error("API 데이터 처리 실패:", error);
      return [];
    }
  }

  // 지역 코드를 지역명으로 변환
  getRegionFromAreaCode(areaCode) {
    const areaMap = {
      1: "서울",
      2: "인천",
      3: "대전",
      4: "대구",
      5: "광주",
      6: "부산",
      7: "울산",
      8: "세종",
      31: "경기",
      32: "강원",
      33: "충북",
      34: "충남",
      35: "전북",
      36: "전남",
      37: "경북",
      38: "경남",
      39: "제주",
    };
    return areaMap[areaCode] || "기타";
  }

  // 콘텐츠 타입명 가져오기
  getContentTypeName(contentTypeId) {
    const typeMap = {
      12: "관광지",
      14: "문화시설",
      15: "축제공연행사",
      25: "여행코스",
      28: "레포츠",
      32: "숙박",
      38: "쇼핑",
      39: "음식점",
    };
    return typeMap[contentTypeId] || "기타";
  }

  // 사용자 관심사 업데이트
  async updateUserInterests(interests) {
    try {
      const response = await fetch("/api/user/interests", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(interests),
      });

      if (response.ok) {
        this.userInterests = interests;
        this.renderInterestTags();
        await this.loadTours();
        this.renderTours();
      }
    } catch (error) {
      console.error("관심사 업데이트 실패:", error);
    }
  }

  // 검색 기록 저장
  saveSearchHistory(filters) {
    try {
      const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
      const newSearch = {
        filters: { ...filters },
        timestamp: new Date().toISOString(),
        results: this.filteredTours.length,
      };

      history.unshift(newSearch);
      if (history.length > 10) history.pop(); // 최대 10개 기록 유지

      localStorage.setItem("searchHistory", JSON.stringify(history));
    } catch (error) {
      console.error("검색 기록 저장 실패:", error);
    }
  }

  // 즐겨찾기 토글
  async toggleFavorite(tourId) {
    try {
      const response = await fetch(`/api/tours/${tourId}/favorite`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        this.updateFavoriteUI(tourId, result.isFavorite);
      }
    } catch (error) {
      console.error("즐겨찾기 토글 실패:", error);
    }
  }

  // 즐겨찾기 UI 업데이트
  updateFavoriteUI(tourId, isFavorite) {
    const card = document.querySelector(`[data-tour-id="${tourId}"]`);
    if (card) {
      const favoriteBtn = card.querySelector(".favorite-btn");
      if (favoriteBtn) {
        favoriteBtn.classList.toggle("active", isFavorite);
        favoriteBtn.innerHTML = isFavorite ? "❤️" : "🤍";
      }
    }
  }
}

// 전역 변수로 인스턴스 생성
let tourSearch;

// DOM 로드 완료 시 초기화
document.addEventListener("DOMContentLoaded", () => {
  tourSearch = new TourSearchManager();
});

// 유틸리티 함수들
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getRelativeTime(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return "방금 전";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)}일 전`;

  return past.toLocaleDateString("ko-KR");
}
