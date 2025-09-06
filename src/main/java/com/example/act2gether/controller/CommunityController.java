package com.example.act2gether.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.act2gether.dto.MembersDTO;
import com.example.act2gether.dto.PostDTO;
import com.example.act2gether.dto.ResetPasswordDTO;
import com.example.act2gether.dto.TravelGroupMembersDTO;
import com.example.act2gether.entity.PostsEntity;
import com.example.act2gether.entity.TravelGroupsEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.service.CommunityService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;


@RestController
@RequestMapping("/community")
@RequiredArgsConstructor
@Slf4j
public class CommunityController {
    @Autowired
    private CommunityService communityService;

    @PostMapping("/members")
    public ResponseEntity<?> getMembers(@RequestBody MembersDTO membersDTO) {

        List<TravelGroupMembersDTO> travelGroupMembersDTO = communityService.getMembers(membersDTO.getGroupId());

        return ResponseEntity.ok(travelGroupMembersDTO);
    }

    @GetMapping("/groups")
    public ResponseEntity<?> getGroups(@RequestBody MembersDTO membersDTO) {
        List<TravelGroupsEntity> travelGroupsEntities = communityService.getGroups();
        return ResponseEntity.ok(travelGroupsEntities);
    }

    @PostMapping("/all/posts")
    public ResponseEntity<?> getAllPosts(@RequestBody PostDTO postDTO) {
         List<PostDTO> postsEntities = communityService.getPosts(postDTO.getGroupId());

        return ResponseEntity.ok(postsEntities);
    }

    @PostMapping("/posts")
    public ResponseEntity<?> savePosts(@RequestBody PostDTO postDTO) {
        boolean isSuccessPost = communityService.savePosts(postDTO);
        if(!isSuccessPost){
            return ResponseEntity.badRequest().body("게시물 저장에 실패했습니다.");
        }

        return ResponseEntity.ok().build();
    }
    
}
