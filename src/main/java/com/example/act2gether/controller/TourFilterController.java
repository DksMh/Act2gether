package com.example.act2gether.controller;

import java.util.Map;

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

import java.util.HashMap;
import java.util.List;

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
     * 🆕 개선된 필터 옵션 조회 (5개 질문 구조)
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
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            log.info("비로그인 사용자 요청");
            return ResponseEntity.ok(Map.of(
                "success", true, 
                "data", filters, 
                "loginRequired", false,
                "userId", userId
            ));

        } catch (Exception e) {
            log.error("사용자 관심사 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false, 
                "message", "관심사 조회에 실패했습니다.", 
                "loginRequired", false
            ));
        }
    }

    /**
     * 🎯 관광지 검색 (5개 질문 구조 + 다중 선택 지원)
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchTours(@RequestParam Map<String, String> params) {
        log.info("관광지 검색 요청 - 파라미터: {}", params);
        
        // 파라미터 유효성 검증 및 정규화
        Map<String, String> normalizedParams = validateAndNormalizeSearchParams(params);
        
        Map<String, Object> result = tourFilterService.searchTours(normalizedParams);
        log.info("검색 결과 - 성공: {}, 개수: {}", 
            result.get("success"), 
            result.containsKey("data") ? "포함" : "없음");
        
        return ResponseEntity.ok(result);
    }

    /**
     * 🆕 검색 파라미터 유효성 검증 및 정규화
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
        
        // 지역 처리 (단일 선택)
        String region = params.get("region");
        if (region != null && !region.trim().isEmpty()) {
            String areaCode = tourFilterService.getAreaCodeByName(region);
            if (!areaCode.isEmpty()) {
                normalized.put("areaCode", areaCode);
            }
        }
        
        // 테마 처리 (다중 선택, JSON 배열 또는 콤마 구분)
        String themes = params.get("themes");
        if (themes != null && !themes.trim().isEmpty()) {
            normalized.put("themes", themes);
        }
        
        // 활동 처리 (다중 선택)
        String activities = params.get("activities");
        if (activities != null && !activities.trim().isEmpty()) {
            normalized.put("activities", activities);
        }
        
        // 장소 처리 (다중 선택)
        String places = params.get("places");
        if (places != null && !places.trim().isEmpty()) {
            normalized.put("places", places);
        }
        
        // 편의시설 처리 (단일 선택)
        String needs = params.get("needs");
        if (needs != null && !needs.trim().isEmpty() && !"해당없음".equals(needs)) {
            normalized.put("needs", needs);
        }
        
        log.debug("파라미터 정규화 완료: {}", normalized);
        
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
     * 🎯 대분류 카테고리 목록 (메인 3개만)
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
     * 🆕 추천 관광지 조회
     */
    @GetMapping("/recommended")
    public ResponseEntity<Map<String, Object>> getRecommendedTours(
            Authentication authentication,
            @RequestParam(defaultValue = "5") int numOfRows) {
        
        log.info("추천 관광지 조회 요청 - 개수: {}", numOfRows);
        
        String userInterests = null;
        
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
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
     * 🆕 관광지 상세 정보 조회
     */
    @GetMapping("/detail/{contentId}")
    public ResponseEntity<Map<String, Object>> getTourDetail(@PathVariable String contentId) {
        log.info("관광지 상세 정보 조회 요청 - contentId: {}", contentId);
        
        if (contentId == null || contentId.trim().isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "success", false, 
                "message", "잘못된 관광지 ID입니다."
            ));
        }
        
        Map<String, Object> result = tourFilterService.getTourDetail(contentId.trim());
        return ResponseEntity.ok(result);
    }

    /**
     * 🆕 빠른 필터 검색 (개선된 가이드 반영)
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
     * 🎯 큐레이션 투어 생성 (균형잡힌 투어 구성)
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
     * 🎨 지역+테마 조합 추천코스 조회
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
     * 🎯 지역+활동 조합 추천코스 조회
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
     * 🆕 검색 통계 정보
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        log.info("검색 통계 정보 조회 요청");
        Map<String, Object> result = tourFilterService.getSearchStatistics();
        return ResponseEntity.ok(result);
    }

    /**
     * 🆕 인기 검색어 (개선된 가이드 반영)
     */
    @GetMapping("/popular-keywords")
    public ResponseEntity<Map<String, Object>> getPopularKeywords() {
        log.info("인기 검색어 조회 요청");
        
        Map<String, Object> keywords = new HashMap<>();
        keywords.put("regions", new String[]{"제주도", "부산", "서울", "경주", "강릉"});
        keywords.put("themes", new String[]{"자연", "문화/역사", "체험"}); // 메인 3개 반영
        keywords.put("activities", new String[]{"문화체험", "자연감상", "액티비티", "사진촬영", "휴식"});
        keywords.put("places", new String[]{"해변", "산", "도시", "온천지역", "섬지역"});
        
        return ResponseEntity.ok(Map.of("success", true, "data", keywords));
    }

    /**
     * 🆕 API 상태 확인 (헬스체크)
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
                "database", "정상", // 실제로는 DB 연결 상태 확인
                "version", "2.1-improved", // 5개 질문 구조 버전
                "structure", "5개 질문 구조 (지역1개 + 테마/활동/장소 각3개 + 편의시설1개)"
            );
            
            return ResponseEntity.ok(Map.of("success", true, "data", health));
            
        } catch (Exception e) {
            log.error("헬스체크 실패: {}", e.getMessage());
            
            Map<String, Object> health = Map.of(
                "status", "DOWN",
                "timestamp", System.currentTimeMillis(),
                "error", e.getMessage(),
                "version", "2.1-improved"
            );
            
            return ResponseEntity.ok(Map.of("success", false, "data", health));
        }
    }

    /**
     * 🎯 개선된 관심사 검증 (5개 질문 구조)
     */
    @GetMapping("/validate-interests")
    public ResponseEntity<Map<String, Object>> validateUserInterests(
            @RequestParam String interestsJson) {
        
        log.info("관심사 검증 요청");
        
        try {
            Map<String, Object> filters = tourFilterService.mapUserInterestsToFilters(interestsJson);
            
            // 검증 결과
            Map<String, Object> validation = new HashMap<>();
            validation.put("isValid", !filters.isEmpty());
            validation.put("filterCount", filters.size());
            validation.put("hasRegions", filters.containsKey("regions"));
            validation.put("hasThemes", filters.containsKey("themes"));
            validation.put("hasActivities", filters.containsKey("activities"));
            validation.put("hasPlaces", filters.containsKey("places"));
            validation.put("hasNeeds", filters.containsKey("needs"));
            
            // 5개 질문 구조 준수 확인
            @SuppressWarnings("unchecked")
            List<Object> regions = (List<Object>) filters.get("regions");
            validation.put("regionCount", regions != null ? regions.size() : 0);
            validation.put("regionValid", regions != null && regions.size() <= 1); // 최대 1개
            
            @SuppressWarnings("unchecked")
            Map<String, String> themes = (Map<String, String>) filters.get("themes");
            validation.put("themeCount", themes != null ? themes.size() : 0);
            validation.put("themeValid", themes != null && themes.size() <= 3); // 최대 3개
            
            @SuppressWarnings("unchecked")
            List<Object> activities = (List<Object>) filters.get("activities");
            validation.put("activityCount", activities != null ? activities.size() : 0);
            validation.put("activityValid", activities != null && activities.size() <= 3); // 최대 3개
            
            @SuppressWarnings("unchecked")
            List<Object> places = (List<Object>) filters.get("places");
            validation.put("placeCount", places != null ? places.size() : 0);
            validation.put("placeValid", places != null && places.size() <= 3); // 최대 3개
            
            @SuppressWarnings("unchecked")
            List<Object> needs = (List<Object>) filters.get("needs");
            validation.put("needCount", needs != null ? needs.size() : 0);
            validation.put("needValid", needs != null && needs.size() <= 1); // 최대 1개
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", validation,
                "message", "5개 질문 구조 관심사 검증 완료"
            ));
            
        } catch (Exception e) {
            log.error("관심사 검증 실패: {}", e.getMessage());
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "관심사 검증에 실패했습니다: " + e.getMessage()
            ));
        }
    }

    /**
     * 🎨 투어 결과 미리보기 (선택된 필터로 간단한 결과 확인)
     */
    @GetMapping("/preview")
    public ResponseEntity<Map<String, Object>> previewTourResults(@RequestParam Map<String, String> params) {
        log.info("투어 결과 미리보기 요청 - 파라미터: {}", params);
        
        // 미리보기용 파라미터 설정 (적은 수량으로)
        Map<String, String> previewParams = validateAndNormalizeSearchParams(params);
        previewParams.put("numOfRows", "3");
        previewParams.put("pageNo", "1");
        
        Map<String, Object> result = tourFilterService.searchTours(previewParams);
        
        if ((Boolean) result.get("success")) {
            result.put("isPreview", true);
            result.put("message", "미리보기 결과 (최대 3개)");
            result.put("appliedFilters", getAppliedFiltersSummary(params));
        }
        
        return ResponseEntity.ok(result);
    }

    /**
     * 🔄 필터 리셋 정보 (관심사 기반 기본값 반환)
     */
    @GetMapping("/reset-filters")
    public ResponseEntity<Map<String, Object>> getResetFilters(Authentication authentication) {
        log.info("필터 리셋 정보 요청");
        
        if (authentication != null && authentication.isAuthenticated() && 
            !"anonymousUser".equals(authentication.getPrincipal())) {
            
            try {
                String userId = authentication.getName();
                UserEntity user = userRepository.findById(userId).orElse(null);
                
                if (user != null && user.getInterests() != null) {
                    Map<String, Object> userFilters = tourFilterService.mapUserInterestsToFilters(user.getInterests());
                    
                    return ResponseEntity.ok(Map.of(
                        "success", true,
                        "data", userFilters,
                        "type", "userInterests",
                        "message", "사용자 관심사 기반 기본값 (5개 질문 구조)"
                    ));
                }
            } catch (Exception e) {
                log.warn("사용자 관심사 로드 실패: {}", e.getMessage());
            }
        }
        
        // 비로그인 또는 관심사 없는 경우 빈 필터 반환
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", Map.of(),
            "type", "empty",
            "message", "기본 빈 필터 (5개 질문 구조)"
        ));
    }

    /**
     * 🎯 투어 개수별 추천 (3개, 6개, 9개, 12개, 15개)
     */
    @GetMapping("/tour-by-count")
    public ResponseEntity<Map<String, Object>> getTourByCount(
            @RequestParam int count,
            @RequestParam Map<String, String> params) {
        
        log.info("개수별 투어 조회 요청 - 개수: {}, 파라미터: {}", count, params);
        
        // 개수 검증 (3, 6, 9, 12, 15만 허용)
        if (!List.of(3, 6, 9, 12, 15).contains(count)) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "허용되지 않는 투어 개수입니다. (3, 6, 9, 12, 15만 가능)"
            ));
        }
        
        // 카테고리별 균등 분배
        Map<String, String> normalizedParams = validateAndNormalizeSearchParams(params);
        normalizedParams.put("numOfRows", String.valueOf(count));
        
        Map<String, Object> result = tourFilterService.getCurationTourData(normalizedParams);
        
        if ((Boolean) result.get("success")) {
            result.put("requestedCount", count);
            result.put("distributionType", "균등분배");
            result.put("message", String.format("%d개 투어 (자연, 문화, 레포츠 균등분배)", count));
        }
        
        return ResponseEntity.ok(result);
    }

    /**
     * 🆕 적용된 필터 요약 정보 생성
     */
    private Map<String, Object> getAppliedFiltersSummary(Map<String, String> params) {
        Map<String, Object> summary = new HashMap<>();
        
        if (params.get("region") != null) {
            summary.put("region", params.get("region"));
        }
        
        if (params.get("themes") != null) {
            summary.put("themes", params.get("themes"));
        }
        
        if (params.get("activities") != null) {
            summary.put("activities", params.get("activities"));
        }
        
        if (params.get("places") != null) {
            summary.put("places", params.get("places"));
        }
        
        if (params.get("needs") != null && !"해당없음".equals(params.get("needs"))) {
            summary.put("needs", params.get("needs"));
        }
        
        return summary;
    }
} false, 
                "message", "로그인이 필요합니다.", 
                "loginRequired", true
            ));
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
                    "loginRequired", false
                ));
            }
            
            if (user.getInterests() == null || user.getInterests().trim().isEmpty()) {
                log.info("사용자 관심사 설정되지 않음: {}", userId);
                return ResponseEntity.ok(Map.of(
                    "success", false, 
                    "message", "관심사가 설정되지 않았습니다. 마이페이지에서 설정해주세요.", 
                    "loginRequired", false
                ));
            }

            Map<String, Object> filters = tourFilterService.mapUserInterestsToFilters(user.getInterests());
            log.info("사용자 관심사 매핑 완료: {} 항목", filters.size());
            
            return ResponseEntity.ok(Map.of(
                "success", 