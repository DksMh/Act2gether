package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.TravelGroupsEntity;

public interface TravelGroupsRepository extends JpaRepository<TravelGroupsEntity, String>{
    
}
