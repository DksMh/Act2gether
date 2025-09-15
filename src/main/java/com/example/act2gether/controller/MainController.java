package com.example.act2gether.controller;

import com.example.act2gether.dto.TourDTO;
import com.example.act2gether.dto.ExperienceDTO;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;
import com.example.act2gether.service.TourCacheService;
import com.example.act2gether.service.TourFilterService;
import com.example.act2gether.service.ToursService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.Month;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
@Slf4j
public class MainController {

  private final TourFilterService tourFilterService;
  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;

  @Autowired
  private TourCacheService cacheService;

  @Autowired
  private ToursService toursService;

  @GetMapping("/")
  public String mainPage(Model model, HttpSession session, Authentication authentication) {
    log.info("🔍 메인 페이지 접속");

    // PageController와 동일한 방식으로 인증 정보 처리
    boolean isAuthenticated = authentication != null &&
        authentication.isAuthenticated() &&
        !"anonymousUser".equals(authentication.getPrincipal());

    log.info("Spring Security 인증: {}", isAuthenticated);

    UserEntity user = null;

    if (isAuthenticated) {
      try {
        String userid = authentication.getName(); // UUID
        log.info("Authentication에서 가져온 userid: {}", userid);

        user = userRepository.findById(userid).orElse(null);

        if (user != null) {
          // 모델에 사용자 정보 설정 - PageController와 동일하게
          model.addAttribute("isAuthenticated", true);
          model.addAttribute("userid", user.getUserId()); // UUID
          model.addAttribute("username", user.getUsername()); // 닉네임
          model.addAttribute("email", user.getEmail());
          model.addAttribute("user_role", user.getUserRole());

          boolean isAdmin = "ADMIN".equals(user.getUserRole());
          model.addAttribute("isAdmin", isAdmin);

          // 세션에도 저장
          session.setAttribute("userid", user.getUserId());
          session.setAttribute("username", user.getUsername());
          session.setAttribute("email", user.getEmail());
          session.setAttribute("user_role", user.getUserRole());
          session.setAttribute("isAdmin", isAdmin);

          log.info("=== 사용자 정보 설정 완료 ===");
          log.info("- userid: {}", user.getUserId());
          log.info("- username: {}", user.getUsername());
          log.info("- email: {}", user.getEmail());
          log.info("- user_role: {}", user.getUserRole());
          log.info("- isAdmin: {}", isAdmin);
        } else {
          log.warn("사용자 정보를 찾을 수 없음: {}", userid);
          model.addAttribute("isAuthenticated", false);
          model.addAttribute("isAdmin", false);
        }
      } catch (Exception e) {
        log.error("사용자 정보 조회 중 오류: {}", e.getMessage(), e);
        model.addAttribute("isAuthenticated", false);
        model.addAttribute("isAdmin", false);
      }
    } else {
      log.info("비인증 상태");
      model.addAttribute("isAuthenticated", false);
      model.addAttribute("isAdmin", false);

      // 세션 정리
      session.removeAttribute("userid");
      session.removeAttribute("username");
      session.removeAttribute("email");
      session.removeAttribute("user_role");
      session.removeAttribute("isAdmin");
    }

    // 사용자 맞춤 추천
    if (isAuthenticated && user != null) {
      loadPersonalizedRecommendations(model, user);
    } else {
      loadDefaultRecommendations(model);
    }

    // 계절별 추천
    loadSeasonalRecommendations(model);

    // 지역별 체험
    loadRegionalExperiences(model);

    // 동행 모임
    loadCompanionGroups(model);

    return "main";
  }

