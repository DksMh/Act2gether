package com.example.act2gether.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.act2gether.dto.EmailDTO;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.service.ProfileService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller 
@RequestMapping("/profile")
public class ProfileController {
    @Autowired
    private ProfileService profileService;

    @PostMapping("/user")
    public ResponseEntity<?> verifyCode(@RequestBody EmailDTO emailDto) {
        log.info("email : {}", emailDto.getEmail());
        UserEntity userEntity = profileService.getProfile(emailDto.getEmail());
        return ResponseEntity.status(HttpStatus.OK).body(userEntity);
    }
}


