package com.example.act2gether.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
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
 * 🆕 TourDetailController - v3.0 투어 상품화 시스템
 * 기존: 개별 관광지 모달 팝업
 * 변경: 통합 투어 상품 전용 상세페이지
 * 
 * 핵심 기능:
 * - tourId 파싱 및 개별 관광지 정보 조합
 * - 무장애여행 정보 통합
 * - 맛집 정보 연동
 * - 투어 상품 메타데이터 생성
 */
@RestController
@RequestMapping("/tour")
@RequiredArgsConstructor
@Slf4j
public class TourDetailController {

  @Autowired
  private TourFilterService tourFilterService;

  @Autowired
  private BarrierFreeService barrierFreeService;

  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * 🎯 투어 상세페이지 메인 엔드포인트
   * URL: /tour/{tourId}
   * 
   * @param tourId - contentid 조합 (예: "1115042113127512955")
   * @return 투어 상품 전체 정보 (관광지 + 맛집 + 메타데이터)
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

      // 2단계: 각 관광지 상세정보 조회
      List<Map<String, Object>> tourSpots = new ArrayList<>();
      String primaryAreaCode = null;
      String primaryRegion = null;

      for (int i = 0; i < contentIds.size(); i++) {
        String contentId = contentIds.get(i);
        Map<String, Object> spotDetail = tourFilterService.getTourDetail(contentId);

        if (spotDetail != null && (Boolean) spotDetail.get("success")) {
          JsonNode spotData = (JsonNode) spotDetail.get("data");

          // 첫 번째 관광지에서 지역 정보 추출
          if (i == 0) {
            primaryAreaCode = spotData.path("areacode").asText();
            primaryRegion = getRegionNameByAreaCode(primaryAreaCode);
          }

          // 관광지 정보 구성
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

          // 이미지 최적화
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

      // 4단계: 투어 메타데이터 생성
      Map<String, Object> tourMetadata = generateTourMetadata(finalSpots, primaryRegion, tourId);

      // 5단계: 맛집 정보 조회
      List<Map<String, Object>> restaurants = getRestaurantInfo(primaryAreaCode);

      // 6단계: 최종 응답 구성
      Map<String, Object> response = new HashMap<>();
      response.put("success", true);
      response.put("tourId", tourId);
      response.put("tour", tourMetadata);
      response.put("spots", finalSpots);
      response.put("restaurants", restaurants);
      response.put("version", "v3.0");
      response.put("features", List.of("투어상품화", "무장애통합", "맛집연동", "상세페이지"));

      log.info("🎉 투어 상세정보 조회 완료: {}개 관광지, {}개 맛집, 접근성점수: {}점",
          finalSpots.size(), restaurants.size(), tourMetadata.get("totalAccessibilityScore"));

      return ResponseEntity.ok(response);

    } catch (Exception e) {
      log.error("💥 투어 상세정보 조회 실패: tourId={}, error={}", tourId, e.getMessage(), e);
      return ResponseEntity.ok(Map.of(
          "success", false,
          "message", "투어 상세정보 조회 중 오류가 발생했습니다: " + e.getMessage()));
    }
  }

  /**
   * 🔧 tourId 파싱 (contentid 조합 → 개별 contentid 리스트)
   * 
   * @param tourId - "1115042113127512955" 형태
   * @return ["1115042", "1131275", "129552"] 형태
   */
  private List<String> parseTourId(String tourId) {
    List<String> contentIds = new ArrayList<>();

    if (tourId == null || tourId.trim().isEmpty()) {
      return contentIds;
    }

    try {
      // tourId 길이 검증
      if (tourId.length() < 6 || tourId.length() > 42) { // 최소 6자리, 최대 42자리 (7자리×6개)
        log.warn("⚠️ 잘못된 tourId 길이: {}", tourId.length());
        return contentIds;
      }

      // 7자리씩 분할하여 contentId 추출
      for (int i = 0; i < tourId.length(); i += 7) {
        if (i + 7 <= tourId.length()) {
          String contentId = tourId.substring(i, i + 7);

          // contentId 유효성 검증 (숫자만)
          if (contentId.matches("\\d{6,7}")) {
            contentIds.add(contentId);
          } else {
            log.warn("⚠️ 잘못된 contentId 형식: {}", contentId);
          }
        }
      }

      // 최대 6개까지만 허용
      if (contentIds.size() > 6) {
        contentIds = contentIds.subList(0, 6);
        log.info("📝 관광지 수 제한 적용: {}개 → 6개", contentIds.size());
      }

    } catch (Exception e) {
      log.error("💥 tourId 파싱 실패: {}", e.getMessage());
    }

    return contentIds;
  }

  /**
   * 🎨 투어 메타데이터 생성
   */
  private Map<String, Object> generateTourMetadata(List<Map<String, Object>> spots,
      String region, String tourId) {
    Map<String, Object> metadata = new HashMap<>();

    // 기본 정보
    metadata.put("tourId", tourId);
    metadata.put("region", region != null ? region : "전국");
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
   * 🍽️ 맛집 정보 조회 (한국관광공사 API A05 카테고리)
   */
  private List<Map<String, Object>> getRestaurantInfo(String areaCode) {
    List<Map<String, Object>> restaurants = new ArrayList<>();

    if (areaCode == null || areaCode.trim().isEmpty()) {
      return restaurants;
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
            if (data.isArray()) {
              for (JsonNode restaurant : data) {
                Map<String, Object> restaurantInfo = new HashMap<>();
                restaurantInfo.put("contentid", restaurant.path("contentid").asText());
                restaurantInfo.put("title", restaurant.path("title").asText());
                restaurantInfo.put("addr1", restaurant.path("addr1").asText());
                restaurantInfo.put("tel", restaurant.path("tel").asText());
                restaurantInfo.put("firstimage", restaurant.path("firstimage").asText());
                restaurantInfo.put("category", category.getValue());
                restaurantInfo.put("mapx", restaurant.path("mapx").asText());
                restaurantInfo.put("mapy", restaurant.path("mapy").asText());

                String optimizedImage = optimizeImageUrl(restaurant.path("firstimage").asText());
                restaurantInfo.put("optimizedImage", optimizedImage);

                restaurants.add(restaurantInfo);
              }
            }
          }
        } catch (Exception e) {
          log.warn("⚠️ {}({}) 맛집 조회 실패: {}", category.getValue(), category.getKey(), e.getMessage());
        }
      }

      log.info("🍽️ 맛집 정보 조회 완료: {}개 (지역: {})", restaurants.size(), areaCode);

    } catch (Exception e) {
      log.error("💥 맛집 정보 조회 실패: areaCode={}, error={}", areaCode, e.getMessage());
    }

    return restaurants;
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