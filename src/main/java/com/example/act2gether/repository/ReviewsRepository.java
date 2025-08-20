package com.example.act2gether.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.ReviewsEntity;
import com.example.act2gether.entity.UserEntity;

public interface ReviewsRepository extends JpaRepository<ReviewsEntity, String>{

    List<ReviewsEntity> findByUserId(String userId);
    
}
