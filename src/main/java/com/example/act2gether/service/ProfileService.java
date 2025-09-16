package com.example.act2gether.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.example.act2gether.dto.ProfileDTO;
import com.example.act2gether.dto.UserDTO;
import com.example.act2gether.entity.ReviewsEntity;
import com.example.act2gether.entity.UserAvatarEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.ReviewsRepository;
import com.example.act2gether.repository.UserAvatarRepository;
import com.example.act2gether.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class ProfileService {
    private final UserRepository userRepository;
    private final ReviewsRepository reviewsRepository;
    private final UserAvatarRepository avatarRepository;
    private final PasswordEncoder passwordEncoder;

    public ProfileDTO getProfile(String email){
        UserEntity userEntity = userRepository.findByEmail(email).orElse(null);
        List<ReviewsEntity> reviewsEntity = reviewsRepository.findByUserId(userEntity.getUserId());
        ProfileDTO profileDto = ProfileDTO.setData(userEntity, reviewsEntity);
        
        return profileDto;
    }

    @Transactional
    public String saveAvatar(String username, MultipartFile file) throws IOException {
        log.info("username: >>>> {}", username);
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 기존 아바타 삭제(최신 1개 정책)
        avatarRepository.deleteByUserId(user.getUserId());

        var entity = UserAvatarEntity.builder()
                .imageId(UUID.randomUUID().toString())
                .userId(user.getUserId())
                .contentType(Optional.ofNullable(file.getContentType()).orElse("application/octet-stream"))
                .sizeBytes(file.getSize())
                .data(file.getBytes())
                .createdAt(LocalDateTime.now())
                .build();

        avatarRepository.save(entity);
        return entity.getImageId();
    }

    public UserAvatarEntity getAvatarByUserId(String username) {
        UserEntity userEntity = userRepository.findByUsername(username).orElse(null);
        return avatarRepository.findFirstByUserIdOrderByCreatedAtDesc(userEntity.getUserId()).orElse(null);
    }

    @Transactional
    public UserEntity updateNR(String username, String region, String me) {
        UserEntity userEntity = userRepository.findByUsername(me).orElse(null);
        userEntity.setUsernameAndRegion(username, region);
        return userEntity;
    }

    public List<String> getUserNames() {
        List<String> usernames = userRepository.findAllUsernames();
        return usernames;
    }

    @Transactional
    public boolean setPassword(UserDTO userDTO) {
        UserEntity userEntity = userRepository.findByUsername(userDTO.getUsername()).orElse(null);
        if(!passwordEncoder.matches(userDTO.getRawPassword(), userEntity.getPassword())){
            return false;
        }
        userEntity.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        return true;
    }

    @Transactional
    public boolean setPolicy(UserDTO userDTO) {
        UserEntity userEntity = userRepository.findByUsername(userDTO.getUsername()).orElse(null);
        userEntity.setPolicy(userDTO.getAgreement());
        return true;
    }

    public String getAgreement(UserDTO userDTO) {
        UserEntity userEntity = userRepository.findByUsername(userDTO.getUsername()).orElse(null);
        return userEntity.getAgreement();
    }
}
