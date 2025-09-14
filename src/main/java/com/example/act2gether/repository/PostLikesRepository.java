package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.PostLikesEntity;
import java.util.List;


public interface PostLikesRepository extends JpaRepository<PostLikesEntity, String>{
    List<PostLikesEntity> findByUserIdAndPostId(String userId, String postId);
}