  // 여행 타입별 - 250913 캐싱 추가
  @GetMapping("/api/tours/generate")
  @ResponseBody
  public ResponseEntity<Map<String, Object>> generateTour(
      @RequestParam String travelType,
      @RequestParam(defaultValue = "6") int numOfRows,
      Authentication authentication) {

    log.info("투어 생성 요청: type={}", travelType);

    // 캐시 확인
    String cacheKey = "tour_" + travelType;
    Optional<Object> cached = cacheService.get(cacheKey);
    if (cached.isPresent()) {
      log.info("캐시에서 투어 반환: {}", travelType);
      return ResponseEntity.ok((Map<String, Object>) cached.get());
    }

    try {
      // 타입별 장소 매핑
      Map<String, List<String>> typeToPlaces = new HashMap<>();
      typeToPlaces.put("culture", Arrays.asList("박물관", "미술관", "고궁/문", "사찰"));
      typeToPlaces.put("healing", Arrays.asList("온천", "테마파크", "찜질방", "관광단지"));
      typeToPlaces.put("nature", Arrays.asList("해변", "산/공원", "계곡/폭포", "수목원"));
      typeToPlaces.put("experience", Arrays.asList("체험"));
      typeToPlaces.put("sports", Arrays.asList("트래킹", "골프장", "스키장", "캠핑장"));

      List<String> places = typeToPlaces.getOrDefault(travelType, Arrays.asList("관광단지"));

      // 3개 투어 생성을 위한 결과 리스트
      List<Map<String, Object>> allTours = new ArrayList<>();

      // 모든 지역 코드
      List<String> allAreaCodes = Arrays.asList("1", "2", "3", "4", "5", "6", "7", "8",
          "31", "32", "33", "34", "35", "36", "37", "38", "39");

      // 사용자 선호 지역이 있으면 우선 포함
      List<String> selectedAreaCodes = new ArrayList<>();
      String preferredAreaCode = "";

      if (authentication != null && authentication.isAuthenticated()
          && !"anonymousUser".equals(authentication.getPrincipal())) {
        String userId = authentication.getName();
        UserEntity user = userRepository.findById(userId).orElse(null);

        if (user != null && user.getInterests() != null) {
          JsonNode interests = objectMapper.readTree(user.getInterests());
          JsonNode regions = interests.path("preferredRegions");

          if (regions.isArray() && regions.size() > 0) {
            String region = regions.get(0).asText();
            preferredAreaCode = tourFilterService.getAreaCodeByName(region);
            if (!preferredAreaCode.isEmpty()) {
              selectedAreaCodes.add(preferredAreaCode);
            }
          }
        }
      }

      // 나머지 지역 랜덤 선택 (중복 없이)
      List<String> remainingAreaCodes = new ArrayList<>(allAreaCodes);
      if (!preferredAreaCode.isEmpty()) {
        remainingAreaCodes.remove(preferredAreaCode);
      }
      Collections.shuffle(remainingAreaCodes);

      // 총 3개 지역 선택
      while (selectedAreaCodes.size() < 3 && !remainingAreaCodes.isEmpty()) {
        selectedAreaCodes.add(remainingAreaCodes.remove(0));
      }

      log.info("선택된 지역 코드: {}", selectedAreaCodes);

      // 각 지역별로 투어 생성
      for (String areaCode : selectedAreaCodes) {
        if (allTours.size() >= 3)
          break;

        // 해당 지역의 시군구 목록 가져오기
        Map<String, Object> sigunguResult = tourFilterService.getSigunguCodes(areaCode);
        List<String> sigunguCodes = new ArrayList<>();

        if (sigunguResult != null && (Boolean) sigunguResult.get("success")) {
          JsonNode sigunguData = (JsonNode) sigunguResult.get("data");
          if (sigunguData.isArray()) {
            for (JsonNode sigungu : sigunguData) {
              String code = sigungu.path("code").asText();
              if (code.isEmpty()) {
                code = sigungu.path("sigungucode").asText();
              }
              if (!code.isEmpty()) {
                sigunguCodes.add(code);
              }
            }
          }
        }

        // 시군구가 없으면 광역시이므로 전체 검색
        if (sigunguCodes.isEmpty()) {
          sigunguCodes.add(null);
        } else {
          Collections.shuffle(sigunguCodes); // 랜덤 시군구 선택
        }

        // 해당 지역에서 투어 생성 시도
        boolean tourCreated = false;
        for (String sigunguCode : sigunguCodes) {
          if (tourCreated)
            break;

          Map<String, String> searchParams = new HashMap<>();
          searchParams.put("places", objectMapper.writeValueAsString(places));
          searchParams.put("numOfRows", "20");
          searchParams.put("areaCode", areaCode);

          if (sigunguCode != null) {
            searchParams.put("sigunguCode", sigunguCode);
          }

          Map<String, Object> result = tourFilterService.searchTours(searchParams);

          if (result != null && (Boolean) result.get("success")) {
            JsonNode tours = (JsonNode) result.get("data");

            if (tours.isArray() && tours.size() >= 6) {
              // 이미지가 있는 관광지 우선 정렬
              List<JsonNode> toursList = new ArrayList<>();
              List<JsonNode> toursWithImage = new ArrayList<>();
              List<JsonNode> toursWithoutImage = new ArrayList<>();

              for (JsonNode tour : tours) {
                String image = tour.path("firstimage").asText("");
                String image2 = tour.path("firstimage2").asText("");
                String optimized = tour.path("optimizedImage").asText("");

                // 어떤 이미지든 있으면 toursWithImage에 추가
                if (!image.isEmpty() || !image2.isEmpty() || !optimized.isEmpty()) {
                  toursWithImage.add(tour);
                } else {
                  toursWithoutImage.add(tour);
                }
              }

              // 이미지 있는 것을 먼저 추가
              toursList.addAll(toursWithImage);
              toursList.addAll(toursWithoutImage);

              // 6개 선택
              List<JsonNode> selectedTours = new ArrayList<>();
              for (int i = 0; i < Math.min(6, toursList.size()); i++) {
                selectedTours.add(toursList.get(i));
              }

              // 썸네일용 대표 이미지 선택 (반드시 이미지가 있는 것으로)
              String mainImage = "";
              JsonNode representativeTour = null;

              // 선택된 투어 중에서 이미지가 있는 첫 번째 관광지 찾기
              for (JsonNode tour : selectedTours) {
                String img1 = tour.path("firstimage").asText("");
                String img2 = tour.path("firstimage2").asText("");
                String opt = tour.path("optimizedImage").asText("");

                if (!img1.isEmpty()) {
                  mainImage = img1;
                  representativeTour = tour;
                  break;
                } else if (!opt.isEmpty()) {
                  mainImage = opt;
                  representativeTour = tour;
                  break;
                } else if (!img2.isEmpty()) {
                  mainImage = img2;
                  representativeTour = tour;
                  break;
                }
              }

              // 대표 관광지가 없으면 첫 번째 관광지 사용
              if (representativeTour == null) {
                representativeTour = selectedTours.get(0);
              }

              // 투어 정보 구성
              List<String> tourIds = new ArrayList<>();
              String cityName = "";

              // 각 지역별로 투어 생성 부분에서 cityName 처리 로직 수정
              for (JsonNode tour : selectedTours) {
                tourIds.add(tour.path("contentid").asText());

                if (cityName.isEmpty()) {
                  String addr = tour.path("addr1").asText();
                  if (!addr.isEmpty()) {
                    String[] parts = addr.split(" ");

                    // 광역시 체크
                    if (parts.length >= 1 && parts[0].contains("광역시")) {
                      // 광역시는 첫 번째 부분만 (예: "대구광역시")
                      cityName = parts[0];
                    } else if (parts.length >= 2) {
                      // 일반 도는 두 부분 (예: "경기도 안성시")
                      cityName = parts[0] + " " + parts[1];
                    } else {
                      cityName = parts[0];
                    }
                  }
                }
              }

              Map<String, Object> tourInfo = new HashMap<>();
              tourInfo.put("tourId", String.join("-", tourIds));
              tourInfo.put("tourType", travelType);
              tourInfo.put("cityName", cityName);
              tourInfo.put("areaCode", areaCode);
              tourInfo.put("tours", selectedTours);
              tourInfo.put("mainImage", mainImage);
              tourInfo.put("representativeTour", representativeTour);
              tourInfo.put("hasImage", !mainImage.isEmpty());

              allTours.add(tourInfo);
              tourCreated = true;
              log.info("투어 생성 성공: {} ({}), 이미지: {}", cityName, areaCode, !mainImage.isEmpty());
            }
          }
        }

        if (!tourCreated) {
          log.warn("지역 코드 {}에서 투어 생성 실패", areaCode);
        }
      }

      // if (!allTours.isEmpty()) {
      // log.info("총 {}개 투어 생성 완료", allTours.size());
      // return ResponseEntity.ok(Map.of(
      // "success", true,
      // "data", Map.of(
      // "tourType", travelType,
      // "tourList", allTours)));
      // }

      if (!allTours.isEmpty()) {
        log.info("총 {}개 투어 생성 완료", allTours.size());

        // 성공 결과 생성
        Map<String, Object> successResult = Map.of(
            "success", true,
            "data", Map.of(
                "tourType", travelType,
                "tourList", allTours));

        // 캐시에 저장
        cacheService.put(cacheKey, successResult);

        return ResponseEntity.ok(successResult);
      }
      return ResponseEntity.ok(Map.of(
          "success", false,
          "message", "투어 생성에 실패했습니다"));

    } catch (Exception e) {
      log.error("투어 생성 실패: {}", e.getMessage(), e);
      return ResponseEntity.ok(Map.of(
          "success", false,
          "message", "투어 생성 중 오류가 발생했습니다"));
    }
  }

