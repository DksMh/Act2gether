// main.js - 메인 페이지 동작 스크립트

$(document).ready(function () {
  // 전역 변수
  let isLoading = false;

  // 초기화
  init();

  function init() {
    // 이벤트 바인딩
    bindEvents();
    // 슬라이더 초기화
    initAllSliders();
    // 사용자 세션 체크
    checkUserSession();
  }

  // 사용자 세션 체크
  function checkUserSession() {
    $.ajax({
      url: "/api/current-user",
      method: "GET",
      success: function (data) {
        console.log("세션 정보:", data);
        if (data.isAuthenticated) {
          console.log("로그인 사용자:", data.username);
        }
      },
      error: function () {
        console.error("세션 체크 실패");
      },
    });
  }

  // 이벤트 바인딩
  function bindEvents() {
    // 여행 타입 필터 클릭
    $(".travel-type-filter li").on("click", function () {
      if (isLoading) return;

      $(".travel-type-filter li").removeClass("active");
      $(this).addClass("active");

      const type = $(this).data("type");
      console.log("선택된 타입:", type);
      filterByTravelType(type);
    });

    // 지역 필터 클릭
    $(".region-filter .region").on("click", function () {
      if (isLoading) return;

      $(".region-filter .region").removeClass("active");
      $(this).addClass("active");

      const region = $(this).data("region");
      loadRegionExperiences(region);
    });

    // 투어 카드 클릭 - 상세 페이지 이동
    $(document).on("click", ".tour-card", function (e) {
      e.preventDefault();
      const tourId = $(this).data("id");
      if (tourId) {
        window.location.href = `/tour-detail?contentId=${tourId}`;
      }
    });

    // 더보기 버튼
    $(".more-button").on("click", function () {
      window.location.href = "/community-search";
    });

    // 동행 모임 둘러보기 버튼
    $(document).on(
      "click",
      ".companion-recommend-section .btn-primary",
      function () {
        const groupId = $(this).closest(".product-card").data("group-id");
        window.location.href = `/community-search?groupId=${groupId}`;
      }
    );
  }

  // 모든 슬라이더 초기화
  function initAllSliders() {
    $(".tour-slider").each(function () {
      initSlider($(this));
    });
  }

  // 개별 슬라이더 초기화
  function initSlider($slider) {
    const $wrapper = $slider.find(".tour-cards-wrapper");
    const $cards = $slider.find(".tour-cards");
    let $dots = $slider.siblings(".slider-dots");

    // slider-dots가 형제 요소가 아닌 경우 부모에서 찾기
    if ($dots.length === 0) {
      $dots = $slider.parent().find(".slider-dots");
    }

    // 카드 개수 확인
    const $allCards = $cards.find(".tour-card, .product-card");
    const totalCards = $allCards.length;

    if (totalCards === 0) return;

    // 뷰포트 너비에 따른 카드 개수 설정
    const viewportWidth = $(window).width();
    let cardsPerView = 3;

    if (viewportWidth <= 768) {
      cardsPerView = 1;
    } else if (viewportWidth <= 1024) {
      cardsPerView = 2;
    }

    const totalSlides = Math.ceil(totalCards / cardsPerView);

    // 슬라이더 화살표 버튼 추가 (없는 경우)
    if ($slider.find(".slider-arrow").length === 0) {
      $slider.append('<button class="slider-arrow left">←</button>');
      $slider.append('<button class="slider-arrow right">→</button>');
    }

    // 화살표 이벤트 바인딩
    $slider
      .find(".slider-arrow.left")
      .off("click")
      .on("click", function () {
        slideCards($slider, -1);
      });

    $slider
      .find(".slider-arrow.right")
      .off("click")
      .on("click", function () {
        slideCards($slider, 1);
      });

    // 도트 생성 및 업데이트
    if ($dots.length > 0) {
      $dots.empty();
      for (let i = 0; i < totalSlides; i++) {
        $dots.append(`<span class="dot ${i === 0 ? "active" : ""}"></span>`);
      }

      // 도트 클릭 이벤트
      $dots
        .find(".dot")
        .off("click")
        .on("click", function () {
          const index = $(this).index();
          goToSlide($slider, index);
        });
    }

    // 데이터 저장
    $slider.data("currentIndex", 0);
    $slider.data("totalSlides", totalSlides);
    $slider.data("cardsPerView", cardsPerView);

    // 초기 위치 설정
    goToSlide($slider, 0);
  }

  // 슬라이더 이동
  function slideCards($slider, direction) {
    const currentIndex = $slider.data("currentIndex") || 0;
    const totalSlides = $slider.data("totalSlides") || 1;

    let newIndex = currentIndex + direction;

    // 범위 체크
    if (newIndex < 0) newIndex = totalSlides - 1;
    if (newIndex >= totalSlides) newIndex = 0;

    goToSlide($slider, newIndex);
  }

  // 특정 슬라이드로 이동
  function goToSlide($slider, index) {
    const $cards = $slider.find(".tour-cards");
    const cardsPerView = $slider.data("cardsPerView") || 3;
    const $firstCard = $cards.find(".tour-card, .product-card").first();

    if ($firstCard.length === 0) return;

    // 카드 너비 계산 (마진 포함)
    const cardWidth = $firstCard.outerWidth(true);

    // 이동 거리 계산
    const translateX = -(index * cardsPerView * cardWidth);

    // CSS transform 적용
    $cards.css({
      transform: `translateX(${translateX}px)`,
      transition: "transform 0.3s ease",
    });

    // 도트 업데이트
    let $dots = $slider.siblings(".slider-dots");
    if ($dots.length === 0) {
      $dots = $slider.parent().find(".slider-dots");
    }

    if ($dots.length > 0) {
      $dots.find(".dot").removeClass("active");
      $dots.find(".dot").eq(index).addClass("active");
    }

    // 인덱스 저장
    $slider.data("currentIndex", index);
  }

  // 여행 타입별 필터링
  function filterByTravelType(type) {
    const typeMapping = {
      culture: "문화시설",
      healing: "휴양관광지",
      nature: "자연관광지",
      festival: "축제",
      experience: "체험관광지",
      food: "맛집",
    };

    const placeMapping = {
      culture: ["박물관", "미술관", "고궁/문"],
      healing: ["온천", "테마파크", "찜질방"],
      nature: ["해변", "산/공원", "계곡/폭포", "수목원"],
      festival: ["축제"],
      experience: ["체험"],
      food: ["맛집"],
    };

    const places = placeMapping[type] || [];

    if (places.length > 0) {
      loadFilteredTours(places);
    }
  }

  // 필터링된 투어 로드
  function loadFilteredTours(places) {
    isLoading = true;
    $(".usernickname-section .tour-cards-wrapper").addClass("loading");

    $.ajax({
      url: "/api/tours/search",
      method: "GET",
      data: {
        places: JSON.stringify(places),
        numOfRows: 6,
      },
      success: function (response) {
        if (response.success && response.data) {
          updateTourCards(".usernickname-section", response.data);
        }
      },
      error: function () {
        console.error("투어 필터링 실패");
      },
      complete: function () {
        isLoading = false;
        $(".usernickname-section .tour-cards-wrapper").removeClass("loading");
      },
    });
  }

  // 투어 카드 업데이트
  function updateTourCards(sectionSelector, tours) {
    const $container = $(sectionSelector).find(".tour-cards");
    $container.empty();

    if (!tours || tours.length === 0) {
      $container.append(`
        <div class="tour-card">
          <div class="thumbnail">
            <img src="/uploads/tour/no-image.png" alt="기본 이미지" />
          </div>
          <div class="tags">
            <span>관광</span>
          </div>
          <h4>관련 여행지를 찾을 수 없습니다</h4>
          <p>다른 조건으로 검색해보세요</p>
        </div>
      `);
      return;
    }

    tours.forEach(function (tour) {
      const imageUrl =
        tour.firstimage || tour.firstimage2 || "/uploads/tour/no-image.png";
      const card = `
        <div class="tour-card" data-id="${tour.contentid}">
          <div class="thumbnail">
            <img src="${imageUrl}" alt="${
        tour.title
      }" onerror="this.src='/uploads/tour/no-image.png'" />
          </div>
          <div class="tags">
            <span>${tour.categoryName || "관광"}</span>
          </div>
          <h4>${tour.title}</h4>
          <p>${tour.addr1 || "주소 정보 없음"}</p>
        </div>
      `;
      $container.append(card);
    });

    // 슬라이더 재초기화
    const $slider = $(sectionSelector).find(".tour-slider");
    initSlider($slider);
  }

  // 지역별 체험 로드
  function loadRegionExperiences(region) {
    isLoading = true;
    $(".experience-section .tour-cards-wrapper").addClass("loading");

    // 지역코드 매핑
    const regionCodeMap = {
      seoul: "1",
      gyeonggi: "31",
      gangwon: "32",
      daejeon: "3",
      busan: "6",
      jeju: "39",
      gyeongbuk: "35",
    };

    const areaCode = regionCodeMap[region] || "1";

    $.ajax({
      url: "/api/tours/search",
      method: "GET",
      data: {
        areaCode: areaCode,
        places: JSON.stringify(["체험"]),
        numOfRows: 4,
      },
      success: function (response) {
        if (response.success && response.data) {
          displayExperienceCards(response.data);
        } else {
          displayDefaultExperiences();
        }
      },
      error: function () {
        console.error("체험 데이터 로드 실패");
        displayDefaultExperiences();
      },
      complete: function () {
        isLoading = false;
        $(".experience-section .tour-cards-wrapper").removeClass("loading");
      },
    });
  }

  // 체험 카드 표시
  function displayExperienceCards(experiences) {
    const $container = $(".experience-section .tour-cards-wrapper");
    $container.empty();

    if (!experiences || experiences.length === 0) {
      displayDefaultExperiences();
      return;
    }

    // 최대 2개만 표시
    const displayCount = Math.min(experiences.length, 2);

    for (let i = 0; i < displayCount; i++) {
      const exp = experiences[i];
      const card = `
        <div class="product-card" data-id="${exp.contentid}">
          <div class="card-header">
            <h3>${exp.title}</h3>
            <span class="arrow">→</span>
          </div>
          <p class="desc">${exp.addr1 || "특별한 체험 프로그램"}</p>
          <p class="meta">체험 프로그램 운영 중</p>
        </div>
      `;
      $container.append(card);
    }
  }

  // 기본 체험 카드 표시
  function displayDefaultExperiences() {
    const $container = $(".experience-section .tour-cards-wrapper");
    $container.html(`
      <div class="product-card">
        <div class="card-header">
          <h3>체험 프로그램 준비 중</h3>
          <span class="arrow">→</span>
        </div>
        <p class="desc">해당 지역의 체험 프로그램을 준비 중입니다.</p>
        <p class="meta">곧 만나보실 수 있어요!</p>
      </div>
    `);
  }

  // 반응형 처리
  $(window).resize(function () {
    initAllSliders();
  });

  // 터치 이벤트 (모바일)
  let touchStartX = 0;
  let touchEndX = 0;

  $(document).on("touchstart", ".tour-cards", function (e) {
    touchStartX = e.touches[0].clientX;
  });

  $(document).on("touchend", ".tour-cards", function (e) {
    touchEndX = e.changedTouches[0].clientX;
    const $slider = $(this).closest(".tour-slider");

    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      // 50px 이상 스와이프
      if (diff > 0) {
        // 왼쪽 스와이프 - 다음
        slideCards($slider, 1);
      } else {
        // 오른쪽 스와이프 - 이전
        slideCards($slider, -1);
      }
    }
  });
});
