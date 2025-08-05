package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.PostsEntity;

public interface PostsRepository extends JpaRepository<PostsEntity, String>{
    
}
