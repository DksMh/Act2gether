package com.example.act2gether.dto;

import java.util.List;

import com.example.act2gether.entity.PostsEntity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PostDTO {
    private String postId;
    private String memberId;
    private String groupId;
    private String content;
    private String type;
    private int isDeleted;
    private int likesCount;
    private String createdAt;
    private String updatedAt;
    private List<String> pictures;
    private List<String> files;
    private List<String> locations;
    private String username;
    public static PostDTO of(PostsEntity e, String username) {
        return PostDTO.builder()
        .username(username)
        .postId(e.getPostId())
        .memberId(e.getMemberId())
        .groupId(e.getGroupId())
        .likesCount(e.getLikesCount())
        .content(e.getContent())
        .createdAt(e.getCreatedAt())
        .updatedAt(e.getUpdatedAt())
        .pictures(e.getPictures())
        .files(e.getFiles())
        .locations(e.getLocations())
        .build();
    }

}
