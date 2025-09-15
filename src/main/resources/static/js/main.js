// main.js - 메인 페이지 동작 스크립트 완전 수정본

$(document).ready(function () {
  // 전역 변수
  let requestQueue = [];
  let isProcessing = false;
  const tourCache = new Map();
  let isLoading = false;
  let currentUser = null;
  let currentTravelType = "culture";

  // 초기화
  init();

  function init() {
    checkUserSession();
    bindEvents();
    startMainSlider();
    initAllSliders();
    initSeasonalSlider();
    generateTour("culture"); // 초기 로드 시 문화 투어 생성
    // 서울 데이터는 서버에서 렌더링되므로 별도 로드 불필요
  }

  // 사용자 세션 체크
  function checkUserSession() {
    $.ajax({
      url: "/api/current-user",
      method: "GET",
      async: false,
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

    setInterval(function () {
      slides.removeClass("active");
      indicators.removeClass("active");

      currentSlide = (currentSlide + 1) % slides.length;

      slides.eq(currentSlide).addClass("active");
      indicators.eq(currentSlide).addClass("active");
    }, 3000);

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

      generateTour(type);
    });

    // 지역 필터 클릭 (지역별 체험)
    $(".region-filter .region").on("click", function () {
      if (isLoading) return;

      $(".region-filter .region").removeClass("active");
      $(this).addClass("active");

      const region = $(this).data("region");
      console.log("선택된 지역:", region);

      loadRegionExperiences(region);
    });

    // 계절별 투어 카드 클릭 이벤트
    $(document).on("click", ".seasonal-tour", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const $card = $(this);
      const tourId = $card.data("tour-id");
      const cityName = $card.data("city");

      if (!tourId) {
        console.log("투어 ID가 없습니다");
        return;
      }

      // 로그인 체크
      if (!currentUser || !currentUser.isAuthenticated) {
        if (
          confirm(
            "투어 상세 정보를 보시려면 로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?"
          )
        ) {
          window.location.href = `/login?redirect=/tour-detail?tourId=${tourId}`;
        }
      } else {
        console.log(`${cityName} 투어 상세 페이지로 이동: ${tourId}`);
        window.location.href = `/tour-detail?tourId=${tourId}`;
      }
    });

    // 일반 투어 카드 클릭 (계절별이 아닌 다른 카드들)
    $(document).on("click", ".tour-card:not(.seasonal-tour)", function (e) {
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

  // 투어 생성 함수 - 캐싱 적용
  function generateTour(type) {
    // 캐시 확인
    const cached = tourCache.get(type);
    if (cached && Date.now() - cached.time < 300000) {
      // 5분 캐시
      console.log("캐시에서 투어 데이터 사용:", type);
      displayTourCards(cached.data);
      updateTravelThemeTitle(type);
      return;
    }

    // 중복 요청 방지
    if (isProcessing) {
      console.log("이미 처리 중인 요청이 있습니다");
      return;
    }

    isLoading = true;
    isProcessing = true;
    showLoadingMessage();

    $.ajax({
      url: "/api/tours/generate",
      method: "GET",
      data: {
        travelType: type,
        numOfRows: 6,
      },
      success: function (response) {
        console.log("투어 생성 응답:", response);

        if (response.success && response.data) {
          // 캐시에 저장
          tourCache.set(type, {
            data: response.data,
            time: Date.now(),
          });

          displayTourCards(response.data);
          updateTravelThemeTitle(type);
        } else {
          showNoToursMessage();
        }
      },
      error: function (xhr, status, error) {
        console.error("투어 생성 실패:", error);
        showNoToursMessage();
      },
      complete: function () {
        isLoading = false;
        isProcessing = false;
      },
    });
  }

  // 여러 투어 카드 표시 함수
  function displayTourCards(data) {
    const $container = $("#tourProductContainer");
    $container.empty();

    const tourList = data.tourList;
    const tourType = data.tourType;

    if (!tourList || tourList.length === 0) {
      showNoToursMessage();
      return;
    }

    const typeNameMap = {
      culture: "문화",
      healing: "휴양",
      nature: "자연",
      experience: "체험",
      sports: "레포츠",
    };

    const typeName = typeNameMap[tourType] || "종합";

    const tourCardsHtml = `
    <div class="tour-product-grid">
      ${tourList
        .map((tourData, index) => {
          const tours = tourData.tours;
          const tourId = tourData.tourId;
          let cityName = tourData.cityName || "지역";
          const representativeTour = tourData.representativeTour || tours[0];

          // 광역시 체크 및 시/군/구 제거
          const metropolitanCities = [
            "서울특별시",
            "부산광역시",
            "대구광역시",
            "인천광역시",
            "광주광역시",
            "대전광역시",
            "울산광역시",
            "세종특별자치시",
          ];

          // cityName이 광역시를 포함하는지 체크
          for (let metro of metropolitanCities) {
            if (cityName.includes(metro)) {
              cityName = metro;
              break;
            }
          }

          // 썸네일 이미지 결정
          let displayImage = tourData.mainImage || "";

          if (!displayImage) {
            for (let i = 0; i < tours.length; i++) {
              const tour = tours[i];
              if (tour.firstimage && !tour.firstimage.includes("no-image")) {
                displayImage = tour.firstimage;
                break;
              } else if (
                tour.optimizedImage &&
                !tour.optimizedImage.includes("no-image")
              ) {
                displayImage = tour.optimizedImage;
                break;
              } else if (
                tour.firstimage2 &&
                !tour.firstimage2.includes("no-image")
              ) {
                displayImage = tour.firstimage2;
                break;
              }
            }
          }

          if (!displayImage || displayImage.includes("no-image")) {
            const defaultImages = {
              culture: "/images/default-culture.jpg",
              healing: "/images/default-healing.jpg",
              nature: "/images/default-nature.jpg",
              experience: "/images/default-experience.jpg",
              sports: "/images/default-sports.jpg",
            };
            displayImage =
              defaultImages[tourType] || "/uploads/tour/no-image.png";
          }

          return `
          <div class="tour-product-card compact" data-tour-id="${tourId}" data-tour-type="${tourType}">
            <div class="tour-header">
              <h3>${cityName} ${typeName} 투어</h3>
            </div>
            <div class="tour-main-image">
              <img src="${displayImage}" 
                   alt="${cityName} ${typeName} 투어" 
                   onerror="this.src='/images/default-${tourType}.jpg'; this.onerror=function(){this.src='/uploads/tour/no-image.png'};">
              <span class="tour-count-badge">${tours.length}개 명소</span>
            </div>
            <div class="tour-places compact">
              <h4>포함된 관광지</h4>
              <div class="place-list">
                <div class="place-item highlight">
                  <div class="place-number">1</div>
                  <div class="place-info">
                    <h5>${
                      representativeTour.title ||
                      representativeTour.cleanTitle ||
                      "관광지"
                    }</h5>
                    <p>${
                      representativeTour.addr1
                        ? representativeTour.addr1
                            .split(" ")
                            .slice(0, 2)
                            .join(" ")
                        : cityName
                    }</p>
                  </div>
                </div>
                <div class="more-places">
                  <span>외 ${tours.length - 1}개 명소</span>
                </div>
              </div>
            </div>
            <div class="tour-action">
              <button class="btn-view-detail">투어 상세보기</button>
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;

    $container.html(tourCardsHtml);

    // 상세보기 버튼
    $(".btn-view-detail")
      .off("click")
      .on("click", function () {
        const tourId = $(this).closest(".tour-product-card").data("tour-id");

        if (!currentUser || !currentUser.isAuthenticated) {
          alert("투어 상세 정보를 보시려면 로그인이 필요합니다.");
          window.location.href = `/login?redirect=/tour-detail?tourId=${tourId}`;
        } else {
          window.location.href = `/tour-detail?tourId=${tourId}`;
        }
      });
  }

  // 지역별 체험 로드 함수
  function loadRegionExperiences(region) {
    isLoading = true;
    $(".experience-section .tour-cards-wrapper").addClass("loading");

    // 지역 코드 매핑 (한국관광공사 코드)
    const regionCodeMap = {
      seoul: "1",
      incheon: "2",
      daejeon: "3",
      daegu: "4",
      gwangju: "5",
      busan: "6",
      ulsan: "7",
      sejong: "8",
      gyeonggi: "31",
      gangwon: "32",
      chungbuk: "33",
      chungnam: "34",
      jeonbuk: "35",
      jeonnam: "36",
      gyeongbuk: "37",
      gyeongnam: "38",
      jeju: "39",
    };

    const regionCode = regionCodeMap[region] || "1";

    $.ajax({
      url: "/api/tours/regional",
      method: "GET",
      data: {
        region: regionCode,
      },
      success: function (response) {
        console.log(`${response.regionName} 투어 데이터:`, response);

        if (response.success && response.data && response.data.length > 0) {
          displayRegionalTours(response.data, response.regionName);
        } else {
          displayNoDataMessage(response.regionName || region);
        }
      },
      error: function () {
        console.error("지역별 투어 데이터 로드 실패");
        displayNoDataMessage(region);
      },
      complete: function () {
        isLoading = false;
        $(".experience-section .tour-cards-wrapper").removeClass("loading");
      },
    });
  }

  // 지역별 투어 카드 표시 함수
  function displayRegionalTours(tours, regionName) {
    const $container = $(".experience-section .tour-cards");
    $container.empty();

    tours.forEach(function (tour, index) {
      const card = `
        <div class="product-card regional-tour" data-id="${tour.tourId}" data-url="${tour.url}">
          <div class="card-header">
            <h3>${tour.title}</h3>
            <span class="arrow">→</span>
          </div>
          <p class="desc">${tour.description}</p>
          <p class="meta">${regionName} 지역 특색 체험</p>
        </div>
      `;
      $container.append(card);
    });

    // 카드 클릭 이벤트 - URL이 있으면 새 탭에서 열기
    $(".product-card.regional-tour")
      .off("click")
      .on("click", function () {
        const url = $(this).data("url");
        if (url && url !== "null" && url !== "") {
          window.open(url, "_blank");
        } else {
          alert("상세 페이지 준비 중입니다.");
        }
      });

    // 슬라이더 재초기화 (카드가 많을 경우)
    if (tours.length > 3) {
      const $slider = $(".experience-section .tour-slider");
      initSlider($slider);
    }
  }

  // 데이터 없음 메시지 표시
  function displayNoDataMessage(regionName) {
    const $container = $(".experience-section .tour-cards");
    $container.html(`
      <div class="product-card">
        <div class="card-header">
          <h3>${regionName} 지역 투어 준비 중</h3>
          <span class="arrow">→</span>
        </div>
        <p class="desc">현재 ${regionName} 지역의 투어 프로그램을 준비하고 있습니다.</p>
        <p class="meta">곧 만나보실 수 있어요!</p>
      </div>
    `);
  }

  // 계절별 투어 슬라이더 초기화
  function initSeasonalSlider() {
    const $seasonSection = $(".season-section");
    if ($seasonSection.length === 0) return;

    const $slider = $seasonSection.find(".tour-slider");
    const $cards = $slider.find(".seasonal-tour");

    if ($cards.length > 3) {
      // 3개 이상일 때만 슬라이더 활성화
      initSlider($slider);
    } else {
      // 슬라이더 컨트롤 숨기기
      $slider.find(".slider-arrow, .slider-dots").hide();
    }
  }

  // 제목 업데이트
  function updateTravelThemeTitle(type) {
    const typeNameMap = {
      culture: "문화",
      healing: "휴양",
      nature: "자연",
      experience: "체험",
      sports: "레포츠",
    };

    $(".tour-products-section .travel-theme").text(typeNameMap[type] || "종합");
  }

  // 로딩 메시지 표시
  function showLoadingMessage() {
    const $container = $("#tourProductContainer");
    $container.html(
      '<div class="loading-message">투어를 생성하고 있습니다...</div>'
    );
  }

  // 투어 없음 메시지
  function showNoToursMessage() {
    const $container = $("#tourProductContainer");
    $container.html(`
      <div class="no-tour-message">
        <p>현재 해당 지역의 투어를 준비 중입니다.</p>
        <p>다른 여행 타입을 선택해보세요!</p>
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
