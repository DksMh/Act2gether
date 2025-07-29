package com.example.act2gether.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.act2gether.entity.CustomerSupportEntity;

public interface CustomerSupportRepository extends JpaRepository<CustomerSupportEntity, String> {
    
    // 사용자별 문의 조회
    Page<CustomerSupportEntity> findByUserId(String userId, Pageable pageable);
    
    // 공개 문의만 조회
    Page<CustomerSupportEntity> findByIsPrivateFalse(Pageable pageable);
    
    // 문의 유형별 조회
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.inquiry_type = :inquiryType")
    Page<CustomerSupportEntity> findByInquiry_type(@Param("inquiryType") String inquiryType, Pageable pageable);
    //Page<CustomerSupportEntity> findByInquiry_type(String inquiryType, Pageable pageable);
    
    // 상태별 조회
    Page<CustomerSupportEntity> findByStatus(String status, Pageable pageable);
    
    // 제목으로 검색 (공개 문의만)
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.title LIKE %:keyword% AND cs.isPrivate = false")
    Page<CustomerSupportEntity> findByTitleContainingAndIsPrivateFalse(@Param("keyword") String keyword, Pageable pageable);
    
    // 내용으로 검색 (공개 문의만)
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.content LIKE %:keyword% AND cs.isPrivate = false")
    Page<CustomerSupportEntity> findByContentContainingAndIsPrivateFalse(@Param("keyword") String keyword, Pageable pageable);
    
    // 제목 또는 내용으로 검색 (공개 문의만)
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE (cs.title LIKE %:keyword% OR cs.content LIKE %:keyword%) AND cs.isPrivate = false")
    Page<CustomerSupportEntity> findByTitleOrContentContainingAndIsPrivateFalse(@Param("keyword") String keyword, Pageable pageable);
    
    // 사용자의 문의 중 제목으로 검색
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId AND cs.title LIKE %:keyword%")
    Page<CustomerSupportEntity> findByUserIdAndTitleContaining(@Param("userId") String userId, @Param("keyword") String keyword, Pageable pageable);
    
    // 사용자의 문의 중 내용으로 검색
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId AND cs.content LIKE %:keyword%")
    Page<CustomerSupportEntity> findByUserIdAndContentContaining(@Param("userId") String userId, @Param("keyword") String keyword, Pageable pageable);
    
    // 사용자의 문의 중 제목 또는 내용으로 검색
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId AND (cs.title LIKE %:keyword% OR cs.content LIKE %:keyword%)")
    Page<CustomerSupportEntity> findByUserIdAndTitleOrContentContaining(@Param("userId") String userId, @Param("keyword") String keyword, Pageable pageable);
    
    // 특정 사용자가 볼 수 있는 문의 조회 (자신의 문의 + 공개 문의)
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId OR cs.isPrivate = false ORDER BY cs.createdAt DESC")
    Page<CustomerSupportEntity> findVisiblePosts(@Param("userId") String userId, Pageable pageable);
    
    // 사용자의 문의 중 제목으로 검색
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId AND cs.title LIKE %:keyword%")
    Page<CustomerSupportEntity> findByUser_idAndTitleContaining(@Param("userId") String userId, @Param("keyword") String keyword, Pageable pageable);
    
    // 사용자의 문의 중 내용으로 검색
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId AND cs.content LIKE %:keyword%")
    Page<CustomerSupportEntity> findByUser_idAndContentContaining(@Param("userId") String userId, @Param("keyword") String keyword, Pageable pageable);
    
    // 사용자의 문의 중 제목 또는 내용으로 검색
    @Query("SELECT cs FROM CustomerSupportEntity cs WHERE cs.userId = :userId AND (cs.title LIKE %:keyword% OR cs.content LIKE %:keyword%)")
    Page<CustomerSupportEntity> findByUser_idAndTitleOrContentContaining(@Param("userId") String userId, @Param("keyword") String keyword, Pageable pageable);
}