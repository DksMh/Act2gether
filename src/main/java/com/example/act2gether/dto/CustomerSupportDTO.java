package com.example.act2gether.dto;

import java.time.LocalDateTime;

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
    private String image_path;
    private Integer view_count;
    
    // 검색 및 페이징을 위한 필드
    private String searchType;
    private String searchKeyword;
    private int page = 0;
    private int size = 10;
}