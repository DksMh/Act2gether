package com.example.act2gether.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.PostCommentEntity;

public interface PostCommentRepository extends JpaRepository<PostCommentEntity, String>{
    List<PostCommentEntity> findByPostIdOrderByCreatedAtAsc(String postId);
}
