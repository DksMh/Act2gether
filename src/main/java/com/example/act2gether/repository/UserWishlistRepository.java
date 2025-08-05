package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.UserWishlistEntity;

public interface UserWishlistRepository extends JpaRepository<UserWishlistEntity, String>{
    
}
