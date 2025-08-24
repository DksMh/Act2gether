package com.example.act2gether.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.act2gether.service.UserWishlistService;
import com.example.act2gether.service.UserWishlistService.PopularTourDto;
import com.example.act2gether.service.UserWishlistService.UserWishlistDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 🆕 UserWishlistController - v3.0 투어 찜하기 시스템 컨트롤러
 * 
 * ✅ REST API 엔드포인트:
 * - POST /api/wishlist/add (찜하기 추가)
 * - DELETE /api/wishlist/remove/{tourId} (찜하기 제거)  
 * - GET /api/wishlist/check/{tourId} (찜 상태 확인)
 * - GET /api/wishlist/user (사용자 찜 목록 조회)
 * - GET /api/wishlist/popular (인기 투어 조회)
 * 
 * ✅ 특징:
 * - 로그인 상태 필수 확인
 * - UUID 수동 생성 활용
 * - 기존 user_wishlist 테이블 활용
 * - 프론트엔드 AJAX 호출 지원
 */
@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
@Slf4j
public class UserWishlistController {

    @Autowired
    private UserWishlistService userWishlistService;
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * ❤️ 찜하기 추가
     * POST /api/wishlist/add
     * 
     * @param authentication - 인증 정보
     * @param requestBody - { "tourId": "1115042113127512955" }
     * @return 성공/실패 응답
     */
    @PostMapping("/add")
    public ResponseEntity<Map<String, Object>> addToWishlist(
            Authentication authentication,
            @RequestBody Map<String, Object> requestBody) {
        
        log.info("🎯 찜하기 추가 요청 - 요청 데이터: {}", requestBody);

        // 로그인 상태 확인
        if (!isAuthenticated(authentication)) {
            return ResponseEntity.status(401).body(createErrorResponse("로그인이 필요합니다", true));
        }

        String userId = authentication.getName();
        String tourId = (String) requestBody.get("tourId");

        // 파라미터 검증
        if (tourId == null || tourId.trim().isEmpty()) {
            log.warn("⚠️ 유효하지 않은 tourId: {}", tourId);
            return ResponseEntity.badRequest().body(createErrorResponse("투어 ID가 필요합니다", false));
        }

        try {
            boolean success = userWishlistService.addToWishlist(userId, tourId.trim());
            
            if (success) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "찜 목록에 추가되었습니다");
                response.put("tourId", tourId.trim());
                response.put("isWishlisted", true);
                
                log.info("✅ 찜하기 추가 성공: userId={}, tourId={}", userId, tourId);
                return ResponseEntity.ok(response);
            } else {
                log.warn("⚠️ 찜하기 추가 실패: userId={}, tourId={}", userId, tourId);
                return ResponseEntity.ok(createErrorResponse("찜하기 추가에 실패했습니다", false));
            }

        } catch (Exception e) {
            log.error("💥 찜하기 추가 중 오류: userId={}, tourId={}, error={}", userId, tourId, e.getMessage(), e);
            return ResponseEntity.ok(createErrorResponse("서버 오류가 발생했습니다", false));
        }
    }

    /**
     * 🗑️ 찜하기 제거
     * DELETE /api/wishlist/remove/{tourId}
     * 
     * @param authentication - 인증 정보
     * @param tourId - 투어 ID
     * @return 성공/실패 응답
     */
    @DeleteMapping("/remove/{tourId}")
    public ResponseEntity<Map<String, Object>> removeFromWishlist(
            Authentication authentication,
            @PathVariable String tourId) {
        
        log.info("🎯 찜하기 제거 요청 - tourId: {}", tourId);

        // 로그인 상태 확인
        if (!isAuthenticated(authentication)) {
            return ResponseEntity.status(401).body(createErrorResponse("로그인이 필요합니다", true));
        }

        String userId = authentication.getName();

        // 파라미터 검증
        if (tourId == null || tourId.trim().isEmpty()) {
            log.warn("⚠️ 유효하지 않은 tourId: {}", tourId);
            return ResponseEntity.badRequest().body(createErrorResponse("투어 ID가 필요합니다", false));
        }

        try {
            boolean success = userWishlistService.removeFromWishlist(userId, tourId.trim());
            
            if (success) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "찜 목록에서 제거되었습니다");
                response.put("tourId", tourId.trim());
                response.put("isWishlisted", false);
                
                log.info("✅ 찜하기 제거 성공: userId={}, tourId={}", userId, tourId);
                return ResponseEntity.ok(response);
            } else {
                log.warn("⚠️ 찜하기 제거 실패: userId={}, tourId={}", userId, tourId);
                return ResponseEntity.ok(createErrorResponse("찜하기 제거에 실패했습니다", false));
            }

        } catch (Exception e) {
            log.error("💥 찜하기 제거 중 오류: userId={}, tourId={}, error={}", userId, tourId, e.getMessage(), e);
            return ResponseEntity.ok(createErrorResponse("서버 오류가 발생했습니다", false));
        }
    }

    /**
     * ✅ 찜하기 상태 확인
     * GET /api/wishlist/check/{tourId}
     * 
     * @param authentication - 인증 정보
     * @param tourId - 투어 ID
     * @return 찜하기 상태
     */
    @GetMapping("/check/{tourId}")
    public ResponseEntity<Map<String, Object>> checkWishlistStatus(
            Authentication authentication,
            @PathVariable String tourId) {
        
        log.debug("🔍 찜하기 상태 확인 요청 - tourId: {}", tourId);

        // 비로그인 상태면 false 반환
        if (!isAuthenticated(authentication)) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("isWishlisted", false);
            response.put("tourId", tourId);
            response.put("loginRequired", true);
            return ResponseEntity.ok(response);
        }

        String userId = authentication.getName();

        // 파라미터 검증
        if (tourId == null || tourId.trim().isEmpty()) {
            log.warn("⚠️ 유효하지 않은 tourId: {}", tourId);
            return ResponseEntity.badRequest().body(createErrorResponse("투어 ID가 필요합니다", false));
        }

        try {
            boolean isWishlisted = userWishlistService.isInWishlist(userId, tourId.trim());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("isWishlisted", isWishlisted);
            response.put("tourId", tourId.trim());
            response.put("loginRequired", false);
            
            log.debug("✅ 찜하기 상태 확인 완료: userId={}, tourId={}, isWishlisted={}", userId, tourId, isWishlisted);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("💥 찜하기 상태 확인 중 오류: userId={}, tourId={}, error={}", userId, tourId, e.getMessage(), e);
            return ResponseEntity.ok(createErrorResponse("서버 오류가 발생했습니다", false));
        }
    }

    /**
     * 📋 사용자 찜 목록 조회
     * GET /api/wishlist/user
     * 
     * @param authentication - 인증 정보
     * @param page - 페이지 번호 (기본: 1)
     * @param size - 페이지 크기 (기본: 10)
     * @return 찜 목록
     */
    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getUserWishlist(
            Authentication authentication,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        log.info("📋 사용자 찜 목록 조회 요청 - page: {}, size: {}", page, size);

        // 로그인 상태 확인
        if (!isAuthenticated(authentication)) {
            return ResponseEntity.status(401).body(createErrorResponse("로그인이 필요합니다", true));
        }

        String userId = authentication.getName();

        try {
            List<UserWishlistDto> wishlist = userWishlistService.getUserWishlist(userId);
            int totalCount = userWishlistService.getWishlistCount(userId);
            
            // 간단한 페이징 처리
            int startIndex = Math.max(0, (page - 1) * size);
            int endIndex = Math.min(wishlist.size(), startIndex + size);
            List<UserWishlistDto> pagedWishlist = wishlist.subList(startIndex, endIndex);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", pagedWishlist);
            response.put("totalCount", totalCount);
            response.put("currentPage", page);
            response.put("pageSize", size);
            response.put("totalPages", (int) Math.ceil((double) totalCount / size));
            
            log.info("✅ 사용자 찜 목록 조회 완료: userId={}, 총 {}개, 페이지 {}/{}", 
                    userId, totalCount, page, (int) Math.ceil((double) totalCount / size));
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("💥 사용자 찜 목록 조회 중 오류: userId={}, error={}", userId, e.getMessage(), e);
            return ResponseEntity.ok(createErrorResponse("서버 오류가 발생했습니다", false));
        }
    }

    /**
     * 📊 인기 투어 조회 (찜 개수 기준)
     * GET /api/wishlist/popular
     * 
     * @param limit - 조회할 개수 (기본: 10)
     * @return 인기 투어 목록
     */
    @GetMapping("/popular")
    public ResponseEntity<Map<String, Object>> getPopularTours(
            @RequestParam(defaultValue = "10") int limit) {
        
        log.info("📊 인기 투어 조회 요청 - limit: {}", limit);

        try {
            // 최대 50개까지 제한
            int actualLimit = Math.min(Math.max(1, limit), 50);
            
            List<PopularTourDto> popularTours = userWishlistService.getPopularTours(actualLimit);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", popularTours);
            response.put("count", popularTours.size());
            response.put("requestedLimit", limit);
            response.put("actualLimit", actualLimit);
            
            log.info("✅ 인기 투어 조회 완료: {}개 반환 (요청: {}개)", popularTours.size(), limit);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("💥 인기 투어 조회 중 오류: limit={}, error={}", limit, e.getMessage(), e);
            return ResponseEntity.ok(createErrorResponse("서버 오류가 발생했습니다", false));
        }
    }

    /**
     * 🔢 사용자 찜 개수 조회
     * GET /api/wishlist/count
     * 
     * @param authentication - 인증 정보
     * @return 찜 개수
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getWishlistCount(Authentication authentication) {
        
        log.debug("🔢 사용자 찜 개수 조회 요청");

        // 비로그인 상태면 0 반환
        if (!isAuthenticated(authentication)) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", 0);
            response.put("loginRequired", true);
            return ResponseEntity.ok(response);
        }

        String userId = authentication.getName();

        try {
            int count = userWishlistService.getWishlistCount(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", count);
            response.put("loginRequired", false);
            
            log.debug("✅ 사용자 찜 개수 조회 완료: userId={}, count={}", userId, count);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("💥 사용자 찜 개수 조회 중 오류: userId={}, error={}", userId, e.getMessage(), e);
            return ResponseEntity.ok(createErrorResponse("서버 오류가 발생했습니다", false));
        }
    }

    /**
     * 🧹 사용자 찜 목록 전체 삭제 (개발/테스트용)
     * DELETE /api/wishlist/clear
     * 
     * @param authentication - 인증 정보
     * @return 삭제 결과
     */
    @DeleteMapping("/clear")
    public ResponseEntity<Map<String, Object>> clearUserWishlist(Authentication authentication) {
        
        log.info("🧹 사용자 찜 목록 전체 삭제 요청");

        // 로그인 상태 확인
        if (!isAuthenticated(authentication)) {
            return ResponseEntity.status(401).body(createErrorResponse("로그인이 필요합니다", true));
        }

        String userId = authentication.getName();

        try {
            int deletedCount = userWishlistService.clearUserWishlist(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "찜 목록이 전체 삭제되었습니다");
            response.put("deletedCount", deletedCount);
            
            log.info("✅ 사용자 찜 목록 전체 삭제 완료: userId={}, 삭제된 개수={}", userId, deletedCount);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("💥 사용자 찜 목록 전체 삭제 중 오류: userId={}, error={}", userId, e.getMessage(), e);
            return ResponseEntity.ok(createErrorResponse("서버 오류가 발생했습니다", false));
        }
    }

    /**
     * 🔍 로그인 상태 확인 (단순 체크용)
     * GET /api/wishlist/check
     * 
     * @param authentication - 인증 정보
     * @return 로그인 상태
     */
    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkLoginStatus(Authentication authentication) {
        
        log.debug("🔍 로그인 상태 확인 요청");

        Map<String, Object> response = new HashMap<>();
        
        if (isAuthenticated(authentication)) {
            response.put("success", true);
            response.put("authenticated", true);
            response.put("userId", authentication.getName());
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("authenticated", false);
            response.put("message", "로그인이 필요합니다");
            return ResponseEntity.status(401).body(response);
        }
    }

    // ===========================================
    // 헬퍼 메서드들
    // ===========================================

    /**
     * 인증 상태 확인
     */
    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null && 
               authentication.isAuthenticated() && 
               !"anonymousUser".equals(authentication.getPrincipal()) &&
               authentication.getName() != null &&
               !authentication.getName().trim().isEmpty();
    }

    /**
     * 에러 응답 생성
     */
    private Map<String, Object> createErrorResponse(String message, boolean loginRequired) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        response.put("loginRequired", loginRequired);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
}