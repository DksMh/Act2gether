package com.example.act2gether.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.act2gether.entity.UserEntity;
import java.util.List;

public interface UserRepository extends JpaRepository<UserEntity, String>{
    Optional<UserEntity> findByEmail(String email);
    
    @Modifying
    @Query("UPDATE UserEntity u SET u.interests = :interests, u.updated_at = :updatedAt WHERE u.email = :email")
    void updateInterestsByEmail(@Param("email") String email, 
                               @Param("interests") String interests, 
                               @Param("updatedAt") String updatedAt);

    Optional<UserEntity> findByRealnameAndUsername(String realname, String username);
}