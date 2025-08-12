package com.example.act2gether.service;

import org.springframework.stereotype.Component;

import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class ProfileService {
    private final UserRepository userRepository;

    public UserEntity getProfile(String email){
        return userRepository.findByEmail(email).orElse(null);
    }
}
