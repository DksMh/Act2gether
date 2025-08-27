package com.example.act2gether.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.example.act2gether.dto.TravelGroupMembersDTO;
import com.example.act2gether.entity.TravelGroupMembersEntity;
import com.example.act2gether.repository.TravelGroupMembersRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class CommunityService {
    private final TravelGroupMembersRepository travelGroupMembersRepository;

    public List<TravelGroupMembersDTO> getMembers(String id){
        List<TravelGroupMembersEntity> travelGroupMembersEntity = travelGroupMembersRepository.findByGroupId(id);
        // List<ReviewsEntity> reviewsEntity = reviewsRepository.findByUserId(userEntity.getUserId());
        // ProfileDTO profileDto = ProfileDTO.setData(userEntity, reviewsEntity);
        List<TravelGroupMembersDTO> members = travelGroupMembersEntity.stream().map(TravelGroupMembersDTO::of).collect(Collectors.toList());
        return members;
    }
}
