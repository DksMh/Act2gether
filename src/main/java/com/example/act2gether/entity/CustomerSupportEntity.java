package com.example.act2gether.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.example.act2gether.dto.CustomerSupportDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

@Entity
@Table(name = "customer_support")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Slf4j
public class CustomerSupportEntity {
    @Id
    private String support_id;
    
    @Column(name = "user_id")
    private String userId;
    
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String content;
    
    private String responder;
    
    @Column(columnDefinition = "TEXT")
    private String response;
    
    private String inquiry_type;
    
    private String status;
    
    @Column(name = "is_private")
    private Boolean isPrivate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at") 
    private LocalDateTime updatedAt;
    
    // 🎯 기존 image_path 필드 그대로 (JSON 배열도 저장 가능)
    private String image_path;
    
    @Column(columnDefinition = "int default 0")
    private Integer view_count;
    
    // 🎯 다중 이미지 처리 메서드들 추가
    
    /**
     * image_path를 List<String>으로 변환
     * - 단일 이미지: "uuid1.jpg" → ["uuid1.jpg"]
     * - 다중 이미지: "[\"uuid1.jpg\", \"uuid2.png\"]" → ["uuid1.jpg", "uuid2.png"]
     */
    public List<String> getImagePathList() {
        if (image_path == null || image_path.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        // JSON 배열 형태인지 확인
        if (image_path.startsWith("[") && image_path.endsWith("]")) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                return mapper.readValue(image_path, new TypeReference<List<String>>() {});
            } catch (Exception e) {
                log.warn("JSON 파싱 실패, 단일 이미지로 처리: {}", image_path);
                return List.of(image_path);  // JSON 파싱 실패 시 단일로 처리
            }
        } else {
            // 기존 단일 이미지인 경우
            return List.of(image_path);
        }
    }
    
    /**
     * List<String>을 image_path에 저장
     * - 단일 이미지: ["uuid1.jpg"] → "uuid1.jpg"
     * - 다중 이미지: ["uuid1.jpg", "uuid2.png"] → "[\"uuid1.jpg\", \"uuid2.png\"]"
     */
    public void setImagePathList(List<String> paths) {
        System.out.println("🎯 setImagePathList 호출됨, 입력: " + paths); // 🎯 추가!
        if (paths == null || paths.isEmpty()) {
            this.image_path = null;
            System.out.println("🎯 paths가 null/empty, image_path = null"); // 🎯 추가!
            return;
        }
        
        // 단일 이미지면 그냥 문자열로, 다중이면 JSON 배열로
        if (paths.size() == 1) {
            this.image_path = paths.get(0);  // "uuid1.jpg"
            System.out.println("🎯 단일 이미지 저장: " + this.image_path); 
        } else {
            try {
                ObjectMapper mapper = new ObjectMapper();
                this.image_path = mapper.writeValueAsString(paths);  // "[\"uuid1.jpg\", \"uuid2.png\"]"
                System.out.println("🎯 다중 이미지 JSON 저장: " + this.image_path); // 🎯 추가
            } catch (Exception e) {
                log.error("JSON 변환 실패", e);
                System.err.println("🚨 JSON 변환 실패: " + e.getMessage()); // 🎯 추가!
                this.image_path = paths.get(0);  // 실패 시 첫 번째만
            }
        }
    }
    
    /**
     * 첫 번째 이미지 경로만 반환 (썸네일용, 기존 호환성)
     */
    public String getFirstImagePath() {
        List<String> paths = getImagePathList();
        return paths.isEmpty() ? null : paths.get(0);
    }
    
    /**
     * 이미지 개수 반환
     */
    public int getImageCount() {
        return getImagePathList().size();
    }
    
    // 🎯 기존 메서드들 그대로 유지
    
    public static CustomerSupportEntity of(CustomerSupportDTO dto) {
        return CustomerSupportEntity.builder()
                .support_id(UUID.randomUUID().toString())
                .userId(dto.getUserId())
                .title(dto.getTitle())
                .content(dto.getContent())
                .inquiry_type(dto.getInquiry_type())
                .status("답변 대기")
                .isPrivate(dto.getIsPrivate() != null ? dto.getIsPrivate() : true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .image_path(dto.getImage_path())  // 🎯 기존 방식 유지
                .view_count(0)
                .build();
    }
    
    public void updateFromDTO(CustomerSupportDTO dto) {
        System.out.println("🎯 updateFromDTO 시작"); // 🎯 추가!
        try {
            this.title = dto.getTitle();
            this.content = dto.getContent();
            this.inquiry_type = dto.getInquiry_type();
            this.isPrivate = dto.getIsPrivate();
            //this.image_path = dto.getImage_path();  // 🎯 기존 방식 유지
            this.updatedAt = LocalDateTime.now();
            System.out.println("🎯 updateFromDTO 완료"); // 🎯 추가!
        } catch (Exception e) {
            System.err.println("🚨 updateFromDTO 오류: " + e.getMessage()); // 🎯 추가!
            throw e;
        }
    }
    
    
    public void addResponse(String responder, String response) {
        this.responder = responder;
        this.response = response;
        this.status = "답변 완료";
        this.updatedAt = LocalDateTime.now();
    }
    
    public void incrementViewCount() {
        this.view_count = (this.view_count == null ? 0 : this.view_count) + 1;
    }
}