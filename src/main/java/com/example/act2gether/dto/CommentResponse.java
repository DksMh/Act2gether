package com.example.act2gether.dto;

public record CommentResponse(
        String id,
        String postId,
        String username,
        String comment,
        String createdAt,
        boolean canEdit
) {}
