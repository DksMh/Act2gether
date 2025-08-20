package com.example.act2gether.service;

import java.util.List;

import org.springframework.stereotype.Component;

import com.example.act2gether.dto.ProfileDTO;
import com.example.act2gether.entity.ReviewsEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.ReviewsRepository;
import com.example.act2gether.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class ProfileService {
    private final UserRepository userRepository;
    private final ReviewsRepository reviewsRepository;

    public ProfileDTO getProfile(String email){
        UserEntity userEntity = userRepository.findByEmail(email).orElse(null);
        List<ReviewsEntity> reviewsEntity = reviewsRepository.findByUserId(userEntity.getUserId());
        ProfileDTO profileDto = ProfileDTO.setData(userEntity, reviewsEntity);
        
        return profileDto;
    }
}
