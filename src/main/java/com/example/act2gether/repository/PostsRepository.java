package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.PostsEntity;
import java.util.List;


public interface PostsRepository extends JpaRepository<PostsEntity, String>{
    List<PostsEntity> findByGroupId(String groupId);
}
