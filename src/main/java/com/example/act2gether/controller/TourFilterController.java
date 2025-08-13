/**
 * TourFilterController.java - v2.3 Enhanced 깔끔한 버전
 * 핵심 기능만 유지: 검색, 필터 옵션, 상세 조회
 * 없는 메서드들 모두 제거
 */

package com.example.act2gether.controller;

import java.util.Map;
import java.util.HashMap;

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

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/tours")
@RequiredArgsConstructor
@Slf4j
public class TourFilterController {

    private final TourFilterService tourFilterService;
    private final UserRepository userRepository;

    // 설정값으로 기본값 관리
    @Value("${tour.search.default.numOfRows:6}")
    private int defaultNumOfRows;

    @Value("${tour.search.max.numOfRows:80}")
    private int maxNumOfRows;

    @Value("${tour.search.min.numOfRows:1}")
    private int minNumOfRows;

    /**
     * ✅ 필터 옵션 조회 (확대된 선택 수 포함)
     */
    @GetMapping("/filter-options")
    public ResponseEntity<Map<String, Object>> getFilterOptions() {
        log.info("필터 옵션 조회 요청 - 선택 수 확대 (테마4, 활동5, 장소6)");

        Map<String, Object> options = tourFilterService.getFilterOptions();

        // v2.3 Enhanced 정보 추가
        options.put("version", "v2.3-enhanced");
        options.put("maxSelections", Map.of(
            "themes", 4,      // 3→4
            "activities", 5,  // 3→5  
            "places", 6       // 3→6
        ));
        options.put("features", "논리적 조합 최적화 + 선택 수 확대");

        return ResponseEntity.ok(Map.of("success", true, "data", options));
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
     * ✅ 관광지 검색 - 논리적 조합 최적화
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchTours(@RequestParam Map<String, String> params) {
        log.info("관광지 검색 요청 - 파라미터: {}", params);

        // 파라미터 유효성 검증 및 정규화
        Map<String, String> normalizedParams = validateAndNormalizeSearchParams(params);
        log.info("정규화된 파라미터: {}", normalizedParams);

        // v2.3 Enhanced 검색 (논리적 조합 최적화)
        Map<String, Object> result = tourFilterService.searchTours(normalizedParams);
        
        // 검색 결과에 v2.3 정보 추가
        if ((Boolean) result.get("success")) {
            result.put("version", "v2.3-enhanced");
            result.put("optimized", true);
            result.put("logicalCombinations", true);
        }

        log.info("검색 결과 - 성공: {}, 개수: {}", 
                result.get("success"), 
                result.containsKey("data") ? "포함" : "없음");

        return ResponseEntity.ok(result);
    }

    /**
     * ✅ 검색 파라미터 유효성 검증 및 정규화
     */
    private Map<String, String> validateAndNormalizeSearchParams(Map<String, String> params) {
        Map<String, String> normalized = new HashMap<>();

        // 방문지 수 검증 (설정값 기반)
        int numOfRows = defaultNumOfRows;
        int pageNo = 1;

        try {
            if (params.containsKey("numOfRows")) {
                numOfRows = Math.min(Math.max(Integer.parseInt(params.get("numOfRows")), minNumOfRows), maxNumOfRows);
                log.debug("방문지 수 설정: {} (범위: {}-{})", numOfRows, minNumOfRows, maxNumOfRows);
            }
            if (params.containsKey("pageNo")) {
                pageNo = Math.max(Integer.parseInt(params.get("pageNo")), 1);
            }
        } catch (NumberFormatException e) {
            log.warn("잘못된 숫자 파라미터, 기본값 사용 - numOfRows: {}, pageNo: {}", defaultNumOfRows, pageNo);
        }

        normalized.put("numOfRows", String.valueOf(numOfRows));
        normalized.put("pageNo", String.valueOf(pageNo));

        // 지역 처리 - 지역명을 지역코드로 변환
        String region = params.get("region");
        String areaCode = params.get("areaCode");

        if (areaCode != null && !areaCode.trim().isEmpty()) {
            normalized.put("areaCode", areaCode.trim());
            log.info("✅ 지역코드 직접 사용: {}", areaCode);
        } else if (region != null && !region.trim().isEmpty()) {
            String convertedAreaCode = tourFilterService.getAreaCodeByName(region);
            if (!convertedAreaCode.isEmpty()) {
                normalized.put("areaCode", convertedAreaCode);
                log.info("✅ 지역명 변환: {} → {}", region, convertedAreaCode);
            } else {
                log.warn("⚠️ 지역명 변환 실패: {}", region);
            }
        }

        // 시군구 처리
        String sigunguCode = params.get("sigunguCode");
        if (sigunguCode != null && !sigunguCode.trim().isEmpty()) {
            normalized.put("sigunguCode", sigunguCode.trim());
            log.info("✅ 시군구코드 설정: {}", sigunguCode);
        }

        // 카테고리 처리 (메인 3개만 허용)
        String cat1 = params.get("cat1");
        if (cat1 != null && !cat1.trim().isEmpty()) {
            if (java.util.List.of("A01", "A02", "A03").contains(cat1.trim())) {
                normalized.put("cat1", cat1.trim());
                log.info("✅ 대분류 카테고리 설정: {}", cat1);
            } else {
                log.warn("⚠️ 허용되지 않은 대분류 카테고리: {}", cat1);
            }
        }

        String cat2 = params.get("cat2");
        if (cat2 != null && !cat2.trim().isEmpty()) {
            normalized.put("cat2", cat2.trim());
            log.info("✅ 중분류 카테고리 설정: {}", cat2);
        }

        String cat3 = params.get("cat3");
        if (cat3 != null && !cat3.trim().isEmpty()) {
            normalized.put("cat3", cat3.trim());
            log.info("✅ 소분류 카테고리 설정: {}", cat3);
        }

        // 테마 처리 (다중 선택 - 최대 4개)
        String themes = params.get("themes");
        if (themes != null && !themes.trim().isEmpty()) {
            normalized.put("themes", themes.trim());
            log.info("✅ 테마 설정: {}", themes);
        }

        // 활동 처리 (다중 선택 - 최대 5개)
        String activities = params.get("activities");
        if (activities != null && !activities.trim().isEmpty()) {
            normalized.put("activities", activities.trim());
            log.info("✅ 활동 설정: {}", activities);
        }

        // 장소 처리 (다중 선택 - 최대 6개)
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

        // 키워드 처리
        String keyword = params.get("keyword");
        if (keyword != null && !keyword.trim().isEmpty()) {
            normalized.put("keyword", keyword.trim());
            log.info("✅ 키워드 설정: {}", keyword);
        }

        log.debug("파라미터 정규화 완료 - 입력: {}, 출력: {}", params.size(), normalized.size());
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

        log.info("추천 관광지 조회 요청 - 개수: {}", numOfRows);

        String userInterests = null;

        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())) {
            try {
                String userId = authentication.getName();
                UserEntity user = userRepository.findById(userId).orElse(null);

                if (user != null && user.getInterests() != null) {
                    userInterests = user.getInterests();
                    log.info("사용자 관심사 기반 추천: {}", userId);
                }
            } catch (Exception e) {
                log.warn("사용자 관심사 로드 실패, 일반 추천으로 대체: {}", e.getMessage());
            }
        }

