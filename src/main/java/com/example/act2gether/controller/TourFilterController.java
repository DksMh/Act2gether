/**
 * TourFilterController.java - v2.3 Enhanced 깔끔한 버전
 * 핵심 기능만 유지: 검색, 필터 옵션, 상세 조회
 * 없는 메서드들 모두 제거
 */

package com.example.act2gether.controller;

import java.util.Map;
import java.util.Set;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;
import com.example.act2gether.service.TourFilterService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/tours")
@RequiredArgsConstructor
@Slf4j
public class TourFilterController {

    private final TourFilterService tourFilterService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // 설정값으로 기본값 관리
    @Value("${tour.search.default.numOfRows:6}")
    private int defaultNumOfRows;

    @Value("${tour.search.max.numOfRows:80}")
    private int maxNumOfRows;

    @Value("${tour.search.min.numOfRows:1}")
    private int minNumOfRows;

    /**
     * ✅ 필터 옵션 조회 (v3.0 단순화 반영)
     */
    @GetMapping("/filter-options")
    public ResponseEntity<Map<String, Object>> getFilterOptions() {
        log.info("🎯 v3.0 필터 옵션 조회 - UI 단순화 (장소 중심)");

        Map<String, Object> options = tourFilterService.getFilterOptions();

        // v3.0 정보 업데이트
        options.put("version", "v3.0");

        // v3.0: UI에서 제거된 필터들 (참조용으로만 유지)
        options.put("uiFilters", Arrays.asList("region", "places", "needs", "numOfRows"));
        options.put("hiddenFilters", Arrays.asList("themes", "activities")); // 자동 매핑됨

        Map<String, Integer> maxSelections = new HashMap<>();
        maxSelections.put("places", 6); // UI에서 유일한 다중선택
        options.put("maxSelections", maxSelections);

        options.put("features", "UI단순화 + 장소기반 자동매핑 + 액티브시니어 최적화");
        options.put("simplification", "필터 50% 감소 (7개→4개)");

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", options);

        return ResponseEntity.ok(response);
    }

    /**
     * 🆕 v3.0: 장소 기반 테마/활동 자동 매핑
     */
    private Map<String, String> autoMapFromPlaces(Map<String, String> params) {
        Map<String, String> mappedParams = new HashMap<>(params);

        String placesParam = params.get("places");
        if (placesParam != null && !placesParam.trim().isEmpty()) {
            try {
                // JSON 배열 파싱
                JsonNode placesArray = objectMapper.readTree(placesParam);
                List<String> placeNames = new ArrayList<>();

                if (placesArray.isArray()) {
                    for (JsonNode place : placesArray) {
                        placeNames.add(place.asText().trim());
                    }
                }

                // 자동 매핑 수행
                List<String> mappedThemes = mapPlacesToThemes(placeNames);
                List<String> mappedActivities = mapPlacesToActivities(placeNames);

                // JSON 형태로 변환하여 파라미터에 추가
                if (!mappedThemes.isEmpty()) {
                    mappedParams.put("themes", objectMapper.writeValueAsString(mappedThemes));
                    log.info("🔄 자동 매핑된 테마: {}", mappedThemes);
                }

                if (!mappedActivities.isEmpty()) {
                    mappedParams.put("activities", objectMapper.writeValueAsString(mappedActivities));
                    log.info("🔄 자동 매핑된 활동: {}", mappedActivities);
                }

            } catch (Exception e) {
                log.warn("⚠️ 장소 자동 매핑 실패: {}", e.getMessage());
            }
        }

        return mappedParams;
    }

    /**
     * 🆕 v3.0: 장소 → 테마 매핑 로직
     */
    private List<String> mapPlacesToThemes(List<String> places) {
        Set<String> themes = new HashSet<>();

        for (String place : places) {
            // 자연 관련 장소들
            if (Arrays.asList("해변", "산/공원", "계곡/폭포", "호수/강", "수목원",
                    "자연휴양림", "자연생태관광지").contains(place)) {
                themes.add("자연");
            }

            // 문화/역사 관련 장소들
            if (Arrays.asList("고궁/문", "민속마을/가옥", "유적지", "사찰", "종교성지",
                    "박물관", "미술관", "체험", "온천", "테마파크", "관광단지",
                    "창질방", "유람선/잠수함관광").contains(place)) {
                themes.add("문화/역사");
            }

            // 레저 관련 장소들
            if (Arrays.asList("트래킹", "골프장", "스키장", "캠핑장", "낚시").contains(place)) {
                themes.add("레포츠");
            }
        }

        return new ArrayList<>(themes);
    }

