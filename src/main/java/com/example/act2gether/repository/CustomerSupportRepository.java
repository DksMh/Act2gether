// CustomerSupportRepository.java에 관리자용 검색 메서드 추가

package com.example.act2gether.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.act2gether.entity.CustomerSupportEntity;

public interface CustomerSupportRepository extends JpaRepository<CustomerSupportEntity, String> {

        // 기존 메서드들...
        Page<CustomerSupportEntity> findByUserId(String userId, Pageable pageable);

        Page<CustomerSupportEntity> findByIsPrivateFalse(Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.inquiry_type = :inquiryType")
        Page<CustomerSupportEntity> findByInquiry_type(@Param("inquiryType") String inquiryType, Pageable pageable);

        Page<CustomerSupportEntity> findByStatus(String status, Pageable pageable);

        // 🎯 관리자용 검색 메서드들 추가 (모든 문의에서 검색)
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.title LIKE %:keyword%")
        Page<CustomerSupportEntity> findByTitleContaining(@Param("keyword") String keyword, Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.content LIKE %:keyword%")
        Page<CustomerSupportEntity> findByContentContaining(@Param("keyword") String keyword, Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.title LIKE %:keyword% OR cs.content LIKE %:keyword%")
        Page<CustomerSupportEntity> findByTitleOrContentContaining(@Param("keyword") String keyword, Pageable pageable);

        // 기존 일반 사용자용 메서드들 (공개 문의만)
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.title LIKE %:keyword% AND cs.isPrivate = false")
        Page<CustomerSupportEntity> findByTitleContainingAndIsPrivateFalse(@Param("keyword") String keyword,
                        Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.content LIKE %:keyword% AND cs.isPrivate = false")
        Page<CustomerSupportEntity> findByContentContainingAndIsPrivateFalse(@Param("keyword") String keyword,
                        Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE (cs.title LIKE %:keyword% OR cs.content LIKE %:keyword%) AND cs.isPrivate = false")
        Page<CustomerSupportEntity> findByTitleOrContentContainingAndIsPrivateFalse(@Param("keyword") String keyword,
                        Pageable pageable);

        // 사용자의 문의 중 검색
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId AND cs.title LIKE %:keyword%")
        Page<CustomerSupportEntity> findByUserIdAndTitleContaining(@Param("userId") String userId,
                        @Param("keyword") String keyword, Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId AND cs.content LIKE %:keyword%")
        Page<CustomerSupportEntity> findByUserIdAndContentContaining(@Param("userId") String userId,
                        @Param("keyword") String keyword, Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId AND (cs.title LIKE %:keyword% OR cs.content LIKE %:keyword%)")
        Page<CustomerSupportEntity> findByUserIdAndTitleOrContentContaining(@Param("userId") String userId,
                        @Param("keyword") String keyword, Pageable pageable);

        // 특정 사용자가 볼 수 있는 문의 조회 (자신의 문의 + 공개 문의)
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE " +
                        "cs.userId = :userId OR cs.isPrivate = false")
        Page<CustomerSupportEntity> findVisiblePosts(@Param("userId") String userId, Pageable pageable);

        // 디버깅용: 내 글만 조회
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId")
        Page<CustomerSupportEntity> findMyPosts(@Param("userId") String userId, Pageable pageable);

        // 디버깅용: 공개 글만 조회
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.isPrivate = false")
        Page<CustomerSupportEntity> findPublicPosts(Pageable pageable);

        // CustomerSupportRepository.java - 검색 + 필터링 조합 메서드 추가

        // 🎯 제목 검색 + 필터링 조합
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.title LIKE %:keyword% AND cs.inquiry_type = :inquiryType")
        Page<CustomerSupportEntity> findByTitleContainingAndInquiryType(@Param("keyword") String keyword,
                        @Param("inquiryType") String inquiryType,
                        Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.title LIKE %:keyword% AND cs.status = :status")
        Page<CustomerSupportEntity> findByTitleContainingAndStatus(@Param("keyword") String keyword,
                        @Param("status") String status,
                        Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.title LIKE %:keyword% AND cs.inquiry_type = :inquiryType AND cs.status = :status")
        Page<CustomerSupportEntity> findByTitleContainingAndInquiryTypeAndStatus(@Param("keyword") String keyword,
                        @Param("inquiryType") String inquiryType,
                        @Param("status") String status,
                        Pageable pageable);

        // 🎯 내용 검색 + 필터링 조합
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.content LIKE %:keyword% AND cs.inquiry_type = :inquiryType")
        Page<CustomerSupportEntity> findByContentContainingAndInquiryType(@Param("keyword") String keyword,
                        @Param("inquiryType") String inquiryType,
                        Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.content LIKE %:keyword% AND cs.status = :status")
        Page<CustomerSupportEntity> findByContentContainingAndStatus(@Param("keyword") String keyword,
                        @Param("status") String status,
                        Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.content LIKE %:keyword% AND cs.inquiry_type = :inquiryType AND cs.status = :status")
        Page<CustomerSupportEntity> findByContentContainingAndInquiryTypeAndStatus(@Param("keyword") String keyword,
                        @Param("inquiryType") String inquiryType,
                        @Param("status") String status,
                        Pageable pageable);

        // 🎯 제목+내용 검색 + 필터링 조합
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE (cs.title LIKE %:keyword% OR cs.content LIKE %:keyword%) AND cs.inquiry_type = :inquiryType")
        Page<CustomerSupportEntity> findByTitleOrContentContainingAndInquiryType(@Param("keyword") String keyword,
                        @Param("inquiryType") String inquiryType,
                        Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE (cs.title LIKE %:keyword% OR cs.content LIKE %:keyword%) AND cs.status = :status")
        Page<CustomerSupportEntity> findByTitleOrContentContainingAndStatus(@Param("keyword") String keyword,
                        @Param("status") String status,
                        Pageable pageable);

        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE (cs.title LIKE %:keyword% OR cs.content LIKE %:keyword%) AND cs.inquiry_type = :inquiryType AND cs.status = :status")
        Page<CustomerSupportEntity> findByTitleOrContentContainingAndInquiryTypeAndStatus(
                        @Param("keyword") String keyword,
                        @Param("inquiryType") String inquiryType,
                        @Param("status") String status,
                        Pageable pageable);

        // 답변 상태만 검색
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE " +
                        "cs.status = :status AND (cs.userId = :userId OR cs.isPrivate = false)")
        Page<CustomerSupportEntity> findByStatusForUser(@Param("userId") String userId,
                        @Param("status") String status,
                        Pageable pageable);

        // 답변 상태 + 내글만 보기 조합
        @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId AND cs.status = :status")
        Page<CustomerSupportEntity> findByUserIdAndStatus(@Param("userId") String userId,
                        @Param("status") String status,
                        Pageable pageable);
}