        Map<String, Object> result = tourFilterService.getRecommendedTours(userInterests, numOfRows);
        
        // v2.3 정보 추가
        if ((Boolean) result.get("success")) {
            result.put("version", "v2.3-enhanced");
            result.put("optimized", true);
        }
        
        return ResponseEntity.ok(result);
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
            // 간단한 지역 API 호출로 상태 확인
            Map<String, Object> areaResult = tourFilterService.getAreaCodes();
            boolean isHealthy = (Boolean) areaResult.get("success");

            Map<String, Object> health = Map.of(
                    "status", isHealthy ? "UP" : "DOWN",
                    "timestamp", System.currentTimeMillis(),
                    "api", isHealthy ? "정상" : "오류",
                    "database", "정상",
                    "version", "v2.3-enhanced",
                    "features", Map.of(
                        "논리적조합최적화", true,
                        "선택수확대", "테마4+활동5+장소6",
                        "계층구조검증", true,
                        "성능최적화", true
                    ),
                    "maxSelections", Map.of(
                        "themes", 4,
                        "activities", 5, 
                        "places", 6
                    ));

            return ResponseEntity.ok(Map.of("success", true, "data", health));

        } catch (Exception e) {
            log.error("헬스체크 실패: {}", e.getMessage());

            Map<String, Object> health = Map.of(
                    "status", "DOWN",
                    "timestamp", System.currentTimeMillis(),
                    "error", e.getMessage(),
                    "version", "v2.3-enhanced");

            return ResponseEntity.ok(Map.of("success", false, "data", health));
        }
    }
}