  private void loadPersonalizedRecommendations(Model model, UserEntity user) {
    try {
      String interests = user.getInterests();
      if (interests == null || interests.trim().isEmpty()) {
        loadDefaultRecommendations(model);
        return;
      }

      JsonNode interestsJson = objectMapper.readTree(interests);

      Map<String, String> searchParams = new HashMap<>();
      searchParams.put("numOfRows", "6");

      // 지역 설정
      JsonNode regions = interestsJson.path("preferredRegions");
      if (regions.isArray() && regions.size() > 0) {
        String region = regions.get(0).asText();
        String areaCode = tourFilterService.getAreaCodeByName(region);
        if (!areaCode.isEmpty()) {
          searchParams.put("areaCode", areaCode);
        }
      }

      // 장소 설정
      JsonNode places = interestsJson.path("places");
      if (places.isArray() && places.size() > 0) {
        List<String> placeList = new ArrayList<>();
        for (JsonNode place : places) {
          placeList.add(place.asText());
        }
        searchParams.put("places", objectMapper.writeValueAsString(placeList));

        String keyword = generateKeywordFromPlaces(placeList);
        model.addAttribute("userInterest", keyword);
      } else {
        model.addAttribute("userInterest", "맞춤");
      }

      // API 호출 및 DTO 변환
      Map<String, Object> result = tourFilterService.searchTours(searchParams);

      if (result != null && Boolean.TRUE.equals(result.get("success"))) {
        JsonNode tours = (JsonNode) result.get("data");
        List<TourDTO> tourList = convertToTourDTOs(tours);
        model.addAttribute("recommendedTours", tourList);
        log.info("✅ 맞춤 추천 로드 성공: {}개", tourList.size());
      } else {
        loadDefaultRecommendations(model);
      }

    } catch (Exception e) {
      log.error("맞춤 추천 로드 실패: {}", e.getMessage());
      loadDefaultRecommendations(model);
    }
  }

