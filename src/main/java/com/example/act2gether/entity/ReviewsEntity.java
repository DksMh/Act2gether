package com.example.act2gether.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "reviews")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewsEntity {
     @Id
     @Column(name = "review_id")
    private String reviewId; 

    @Column(name = "tour_id")
    private String tourId;

    @Column(name = "user_id")
    private String userId; 

    @Column(name = "group_id")
    private String groupId;
    
    private boolean rating;

    @Column(name = "review_text")
    private String reviewText;

    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "updated_at")
    private String updatedAt;
}
