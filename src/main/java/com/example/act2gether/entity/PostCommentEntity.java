package com.example.act2gether.entity;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

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
@Table(name = "post_comment")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostCommentEntity {
    @Id
    @Column(name = "comment_id")
    private String commentId; 

    @Column(name = "post_id")
    private String postId;

    @Column(name = "user_id")
    private String userId; 

    @Setter
    private String comment;

    @Column(name = "created_at")
    private String createdAt;

    public static PostCommentEntity of(String postId, String userId, String comment) {
        return PostCommentEntity.builder()
                .commentId(UUID.randomUUID().toString())
                .postId(postId)
                .userId(userId)
                .comment(comment)
                .createdAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .build();
    }
}
