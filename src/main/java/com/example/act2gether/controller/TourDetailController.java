package com.example.act2gether.controller;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.act2gether.service.TourFilterService;
import com.example.act2gether.service.ToursService;
import com.example.act2gether.entity.ToursEntity;
import com.example.act2gether.entity.TravelGroupsEntity;
import com.example.act2gether.repository.TravelGroupsRepository;
import com.example.act2gether.service.BarrierFreeService;
import com.example.act2gether.service.SpotDetailService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * TourDetailController - v3.0 투어 상품화 시스템 (완전 개선판)
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
  private TourFilterService tourFilterService; // ✅ 기본(좌표/이미지/카테고리)

  @Autowired
  private BarrierFreeService barrierFreeService;

  @Autowired
  private SpotDetailService spotDetailService; // ✅ 부가(휴무/시간/주차/요금)

  // TourDetailController 클래스 상단에 Repository 주입 추가
  @Autowired
  private TravelGroupsRepository travelGroupsRepository;

  // 여행 꿀정보
  @Autowired
  private ToursService toursService;

  // 새로 추가: 카카오맵 API 키
  @Value("${kakao.map.api.key}")
  private String kakaoMapApiKey;

  // fallback 대응

  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * 투어 상세페이지 메인 엔드포인트
   * URL: /tour/{tourId}
   * 
   * @param tourId - contentid 조합 (예: "1115042113127512955")
   * @return 투어 상품 전체 정보 (관광지 + 맛집 + 메타데이터 + API키)
   */

  @GetMapping("/{tourId}")
  public ResponseEntity<Map<String, Object>> getTourDetail(@PathVariable String tourId) {
    log.info("투어 상세페이지 요청 - tourId: {}", tourId);

    try {
      // 1단계: tourId 파싱
      List<String> contentIds = parseTourId(tourId);
      if (contentIds.isEmpty()) {
        return ResponseEntity.badRequest().body(Map.of(
            "success", false,
            "message", "잘못된 투어 ID 형식입니다."));
      }

      log.info("파싱된 관광지 ID 목록: {}개 - {}", contentIds.size(), contentIds);

      // 🆕 2단계: 세션 스토리지 활용 안내
      // 프론트엔드에서 세션 데이터를 우선 확인하도록 응답
      Map<String, Object> response = new HashMap<>();
      response.put("success", true);
      response.put("tourId", tourId);
      response.put("useSessionFirst", true); // 세션 우선 사용 플래그
      response.put("tour", generateBasicTourMetadata(contentIds, tourId));
      response.put("spots", Collections.emptyList()); // 빈 배열
      response.put("restaurants", new HashMap<>());
      response.put("kakaoMapApiKey", kakaoMapApiKey);
      response.put("version", "v3.0-session");
      // response.put("message", "프론트엔드 세션 데이터를 우선 확인하세요");

      log.info("세션 우선 응답 준비 완료: tourId={}", tourId);
      return ResponseEntity.ok(response);

    } catch (Exception e) {
      log.error("투어 상세정보 조회 실패: tourId={}, error={}", tourId, e.getMessage(), e);
      return ResponseEntity.ok(Map.of(
          "success", false,
          "message", "투어 상세정보 조회 중 오류가 발생했습니다: " + e.getMessage()));
    }
  }

  // 지역명을 areaCode로 변환하는 헬퍼 메서드 추가
  private String getAreaCodeByRegionName(String regionName) {
    Map<String, String> regionToCode = Map.of(
        "서울", "1",
        "부산", "6",
        "대구", "4",
        "인천", "2",
        "광주", "5",
        "대전", "3",
        "울산", "7",
        "경기", "31",
        "강원", "32",
        "충북", "33");

    Map<String, String> regionToCode2 = Map.of(
        "충남", "34",
        "전북", "37",
        "전남", "38",
        "경북", "35",
        "경남", "36",
        "제주", "39",
        "세종", "8");

    String code = regionToCode.getOrDefault(regionName, "");
    if (code.isEmpty()) {
      code = regionToCode2.getOrDefault(regionName, "");
    }

    return code;
  }

  /**
   * API 호출 대체 엔드포인트 (세션 데이터가 없을 때만 사용)
   */
  // fallback 엔드포인트도 수정
  @GetMapping("/{tourId}/fallback")
  public ResponseEntity<Map<String, Object>> getTourDetailFallback(
      @PathVariable String tourId,
      @RequestParam(required = false) String needs, // URL 파라미터에서 받기
      HttpServletRequest request) {
    log.info("투어 상세페이지 fallback 요청 - tourId: {}", tourId);

    try {
      // 1. tourId 파싱
      List<String> contentIds = parseTourId(tourId);
      if (contentIds.isEmpty()) {
        return ResponseEntity.badRequest().body(Map.of(
            "success", false,
            "message", "잘못된 투어 ID 형식입니다."));
      }

      log.info("추출된 contentId: {} ({}개)", contentIds, contentIds.size());

      // 2. 병렬로 각 contentId 상세정보 조회 (URL 순서 보장)
      List<CompletableFuture<Map<String, Object>>> futures = new ArrayList<>();

      for (int i = 0; i < contentIds.size(); i++) {
        final int order = i + 1; // URL 순서
        final String contentId = contentIds.get(i);

        CompletableFuture<Map<String, Object>> future = CompletableFuture.supplyAsync(() -> {
          Map<String, Object> spot = new HashMap<>();
          spot.put("order", order);
          spot.put("contentid", contentId);

          try {
            // 한국관광공사 API 직접 호출
            Map<String, Object> spotDetail = tourFilterService.getTourDetail(contentId);

            if (spotDetail != null && (Boolean) spotDetail.get("success")) {
              JsonNode spotData = (JsonNode) spotDetail.get("data");

              // 세션 기반과 동일한 필드 구조로 매핑
              spot.put("title", spotData.path("title").asText("관광지 정보 없음"));
              spot.put("addr1", spotData.path("addr1").asText(""));
              spot.put("addr2", spotData.path("addr2").asText(""));
              spot.put("tel", spotData.path("tel").asText(""));
              spot.put("homepage", spotData.path("homepage").asText(""));
              spot.put("overview", spotData.path("overview").asText(""));
              spot.put("firstimage", spotData.path("firstimage").asText(""));
              spot.put("firstimage2", spotData.path("firstimage2").asText(""));
              spot.put("mapx", spotData.path("mapx").asText("0"));
              spot.put("mapy", spotData.path("mapy").asText("0"));
              spot.put("cat1", spotData.path("cat1").asText(""));
              spot.put("cat2", spotData.path("cat2").asText(""));
              spot.put("cat3", spotData.path("cat3").asText(""));
              spot.put("areacode", spotData.path("areacode").asText(""));
              spot.put("sigungucode", spotData.path("sigungucode").asText(""));

              // 추가 처리 필드
              spot.put("optimizedImage", optimizeImageUrl(spotData.path("firstimage").asText()));
              spot.put("categoryName", getCategoryDisplayName(spotData.path("cat1").asText()));

              log.info("{}번 관광지 조회 성공: {}", order, spot.get("title"));
            } else {
              log.error("API 응답 실패 상세: contentId={}, success=false, message={}, 전체응답={}",
                  contentId,
                  spotDetail != null ? spotDetail.get("message") : "null response",
                  spotDetail);
              throw new Exception("API 조회 실패: " + (spotDetail != null ? spotDetail.get("message") : "응답 없음"));
            }
          } catch (Exception e) {
            log.warn("{}번 contentId {} 조회 실패: {}", order, contentId, e.getMessage());

            // 실패해도 자리는 채워서 일관성 유지
            spot.put("title", "정보 없음");
            spot.put("addr1", "");
            spot.put("addr2", "");
            spot.put("tel", "");
            spot.put("homepage", "");
            spot.put("overview", "");
            spot.put("firstimage", "");
            spot.put("firstimage2", "");
            spot.put("mapx", "0");
            spot.put("mapy", "0");
            spot.put("cat1", "");
            spot.put("cat2", "");
            spot.put("cat3", "");
            spot.put("areacode", "");
            spot.put("sigungucode", "");
            spot.put("optimizedImage", "/uploads/tour/no-image.png");
            spot.put("categoryName", "기타");
            // 무장애 정보 필드도 추가
            spot.put("hasBarrierFreeInfo", false);
            spot.put("accessibilityScore", 0);
            spot.put("barrierFreeInfo", "{}");
            // 스택 트레이스도 로그에 출력 (디버깅용)
            log.error("상세 에러 스택:", e);
          }
          return spot;
        });

        futures.add(future);
      }

      // 모든 비동기 완료 대기 및 순서 보장 수집
      CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

      List<Map<String, Object>> tourSpots = futures.stream()
          .map(CompletableFuture::join)
          .sorted(Comparator.comparingInt(m -> (Integer) m.get("order"))) // URL 순서
          .collect(Collectors.toList());

      log.info("전체 spot 수집 완료: {}개 (URL 순서 보장)", tourSpots.size());

      // 첫 번째 유효한 spot에서 지역 정보 추출
      String primaryAreaCode = "";
      String primarySigunguCode = "";
      String primaryRegion = "전국";

      for (Map<String, Object> spot : tourSpots) {
        String areaCode = (String) spot.get("areacode");
        if (areaCode != null && !areaCode.isEmpty()) {
          primaryAreaCode = areaCode;
          primarySigunguCode = (String) spot.getOrDefault("sigungucode", "");
          primaryRegion = getRegionNameByAreaCode(primaryAreaCode);
          log.info("🗺️ 지역 정보 확정: {} ({})", primaryRegion, primaryAreaCode);
          break;
        }
      }

      // 3. 무장애 정보 통합 (안전 merge) - 핵심 수정 부분
      try {
        List<JsonNode> spotsAsJsonNodes = convertToJsonNodes(tourSpots);
        List<JsonNode> enriched = barrierFreeService.enrichWithBarrierFreeInfo(
            spotsAsJsonNodes, primaryAreaCode, primarySigunguCode);

        // contentId → enriched 노드 맵
        Map<String, JsonNode> byId = new HashMap<>();
        for (JsonNode n : enriched) {
          String cid = n.path("contentid").asText("");
          if (!cid.isEmpty())
            byId.put(cid, n);
        }

        // 모든 spot에 대해 무장애 정보 보장
        for (Map<String, Object> spot : tourSpots) {
          String cid = String.valueOf(spot.getOrDefault("contentid", ""));
          JsonNode n = byId.get(cid);

          if (n != null && n.has("barrierFreeInfo")) {
            spot.put("hasBarrierFreeInfo", true);
            spot.put("accessibilityScore", n.path("accessibilityScore").asInt(0));
            spot.put("barrierFreeInfo", n.get("barrierFreeInfo").toString());
          } else {
            // ✅ 무장애 정보가 없어도 필드는 반드시 추가
            spot.put("hasBarrierFreeInfo", false);
            spot.put("accessibilityScore", 0);
            spot.put("barrierFreeInfo", "{}");
          }
        }

        log.info("🛡️ 무장애 merge 완료: 전체 {} 중 무장애정보 {}개",
            tourSpots.size(), byId.size());

      } catch (Exception e) {
        log.warn("무장애 merge 실패, 원본 유지: {}", e.getMessage());
        // ✅ 예외 발생 시에도 모든 spot에 기본값 설정
        for (Map<String, Object> spot : tourSpots) {
          spot.putIfAbsent("hasBarrierFreeInfo", false);
          spot.putIfAbsent("accessibilityScore", 0);
          spot.putIfAbsent("barrierFreeInfo", "{}");
        }
      }

      // 4. 맛집 정보 조회 (동일 관광지 좌표만 사용)
      Map<String, List<Map<String, Object>>> restaurants = new HashMap<>();
      try {
        List<Map<String, Object>> validSpots = tourSpots.stream()
            .filter(s -> !"0".equals(String.valueOf(s.get("mapx")))
                && !"0".equals(String.valueOf(s.get("mapy")))
                && !String.valueOf(s.get("mapx")).isEmpty()
                && !String.valueOf(s.get("mapy")).isEmpty())
            .collect(Collectors.toList());

        if (!validSpots.isEmpty()) {
          restaurants = tourFilterService.getRestaurantsAroundMultipleSpots(validSpots);
          log.info("맛집 검색 완료: {}개 유효 좌표 → {}개 카테고리",
              validSpots.size(), restaurants.size());
        } else {
          // 동일성 보장: 좌표 없으면 빈 결과 (지역 대체검색 금지)
          restaurants = new HashMap<>();
          log.info("모든 spot 좌표 없음 → restaurants 빈 맵 유지");
        }
      } catch (Exception e) {
        log.warn("맛집 조회 실패, 빈 결과 유지: {}", e.getMessage());
      }

      // 5. 투어 메타데이터 생성
      int totalBarrierFreeSpots = (int) tourSpots.stream()
          .mapToLong(spot -> (Boolean) spot.getOrDefault("hasBarrierFreeInfo", false) ? 1 : 0)
          .sum();

      double avgAccessibilityScore = tourSpots.stream()
          .mapToInt(spot -> (Integer) spot.getOrDefault("accessibilityScore", 0))
          .average()
          .orElse(0.0);

      Map<String, Object> tourMetadata = new HashMap<>();
      tourMetadata.put("tourId", tourId);
      tourMetadata.put("title", primaryRegion + " 투어 (" + tourSpots.size() + "곳)");
      tourMetadata.put("region", primaryRegion);
      tourMetadata.put("areaCode", primaryAreaCode);
      tourMetadata.put("sigunguCode", primarySigunguCode);
      tourMetadata.put("sigungu", getSigunguName(primaryAreaCode, primarySigunguCode));
      tourMetadata.put("spotCount", tourSpots.size());
      tourMetadata.put("totalBarrierFreeSpots", totalBarrierFreeSpots);
      tourMetadata.put("totalAccessibilityScore", Math.round(avgAccessibilityScore * 10) / 10.0);
      tourMetadata.put("hasBarrierFreeInfo", totalBarrierFreeSpots > 0);

      if (!tourSpots.isEmpty()) {
        tourMetadata.put("representativeImage", tourSpots.get(0).get("optimizedImage"));
        tourMetadata.put("representativeTitle", tourSpots.get(0).get("title"));
      }

      // 6. 서버 세션에도 캐시 (같은 tourId 재진입 가속)
      try {
        Map<String, Object> cache = new HashMap<>();
        cache.put("spots", tourSpots);
        cache.put("tour", tourMetadata);
        cache.put("restaurants", restaurants);
        cache.put("areaCode", primaryAreaCode);
        cache.put("region", primaryRegion);
        request.getSession(true).setAttribute("tour_" + tourId, cache);
        log.info("서버 세션 캐시 저장 완료");
      } catch (Exception e) {
        log.warn("세션 캐시 저장 실패: {}", e.getMessage());
      }

      // 7. 최종 응답 구성
      Map<String, Object> response = new HashMap<>();
      response.put("success", true);
      response.put("tourId", tourId);
      response.put("tour", tourMetadata);
      response.put("spots", tourSpots);
      response.put("restaurants", restaurants);
      response.put("kakaoMapApiKey", kakaoMapApiKey);
      // 편의시설 필터 정보 추가 (URL 파라미터에서 온 경우)
      if (needs != null && !needs.isEmpty()) {
        Map<String, Object> accessibilityInfo = new HashMap<>();
        accessibilityInfo.put("selectedNeedsType", needs);
        accessibilityInfo.put("hasAccessibilityFilter", true);

        // 편의시설별 카운트
        Map<String, String[]> needsMapping = Map.of(
            "주차편의", new String[] { "parking", "publictransport" },
            "접근편의", new String[] { "route", "exit" },
            "시설편의", new String[] { "restroom", "elevator" });

        String needsType = needs.replace("편의", " 편의"); // "주차편의" -> "주차 편의"
        accessibilityInfo.put("selectedNeedsType", needsType);

        // validCount 계산
        int validCount = 0;
        String[] fields = needsMapping.get(needs);
        if (fields != null) {
          for (Map<String, Object> spot : tourSpots) {
            String bfInfo = (String) spot.get("barrierFreeInfo");
            if (bfInfo != null && !bfInfo.equals("{}")) {
              try {
                JsonNode node = objectMapper.readTree(bfInfo);
                for (String field : fields) {
                  if (node.has(field) && !node.get(field).asText("").isEmpty()) {
                    validCount++;
                    break;
                  }
                }
              } catch (Exception e) {
              }
            }
          }
        }
        accessibilityInfo.put("validCount", validCount);
        accessibilityInfo.put("totalCount", tourSpots.size());

        response.put("accessibilityInfo", accessibilityInfo);
        log.info("편의시설 필터 적용: {}, valid={}/{}", needsType, validCount, tourSpots.size());
      }

      log.info("fallback 완료: {}개 관광지 → 무장애 {}개, 맛집 {}개 카테고리",
          tourSpots.size(), totalBarrierFreeSpots, restaurants.size());

      response.put("version", "v3.0-consistent");
      return ResponseEntity.ok(response);

    } catch (

    Exception e) {
      log.error("fallback 전체 실패: tourId={}, error={}", tourId, e.getMessage(), e);

      // 완전 실패 시에도 기본 구조 반환
      Map<String, Object> response = new HashMap<>();
      response.put("success", false);
      response.put("message", "투어 정보를 불러올 수 없습니다. 다시 시도해주세요.");
      response.put("tourId", tourId);
      response.put("tour", generateBasicTourMetadata(parseTourId(tourId), tourId));
      response.put("spots", new ArrayList<>());
      response.put("restaurants", new HashMap<>());
      response.put("kakaoMapApiKey", kakaoMapApiKey);
      response.put("version", "v3.0-error-fallback");

      return ResponseEntity.ok(response);
    }
  }

  // 편의시설 필터링 헬퍼 메서드
  private List<Map<String, Object>> filterSpotsByAccessibility(
      List<Map<String, Object>> spots, String needsType) {

    Map<String, String[]> ACCESSIBILITY_GROUPS = Map.of(
        "주차 편의", new String[] { "parking", "publictransport" },
        "접근 편의", new String[] { "route", "exit" },
        "시설 편의", new String[] { "restroom", "elevator" });

    String[] requiredFields = ACCESSIBILITY_GROUPS.get(needsType);
    if (requiredFields == null)
      return spots;

    return spots.stream()
        .filter(spot -> {
          String barrierFreeJson = (String) spot.get("barrierFreeInfo");
          if (barrierFreeJson == null || "{}".equals(barrierFreeJson)) {
            return false;
          }

          try {
            JsonNode barrierFreeInfo = objectMapper.readTree(barrierFreeJson);
            for (String field : requiredFields) {
              if (barrierFreeInfo.has(field) &&
                  !barrierFreeInfo.get(field).asText("").isEmpty()) {
                return true; // 하나라도 있으면 통과
              }
            }
          } catch (Exception e) {
            log.warn("barrierFreeInfo 파싱 실패: {}", e.getMessage());
          }
          return false;
        })
        .collect(Collectors.toList());
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
      log.warn("지역 코드 추정 실패: {}", e.getMessage());
    }
    return "1"; // 기본값: 서울
  }

  /**
   * 🔧 tourId 파싱 (contentid 조합 → 하이픈 구분자 방식 - 안전하고 성능 최적)
   * 
   * @param tourId - "1115042-1131275-129552" 형태
   * @return ["1115042", "1131275", "129552"] 형태
   */
  private List<String> parseTourId(String tourId) {
    if (tourId == null || tourId.trim().isEmpty()) {
      log.warn("빈 tourId");
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
          log.warn("잘못된 contentId 형식: {}", contentId);
        }
      }

      // 최대 15개까지 허용 (요구사항 반영)
      if (validContentIds.size() > 15) {
        validContentIds = validContentIds.subList(0, 15);
        log.info("관광지 수 제한 적용: {}개 → 15개", contentIds.size());
      }

      log.debug("tourId 파싱 완료: {} → {}개 contentId", tourId, validContentIds.size());
      return validContentIds;

    } catch (Exception e) {
      log.error("tourId 파싱 실패: tourId={}, error={}", tourId, e.getMessage());
      return new ArrayList<>();
    }
  }

  /**
   * 🎨 투어 메타데이터 생성 (시/군/구 정보 추가)
   */
  private Map<String, Object> generateTourMetadata(List<Map<String, Object>> spots,
      String region, String areaCode, String sigunguCode, String tourId) {
    Map<String, Object> metadata = new HashMap<>();

    // 기본 정보
    metadata.put("tourId", tourId);
    metadata.put("region", region != null ? region : "전국");
    metadata.put("areaCode", areaCode);
    metadata.put("sigunguCode", sigunguCode);

    // 시/군/구 이름 추가
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
   * 맛집 정보 전용 엔드포인트 (관광지 상세정보와 동일한 패턴)
   */
  @PostMapping("/{tourId}/restaurants")
  public ResponseEntity<Map<String, Object>> getTourRestaurantsWithSpots(
      @PathVariable String tourId,
      @RequestBody Map<String, Object> requestBody) {

    log.info("투어 맛집 정보 요청 (좌표 포함): tourId={}", tourId);

    try {
      List<Map<String, Object>> spots = (List<Map<String, Object>>) requestBody.get("spots");

      if (spots != null && !spots.isEmpty()) {
        log.info("클라이언트에서 전송한 좌표 사용: {}개 관광지", spots.size());

        // TourFilterService 호출
        Map<String, List<Map<String, Object>>> groupedRestaurants = tourFilterService
            .getRestaurantsAroundMultipleSpots(spots);

        int totalCount = groupedRestaurants.values().stream()
            .mapToInt(List::size)
            .sum();

        log.info("맛집 검색 완료: 총 {}개", totalCount);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "restaurants", groupedRestaurants,
            "searchedSpots", spots.size()));
      }

      return ResponseEntity.ok(Map.of(
          "success", false,
          "message", "좌표 정보가 없습니다"));

    } catch (Exception e) {
      log.error("맛집 정보 조회 실패: {}", e.getMessage(), e);
      return ResponseEntity.ok(Map.of(
          "success", false,
          "message", "맛집 정보를 불러올 수 없습니다"));
    }
  }

  /**
   * 맛집 정보 조회 (카테고리별 그룹화된 Map 반환)
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
            log.info("{} 맛집 {}개 조회 완료", category.getValue(), categoryRestaurants.size());

          }
        } catch (Exception e) {
          log.warn("{}({}) 맛집 조회 실패: {}", category.getValue(), category.getKey(), e.getMessage());
          // 실패한 경우에도 빈 리스트 유지
          groupedRestaurants.put(category.getValue(), new ArrayList<>());
        }
      }

      int totalRestaurants = groupedRestaurants.values().stream()
          .mapToInt(List::size)
          .sum();
      log.info("맛집 정보 조회 완료: {}개 카테고리, 총 {}개 맛집 (지역: {})",
          groupedRestaurants.size(), totalRestaurants, areaCode);

    } catch (Exception e) {
      log.error("맛집 정보 조회 실패: areaCode={}, error={}", areaCode, e.getMessage());

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
   * 시/군/구 이름 조회 (새로 추가)
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
      log.warn("시군구 이름 조회 실패: areaCode={}, sigunguCode={}, error={}", areaCode, sigunguCode, e.getMessage());
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
   * Map → JsonNode 변환 (BarrierFreeService 호환)
   */
  private List<JsonNode> convertToJsonNodes(List<Map<String, Object>> spots) {
    List<JsonNode> jsonNodes = new ArrayList<>();

    for (Map<String, Object> spot : spots) {
      try {
        JsonNode jsonNode = objectMapper.valueToTree(spot);
        jsonNodes.add(jsonNode);
      } catch (Exception e) {
        log.warn("Map → JsonNode 변환 실패: {}", e.getMessage());
      }
    }

    return jsonNodes;
  }

  /**
   * JsonNode → Map 변환 (무장애 정보 통합)
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
        log.warn("JsonNode → Map 변환 실패: {}", e.getMessage());
        finalSpots.add(originalSpots.get(i)); // 원본 데이터라도 추가
      }
    }

    return finalSpots;
  }

  /**
   * 관광지 상세정보 조회 - 아코디언용
   * URL: /tour-detail/spot-detail/{contentId}
   * 
   * @param contentId - 관광지 ID
   * @return 통합된 관광지 상세정보 (홈페이지, 쉬는날, 이용시간, 주차, 입장료)
   */
  @GetMapping("/spot-detail/{contentId}")
  public ResponseEntity<Map<String, Object>> getSpotDetail(@PathVariable String contentId) {
    log.info("관광지 상세정보 조회: contentId={}", contentId);

    try {
      Map<String, Object> result = spotDetailService.getSpotDetail(contentId);

      if ((Boolean) result.get("success")) {
        log.info("관광지 상세정보 조회 성공: contentId={}", contentId);
      } else {
        log.warn("관광지 상세정보 조회 실패: contentId={}, message={}",
            contentId, result.get("message"));
      }

      return ResponseEntity.ok(result);

    } catch (Exception e) {
      log.error("관광지 상세정보 조회 중 예외 발생: contentId={}, error={}", contentId, e.getMessage(), e);

      return ResponseEntity.ok(Map.of(
          "success", false,
          "message", "상세정보를 불러오는 중 오류가 발생했습니다: " + e.getMessage()));
    }
  }

  /**
   * 🆕 배치 상세정보 조회 - 여러 관광지를 한번에 조회 (선택사항)
   */
  @GetMapping("/spot-detail/batch")
  public ResponseEntity<Map<String, Object>> getSpotDetailBatch(@RequestParam String ids) {
    try {
      String[] contentIds = ids.split(",");
      Map<String, Object> results = new HashMap<>();

      for (String contentId : contentIds) {
        Map<String, Object> spotDetail = spotDetailService.getSpotDetail(contentId.trim());
        if ((Boolean) spotDetail.get("success")) {
          results.put(contentId.trim(), spotDetail.get("data"));
        }
      }

      return ResponseEntity.ok(Map.of(
          "success", true,
          "data", results));

    } catch (Exception e) {
      log.error("배치 상세정보 조회 실패: {}", e.getMessage());
      return ResponseEntity.ok(Map.of(
          "success", false,
          "message", "상세정보를 불러올 수 없습니다"));
    }
  }

  /**
   * 여행 그룹 존재 여부 확인
   * GET /tour-detail/{tourId}/group-status
   * 
   * @param tourId - 투어 ID
   * @return 그룹 존재 여부 및 참여 가능 상태
   */
  @GetMapping("/{tourId}/group-status")
  public ResponseEntity<Map<String, Object>> checkTravelGroupStatus(@PathVariable String tourId) {
    log.info("여행 그룹 상태 확인: tourId={}", tourId);

    Map<String, Object> response = new HashMap<>();

    try {
      // 1. 해당 tourId로 그룹이 존재하는지 확인
      boolean hasGroup = travelGroupsRepository.existsByTourId(tourId);

      // 2. 참여 가능한 그룹이 있는지 확인
      long availableGroups = 0;
      List<Map<String, Object>> groupInfo = new ArrayList<>();

      if (hasGroup) {
        // 활성 그룹들 조회
        List<TravelGroupsEntity> activeGroups = travelGroupsRepository.findActiveGroupsByTourId(tourId);

        for (TravelGroupsEntity group : activeGroups) {
          Map<String, Object> info = new HashMap<>();
          info.put("groupId", group.getGroupId());
          info.put("currentMembers", group.getCurrentMembers());
          info.put("maxMembers", group.getMaxMembers());
          info.put("status", group.getStatus());
          info.put("startDate", group.getStartDate());
          info.put("endDate", group.getEndDate());
          info.put("recruitDeadline", group.getRecruitDeadline());

          // 참여 가능한지 확인
          boolean canJoin = "recruiting".equals(group.getStatus()) &&
              group.getCurrentMembers() < group.getMaxMembers();
          info.put("canJoin", canJoin);

          if (canJoin)
            availableGroups++;

          groupInfo.add(info);
        }
      }

      response.put("success", true);
      response.put("hasGroup", hasGroup);
      response.put("availableGroups", availableGroups);
      response.put("canJoinGroup", availableGroups > 0);
      response.put("groups", groupInfo);
      response.put("tourId", tourId);

      log.info("여행 그룹 상태: tourId={}, hasGroup={}, availableGroups={}",
          tourId, hasGroup, availableGroups);

      return ResponseEntity.ok(response);

    } catch (Exception e) {
      log.error("여행 그룹 상태 확인 실패: tourId={}, error={}", tourId, e.getMessage(), e);

      response.put("success", false);
      response.put("message", "그룹 상태 확인 중 오류가 발생했습니다");
      response.put("hasGroup", false);
      response.put("canJoinGroup", false);

      return ResponseEntity.ok(response);
    }
  }

  /**
   * 투어별 여행 그룹 목록 조회
   * GET /tour-detail/{tourId}/groups
   * 
   * @param tourId - 투어 ID
   * @return 여행 그룹 목록
   */
  @GetMapping("/{tourId}/groups")
  public ResponseEntity<Map<String, Object>> getTravelGroups(@PathVariable String tourId) {
    log.info("투어별 여행 그룹 조회: tourId={}", tourId);

    Map<String, Object> response = new HashMap<>();

    try {
      List<TravelGroupsEntity> groups = travelGroupsRepository.findByTourId(tourId);

      List<Map<String, Object>> groupList = new ArrayList<>();
      for (TravelGroupsEntity group : groups) {
        Map<String, Object> groupData = new HashMap<>();
        groupData.put("groupId", group.getGroupId());
        groupData.put("intro", group.getIntro());
        groupData.put("currentMembers", group.getCurrentMembers());
        groupData.put("maxMembers", group.getMaxMembers());
        groupData.put("startDate", group.getStartDate());
        groupData.put("endDate", group.getEndDate());
        groupData.put("recruitDeadline", group.getRecruitDeadline());
        groupData.put("status", group.getStatus());
        groupData.put("createdAt", group.getCreatedAt());

        // 참여 가능 여부
        boolean canJoin = ("recruiting".equals(group.getStatus()) || "open".equals(group.getStatus()))
            && group.getCurrentMembers() < group.getMaxMembers();
        groupData.put("canJoin", canJoin);

        // 참여 가능 인원
        int availableSlots = group.getMaxMembers() - group.getCurrentMembers();
        groupData.put("availableSlots", availableSlots);

        groupList.add(groupData);
      }

      response.put("success", true);
      response.put("tourId", tourId);
      response.put("groups", groupList);
      response.put("totalGroups", groups.size());

      log.info("여행 그룹 조회 완료: tourId={}, 그룹 수={}", tourId, groups.size());

      return ResponseEntity.ok(response);

    } catch (Exception e) {
      log.error("여행 그룹 조회 실패: tourId={}, error={}", tourId, e.getMessage(), e);

      response.put("success", false);
      response.put("message", "그룹 목록 조회 중 오류가 발생했습니다");
      response.put("groups", new ArrayList<>());

      return ResponseEntity.ok(response);
    }
  }

  /**
   * 지역별 여행 꿀정보 조회
   * GET /tour-detail/region-tips/{areaCode}
   */
  // 기존 엔드포인트를 Optional PathVariable로 수정
  @GetMapping({ "/region-tips/{areaCode}", "/region-tips/{areaCode}/" })
  public ResponseEntity<Map<String, Object>> getRegionTips(
      @PathVariable String areaCode,
      @RequestParam(required = false) String sigunguCode) {

    log.info("지역별 여행 꿀정보 조회: areaCode={}, sigunguCode={}", areaCode, sigunguCode);

    Map<String, Object> response = new HashMap<>();

    try {
      // 모든 투어 정보 가져오기
      List<ToursEntity> regionTours = toursService.getAllToursByRegion(areaCode);
      String regionName = toursService.getRegionName(areaCode);

      if (!regionTours.isEmpty()) {
        List<Map<String, Object>> allTips = new ArrayList<>();

        for (ToursEntity tour : regionTours) {
          Map<String, Object> tipData = new HashMap<>();
          tipData.put("tourId", tour.getTourId());
          tipData.put("region", regionName);
          tipData.put("url", tour.getUrl());
          tipData.put("tourExplain", tour.getTourExplain());

          String explain = tour.getTourExplain();
          if (explain != null && explain.contains(" - ")) {
            String[] parts = explain.split(" - ", 2);
            tipData.put("title", parts[0]);
            tipData.put("description", parts.length > 1 ? parts[1] : "");
          } else {
            tipData.put("title", explain != null ? explain : "지역 특색 여행");
            tipData.put("description", "");
          }

          allTips.add(tipData);
        }

        response.put("success", true);
        response.put("hasData", true);
        response.put("data", allTips); // 배열로 모든 투어 전송
        response.put("totalCount", regionTours.size());

        log.info("지역 꿀정보 응답: {}개 투어", allTips.size());

      } else {
        response.put("success", true);
        response.put("hasData", false);
        response.put("regionName", regionName);
        response.put("message", regionName + " 지역의 특색 정보를 준비 중입니다");
      }

    } catch (Exception e) {
      log.error("지역 꿀정보 조회 실패: {}", e.getMessage(), e);
      String regionName = toursService.getRegionName(areaCode);
      response.put("success", false);
      response.put("hasData", false);
      response.put("regionName", regionName);
    }

    return ResponseEntity.ok(response);
  }

}