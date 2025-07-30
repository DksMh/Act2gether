package com.example.act2gether.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.act2gether.entity.UserEntity;
import java.util.List;


public interface UserRepository extends JpaRepository<UserEntity, String>{
    Optional<UserEntity> findByEmail(String email);
    
    @Query("SELECT u FROM UserEntity u WHERE u.user_id = :userId")
    Optional<UserEntity> findByUser_id(String user_id);
}
