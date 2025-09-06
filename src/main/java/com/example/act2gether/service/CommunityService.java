package com.example.act2gether.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.example.act2gether.dto.PostDTO;
import com.example.act2gether.dto.TravelGroupMembersDTO;
import com.example.act2gether.entity.PostImageEntity;
import com.example.act2gether.entity.PostsEntity;
import com.example.act2gether.entity.TravelGroupMembersEntity;
import com.example.act2gether.entity.TravelGroupsEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.PostImageRepository;
import com.example.act2gether.repository.PostsRepository;
import com.example.act2gether.repository.TravelGroupMembersRepository;
import com.example.act2gether.repository.TravelGroupsRepository;
import com.example.act2gether.repository.UserRepository;

import jakarta.transaction.Transactional;
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
    private final PostImageRepository postImageRepository;

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

    // public boolean savePosts(PostDTO postDTO, List<MultipartFile> images) {
    //     UserEntity userEntity = userRepository.findByUsername(postDTO.getUsername()).orElse(null);
    //     if(userEntity == null){
    //         return false;
    //     }

    //     String userId = userEntity.getUserId();
    //     TravelGroupMembersEntity travelGroupMembersEntity = travelGroupMembersRepository.findByUserId(userId).orElse(null);
    //     if(travelGroupMembersEntity == null){
    //         return false;
    //     }

    //     postsRepository.save(PostsEntity.of(postDTO, travelGroupMembersEntity.getMemberId()));
    //     return true;
    // }

    @Transactional
    public boolean savePosts(PostDTO postDTO, List<MultipartFile> images) {
        // 1) 사용자/멤버 확인
        UserEntity user = userRepository.findByUsername(postDTO.getUsername()).orElse(null);
        if (user == null) return false;

        // (가능하면 userId + groupId 로 검증 권장)
        TravelGroupMembersEntity member = travelGroupMembersRepository
                .findByUserId(user.getUserId()).orElse(null);
        if (member == null) return false;

        // 2) 게시글 선 저장 → postId 확보
        PostsEntity post = PostsEntity.of(postDTO, member.getMemberId());
        post = postsRepository.save(post);

        // 3) 이미지 DB 저장 + 접근 URL 수집
        List<String> pictureUrls = new ArrayList<>();
        if (images != null) {
            for (MultipartFile img : images) {
                if (img == null || img.isEmpty()) continue;

                PostImageEntity pi = new PostImageEntity();
                pi.setImageId(UUID.randomUUID().toString());
                pi.setPostId(post.getPostId());  // String 타입 주의
                pi.setFilename(
                    Optional.ofNullable(img.getOriginalFilename()).orElse("image"));
                pi.setContentType(
                    Optional.ofNullable(img.getContentType()).orElse("application/octet-stream"));
                pi.setSize(img.getSize());
                try {
                    pi.setData(img.getBytes()); // 🔴 LONGBLOB 에 저장
                } catch (IOException e) {
                    throw new RuntimeException("이미지 읽기 실패", e);
                }
                PostImageEntity saved = postImageRepository.save(pi);

                // 이 URL은 다운로드 컨트롤러에서 서빙
                pictureUrls.add("/attachments/" + saved.getImageId());
            }
        }

        // 4) pictures JSON 리스트로 반영 + updatedAt 갱신
        if (!pictureUrls.isEmpty()) {
            post.setPictures(pictureUrls); // 컨버터가 JSON 문자열로 컬럼에 기록
        }
        post.setUpdatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        postsRepository.save(post); // update

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

    @Transactional
    public boolean deletePost(String postId) {
        var postOpt = postsRepository.findById(postId);
        if (postOpt.isEmpty()) {
            return false;
        }

        // 1) 이미지 먼저 삭제 (FK CASCADE가 있으면 이 줄은 생략 가능)
        int imagesDeleted = postImageRepository.deleteByPostId(postId);

        // 2) 게시글 삭제
        postsRepository.deleteById(postId);
        return true;
    }

}