    /**
     * 🆕 v3.0: 장소 → 활동 매핑 로직
     */
    private List<String> mapPlacesToActivities(List<String> places) {
        Set<String> activities = new HashSet<>();

        for (String place : places) {
            // 자연관광지 활동
            if (Arrays.asList("해변", "산/공원", "계곡/폭포", "호수/강", "수목원",
                    "자연휴양림", "자연생태관광지").contains(place)) {
                activities.add("자연관광지");
            }

            // 역사관광지 활동
            if (Arrays.asList("고궁/문", "민속마을/가옥", "유적지", "사찰", "종교성지").contains(place)) {
                activities.add("역사관광지");
            }

            // 휴양관광지 활동
            if (Arrays.asList("온천", "테마파크", "관광단지", "창질방", "유람선/잠수함관광").contains(place)) {
                activities.add("휴양관광지");
            }

            // 체험관광지 활동
            if (Arrays.asList("체험").contains(place)) {
                activities.add("체험관광지");
            }

            // 문화시설 활동
            if (Arrays.asList("박물관", "미술관").contains(place)) {
                activities.add("문화시설");
            }

            // 육상레포츠 활동
            if (Arrays.asList("트래킹", "골프장", "스키장", "캠핑장").contains(place)) {
                activities.add("육상레포츠");
            }

            // 수상레포츠 활동
            if (Arrays.asList("낚시").contains(place)) {
                activities.add("수상레포츠");
            }
        }

        return new ArrayList<>(activities);
    }

