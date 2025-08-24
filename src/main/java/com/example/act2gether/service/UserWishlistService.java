package com.example.act2gether.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

/**
 * 🆕 UserWishlistService - v3.0 투어 찜하기 시스템
 * 
 * ✅ 기존 user_wishlist 테이블 활용
 * ✅ UUID 수동 생성 (자동 생성 아님)
 * ✅ FK 제약조건 없음 확인
 * ✅ 투어 상품 찜하기/취소 기능
 * 
 * 데이터베이스 구조:
 * - wishlist_id: varchar(50) PK (UUID 수동 생성)
 * - user_id: varchar(50) (users 테이블 참조, FK 제약조건 없음)
 * - tour_id: varchar(50) (tourId - contentid 조합)
 * - wishlist_date: varchar(30) (찜한 날짜)
 */
@Service
@Slf4j
public class UserWishlistService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final String DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern(DATE_FORMAT);

    /**
     * 🎯 찜하기 추가
     * 
     * @param userId - 사용자 ID
     * @param tourId - 투어 ID (contentid 조합)
     * @return 성공 여부
     */
    public boolean addToWishlist(String userId, String tourId) {
        if (userId == null || userId.trim().isEmpty() || tourId == null || tourId.trim().isEmpty()) {
            log.warn("⚠️ 유효하지 않은 파라미터: userId={}, tourId={}", userId, tourId);
            return false;
        }

        try {
            // 중복 확인
            if (isInWishlist(userId, tourId)) {
                log.info("ℹ️ 이미 찜 목록에 있음: userId={}, tourId={}", userId, tourId);
                return true; // 이미 있으면 성공으로 처리
            }

            // ✅ UUID 수동 생성 (자동 생성 아님)
            String wishlistId = UUID.randomUUID().toString();
            String currentDate = LocalDateTime.now().format(formatter);

            String sql = "INSERT INTO user_wishlist (wishlist_id, user_id, tour_id, wishlist_date) VALUES (?, ?, ?, ?)";
            
            int result = jdbcTemplate.update(sql, wishlistId, userId, tourId, currentDate);
            
            if (result > 0) {
                log.info("✅ 찜하기 추가 성공: wishlistId={}, userId={}, tourId={}", wishlistId, userId, tourId);
                return true;
            } else {
                log.warn("⚠️ 찜하기 추가 실패 - SQL 실행 결과: {}", result);
                return false;
            }

        } catch (Exception e) {
            log.error("💥 찜하기 추가 중 오류: userId={}, tourId={}, error={}", userId, tourId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 🗑️ 찜하기 제거
     * 
     * @param userId - 사용자 ID
     * @param tourId - 투어 ID
     * @return 성공 여부
     */
    public boolean removeFromWishlist(String userId, String tourId) {
        if (userId == null || userId.trim().isEmpty() || tourId == null || tourId.trim().isEmpty()) {
            log.warn("⚠️ 유효하지 않은 파라미터: userId={}, tourId={}", userId, tourId);
            return false;
        }

        try {
            String sql = "DELETE FROM user_wishlist WHERE user_id = ? AND tour_id = ?";
            
            int result = jdbcTemplate.update(sql, userId, tourId);
            
            if (result > 0) {
                log.info("✅ 찜하기 제거 성공: userId={}, tourId={}, 삭제된 행: {}", userId, tourId, result);
                return true;
            } else {
                log.info("ℹ️ 찜하기 제거 - 해당 데이터 없음: userId={}, tourId={}", userId, tourId);
                return true; // 데이터가 없어도 성공으로 처리
            }

        } catch (Exception e) {
            log.error("💥 찜하기 제거 중 오류: userId={}, tourId={}, error={}", userId, tourId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * ✅ 찜하기 상태 확인
     * 
     * @param userId - 사용자 ID
     * @param tourId - 투어 ID
     * @return 찜하기 여부
     */
    public boolean isInWishlist(String userId, String tourId) {
        if (userId == null || userId.trim().isEmpty() || tourId == null || tourId.trim().isEmpty()) {
            return false;
        }

        try {
            String sql = "SELECT COUNT(*) FROM user_wishlist WHERE user_id = ? AND tour_id = ?";
            
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId, tourId);
            
            boolean isWishlisted = count != null && count > 0;
            log.debug("🔍 찜하기 상태 확인: userId={}, tourId={}, isWishlisted={}", userId, tourId, isWishlisted);
            
            return isWishlisted;

        } catch (Exception e) {
            log.error("💥 찜하기 상태 확인 중 오류: userId={}, tourId={}, error={}", userId, tourId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 📋 사용자 찜 목록 조회
     * 
     * @param userId - 사용자 ID
     * @return 찜 목록 (최신순)
     */
    public List<UserWishlistDto> getUserWishlist(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            log.warn("⚠️ 유효하지 않은 사용자 ID: {}", userId);
            return List.of();
        }

        try {
            String sql = "SELECT wishlist_id, user_id, tour_id, wishlist_date " +
                        "FROM user_wishlist " +
                        "WHERE user_id = ? " +
                        "ORDER BY wishlist_date DESC";

            List<UserWishlistDto> wishlist = jdbcTemplate.query(sql, wishlistRowMapper(), userId);
            
            log.info("📋 사용자 찜 목록 조회 완료: userId={}, 개수={}", userId, wishlist.size());
            return wishlist;

        } catch (Exception e) {
            log.error("💥 사용자 찜 목록 조회 중 오류: userId={}, error={}", userId, e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * 🔢 사용자 찜 개수 조회
     * 
     * @param userId - 사용자 ID
     * @return 찜 개수
     */
    public int getWishlistCount(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            return 0;
        }

        try {
            String sql = "SELECT COUNT(*) FROM user_wishlist WHERE user_id = ?";
            
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            int wishlistCount = count != null ? count : 0;
            
            log.debug("🔢 사용자 찜 개수: userId={}, count={}", userId, wishlistCount);
            return wishlistCount;

        } catch (Exception e) {
            log.error("💥 사용자 찜 개수 조회 중 오류: userId={}, error={}", userId, e.getMessage(), e);
            return 0;
        }
    }

    /**
     * 🧹 사용자 찜 목록 전체 삭제 (탈퇴 시 사용)
     * 
     * @param userId - 사용자 ID
     * @return 삭제된 개수
     */
    public int clearUserWishlist(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            log.warn("⚠️ 유효하지 않은 사용자 ID: {}", userId);
            return 0;
        }

        try {
            String sql = "DELETE FROM user_wishlist WHERE user_id = ?";
            
            int deletedCount = jdbcTemplate.update(sql, userId);
            
            log.info("🧹 사용자 찜 목록 전체 삭제 완료: userId={}, 삭제된 개수={}", userId, deletedCount);
            return deletedCount;

        } catch (Exception e) {
            log.error("💥 사용자 찜 목록 전체 삭제 중 오류: userId={}, error={}", userId, e.getMessage(), e);
            return 0;
        }
    }

    /**
     * 📊 인기 투어 조회 (찜 개수 기준)
     * 
     * @param limit - 조회할 개수
     * @return 인기 투어 목록 (tourId, 찜 개수)
     */
    public List<PopularTourDto> getPopularTours(int limit) {
        try {
            String sql = "SELECT tour_id, COUNT(*) as wishlist_count " +
                        "FROM user_wishlist " +
                        "GROUP BY tour_id " +
                        "ORDER BY wishlist_count DESC " +
                        "LIMIT ?";

            List<PopularTourDto> popularTours = jdbcTemplate.query(sql, popularTourRowMapper(), Math.max(1, limit));
            
            log.info("📊 인기 투어 조회 완료: 요청 개수={}, 결과 개수={}", limit, popularTours.size());
            return popularTours;

        } catch (Exception e) {
            log.error("💥 인기 투어 조회 중 오류: limit={}, error={}", limit, e.getMessage(), e);
            return List.of();
        }
    }

    // ===========================================
    // RowMapper 및 DTO 클래스들
    // ===========================================

    /**
     * UserWishlist RowMapper
     */
    private RowMapper<UserWishlistDto> wishlistRowMapper() {
        return (rs, rowNum) -> UserWishlistDto.builder()
                .wishlistId(rs.getString("wishlist_id"))
                .userId(rs.getString("user_id"))
                .tourId(rs.getString("tour_id"))
                .wishlistDate(rs.getString("wishlist_date"))
                .build();
    }

    /**
     * PopularTour RowMapper
     */
    private RowMapper<PopularTourDto> popularTourRowMapper() {
        return (rs, rowNum) -> PopularTourDto.builder()
                .tourId(rs.getString("tour_id"))
                .wishlistCount(rs.getInt("wishlist_count"))
                .build();
    }

    // ===========================================
    // DTO 클래스들
    // ===========================================

    /**
     * 사용자 찜 목록 DTO
     */
    public static class UserWishlistDto {
        private String wishlistId;
        private String userId;
        private String tourId;
        private String wishlistDate;

        // Builder 패턴 사용
        public static UserWishlistDtoBuilder builder() {
            return new UserWishlistDtoBuilder();
        }

        public static class UserWishlistDtoBuilder {
            private String wishlistId;
            private String userId;
            private String tourId;
            private String wishlistDate;

            public UserWishlistDtoBuilder wishlistId(String wishlistId) {
                this.wishlistId = wishlistId;
                return this;
            }

            public UserWishlistDtoBuilder userId(String userId) {
                this.userId = userId;
                return this;
            }

            public UserWishlistDtoBuilder tourId(String tourId) {
                this.tourId = tourId;
                return this;
            }

            public UserWishlistDtoBuilder wishlistDate(String wishlistDate) {
                this.wishlistDate = wishlistDate;
                return this;
            }

            public UserWishlistDto build() {
                UserWishlistDto dto = new UserWishlistDto();
                dto.wishlistId = this.wishlistId;
                dto.userId = this.userId;
                dto.tourId = this.tourId;
                dto.wishlistDate = this.wishlistDate;
                return dto;
            }
        }

        // Getters
        public String getWishlistId() { return wishlistId; }
        public String getUserId() { return userId; }
        public String getTourId() { return tourId; }
        public String getWishlistDate() { return wishlistDate; }
    }

    /**
     * 인기 투어 DTO
     */
    public static class PopularTourDto {
        private String tourId;
        private int wishlistCount;

        public static PopularTourDtoBuilder builder() {
            return new PopularTourDtoBuilder();
        }

        public static class PopularTourDtoBuilder {
            private String tourId;
            private int wishlistCount;

            public PopularTourDtoBuilder tourId(String tourId) {
                this.tourId = tourId;
                return this;
            }

            public PopularTourDtoBuilder wishlistCount(int wishlistCount) {
                this.wishlistCount = wishlistCount;
                return this;
            }

            public PopularTourDto build() {
                PopularTourDto dto = new PopularTourDto();
                dto.tourId = this.tourId;
                dto.wishlistCount = this.wishlistCount;
                return dto;
            }
        }

        // Getters
        public String getTourId() { return tourId; }
        public int getWishlistCount() { return wishlistCount; }
    }
}