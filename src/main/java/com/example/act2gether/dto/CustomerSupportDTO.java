package com.example.act2gether.dto;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
public class CustomerSupportDTO {
    private String support_id;
    private String userId; // 조인용 
    private String title;
    private String content;
    private String responder;
    private String response;
    private String inquiry_type;
    private String status;
    private Boolean isPrivate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // private String image_path;
    // private Integer view_count;

     // 🎯 이미지 관련 필드
    private String image_path;        // 기존 호환성 (첫 번째 이미지)
    private List<String> image_paths; // 🎯 다중 이미지 목록
    
    private Integer view_count;

    // 검색 및 페이징을 위한 필드
    private String searchType;
    private String searchKeyword;
    private int page = 0;
    private int size = 10;
}