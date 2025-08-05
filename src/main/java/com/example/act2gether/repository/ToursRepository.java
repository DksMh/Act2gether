package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.ToursEntity;

public interface ToursRepository extends JpaRepository<ToursEntity, String>{
    
}
