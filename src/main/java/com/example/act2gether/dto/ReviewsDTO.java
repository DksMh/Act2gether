package com.example.act2gether.dto;

import com.example.act2gether.entity.ReviewsEntity;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReviewsDTO {
    private String reviewId; 
    private String tourId;
    private String userId; 
    private String groupId;
    private int rating;
    private String reviewText;
    private String createdAt;
    private String updatedAt;

    public static ReviewsDTO of(ReviewsEntity reviewsEntity) {
        return ReviewsDTO.builder()
        .reviewId(reviewsEntity.getReviewId())
        .tourId(reviewsEntity.getTourId())
        .userId(reviewsEntity.getUserId())
        .groupId(reviewsEntity.getUserId())
        .rating(reviewsEntity.getRating())
        .reviewText(reviewsEntity.getReviewText())
        .createdAt(reviewsEntity.getCreatedAt())
        .updatedAt(reviewsEntity.getUpdatedAt())
        .build();
    }
    
}
