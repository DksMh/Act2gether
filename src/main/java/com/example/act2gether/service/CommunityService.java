package com.example.act2gether.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.example.act2gether.dto.TravelGroupMembersDTO;
import com.example.act2gether.entity.TravelGroupMembersEntity;
import com.example.act2gether.entity.TravelGroupsEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.TravelGroupMembersRepository;
import com.example.act2gether.repository.TravelGroupsRepository;
import com.example.act2gether.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class CommunityService {
    private final TravelGroupMembersRepository travelGroupMembersRepository;
    private final UserRepository userRepository;
    private final TravelGroupsRepository travelGroupsRepository;

    public List<TravelGroupMembersDTO> getMembers(String id){
        List<TravelGroupMembersEntity> travelGroupMembersEntity = travelGroupMembersRepository.findByGroupId(id);
        // List<ReviewsEntity> reviewsEntity = reviewsRepository.findByUserId(userEntity.getUserId());
        // ProfileDTO profileDto = ProfileDTO.setData(userEntity, reviewsEntity); 
        List<TravelGroupMembersDTO> users = travelGroupMembersEntity.stream().map(entity -> {
            TravelGroupMembersEntity tgEntity = entity;
            UserEntity userEntity = userRepository.findById(entity.getUserId()).orElse(null);
            return TravelGroupMembersDTO.of(tgEntity, userEntity);
        }).collect(Collectors.toList());
        
        return users;
    }

    public List<TravelGroupsEntity> getGroups() {
        List<TravelGroupsEntity> travelGroupMembersEntities = travelGroupsRepository.findAll();
        return travelGroupMembersEntities;
    }
}
