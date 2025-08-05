package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.PostLikesEntity;

public interface PostLikesRepository extends JpaRepository<PostLikesEntity, String>{
    
}