    /**
     * ✅ 사용자 관심사 기반 필터 설정 조회
     */
    @GetMapping("/user-interests")
    public ResponseEntity<Map<String, Object>> getUserInterests(Authentication authentication) {
        log.info("사용자 관심사 조회 요청");

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            log.info("비로그인 사용자 요청");
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "로그인이 필요합니다.",
                    "loginRequired", true));
        }

        try {
            String userId = authentication.getName();
            log.info("로그인 사용자 관심사 조회: {}", userId);

            UserEntity user = userRepository.findById(userId).orElse(null);

            if (user == null) {
                log.warn("사용자를 찾을 수 없음: {}", userId);
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "사용자를 찾을 수 없습니다.",
                        "loginRequired", false));
            }

            if (user.getInterests() == null || user.getInterests().trim().isEmpty()) {
                log.info("사용자 관심사 설정되지 않음: {}", userId);
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "관심사가 설정되지 않았습니다. 마이페이지에서 설정해주세요.",
                        "loginRequired", false));
            }

            Map<String, Object> filters = tourFilterService.mapUserInterestsToFilters(user.getInterests());
            log.info("사용자 관심사 매핑 완료: {} 항목", filters.size());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", filters,
                    "loginRequired", false,
                    "userId", userId));

        } catch (Exception e) {
            log.error("사용자 관심사 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "관심사 조회에 실패했습니다.",
                    "loginRequired", false));
        }
    }

    /**
     * ✅ 관광지 검색 - v3.0 장소 기반 자동 매핑 지원
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchTours(@RequestParam Map<String, String> params) {
        log.info("🎯 v3.0 관광지 검색 요청 - 파라미터: {}", params);

        // v3.0: 장소 기반 자동 매핑 수행
        Map<String, String> enhancedParams = autoMapFromPlaces(params);

        // 파라미터 유효성 검증 및 정규화
        Map<String, String> normalizedParams = validateAndNormalizeSearchParams(enhancedParams);
        log.info("정규화된 파라미터 (자동매핑 포함): {}", normalizedParams);

        // v3.0 무장애여행 통합 검색 (기존 로직 활용)
        Map<String, Object> result = tourFilterService.searchTours(normalizedParams);

        // 불변 Map 문제 해결
        Map<String, Object> response = new HashMap<>();
        if (result != null) {
            response.putAll(result);
        }

        // v3.0 정보 추가
        if ((Boolean) response.getOrDefault("success", false)) {
            response.put("version", "v3.0");
            response.put("uiSimplified", true);
            response.put("autoMapped", true);
            response.put("barrierFreeIntegration", true);

            // 자동 매핑 정보 추가 (디버깅용)
            if (enhancedParams.containsKey("themes") && !params.containsKey("themes")) {
                response.put("mappedThemes", enhancedParams.get("themes"));
            }
            if (enhancedParams.containsKey("activities") && !params.containsKey("activities")) {
                response.put("mappedActivities", enhancedParams.get("activities"));
            }
        }

        log.info("v3.0 검색 결과 - 성공: {}, 개수: {}",
                response.get("success"),
                response.containsKey("data") ? "포함" : "없음");

        return ResponseEntity.ok(response);
    }

    /**
     * ✅ 검색 파라미터 유효성 검증 및 정규화
     */
    private Map<String, String> validateAndNormalizeSearchParams(Map<String, String> params) {
        Map<String, String> normalized = new HashMap<>();

        // 방문지 수 검증
        int numOfRows = defaultNumOfRows;
        int pageNo = 1;

        try {
            if (params.containsKey("numOfRows")) {
                numOfRows = Math.min(Math.max(Integer.parseInt(params.get("numOfRows")), minNumOfRows), maxNumOfRows);
            }
            if (params.containsKey("pageNo")) {
                pageNo = Math.max(Integer.parseInt(params.get("pageNo")), 1);
            }
        } catch (NumberFormatException e) {
            log.warn("잘못된 숫자 파라미터, 기본값 사용");
        }

        normalized.put("numOfRows", String.valueOf(numOfRows));
        normalized.put("pageNo", String.valueOf(pageNo));

        // 지역 처리
        String region = params.get("region");
        String areaCode = params.get("areaCode");

        if (areaCode != null && !areaCode.trim().isEmpty()) {
            normalized.put("areaCode", areaCode.trim());
        } else if (region != null && !region.trim().isEmpty()) {
            String convertedAreaCode = tourFilterService.getAreaCodeByName(region);
            if (!convertedAreaCode.isEmpty()) {
                normalized.put("areaCode", convertedAreaCode);
                log.info("✅ 지역명 변환: {} → {}", region, convertedAreaCode);
            }
        }

        // 시군구 처리
        String sigunguCode = params.get("sigunguCode");
        if (sigunguCode != null && !sigunguCode.trim().isEmpty()) {
            normalized.put("sigunguCode", sigunguCode.trim());
        }

        // 🆕 v3.0: 자동 매핑된 테마/활동 처리
        String themes = params.get("themes");
        if (themes != null && !themes.trim().isEmpty()) {
            normalized.put("themes", themes.trim());
            log.info("✅ 테마 설정 (자동매핑): {}", themes);
        }

        String activities = params.get("activities");
        if (activities != null && !activities.trim().isEmpty()) {
            normalized.put("activities", activities.trim());
            log.info("✅ 활동 설정 (자동매핑): {}", activities);
        }

        // 장소 처리 (v3.0 핵심)
        String places = params.get("places");
        if (places != null && !places.trim().isEmpty()) {
            normalized.put("places", places.trim());
            log.info("✅ 장소 설정: {}", places);
        }

        // 편의시설 처리
        String needs = params.get("needs");
        if (needs != null && !needs.trim().isEmpty() && !"해당없음".equals(needs.trim())) {
            normalized.put("needs", needs.trim());
            log.info("✅ 편의시설 설정: {}", needs);
        }

        return normalized;
    }

    /**
     * ✅ 지역 코드 목록 조회
     */
    @GetMapping("/areas")
    public ResponseEntity<Map<String, Object>> getAreas() {
        log.info("지역 코드 목록 조회 요청");
        Map<String, Object> result = tourFilterService.getAreaCodes();
        return ResponseEntity.ok(result);
    }

    /**
     * ✅ 시군구 코드 목록 조회
     */
    @GetMapping("/sigungu")
    public ResponseEntity<Map<String, Object>> getSigungu(@RequestParam String areaCode) {
        log.info("시군구 코드 조회 요청 - 지역코드: {}", areaCode);
        Map<String, Object> result = tourFilterService.getSigunguCodes(areaCode);
        return ResponseEntity.ok(result);
    }

    /**
     * ✅ 추천 관광지 조회
     */
    @GetMapping("/recommended")
    public ResponseEntity<Map<String, Object>> getRecommendedTours(
            Authentication authentication,
            @RequestParam(defaultValue = "6") int numOfRows) {

        String userInterests = null;
        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())) {
            try {
                String userId = authentication.getName();
                UserEntity user = userRepository.findById(userId).orElse(null);
                if (user != null && user.getInterests() != null) {
                    userInterests = user.getInterests();
                }
            } catch (Exception e) {
                log.warn("사용자 관심사 로드 실패: {}", e.getMessage());
            }
        }

        Map<String, Object> result = tourFilterService.getRecommendedTours(userInterests, numOfRows);
        Map<String, Object> response = new HashMap<>();
        if (result != null) {
            response.putAll(result);
        }

        // v3.0 정보 추가
        if ((Boolean) response.getOrDefault("success", false)) {
            response.put("version", "v3.0");
            response.put("uiSimplified", true);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * ✅ 관광지 상세 정보 조회
     */
    @GetMapping("/detail/{contentId}")
    public ResponseEntity<Map<String, Object>> getTourDetail(@PathVariable String contentId) {
        log.info("관광지 상세 정보 조회 요청 - contentId: {}", contentId);

        if (contentId == null || contentId.trim().isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "잘못된 관광지 ID입니다."));
        }

        Map<String, Object> result = tourFilterService.getTourDetail(contentId.trim());
        return ResponseEntity.ok(result);
    }

    /**
     * ✅ API 상태 확인 (헬스체크)
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            Map<String, Object> areaResult = tourFilterService.getAreaCodes();
            boolean isHealthy = (Boolean) areaResult.get("success");

            Map<String, Object> health = new HashMap<>();
            health.put("status", isHealthy ? "UP" : "DOWN");
            health.put("timestamp", System.currentTimeMillis());
            health.put("version", "v3.0");
            health.put("features", "UI단순화 + 장소기반자동매핑 + 액티브시니어최적화");

            return ResponseEntity.ok(Map.of("success", true, "data", health));

        } catch (Exception e) {
            Map<String, Object> health = Map.of(
                    "status", "DOWN",
                    "timestamp", System.currentTimeMillis(),
                    "error", e.getMessage(),
                    "version", "v3.0");
            return ResponseEntity.ok(Map.of("success", false, "data", health));
        }
    }
}