package com.example.act2gether.entity;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
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

    @Column(name = "group_id")
    private String groupId; 

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

    @Column(name = "pictures")
    private List<String> pictures;

    @Column(name = "files")
    private List<String> files;

    @Column(name = "locations")
    private List<String> locations;

    public static PostsEntity of(PostDTO postDTO, String memberId) {
        return PostsEntity.builder()
        .postId(UUID.randomUUID().toString())
        .memberId(memberId)
        .groupId(postDTO.getGroupId())
        .content(postDTO.getContent())
        .type(null)
        // .isDeleted(false)
        .likesCount(0) 
        .createdAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
        .updatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
        .pictures(null)
        .files(null)
        .locations(null)
        .build();
    }
}
