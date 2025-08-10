package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.LoginAttemptsEntity;
import java.util.Optional;


public interface LoginAttemsRepository extends JpaRepository<LoginAttemptsEntity, String>{
    Optional<LoginAttemptsEntity> findByUserId(String user_id);
}
