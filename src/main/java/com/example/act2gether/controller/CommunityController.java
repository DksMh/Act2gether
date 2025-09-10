package com.example.act2gether.controller;

import java.util.List;
import java.util.Map;

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

    @PostMapping(
        path = "/posts/update",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<?> updatePost(
            @RequestParam String postId,
            @RequestParam String content,
            @RequestParam(value = "removeImageIds", required = false) List<String> removeImageIds,
            @RequestPart(value = "images", required = false) List<MultipartFile> images
    ) {
        var res = communityService.updatePost(postId, content, removeImageIds, images);
        if (!res.success()) {
            return ResponseEntity.badRequest().body(res.message());
        }
        return ResponseEntity.ok(Map.of(
                "postId", postId,
                "content", res.content(),
                "pictures", res.pictures()          // 최종 이미지 URL 목록
        ));
    }

    //posts의 postlikes 컬럼만 저장
     @PostMapping("/post/count")
    public ResponseEntity<?> postCount(@RequestBody PostDTO postDTO) {
        boolean isSave = communityService.saveCount(postDTO);
        if(!isSave){
            return ResponseEntity.badRequest().body("좋아요 저장 실패했습니다.");
        }

        return ResponseEntity.ok("좋아요 저장 성공했습니다.");
    }

    //post-like테이블 저장
     @PostMapping("/post/like")
    public ResponseEntity<?> postLike(@RequestBody PostDTO postDTO) {
        boolean isSave = communityService.savePostLike(postDTO);
        if(!isSave){
            return ResponseEntity.badRequest().body("좋아요 정보 저장 실패했습니다.");
        }

        return ResponseEntity.ok("좋아요 정보 저장 성공했습니다.");
    }

     //post-like테이블 로그인 한 사람이 좋아요 눌렀는 지 안눌렀는지 응답 전송
     @PostMapping("/post/likeInfo")
    public ResponseEntity<?> isPostLikeByUser(@RequestBody PostDTO postDTO) {
        boolean isPostLikeByUser = communityService.isPostLikeByUser(postDTO);

        return ResponseEntity.ok(isPostLikeByUser);
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
