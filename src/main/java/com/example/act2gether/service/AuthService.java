package com.example.act2gether.service;

import jakarta.servlet.http.HttpServletRequest;

/**
 * ✅ 인증 서비스 인터페이스
 * JWT, Session 등 다양한 인증 방식을 추상화
 */
public interface AuthService {
    
    /**
     * 현재 로그인한 사용자 ID 조회
     * @param request HTTP 요청
     * @return 사용자 ID (로그인하지 않은 경우 null)
     */
    String getCurrentUserId(HttpServletRequest request);
    
    /**
     * 관리자 권한 확인
     * @param request HTTP 요청
     * @return 관리자 여부
     */
    boolean isAdmin(HttpServletRequest request);
    
    /**
     * 로그인 상태 확인
     * @param request HTTP 요청
     * @return 로그인 여부
     */
    boolean isLoggedIn(HttpServletRequest request);
    
    /**
     * 사용자 닉네임 조회 (선택사항)
     * @param userId 사용자 ID
     * @return 사용자 닉네임
     */
    default String getUserNickname(String userId) {
        return userId; // 기본 구현: userId 그대로 반환
    }
    
    /**
     * 클라이언트 IP 주소 추출
     * @param request HTTP 요청
     * @return IP 주소
     */
    default String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }

    boolean isAuthenticated(HttpServletRequest request);
}