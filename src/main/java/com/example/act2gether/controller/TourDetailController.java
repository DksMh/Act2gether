package com.example.act2gether.controller;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.act2gether.service.TourFilterService;
import com.example.act2gether.service.BarrierFreeService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 🆕 TourDetailController - v3.0 투어 상품화 시스템 (완전 개선판)
 * 기존: 개별 관광지 모달 팝업
 * 변경: 통합 투어 상품 전용 상세페이지
 * 
 * v3.0 개선사항:
 * - 카카오맵 API 키 응답에 포함
 * - 시/군/구 이름 정확한 표시
 * - 맛집 정보 카테고리별 그룹화
 * - 투어 메타데이터 시/군/구 정보 추가
 * 
 * 핵심 기능:
 * - tourId 파싱 및 개별 관광지 정보 조합
 * - 무장애여행 정보 통합
 * - 맛집 정보 연동 (카테고리별 Map)
 * - 투어 상품 메타데이터 생성
 */
@RestController
@RequestMapping("/tour-detail")
@RequiredArgsConstructor
@Slf4j
public class TourDetailController {

  @Autowired
  private TourFilterService tourFilterService;

  @Autowired
  private BarrierFreeService barrierFreeService;

  // ✅ 새로 추가: 카카오맵 API 키
  @Value("${kakao.map.api.key}")
  private String kakaoMapApiKey;

  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * 🎯 투어 상세페이지 메인 엔드포인트 (v3.0 완전 개선판)
   * URL: /tour/{tourId}
   * 
   * @param tourId - contentid 조합 (예: "1115042113127512955")
   * @return 투어 상품 전체 정보 (관광지 + 맛집 + 메타데이터 + API키)
   */
  @GetMapping("/{tourId}")
  public ResponseEntity<Map<String, Object>> getTourDetail(@PathVariable String tourId) {
    log.info("🎯 투어 상세페이지 요청 - tourId: {}", tourId);

    try {
      // 1단계: tourId 파싱
      List<String> contentIds = parseTourId(tourId);
      if (contentIds.isEmpty()) {
        return ResponseEntity.badRequest().body(Map.of(
            "success", false,
            "message", "잘못된 투어 ID 형식입니다."));
      }

      log.info("📋 파싱된 관광지 ID 목록: {}개 - {}", contentIds.size(), contentIds);

     // 🆕 2단계: 세션 스토리지 활용 안내
    // 프론트엔드에서 세션 데이터를 우선 확인하도록 응답
    Map<String, Object> response = new HashMap<>();
    response.put("success", true);
    response.put("tourId", tourId);
    response.put("useSessionFirst", true); // 세션 우선 사용 플래그
    // 세션 데이터가 없을 경우를 위한 기본 구조
            response.put("tour", generateBasicTourMetadata(contentIds, tourId));
            response.put("spots", Collections.emptyList()); // 빈 배열
            response.put("restaurants", getRestaurantInfoGrouped(getAreaCodeFromTourId(tourId)));
            response.put("kakaoMapApiKey", kakaoMapApiKey);
            response.put("version", "v3.0-session");
            response.put("message", "프론트엔드 세션 데이터를 우선 확인하세요");

            log.info("✅ 세션 우선 응답 준비 완료: tourId={}", tourId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("💥 투어 상세정보 조회 실패: tourId={}, error={}", tourId, e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "투어 상세정보 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
  } 
  /**
     * 🔧 기존 API 호출 로직을 별도 메서드로 분리
     */
    private ResponseEntity<Map<String, Object>> getTourDetailByApi(String tourId) {
        try {
            List<String> contentIds = parseTourId(tourId);
            if (contentIds.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "잘못된 투어 ID 형식입니다."));
            }
      // 2단계: 각 관광지 상세정보 조회
      List<Map<String, Object>> tourSpots = new ArrayList<>();
      String primaryAreaCode = null;
      String primarySigunguCode = null;
      String primaryRegion = null;

      for (int i = 0; i < contentIds.size(); i++) {
        String contentId = contentIds.get(i);
        Map<String, Object> spotDetail = tourFilterService.getTourDetail(contentId);

        if (spotDetail != null && (Boolean) spotDetail.get("success")) {
          JsonNode spotData = (JsonNode) spotDetail.get("data");

          // 첫 번째 관광지에서 지역 정보 추출
          if (i == 0) {
            primaryAreaCode = spotData.path("areacode").asText();
            primarySigunguCode = spotData.path("sigungucode").asText();
            primaryRegion = getRegionNameByAreaCode(primaryAreaCode);
            log.info("🗺️ 주요 지역 정보: {} ({}), 시군구코드: {}", primaryRegion, primaryAreaCode, primarySigunguCode);
          }

  //         // 관광지 정보 구성
          Map<String, Object> spot = new HashMap<>();
          spot.put("order", i + 1);
          spot.put("contentid", contentId);
          spot.put("title", spotData.path("title").asText());
          spot.put("addr1", spotData.path("addr1").asText());
          spot.put("addr2", spotData.path("addr2").asText());
          spot.put("tel", spotData.path("tel").asText());
          spot.put("homepage", spotData.path("homepage").asText());
          spot.put("overview", spotData.path("overview").asText());
          spot.put("firstimage", spotData.path("firstimage").asText());
          spot.put("firstimage2", spotData.path("firstimage2").asText());
          spot.put("mapx", spotData.path("mapx").asText());
          spot.put("mapy", spotData.path("mapy").asText());
          spot.put("cat1", spotData.path("cat1").asText());
          spot.put("cat2", spotData.path("cat2").asText());
          spot.put("cat3", spotData.path("cat3").asText());
          spot.put("areacode", spotData.path("areacode").asText());
          spot.put("sigungucode", spotData.path("sigungucode").asText());

  //         // 이미지 최적화
          String optimizedImage = optimizeImageUrl(spotData.path("firstimage").asText());
          spot.put("optimizedImage", optimizedImage);

          tourSpots.add(spot);
          log.info("✅ {}번째 관광지 정보 수집 완료: {}", i + 1, spot.get("title"));
        } else {
          log.warn("⚠️ 관광지 정보 조회 실패: contentId={}", contentId);
        }
      }

      if (tourSpots.isEmpty()) {
        return ResponseEntity.ok(Map.of(
            "success", false,
            "message", "투어 관광지 정보를 찾을 수 없습니다."));
      }

      // 3단계: 무장애여행 정보 통합
      List<JsonNode> spotsAsJsonNodes = convertToJsonNodes(tourSpots);
      List<JsonNode> enrichedSpots = barrierFreeService.enrichWithBarrierFreeInfo(
          spotsAsJsonNodes, primaryAreaCode, null);

      // JsonNode를 다시 Map으로 변환하면서 무장애 정보 통합
      List<Map<String, Object>> finalSpots = convertFromJsonNodes(enrichedSpots, tourSpots);

      // 4단계: 투어 메타데이터 생성 (✅ 시/군/구 정보 추가)
      Map<String, Object> tourMetadata = generateTourMetadata(finalSpots, primaryRegion, primaryAreaCode, primarySigunguCode, tourId);

      // 5단계: 맛집 정보 조회 (✅ 카테고리별 그룹화)
      Map<String, List<Map<String, Object>>> groupedRestaurants = getRestaurantInfoGrouped(primaryAreaCode);

      // 6단계: 최종 응답 구성 (✅ 카카오맵 API 키 포함)
      Map<String, Object> response = new HashMap<>();
      response.put("success", true);
      response.put("tourId", tourId);
      response.put("tour", tourMetadata);
      response.put("spots", finalSpots);
      response.put("restaurants", groupedRestaurants);  // ✅ 카테고리별 그룹화된 맛집
      response.put("kakaoMapApiKey", kakaoMapApiKey);    // ✅ 카카오맵 API 키
      response.put("version", "v3.0-api");
      response.put("features", List.of("투어상품화", "무장애통합", "맛집연동", "상세페이지", "카카오맵", "시군구정보"));

      log.info("🎉 투어 상세정보 조회 완료: {}개 관광지, {}개 맛집 카테고리, 접근성점수: {}점, API키: {}",
          finalSpots.size(), groupedRestaurants.size(), tourMetadata.get("totalAccessibilityScore"), 
          kakaoMapApiKey != null ? "포함" : "누락");

      return ResponseEntity.ok(response);

    } catch (Exception e) {
            log.error("💥 API fallback 실패: tourId={}, error={}", tourId, e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "API를 통한 투어 정보 조회에 실패했습니다."));
        }
    }

