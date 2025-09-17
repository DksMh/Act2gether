package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.act2gether.entity.TravelGroupMembersEntity;
import java.util.List;
import java.util.Optional;


public interface TravelGroupMembersRepository extends JpaRepository<TravelGroupMembersEntity, String>{
    List<TravelGroupMembersEntity> findByGroupId(String groupId);
    List<TravelGroupMembersEntity> findByUserId(String userId);
    Optional<TravelGroupMembersEntity> findByMemberId(String memberId);
    List<TravelGroupMembersEntity> findByGroupIdAndUserId(String groupId, String userId);
    long countByGroupId(String groupId);  
}
