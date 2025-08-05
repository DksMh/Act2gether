package com.example.act2gether.entity;

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
    private String post_id; 
    private String member_id;
    private String parent_post_id; 
    private String content;
    private String type;
    private boolean is_deleted;
    private int likes_count;
    private String created_at;
    private String updated_at;
}
