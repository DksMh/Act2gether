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
@Table(name = "posts")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostsEntity {
    @Id
    @Column(name = "post_id")
    private String postId; 

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "parent_post_id")
    private String parentPostId; 

    private String content;

    private String type;

    @Column(name = "is_deleted")
    private boolean isDeleted;

    @Column(name = "likes_count")
    private int likesCount;

    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "updated_at")
    private String updatedAt;
}
