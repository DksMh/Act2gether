package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.PostImageEntity;
import com.example.act2gether.entity.PostLikesEntity;

public interface PostImageRepository extends JpaRepository<PostImageEntity, String>{
    int deleteByPostId(String postId);
}