  private void loadDefaultRecommendations(Model model) {
    try {
      Map<String, Object> result = tourFilterService.getRecommendedTours(null, 6);

      if (result != null && Boolean.TRUE.equals(result.get("success"))) {
        JsonNode tours = (JsonNode) result.get("data");
        List<TourDTO> tourList = convertToTourDTOs(tours);
        model.addAttribute("recommendedTours", tourList);
        log.info("✅ 기본 추천 로드 성공: {}개", tourList.size());
      } else {
        model.addAttribute("recommendedTours", new ArrayList<>());
      }

      model.addAttribute("userInterest", "인기");

    } catch (Exception e) {
      log.error("기본 추천 로드 실패: {}", e.getMessage());
      model.addAttribute("recommendedTours", new ArrayList<>());
    }
  }

  // 1. 최적화된 계절별 지역 선택
  private List<String> getOptimizedSeasonalAreas(String season) {
    Map<String, List<String>> seasonAreaMap = new HashMap<>();

    seasonAreaMap.put("봄", Arrays.asList("39", "36", "35", "1", "37", "31"));
    seasonAreaMap.put("여름", Arrays.asList("32", "6", "39", "8", "36", "35"));
    seasonAreaMap.put("가을", Arrays.asList("32", "37", "35", "1", "38", "33"));
    seasonAreaMap.put("겨울", Arrays.asList("32", "39", "6", "35", "3", "33"));

    return seasonAreaMap.getOrDefault(season,
        Arrays.asList("1", "6", "39", "32", "35", "31"));
  }

