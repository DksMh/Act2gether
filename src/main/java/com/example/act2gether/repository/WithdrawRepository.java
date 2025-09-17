package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.WithdrawEntity;

public interface WithdrawRepository extends JpaRepository<WithdrawEntity, String>{
    
}