  /**
     * 🆕 API 호출 대체 엔드포인트 (세션 데이터가 없을 때만 사용)
     */
    @GetMapping("/{tourId}/fallback")
    public ResponseEntity<Map<String, Object>> getTourDetailFallback(@PathVariable String tourId) {
        log.info("🔄 투어 상세페이지 fallback 요청 - tourId: {}", tourId);

        // 기존의 API 호출 로직 실행
        return getTourDetailByApi(tourId);
    }
 /**
     * 🔧 기본 투어 메타데이터 생성 (세션 데이터 없을 때 사용)
     */
    private Map<String, Object> generateBasicTourMetadata(List<String> contentIds, String tourId) {
        Map<String, Object> metadata = new HashMap<>();
        
        metadata.put("tourId", tourId);
        metadata.put("title", "투어 상품");
        metadata.put("region", "전국");
        metadata.put("spotCount", contentIds.size());
        metadata.put("hasBarrierFreeInfo", false);
        metadata.put("totalAccessibilityScore", 0);
        
        return metadata;
    }

    /**
     * 🔧 투어 ID에서 지역 코드 추정 (첫 번째 contentId 기반)
     */
    private String getAreaCodeFromTourId(String tourId) {
        try {
            List<String> contentIds = parseTourId(tourId);
            if (!contentIds.isEmpty()) {
                // 첫 번째 contentId로 임시 API 호출하여 지역 코드 확인
                Map<String, Object> result = tourFilterService.getTourDetail(contentIds.get(0));
                if (result != null && (Boolean) result.get("success")) {
                    JsonNode data = (JsonNode) result.get("data");
                    return data.path("areacode").asText();
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ 지역 코드 추정 실패: {}", e.getMessage());
        }
        return "1"; // 기본값: 서울
    }


  /**
     * 🔧 tourId 파싱 (contentid 조합 →  하이픈 구분자 방식 - 안전하고 성능 최적)
     * 
     * @param tourId - "1115042-1131275-129552" 형태
     * @return ["1115042", "1131275", "129552"] 형태
     */
    private List<String> parseTourId(String tourId) {
        if (tourId == null || tourId.trim().isEmpty()) {
            log.warn("⚠️ 빈 tourId");
            return new ArrayList<>();
        }

        try {
            // 하이픈으로 분할 - O(1) 성능
            List<String> contentIds = Arrays.asList(tourId.split("-"));
            
            // 유효성 검증
            List<String> validContentIds = new ArrayList<>();
            for (String contentId : contentIds) {
                if (contentId.matches("\\d{4,9}")) { // contentId: 4~9자리 숫자
                    validContentIds.add(contentId.trim());
                } else {
                    log.warn("⚠️ 잘못된 contentId 형식: {}", contentId);
                }
            }
            
            // 최대 15개까지 허용 (요구사항 반영)
            if (validContentIds.size() > 15) {
                validContentIds = validContentIds.subList(0, 15);
                log.info("📝 관광지 수 제한 적용: {}개 → 15개", contentIds.size());
            }
            
            log.debug("✅ tourId 파싱 완료: {} → {}개 contentId", tourId, validContentIds.size());
            return validContentIds;
            
        } catch (Exception e) {
            log.error("💥 tourId 파싱 실패: tourId={}, error={}", tourId, e.getMessage());
            return new ArrayList<>();
        }
    }

  /**
   * 🎨 투어 메타데이터 생성 (✅ 시/군/구 정보 추가)
   */
  private Map<String, Object> generateTourMetadata(List<Map<String, Object>> spots,
      String region, String areaCode, String sigunguCode, String tourId) {
    Map<String, Object> metadata = new HashMap<>();

    // 기본 정보
    metadata.put("tourId", tourId);
    metadata.put("region", region != null ? region : "전국");
    metadata.put("areaCode", areaCode);
    metadata.put("sigunguCode", sigunguCode);
    
    // ✅ 시/군/구 이름 추가
    String sigunguName = getSigunguName(areaCode, sigunguCode);
    metadata.put("sigungu", sigunguName);
    
    metadata.put("spotCount", spots.size());

    // 투어 제목 생성
    String tourTitle = generateTourTitle(spots, region);
    metadata.put("title", tourTitle);

    // 접근성 정보 계산
    int totalAccessibilityScore = calculateTotalAccessibilityScore(spots);
    long barrierFreeCount = spots.stream()
        .mapToInt(spot -> (Boolean) spot.getOrDefault("hasBarrierFreeInfo", false) ? 1 : 0)
        .sum();

    metadata.put("totalAccessibilityScore", totalAccessibilityScore);
    metadata.put("hasBarrierFreeInfo", barrierFreeCount > 0);
    metadata.put("totalBarrierFreeSpots", barrierFreeCount);

    // 카테고리 분석
    Map<String, Integer> categoryCount = new HashMap<>();
    List<String> themes = new ArrayList<>();

    for (Map<String, Object> spot : spots) {
      String cat1 = (String) spot.get("cat1");
      categoryCount.put(cat1, categoryCount.getOrDefault(cat1, 0) + 1);

      String theme = getCategoryDisplayName(cat1);
      if (!themes.contains(theme)) {
        themes.add(theme);
      }
    }

    metadata.put("themes", themes);
    metadata.put("categoryDistribution", categoryCount);

    // 예상 소요시간 계산 (관광지당 1-2시간)
    int estimatedHours = spots.size() * 2;
    metadata.put("estimatedDuration", estimatedHours + "시간");

    // 대표 이미지 (첫 번째 관광지 이미지)
    if (!spots.isEmpty()) {
      Map<String, Object> firstSpot = spots.get(0);
      metadata.put("representativeImage", firstSpot.get("optimizedImage"));
      metadata.put("representativeTitle", firstSpot.get("title"));
    }

    return metadata;
  }

  /**
   * 🏷️ 투어 제목 자동 생성
   */
  private String generateTourTitle(List<Map<String, Object>> spots, String region) {
    if (spots.isEmpty()) {
      return "투어 상품";
    }

    // 테마 분석
    Map<String, Integer> themeCount = new HashMap<>();
    for (Map<String, Object> spot : spots) {
      String cat1 = (String) spot.get("cat1");
      String theme = getCategoryDisplayName(cat1);
      themeCount.put(theme, themeCount.getOrDefault(theme, 0) + 1);
    }

    // 주요 테마 추출 (최대 2개)
    List<String> mainThemes = themeCount.entrySet().stream()
        .sorted((e1, e2) -> e2.getValue().compareTo(e1.getValue()))
        .limit(2)
        .map(Map.Entry::getKey)
        .toList();

    String themeText = String.join("+", mainThemes);

    return String.format("%s %s 투어 (%d곳)",
        region != null ? region : "전국",
        themeText,
        spots.size());
  }

  /**
   * 📊 총 접근성 점수 계산
   */
  private int calculateTotalAccessibilityScore(List<Map<String, Object>> spots) {
    if (spots.isEmpty())
      return 0;

    int totalScore = spots.stream()
        .mapToInt(spot -> (Integer) spot.getOrDefault("accessibilityScore", 0))
        .sum();

    return totalScore / spots.size(); // 평균 점수
  }

  /**
   * 🍽️ 맛집 정보 조회 (✅ 카테고리별 그룹화된 Map 반환)
   */
  private Map<String, List<Map<String, Object>>> getRestaurantInfoGrouped(String areaCode) {
    Map<String, List<Map<String, Object>>> groupedRestaurants = new HashMap<>();

    if (areaCode == null || areaCode.trim().isEmpty()) {
      return groupedRestaurants;
    }

    try {
      // 음식점 카테고리별 조회
      Map<String, String> foodCategories = Map.of(
          "A05020100", "한식",
          "A05020200", "서양식",
          "A05020300", "일식",
          "A05020400", "중식",
          "A05020700", "이색음식점",
          "A05020900", "카페/전통찻집");

      // 각 카테고리별로 빈 리스트 초기화
      foodCategories.values().forEach(category -> groupedRestaurants.put(category, new ArrayList<>()));

      for (Map.Entry<String, String> category : foodCategories.entrySet()) {
        try {
          // TourFilterService의 기존 API 호출 메서드 활용
          Map<String, String> searchParams = Map.of(
              "areaCode", areaCode,
              "cat1", "A05",
              "cat2", "A0502",
              "cat3", category.getKey(),
              "numOfRows", "3" // 카테고리당 3개씩
          );

          Map<String, Object> result = tourFilterService.searchTours(searchParams);

          if ((Boolean) result.get("success")) {
            JsonNode data = (JsonNode) result.get("data");
            List<Map<String, Object>> categoryRestaurants = new ArrayList<>();
            
            if (data.isArray()) {
              for (JsonNode restaurant : data) {
                Map<String, Object> restaurantInfo = new HashMap<>();
                restaurantInfo.put("contentid", restaurant.path("contentid").asText());
                restaurantInfo.put("title", restaurant.path("title").asText());
                restaurantInfo.put("addr1", restaurant.path("addr1").asText());
                restaurantInfo.put("tel", restaurant.path("tel").asText());
                restaurantInfo.put("firstimage", restaurant.path("firstimage").asText());
                restaurantInfo.put("mapx", restaurant.path("mapx").asText());
                restaurantInfo.put("mapy", restaurant.path("mapy").asText());

                String optimizedImage = optimizeImageUrl(restaurant.path("firstimage").asText());
                restaurantInfo.put("optimizedImage", optimizedImage);

                categoryRestaurants.add(restaurantInfo);
              }
            }
            
            groupedRestaurants.put(category.getValue(), categoryRestaurants);
            log.info("🍽️ {} 맛집 {}개 조회 완료", category.getValue(), categoryRestaurants.size());
            
        }} catch (Exception e) {
          log.warn("⚠️ {}({}) 맛집 조회 실패: {}", category.getValue(), category.getKey(), e.getMessage());
          // 실패한 경우에도 빈 리스트 유지
          groupedRestaurants.put(category.getValue(), new ArrayList<>());
        }
      }

      int totalRestaurants = groupedRestaurants.values().stream()
          .mapToInt(List::size)
          .sum();
      log.info("🍽️ 맛집 정보 조회 완료: {}개 카테고리, 총 {}개 맛집 (지역: {})", 
          groupedRestaurants.size(), totalRestaurants, areaCode);

    } catch (Exception e) {
      log.error("💥 맛집 정보 조회 실패: areaCode={}, error={}", areaCode, e.getMessage());
      
      // 오류 시 빈 카테고리 맵 반환
      Map<String, String> foodCategories = Map.of(
          "A05020100", "한식",
          "A05020200", "서양식",
          "A05020300", "일식",
          "A05020400", "중식",
          "A05020700", "이색음식점",
          "A05020900", "카페/전통찻집");
      foodCategories.values().forEach(category -> groupedRestaurants.put(category, new ArrayList<>()));
    }

    return groupedRestaurants;
  }

  /**
   * ✅ 시/군/구 이름 조회 (새로 추가)
   */
  private String getSigunguName(String areaCode, String sigunguCode) {
    if (sigunguCode == null || sigunguCode.trim().isEmpty()) {
      return "";
    }
    
    try {
      Map<String, Object> result = tourFilterService.getSigunguCodes(areaCode);
      if ((Boolean) result.get("success")) {
        @SuppressWarnings("unchecked")
        List<Map<String, String>> sigunguList = (List<Map<String, String>>) result.get("data");
        
        if (sigunguList != null) {
          for (Map<String, String> sigungu : sigunguList) {
            if (sigunguCode.equals(sigungu.get("code")) || sigunguCode.equals(sigungu.get("sigungucode"))) {
              return sigungu.get("name");
            }
          }
        }
      }
    } catch (Exception e) {
      log.warn("⚠️ 시군구 이름 조회 실패: areaCode={}, sigunguCode={}, error={}", areaCode, sigunguCode, e.getMessage());
    }
    
    return "";
  }

  /**
   * 🔧 헬퍼 메서드들
   */
  private String optimizeImageUrl(String imageUrl) {
    if (imageUrl == null || imageUrl.trim().isEmpty()) {
      return "/uploads/tour/no-image.png";
    }
    if (imageUrl.startsWith("//")) {
      return "https:" + imageUrl;
    } else if (imageUrl.startsWith("/")) {
      return "https://tong.visitkorea.or.kr" + imageUrl;
    }
    return imageUrl;
  }

  private String getRegionNameByAreaCode(String areaCode) {
    Map<String, String> areaMap = new HashMap<>();
    areaMap.put("1", "서울");
    areaMap.put("2", "인천");
    areaMap.put("3", "대전");
    areaMap.put("4", "대구");
    areaMap.put("5", "광주");
    areaMap.put("6", "부산");
    areaMap.put("7", "울산");
    areaMap.put("8", "세종");
    areaMap.put("31", "경기");
    areaMap.put("32", "강원");
    areaMap.put("33", "충북");
    areaMap.put("34", "충남");
    areaMap.put("35", "경북");
    areaMap.put("36", "경남");
    areaMap.put("37", "전북");
    areaMap.put("38", "전남");
    areaMap.put("39", "제주");

    return areaMap.getOrDefault(areaCode, "전국");
  }

  private String getCategoryDisplayName(String categoryCode) {
    Map<String, String> categoryNames = Map.of(
        "A01", "자연",
        "A02", "문화/역사",
        "A03", "레포츠",
        "A04", "쇼핑",
        "A05", "음식");
    return categoryNames.getOrDefault(categoryCode, "기타");
  }

  /**
   * 🔄 Map → JsonNode 변환 (BarrierFreeService 호환)
   */
  private List<JsonNode> convertToJsonNodes(List<Map<String, Object>> spots) {
    List<JsonNode> jsonNodes = new ArrayList<>();

    for (Map<String, Object> spot : spots) {
      try {
        JsonNode jsonNode = objectMapper.valueToTree(spot);
        jsonNodes.add(jsonNode);
      } catch (Exception e) {
        log.warn("⚠️ Map → JsonNode 변환 실패: {}", e.getMessage());
      }
    }

    return jsonNodes;
  }

  /**
   * 🔄 JsonNode → Map 변환 (무장애 정보 통합)
   */
  private List<Map<String, Object>> convertFromJsonNodes(List<JsonNode> enrichedSpots,
      List<Map<String, Object>> originalSpots) {
    List<Map<String, Object>> finalSpots = new ArrayList<>();

    for (int i = 0; i < enrichedSpots.size() && i < originalSpots.size(); i++) {
      JsonNode enrichedNode = enrichedSpots.get(i);
      Map<String, Object> originalSpot = originalSpots.get(i);

      try {
        Map<String, Object> finalSpot = new HashMap<>(originalSpot);

        // 무장애 정보 추가
        finalSpot.put("accessibilityScore", enrichedNode.path("accessibilityScore").asInt(0));
        finalSpot.put("hasBarrierFreeInfo", enrichedNode.path("hasBarrierFreeInfo").asBoolean(false));
        finalSpot.put("barrierFreeInfo", enrichedNode.path("barrierFreeInfo").asText("{}"));

        finalSpots.add(finalSpot);

      } catch (Exception e) {
        log.warn("⚠️ JsonNode → Map 변환 실패: {}", e.getMessage());
        finalSpots.add(originalSpots.get(i)); // 원본 데이터라도 추가
      }
    }

    return finalSpots;
  }
}