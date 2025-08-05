package com.example.act2gether.entity;

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
    private String review_id; 
    private String tour_id;
    private String user_id; 
    private String group_id;
    private boolean rating;
    private String review_text;
    private String created_at;
    private String updated_at;
}
