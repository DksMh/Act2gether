package com.example.act2gether.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.example.act2gether.dto.TravelGroupMembersDTO;
import com.example.act2gether.entity.TravelGroupMembersEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.TravelGroupMembersRepository;
import com.example.act2gether.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class CommunityService {
    private final TravelGroupMembersRepository travelGroupMembersRepository;
    private final UserRepository userRepository;

    public List<UserEntity> getMembers(String id){
        List<TravelGroupMembersEntity> travelGroupMembersEntity = travelGroupMembersRepository.findByGroupId(id);
        // List<ReviewsEntity> reviewsEntity = reviewsRepository.findByUserId(userEntity.getUserId());
        // ProfileDTO profileDto = ProfileDTO.setData(userEntity, reviewsEntity);
        List<UserEntity> users = travelGroupMembersEntity.stream().map(TravelGroupMembersDTO::of).map(dto -> userRepository.findById(dto.getUserId()).orElse(null)).collect(Collectors.toList());
        
        return users;
    }
}
