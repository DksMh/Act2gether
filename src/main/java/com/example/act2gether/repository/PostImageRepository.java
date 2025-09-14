package com.example.act2gether.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.PostImageEntity;
import com.example.act2gether.entity.PostLikesEntity;

public interface PostImageRepository extends JpaRepository<PostImageEntity, String>{
    int deleteByPostId(String postId);

    // 수정 후 남은 이미지를 다시 그리기 위해 필요
    List<PostImageEntity> findByPostId(String postId);
}
