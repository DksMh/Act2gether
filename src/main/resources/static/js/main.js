// main.js - 메인 페이지 동작 스크립트

$(document).ready(function () {
  // 전역 변수
  let isLoading = false;
  let currentUser = null;
  let currentTravelType = "culture"; // 기본값

  // 초기화
  init();

  function init() {
    // 사용자 세션 체크 (먼저 실행)
    checkUserSession();
    // 이벤트 바인딩
    bindEvents();
    // 메인 슬라이더 시작
    startMainSlider();
    // 슬라이더 초기화
    initAllSliders();
    // 초기 투어 상품 로드
    loadTourProducts("culture");
  }

  // 사용자 세션 체크
  function checkUserSession() {
    $.ajax({
      url: "/api/current-user",
      method: "GET",
      async: false, // 동기 처리로 사용자 정보 먼저 확인
      success: function (data) {
        console.log("세션 정보:", data);
        if (data.isAuthenticated) {
          currentUser = data;
          console.log("로그인 사용자:", data.username);
        }
      },
      error: function () {
        console.error("세션 체크 실패");
      },
    });
  }

  // 메인 슬라이더 시작
  function startMainSlider() {
    let currentSlide = 0;
    const slides = $(".main-slider .slide");
    const indicators = $(".main-slider .indicator");

    if (slides.length === 0) return;

    // 3초마다 자동 전환
    setInterval(function () {
      slides.removeClass("active");
      indicators.removeClass("active");

      currentSlide = (currentSlide + 1) % slides.length;

      slides.eq(currentSlide).addClass("active");
      indicators.eq(currentSlide).addClass("active");
    }, 3000);

    // 인디케이터 클릭 이벤트
    indicators.on("click", function () {
      const index = $(this).data("slide");
      slides.removeClass("active");
      indicators.removeClass("active");

      slides.eq(index).addClass("active");
      $(this).addClass("active");
      currentSlide = index;
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
      currentTravelType = type;
      console.log("선택된 타입:", type);

      // 투어 상품 로드
      loadTourProducts(type);
    });

    // 지역 필터 클릭
    $(".region-filter .region").on("click", function () {
      if (isLoading) return;

      $(".region-filter .region").removeClass("active");
      $(this).addClass("active");

      const region = $(this).data("region");
      loadRegionExperiences(region);
    });

    // 투어 상품 카드 클릭 - 로그인 체크 후 처리
    $(document).on("click", ".tour-card.tour-product", function (e) {
      e.preventDefault();
      const tourId = $(this).data("id");

      if (!currentUser || !currentUser.isAuthenticated) {
        // 비로그인 시 로그인 페이지로
        alert("투어 상품을 이용하시려면 로그인이 필요합니다.");
        window.location.href = `/login?redirect=/tour-detail?contentId=${tourId}`;
      } else {
        // 로그인 시 상세 페이지로
        window.location.href = `/tour-detail?contentId=${tourId}`;
      }
    });

    // 일반 투어 카드 클릭 (계절별, 지역별 등)
    $(document).on("click", ".tour-card:not(.tour-product)", function (e) {
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

  // 투어 상품 로드
  function loadTourProducts(type) {
    isLoading = true;

    // 타입별 매핑
    const typeNameMap = {
      culture: "문화",
      healing: "힐링",
      nature: "자연",
      festival: "축제",
      experience: "체험",
      food: "맛집",
    };

    const placeMapping = {
      culture: ["박물관", "미술관", "고궁/문", "사찰"],
      healing: ["온천", "테마파크", "찜질방", "관광단지"],
      nature: ["해변", "산/공원", "계곡/폭포", "수목원"],
      festival: ["축제", "행사"],
      experience: ["체험"],
      food: ["맛집", "전통시장"],
    };

    // 제목 업데이트
    $(".tour-products-section .travel-theme").text(typeNameMap[type]);

    // 지역 설정 (로그인 여부에 따라)
    let areaCode = "";
    if (currentUser && currentUser.isAuthenticated) {
      // 로그인 시 - 사용자 관심 지역 (서버에서 처리되므로 별도 설정 불필요)
      console.log("로그인 사용자 - 관심 지역 기반 검색");
    } else {
      // 비로그인 시 - 랜덤 지역
      const areaCodes = [
        "1",
        "31",
        "32",
        "33",
        "34",
        "35",
        "36",
        "37",
        "38",
        "39",
      ];
      areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
      console.log("비로그인 - 랜덤 지역:", areaCode);
    }

    const places = placeMapping[type] || [];

    // API 호출
    $.ajax({
      url: "/api/tour-products/search", // 투어 상품 전용 엔드포인트
      method: "GET",
      data: {
        places: JSON.stringify(places),
        areaCode: areaCode,
        numOfRows: 6,
        travelType: type,
      },
      success: function (response) {
        if (response.success && response.data) {
          updateTourProductCards(response.data);
        } else {
          // 데이터가 없으면 일반 관광지 API 호출
          loadAlternativeTours(places, areaCode);
        }
      },
      error: function () {
        console.error("투어 상품 로드 실패");
        loadAlternativeTours(places, areaCode);
      },
      complete: function () {
        isLoading = false;
      },
    });
  }

  // 대체 투어 데이터 로드 (투어 상품이 없을 때)
  function loadAlternativeTours(places, areaCode) {
    $.ajax({
      url: "/api/tours/search",
      method: "GET",
      data: {
        places: JSON.stringify(places),
        areaCode: areaCode,
        numOfRows: 6,
      },
      success: function (response) {
        if (response.success && response.data) {
          updateTourProductCards(response.data, true); // isAlternative = true
        }
      },
      error: function () {
        console.error("대체 투어 로드 실패");
        showNoProductsMessage();
      },
    });
  }

  // 투어 상품 카드 업데이트
  function updateTourProductCards(tours, isAlternative = false) {
    const $container = $("#tourProductCards");
    $container.empty();

    if (!tours || tours.length === 0) {
      showNoProductsMessage();
      return;
    }

    tours.forEach(function (tour) {
      const imageUrl =
        tour.firstimage || tour.firstimage2 || "/uploads/tour/no-image.png";
      const badge = isAlternative ? "관광지" : "투어 상품";

      const card = `
        <div class="tour-card tour-product" data-id="${
          tour.contentid
        }" data-type="product">
          <div class="product-badge">${badge}</div>
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
          ${
            !isAlternative
              ? `
          <div class="product-info">
            <span class="price">가격 정보 준비중</span>
            <span class="duration">소요 시간 정보</span>
          </div>`
              : ""
          }
        </div>
      `;
      $container.append(card);
    });

    // 슬라이더 재초기화
    const $slider = $(".tour-products-section .tour-slider");
    initSlider($slider);
  }

  // 상품 없음 메시지 표시
  function showNoProductsMessage() {
    const $container = $("#tourProductCards");
    $container.html(`
      <div class="tour-card tour-product">
        <div class="product-badge">준비중</div>
        <div class="thumbnail">
          <img src="/uploads/tour/no-image.png" alt="기본 이미지" />
        </div>
        <div class="tags">
          <span>${currentTravelType}</span>
        </div>
        <h4>투어 상품을 준비 중입니다</h4>
        <p>곧 만나보실 수 있어요!</p>
      </div>
    `);
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

    if ($dots.length === 0) {
      $dots = $slider.parent().find(".slider-dots");
    }

    const $allCards = $cards.find(".tour-card, .product-card");
    const totalCards = $allCards.length;

    if (totalCards === 0) return;

    const viewportWidth = $(window).width();
    let cardsPerView = 3;

    if (viewportWidth <= 768) {
      cardsPerView = 1;
    } else if (viewportWidth <= 1024) {
      cardsPerView = 2;
    }

    const totalSlides = Math.ceil(totalCards / cardsPerView);

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

      $dots
        .find(".dot")
        .off("click")
        .on("click", function () {
          const index = $(this).index();
          goToSlide($slider, index);
        });
    }

    $slider.data("currentIndex", 0);
    $slider.data("totalSlides", totalSlides);
    $slider.data("cardsPerView", cardsPerView);

    goToSlide($slider, 0);
  }

  // 슬라이더 이동
  function slideCards($slider, direction) {
    const currentIndex = $slider.data("currentIndex") || 0;
    const totalSlides = $slider.data("totalSlides") || 1;

    let newIndex = currentIndex + direction;

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

    const cardWidth = $firstCard.outerWidth(true);
    const translateX = -(index * cardsPerView * cardWidth);

    $cards.css({
      transform: `translateX(${translateX}px)`,
      transition: "transform 0.3s ease",
    });

    let $dots = $slider.siblings(".slider-dots");
    if ($dots.length === 0) {
      $dots = $slider.parent().find(".slider-dots");
    }

    if ($dots.length > 0) {
      $dots.find(".dot").removeClass("active");
      $dots.find(".dot").eq(index).addClass("active");
    }

    $slider.data("currentIndex", index);
  }

  // 지역별 체험 로드
  function loadRegionExperiences(region) {
    isLoading = true;
    $(".experience-section .tour-cards-wrapper").addClass("loading");

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
      if (diff > 0) {
        slideCards($slider, 1);
      } else {
        slideCards($slider, -1);
      }
    }
  });
});
