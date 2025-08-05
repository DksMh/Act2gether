package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.ReviewsEntity;

public interface ReviewsRepository extends JpaRepository<ReviewsEntity, String>{
    
}