  // 2. 투어 정보 생성 헬퍼
  private Map<String, Object> createSeasonalTourInfo(List<JsonNode> tours, String areaCode, String season) {
    List<String> tourIds = new ArrayList<>();
    String cityName = "";
    String mainImage = "";
    JsonNode representativeTour = null;

    // 첫 번째 투어에서 도시명 추출
    if (tours.size() > 0) {
      String firstAddr = tours.get(0).path("addr1").asText("");
      if (!firstAddr.isEmpty()) {
        String[] parts = firstAddr.split(" ");
        // 시/군/구 단위만 추출 (같은 지역이므로 모두 동일)
        if (parts.length >= 2) {
          cityName = parts[1]; // 시/군/구 이름만
        } else if (parts.length >= 1) {
          cityName = parts[0];
        }
      }
    }

    for (JsonNode tour : tours) {
      tourIds.add(tour.path("contentid").asText());

      if (mainImage.isEmpty()) {
        String img1 = tour.path("firstimage").asText("");
        String img2 = tour.path("firstimage2").asText("");
        String opt = tour.path("optimizedImage").asText("");

        if (!img1.isEmpty()) {
          mainImage = img1;
          representativeTour = tour;
        } else if (!opt.isEmpty()) {
          mainImage = opt;
          representativeTour = tour;
        } else if (!img2.isEmpty()) {
          mainImage = img2;
          representativeTour = tour;
        }
      }
    }

    if (representativeTour == null && tours.size() > 0) {
      representativeTour = tours.get(0);
    }

    Map<String, Object> tourInfo = new HashMap<>();
    tourInfo.put("tourId", String.join("-", tourIds));
    tourInfo.put("cityName", cityName);
    tourInfo.put("mainImage", mainImage);
    tourInfo.put("representativeTour", representativeTour);
    tourInfo.put("representativeTitle",
        representativeTour != null ? representativeTour.path("title").asText("특별 관광지") : "특별 관광지");
    tourInfo.put("season", season);
    tourInfo.put("tourCount", tours.size());

    return tourInfo;
  }

