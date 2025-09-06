package com.example.act2gether.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.example.act2gether.dto.PostDTO;
import com.example.act2gether.dto.TravelGroupMembersDTO;
import com.example.act2gether.entity.PostsEntity;
import com.example.act2gether.entity.TravelGroupMembersEntity;
import com.example.act2gether.entity.TravelGroupsEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.PostsRepository;
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
    private final PostsRepository postsRepository;

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

    public boolean savePosts(PostDTO postDTO) {
        UserEntity userEntity = userRepository.findByUsername(postDTO.getUsername()).orElse(null);
        if(userEntity == null){
            return false;
        }

        String userId = userEntity.getUserId();
        TravelGroupMembersEntity travelGroupMembersEntity = travelGroupMembersRepository.findByUserId(userId).orElse(null);
        if(travelGroupMembersEntity == null){
            return false;
        }

        postsRepository.save(PostsEntity.of(postDTO, travelGroupMembersEntity.getMemberId()));
        return true;
    }

    public List<PostDTO> getPosts(String groupId) {
        List<PostsEntity> getPosts = postsRepository.findByGroupId(groupId);
        List<PostDTO> posts = getPosts.stream().map(e -> {
            TravelGroupMembersEntity travelGroupMembersEntity = travelGroupMembersRepository.findByMemberId(e.getMemberId()).orElse(null);
            UserEntity userEntity = userRepository.findById(travelGroupMembersEntity.getUserId()).orElse(null); 
            return PostDTO.of(e, userEntity.getUsername());
        }).collect(Collectors.toList());
        return posts;
    }
}
