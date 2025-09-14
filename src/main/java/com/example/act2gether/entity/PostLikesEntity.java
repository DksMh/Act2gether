package com.example.act2gether.entity;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import com.example.act2gether.dto.PostDTO;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "post_likes")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostLikesEntity {
    @Id
    @Column(name = "like_id")
    private String likeId; 

    @Column(name = "user_id")
    private String userId;

    @Column(name = "post_id")
    private String postId; 

    @Column(name = "created_at")
    private String createdAt;

    public static PostLikesEntity of(PostDTO postDTO, String userId) {
        return PostLikesEntity.builder()
            .likeId(UUID.randomUUID().toString())
            .userId(userId)
            .postId(postDTO.getPostId())
            .createdAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
            .build();
    }
}
