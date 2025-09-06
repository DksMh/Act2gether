package com.example.act2gether.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
import org.springframework.web.bind.annotation.RequestPart;


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

    @PostMapping(value = "/posts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> savePosts(
        // JSON 형태로 보내면 여기로 바인딩 (part name: "post")
        @RequestPart("post") PostDTO postDTO,
        // 이미지 첨부가 없으면 null 또는 빈 리스트로 들어옴
        @RequestPart(value = "images", required = false) List<MultipartFile> images
    ) {
        boolean ok = communityService.savePosts(postDTO, images);
        if (!ok) {
            return ResponseEntity.badRequest().body("게시물 저장에 실패했습니다.");
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/post/delete")
    public ResponseEntity<?> deletePost(@RequestBody PostDTO postDTO) {
        boolean isDelete = communityService.deletePost(postDTO.getPostId());
        if(!isDelete){
            return ResponseEntity.badRequest().body("게시글 삭제 실패했습니다.");
        }

        return ResponseEntity.ok("게시글이 삭제되었습니다.");
    }
    
}
