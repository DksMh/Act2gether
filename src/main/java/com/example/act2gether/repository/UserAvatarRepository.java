package com.example.act2gether.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.UserAvatarEntity;

import jakarta.transaction.Transactional;

public interface UserAvatarRepository extends JpaRepository<UserAvatarEntity, String> {
    Optional<UserAvatarEntity> findFirstByUserIdOrderByCreatedAtDesc(String userId);
    @Transactional int deleteByUserId(String userId);
}
