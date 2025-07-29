package com.example.act2gether.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import com.example.act2gether.dto.CustomerSupportDTO;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "customer_support")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
    
    private String image_path;
    
    @Column(columnDefinition = "int default 0")
    private Integer view_count;
    
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
                .image_path(dto.getImage_path())
                .view_count(0)
                .build();
    }
    
    public void updateFromDTO(CustomerSupportDTO dto) {
        this.title = dto.getTitle();
        this.content = dto.getContent();
        this.inquiry_type = dto.getInquiry_type();
        this.isPrivate = dto.getIsPrivate();
        this.image_path = dto.getImage_path();
        this.updatedAt = LocalDateTime.now();
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