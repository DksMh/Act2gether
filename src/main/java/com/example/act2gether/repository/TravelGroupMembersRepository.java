package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.TravelGroupMembersEntity;

public interface TravelGroupMembersRepository extends JpaRepository<TravelGroupMembersEntity, String>{
    
}
