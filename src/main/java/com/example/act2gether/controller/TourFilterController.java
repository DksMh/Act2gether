/**
 * TourFilterController.java - 검색 파라미터 정규화 수정
 * 핵심 수정: validateAndNormalizeSearchParams 메서드에서 areaCode 변환 로직 추가
 */

package com.example.act2gether.controller;

import java.util.Map;
import java.util.HashMap;

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

    /**
     * 개선된 필터 옵션 조회 (5개 질문 구조)
     */
    @GetMapping("/filter-options")
    public ResponseEntity<Map<String, Object>> getFilterOptions() {
        log.info("필터 옵션 조회 요청 - 5개 질문 구조");

        Map<String, Object> options = tourFilterService.getFilterOptions();

        return ResponseEntity.ok(Map.of("success", true, "data", options));
    }

    /**
     * 사용자 관심사 기반 필터 설정 조회
     */
    @GetMapping("/user-interests")
    public ResponseEntity<Map<String, Object>> getUserInterests(Authentication authentication) {
        log.info("사용자 관심사 조회 요청");

        // 비로그인 상태에서도 접근 가능하도록 수정
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
     * 🔧 수정된 관광지 검색 - 파라미터 정규화 개선
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchTours(@RequestParam Map<String, String> params) {
        log.info("관광지 검색 요청 - 파라미터: {}", params);

        // ✅ 파라미터 유효성 검증 및 정규화 (지역명 → 지역코드 변환 포함)
        Map<String, String> normalizedParams = validateAndNormalizeSearchParams(params);

        log.info("정규화된 파라미터: {}", normalizedParams);

        Map<String, Object> result = tourFilterService.searchTours(normalizedParams);
        log.info("검색 결과 - 성공: {}, 개수: {}",
                result.get("success"),
                result.containsKey("data") ? "포함" : "없음");

        return ResponseEntity.ok(result);
    }

    /**
     * ✅ 수정된 검색 파라미터 유효성 검증 및 정규화
     * 핵심 개선: 지역명을 지역코드로 자동 변환
     */
    private Map<String, String> validateAndNormalizeSearchParams(Map<String, String> params) {
        Map<String, String> normalized = new HashMap<>();

        // 방문지 수 검증
        int numOfRows = 6;
        int pageNo = 1;

        try {
            if (params.containsKey("numOfRows")) {
                numOfRows = Math.min(Math.max(Integer.parseInt(params.get("numOfRows")), 1), 50);
            }
            if (params.containsKey("pageNo")) {
                pageNo = Math.max(Integer.parseInt(params.get("pageNo")), 1);
            }
        } catch (NumberFormatException e) {
            log.warn("잘못된 숫자 파라미터: {}", e.getMessage());
        }

        normalized.put("numOfRows", String.valueOf(numOfRows));
        normalized.put("pageNo", String.valueOf(pageNo));

        // ✅ 1. 지역 처리 - 지역명을 지역코드로 변환
        String region = params.get("region");
        String areaCode = params.get("areaCode");

        if (areaCode != null && !areaCode.trim().isEmpty()) {
            // 이미 지역코드가 있는 경우 직접 사용
            normalized.put("areaCode", areaCode.trim());
            log.info("✅ 지역코드 직접 사용: {}", areaCode);
        } else if (region != null && !region.trim().isEmpty()) {
            // 지역명을 지역코드로 변환
            String convertedAreaCode = tourFilterService.getAreaCodeByName(region);
            if (!convertedAreaCode.isEmpty()) {
                normalized.put("areaCode", convertedAreaCode);
                log.info("✅ 지역명 변환: {} → {}", region, convertedAreaCode);
            } else {
                log.warn("⚠️ 지역명 변환 실패: {}", region);
            }
        }

        // ✅ 2. 시군구 처리 - 코드 직접 사용
        String sigunguCode = params.get("sigunguCode");
        if (sigunguCode != null && !sigunguCode.trim().isEmpty()) {
            normalized.put("sigunguCode", sigunguCode.trim());
            log.info("✅ 시군구코드 설정: {}", sigunguCode);
        }

        // ✅ 3. 카테고리 처리 (메인 3개만 허용)
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

        // ✅ 4. 테마 처리 (다중 선택, JSON 배열 또는 콤마 구분)
        String themes = params.get("themes");
        if (themes != null && !themes.trim().isEmpty()) {
            normalized.put("themes", themes.trim());
            log.info("✅ 테마 설정: {}", themes);
        }

        // ✅ 5. 활동 처리 (다중 선택)
        String activities = params.get("activities");
        if (activities != null && !activities.trim().isEmpty()) {
            normalized.put("activities", activities.trim());
            log.info("✅ 활동 설정: {}", activities);
        }

        // ✅ 6. 장소 처리 (다중 선택)
        String places = params.get("places");
        if (places != null && !places.trim().isEmpty()) {
            normalized.put("places", places.trim());
            log.info("✅ 장소 설정: {}", places);
        }

        // ✅ 7. 편의시설 처리 (단일 선택)
        String needs = params.get("needs");
        if (needs != null && !needs.trim().isEmpty() && !"해당없음".equals(needs.trim())) {
            normalized.put("needs", needs.trim());
            log.info("✅ 편의시설 설정: {}", needs);
        }

        // ✅ 8. 키워드 처리 (기존 키워드 파라미터 유지)
        String keyword = params.get("keyword");
        if (keyword != null && !keyword.trim().isEmpty()) {
            normalized.put("keyword", keyword.trim());
            log.info("✅ 키워드 설정: {}", keyword);
        }

        log.debug("파라미터 정규화 완료: {} → {}", params, normalized);

        return normalized;
    }

    /**
     * 지역 코드 목록 조회
     */
    @GetMapping("/areas")
    public ResponseEntity<Map<String, Object>> getAreas() {
        log.info("지역 코드 목록 조회 요청");
        Map<String, Object> result = tourFilterService.getAreaCodes();
        return ResponseEntity.ok(result);
    }

    /**
     * 시군구 코드 목록 조회
     */
    @GetMapping("/sigungu")
    public ResponseEntity<Map<String, Object>> getSigungu(@RequestParam String areaCode) {
        log.info("시군구 코드 조회 요청 - 지역코드: {}", areaCode);
        Map<String, Object> result = tourFilterService.getSigunguCodes(areaCode);
        return ResponseEntity.ok(result);
    }

    /**
     * 대분류 카테고리 목록 (메인 3개만)
     */
    @GetMapping("/categories/main")
    public ResponseEntity<Map<String, Object>> getCategoriesMain() {
        log.info("메인 카테고리 조회 요청 (자연, 인문, 레포츠)");
        Map<String, Object> result = tourFilterService.getCategoryMain();
        return ResponseEntity.ok(result);
    }

    /**
     * 중분류 카테고리 목록
     */
    @GetMapping("/categories/middle")
    public ResponseEntity<Map<String, Object>> getCategoriesMiddle(@RequestParam String cat1) {
        log.info("중분류 카테고리 조회 요청 - 대분류: {}", cat1);
        Map<String, Object> result = tourFilterService.getCategoryMiddle(cat1);
        return ResponseEntity.ok(result);
    }

    /**
     * 소분류 카테고리 목록
     */
    @GetMapping("/categories/small")
    public ResponseEntity<Map<String, Object>> getCategoriesSmall(
            @RequestParam String cat1,
            @RequestParam String cat2) {
        log.info("소분류 카테고리 조회 요청 - 대분류: {}, 중분류: {}", cat1, cat2);
        Map<String, Object> result = tourFilterService.getCategorySmall(cat1, cat2);
        return ResponseEntity.ok(result);
    }

    /**
     * 추천 관광지 조회
     */
    @GetMapping("/recommended")
    public ResponseEntity<Map<String, Object>> getRecommendedTours(
            Authentication authentication,
            @RequestParam(defaultValue = "5") int numOfRows) {

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
        return ResponseEntity.ok(result);
    }

    /**
     * 관광지 상세 정보 조회
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
     * 빠른 필터 검색
     */
    @GetMapping("/quick-search")
    public ResponseEntity<Map<String, Object>> quickSearch(@RequestParam String filterType) {
        log.info("빠른 필터 검색 요청 - 타입: {}", filterType);

        Map<String, String> params = tourFilterService.getQuickFilterParams(filterType);
        Map<String, Object> result = tourFilterService.searchTours(params);

        if ((Boolean) result.get("success")) {
            result.put("filterType", filterType);
            result.put("quickSearch", true);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * 큐레이션 투어 생성 (균형잡힌 투어 구성)
     */
    @GetMapping("/curation-tour")
    public ResponseEntity<Map<String, Object>> getCurationTour(@RequestParam Map<String, String> params) {
        log.info("큐레이션 투어 생성 요청 - 파라미터: {}", params);

        // 기본 파라미터 설정
        params.putIfAbsent("numOfRows", "9"); // 3개 카테고리 × 3개씩 = 총 9개
        params.putIfAbsent("pageNo", "1");

        Map<String, Object> result = tourFilterService.getCurationTourData(params);

        return ResponseEntity.ok(result);
    }

    /**
     * 지역+테마 조합 추천코스 조회
     */
    @GetMapping("/courses-by-theme")
    public ResponseEntity<Map<String, Object>> getCoursesByTheme(
            @RequestParam String areaCode,
            @RequestParam String themeCode,
            @RequestParam(required = false) String sigunguCode) {

        log.info("지역+테마 조합 코스 조회 요청 - 지역: {}, 테마: {}, 시군구: {}", areaCode, themeCode, sigunguCode);

        Map<String, Object> result = tourFilterService.getCoursesByTheme(areaCode, themeCode, sigunguCode);
        return ResponseEntity.ok(result);
    }

    /**
     * 지역+활동 조합 추천코스 조회
     */
    @GetMapping("/courses-by-activity")
    public ResponseEntity<Map<String, Object>> getCoursesByActivity(
            @RequestParam String areaCode,
            @RequestParam String activity,
            @RequestParam(required = false) String sigunguCode) {

        log.info("지역+활동 조합 코스 조회 요청 - 지역: {}, 활동: {}, 시군구: {}", areaCode, activity, sigunguCode);

        Map<String, Object> result = tourFilterService.getCoursesByActivity(areaCode, activity, sigunguCode);
        return ResponseEntity.ok(result);
    }

    /**
     * 검색 통계 정보
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        log.info("검색 통계 정보 조회 요청");
        Map<String, Object> result = tourFilterService.getSearchStatistics();
        return ResponseEntity.ok(result);
    }

    /**
     * 인기 검색어
     */
    @GetMapping("/popular-keywords")
    public ResponseEntity<Map<String, Object>> getPopularKeywords() {
        log.info("인기 검색어 조회 요청");

        Map<String, Object> keywords = new HashMap<>();
        keywords.put("regions", new String[] { "제주도", "부산", "서울", "경주", "강릉" });
        keywords.put("themes", new String[] { "자연", "문화/역사", "체험" }); // 메인 3개 반영
        keywords.put("activities", new String[] { "문화체험", "자연감상", "액티비티", "사진촬영", "휴식" });
        keywords.put("places", new String[] { "해변", "산", "도시", "온천지역", "섬지역" });

        return ResponseEntity.ok(Map.of("success", true, "data", keywords));
    }

    /**
     * API 상태 확인 (헬스체크)
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
                    "version", "2.1-fixed", // 지역 파라미터 수정 버전
                    "structure", "5개 질문 구조 + 지역 파라미터 누락 수정",
                    "fixes", "areaCode, sigunguCode 전달 문제 해결");

            return ResponseEntity.ok(Map.of("success", true, "data", health));

        } catch (Exception e) {
            log.error("헬스체크 실패: {}", e.getMessage());

            Map<String, Object> health = Map.of(
                    "status", "DOWN",
                    "timestamp", System.currentTimeMillis(),
                    "error", e.getMessage(),
                    "version", "2.1-fixed");

            return ResponseEntity.ok(Map.of("success", false, "data", health));
        }
    }
}