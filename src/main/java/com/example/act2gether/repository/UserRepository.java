package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.UserEntity;

public interface UserRepository extends JpaRepository<UserEntity, String>{
    
}