  // 3. 메인 loadSeasonalRecommendations 메서드
  private void loadSeasonalRecommendations(Model model) {
    try {
      String season = getCurrentSeason();
      model.addAttribute("currentSeason", season);

      // 캐시 확인
      String cacheKey = "seasonal_" + season;
      Optional<Object> cached = cacheService.get(cacheKey);
      if (cached.isPresent()) {
        model.addAttribute("seasonTours", cached.get());
        log.info("캐시에서 {} 테마 투어 반환", season);
        return;
      }

      List<String> seasonPlaces = getSeasonPlaces(season);
      List<String> seasonalAreas = getOptimizedSeasonalAreas(season);
      List<Map<String, Object>> seasonalTours = new ArrayList<>();

      int maxAttempts = Math.min(seasonalAreas.size(), 8);

      for (int i = 0; i < maxAttempts && seasonalTours.size() < 6; i++) {
        String areaCode = seasonalAreas.get(i);

        Map<String, String> params = new HashMap<>();
        params.put("numOfRows", "12");
        params.put("places", objectMapper.writeValueAsString(seasonPlaces));
        params.put("areaCode", areaCode);

        Map<String, Object> result = tourFilterService.searchTours(params);

        if (result != null && Boolean.TRUE.equals(result.get("success"))) {
          JsonNode tours = (JsonNode) result.get("data");

          if (tours.isArray() && tours.size() >= 6) {
            // 이미지 있는 것 우선 정렬
            List<JsonNode> validTours = new ArrayList<>();
            List<JsonNode> withImage = new ArrayList<>();
            List<JsonNode> withoutImage = new ArrayList<>();

            for (JsonNode tour : tours) {
              boolean hasImage = !tour.path("firstimage").asText("").isEmpty() ||
                  !tour.path("optimizedImage").asText("").isEmpty() ||
                  !tour.path("firstimage2").asText("").isEmpty();
              if (hasImage) {
                withImage.add(tour);
              } else {
                withoutImage.add(tour);
              }
            }

            validTours.addAll(withImage);
            validTours.addAll(withoutImage);

            if (validTours.size() >= 6) {
              Map<String, Object> tourInfo = createSeasonalTourInfo(
                  validTours.subList(0, 6),
                  areaCode,
                  season);

              seasonalTours.add(tourInfo);
              log.info("계절 투어 생성: {} ({}) - {}",
                  tourInfo.get("cityName"), areaCode, season);
            }
          }
        }
      }

      // 캐싱
      if (!seasonalTours.isEmpty()) {
        cacheService.put(cacheKey, seasonalTours);
      }

      model.addAttribute("seasonTours", seasonalTours);
      log.info("✅ {} 테마 투어 로드 완료: {}개", season, seasonalTours.size());

    } catch (Exception e) {
      log.error("계절별 추천 로드 실패: {}", e.getMessage(), e);
      model.addAttribute("seasonTours", new ArrayList<>());
      model.addAttribute("currentSeason", getCurrentSeason());
    }
  }

  /**
   * 지역별 투어 조회 API
   * /api/tours/regional?region=1
   */
  @GetMapping("/api/tours/regional")
  @ResponseBody
  public ResponseEntity<Map<String, Object>> getRegionalTours(
      @RequestParam(defaultValue = "1") String region) {

    log.info("지역별 투어 조회 요청: region={}", region);

    Map<String, Object> response = new HashMap<>();

    try {
      // DB에서 해당 지역 투어 전체 조회
      List<Map<String, Object>> tours = toursService.getToursByRegion(region);

      response.put("success", true);
      response.put("data", tours);
      response.put("region", region);
      response.put("regionName", toursService.getRegionName(region));
      response.put("count", tours.size());

      log.info("지역별 투어 조회 성공: {} 지역, {}개 조회",
          toursService.getRegionName(region), tours.size());

    } catch (Exception e) {
      log.error("지역별 투어 조회 실패: {}", e.getMessage(), e);
      response.put("success", false);
      response.put("message", "투어 조회 중 오류가 발생했습니다.");
      response.put("data", new ArrayList<>());
    }

    return ResponseEntity.ok(response);
  }

