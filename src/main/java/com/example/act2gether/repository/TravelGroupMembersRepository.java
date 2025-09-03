package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.TravelGroupMembersEntity;
import java.util.List;


public interface TravelGroupMembersRepository extends JpaRepository<TravelGroupMembersEntity, String>{
    List<TravelGroupMembersEntity> findByGroupId(String groupId);
}