  // 초기 로드용 - 서울 데이터
  private void loadRegionalExperiences(Model model) {
    try {
      // DB에서 서울 지역(1) 투어 전체 조회
      List<Map<String, Object>> tours = toursService.getToursByRegion("1");

      // ExperienceDTO로 변환
      List<ExperienceDTO> experiences = new ArrayList<>();

      for (Map<String, Object> tour : tours) {
        ExperienceDTO dto = ExperienceDTO.builder()
            .id((String) tour.get("tourId"))
            .title((String) tour.get("title"))
            .description((String) tour.get("description"))
            .meta("지역 특색 체험")
            .regionCode((String) tour.get("region"))
            .regionName((String) tour.get("regionName"))
            .url((String) tour.get("url"))
            .build();

        experiences.add(dto);
      }

      model.addAttribute("regionalExperiences", experiences);
      log.info("서울 지역 체험 로드 성공: {}개", experiences.size());

    } catch (Exception e) {
      log.error("지역별 체험 로드 실패: {}", e.getMessage());
      model.addAttribute("regionalExperiences", new ArrayList<>());
    }
  }

  private void loadCompanionGroups(Model model) {
    List<Map<String, Object>> groups = new ArrayList<>();

    Map<String, Object> group1 = new HashMap<>();
    group1.put("id", 1);
    group1.put("title", "중년 여성끼리 소박하게 국내 여행 가요~");
    group1.put("description", "50대 이상 / 힐링 여행 / 여성 전용");
    groups.add(group1);

    Map<String, Object> group2 = new HashMap<>();
    group2.put("id", 2);
    group2.put("title", "청춘 배낭 여행 동아리");
    group2.put("description", "20-30대 / 배낭여행 / 성별무관");
    groups.add(group2);

    Map<String, Object> group3 = new HashMap<>();
    group3.put("id", 3);
    group3.put("title", "가족과 함께하는 캠핑 모임");
    group3.put("description", "가족 단위 / 캠핑 / 아이 동반 가능");
    groups.add(group3);

    Map<String, Object> group4 = new HashMap<>();
    group4.put("id", 4);
    group4.put("title", "전국 맛집 탐방 모임");
    group4.put("description", "전연령 / 맛집 투어 / 미식가 환영");
    groups.add(group4);

    model.addAttribute("companionGroups", groups);
  }

  // JsonNode를 TourDTO로 변환
  private List<TourDTO> convertToTourDTOs(JsonNode tours) {
    List<TourDTO> tourList = new ArrayList<>();

    if (tours != null && tours.isArray()) {
      for (JsonNode node : tours) {
        TourDTO dto = TourDTO.builder()
            .contentId(node.path("contentid").asText())
            .title(node.path("title").asText())
            .addr1(node.path("addr1").asText())
            .addr2(node.path("addr2").asText())
            .firstimage(node.path("firstimage").asText())
            .firstimage2(node.path("firstimage2").asText())
            .optimizedImage(node.path("optimizedImage").asText())
            .categoryName(node.path("categoryName").asText())
            .cat1(node.path("cat1").asText())
            .cat2(node.path("cat2").asText())
            .cat3(node.path("cat3").asText())
            .mapx(node.path("mapx").asText())
            .mapy(node.path("mapy").asText())
            .tel(node.path("tel").asText())
            .accessibilityScore(node.path("accessibilityScore").asInt(0))
            .hasBarrierFreeInfo(node.path("hasBarrierFreeInfo").asBoolean(false))
            .build();

        tourList.add(dto);
      }
    }

    return tourList;
  }

  // JsonNode를 ExperienceDTO로 변환
  // private List<ExperienceDTO> convertToExperienceDTOs(JsonNode tours) {
  // List<ExperienceDTO> experiences = new ArrayList<>();

  // if (tours != null && tours.isArray()) {
  // int count = 0;
  // for (JsonNode node : tours) {
  // if (count >= 2)
  // break;

  // ExperienceDTO dto = ExperienceDTO.builder()
  // .id(node.path("contentid").asText())
  // .title(node.path("title").asText("서울 체험"))
  // .description(node.path("addr1").asText("특별한 체험 프로그램"))
  // .meta("체험 프로그램 운영 중")
  // .build();

  // experiences.add(dto);
  // count++;
  // }
  // }

  // return experiences;
  // }

  // private List<ExperienceDTO> createDefaultExperiences() {
  // List<ExperienceDTO> experiences = new ArrayList<>();

  // experiences.add(ExperienceDTO.builder()
  // .title("서울 시티투어 버스")
  // .description("서울의 주요 명소를 편하게 둘러보는 투어")
  // .meta("매일 운행")
  // .build());

  // experiences.add(ExperienceDTO.builder()
  // .title("경복궁 한복 체험")
  // .description("전통 한복 체험과 궁궐 관람")
  // .meta("예약 필수")
  // .build());

  // return experiences;
  // }

  // 해당 서버 달로 확인 - 유틸리티 메서드들
  private String getCurrentSeason() {
    LocalDate now = LocalDate.now();
    Month month = now.getMonth();

    if (month == Month.MARCH || month == Month.APRIL || month == Month.MAY) {
      return "봄";
    } else if (month == Month.JUNE || month == Month.JULY || month == Month.AUGUST) {
      return "여름";
    } else if (month == Month.SEPTEMBER || month == Month.OCTOBER || month == Month.NOVEMBER) {
      return "가을";
    } else {
      return "겨울";
    }
  }

  private List<String> getSeasonPlaces(String season) {
    Map<String, List<String>> seasonMap = new HashMap<>();
    seasonMap.put("봄", Arrays.asList("수목원", "자연휴양림", "테마파크"));
    seasonMap.put("여름", Arrays.asList("해변", "계곡/폭포", "캠핑장"));
    seasonMap.put("가을", Arrays.asList("산/공원", "트래킹", "자연생태관광지"));
    seasonMap.put("겨울", Arrays.asList("온천", "스키장", "찜질방"));

    return seasonMap.getOrDefault(season, Arrays.asList("관광단지"));
  }

  private String generateKeywordFromPlaces(List<String> places) {
    if (places.isEmpty())
      return "특별한";

    String firstPlace = places.get(0);
    Map<String, String> keywordMap = new HashMap<>();
    keywordMap.put("해변", "시원한 바다가 있는");
    keywordMap.put("산/공원", "푸른 자연 속");
    keywordMap.put("온천", "따뜻한 휴식이 있는");
    keywordMap.put("체험", "즐거운 체험이 가득한");
    keywordMap.put("박물관", "문화가 숨쉬는");

    return keywordMap.getOrDefault(firstPlace, "맞춤");
  }

  // 여행 타입별 장소 매핑 헬퍼 메서드
  // private Map<String, List<String>> getTravelTypePlaceMapping() {
  // Map<String, List<String>> mapping = new HashMap<>();

  // // 자연관광지
  // mapping.put("nature", Arrays.asList(
  // "해변", "산/공원", "계곡/폭포", "호수/강",
  // "수목원", "자연휴양림", "자연생태관광지"));

  // // 역사관광지 (인문)
  // mapping.put("culture", Arrays.asList(
  // "고궁/문", "민속마을/가옥", "유적지",
  // "사찰", "종교성지", "박물관", "미술관"));

  // // 휴양관광지
  // mapping.put("healing", Arrays.asList(
  // "온천", "테마파크", "관광단지",
  // "찜질방", "유람선/잠수함관광"));

  // // 체험관광지
  // mapping.put("experience", Arrays.asList("체험"));

  // // 레포츠
  // mapping.put("sports", Arrays.asList(
  // "트래킹", "골프장", "스키장", "캠핑장", "낚시"));

  // return mapping;
  // }

}