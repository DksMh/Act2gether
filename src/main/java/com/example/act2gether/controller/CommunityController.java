package com.example.act2gether.controller;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.act2gether.dto.CommentCreateRequest;
import com.example.act2gether.dto.CommentResponse;
import com.example.act2gether.dto.CommentUpdateRequest;
import com.example.act2gether.dto.GroupMetaResponse;
import com.example.act2gether.dto.IdListReq;
import com.example.act2gether.dto.MembersDTO;
import com.example.act2gether.dto.PostDTO;
import com.example.act2gether.dto.ResetPasswordDTO;
import com.example.act2gether.dto.TravelGroupDto;
import com.example.act2gether.dto.TravelGroupMembersDTO;
import com.example.act2gether.entity.PostsEntity;
import com.example.act2gether.entity.TravelGroupsEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.service.CommunityService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;


@RestController
@RequestMapping("/community")
@RequiredArgsConstructor
@Slf4j
public class CommunityController {
    @Autowired
    private CommunityService communityService;

    /** 모달 카드에 뿌릴 그룹 상세 조회 */
    @PostMapping("/groups/lookup")
    public List<TravelGroupsEntity> lookup(@RequestBody IdListReq req) {
        if (req == null || req.ids() == null || req.ids().isEmpty()) return List.of();

        return communityService.findByIds(req.ids());
    }

    // 가입 여부 확인
    @GetMapping("/member/me")
    public Map<String, Object> isMyMember(@RequestParam String groupId, Principal principal) {
        String username = principal != null ? principal.getName() : null;
        log.info("username : {}", username);
        boolean member = (username != null) && communityService.existsByGroupIdAndUsername(groupId, username);
        return Map.of("member", member);
    }

    @GetMapping("/search")
    public List<TravelGroupDto> search(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end,
            @RequestParam(required = false, defaultValue = "false") boolean all
    ) {
        if (all) {
            return communityService.findAllRecent();
        }
        return communityService.search(from, to, start, end);
    }

    @GetMapping("/gathering/{region}")
    public ResponseEntity<?> getMembers(@PathVariable("region") String region) {
        List<TravelGroupsEntity> travelgroups = communityService.getGathering(region);
        return ResponseEntity.ok(travelgroups);
    }

    @PostMapping("/members")
    public ResponseEntity<?> getMembers(@RequestBody MembersDTO membersDTO) {

        List<TravelGroupMembersDTO> travelGroupMembersDTO = communityService.getMembers(membersDTO.getGroupId());

        return ResponseEntity.ok(travelGroupMembersDTO);
    }

    @PostMapping("/only/member/save")
    public ResponseEntity<?> setOnlyMembers(@RequestBody MembersDTO membersDTO) {
        communityService.saveOnlyMember(membersDTO);
        return ResponseEntity.ok().body("커뮤니티 가입 성공했습니다");
    }

    @PostMapping("/member/save")
    public ResponseEntity<?> setMembers(@RequestBody MembersDTO membersDTO) {
        boolean isSetMember = communityService.saveMember(membersDTO);
        if(!isSetMember){
            return ResponseEntity.badRequest().body("이미 가입된 커뮤니티입니다.");
        }
        return ResponseEntity.ok().body("커뮤니티 가입 성공했습니다");
    }

    @GetMapping("/groups")
    public ResponseEntity<?> getGroups(@RequestBody MembersDTO membersDTO) {
        List<TravelGroupsEntity> travelGroupsEntities = communityService.getGroups();
        return ResponseEntity.ok(travelGroupsEntities);
    }

    @GetMapping("/group/{groupId}/meta")
    public ResponseEntity<GroupMetaResponse> meta(@PathVariable String groupId) {
        return ResponseEntity.ok(communityService.getMeta(groupId));
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

    // 목록: GET /community/post/{postId}/comments?username=jsy2 (username은 선택, canEdit 계산용)
    @GetMapping("/post/{postId}/comments")
    public ResponseEntity<List<CommentResponse>> list(
            @PathVariable String postId,
            @RequestParam(required = false) String username
    ) {
        return ResponseEntity.ok(communityService.list(postId, username));
    }

    // 작성: POST /community/comment  (JSON: {postId, username, comment})
    @PostMapping(value = "/comment", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CommentResponse> add(@RequestBody CommentCreateRequest req) {
        return ResponseEntity.ok(communityService.add(req));
    }

    // 수정: PUT /community/comment/{commentId}  (JSON: {comment})
    @PutMapping(value = "/comment/{commentId}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CommentResponse> update(@PathVariable String commentId,
                                                  @RequestBody CommentUpdateRequest req) {
        return ResponseEntity.ok(communityService.update(commentId, req));
    }

    // 삭제: DELETE /community/comment/{commentId}
    @DeleteMapping("/comment/{commentId}")
    public ResponseEntity<Void> delete(@PathVariable String commentId) {
        communityService.delete(commentId);
        return ResponseEntity.ok().build();
    }

    //posts의 commentCount 컬럼만 저장
     @PostMapping("/post/commentCount")
    public ResponseEntity<?> postCommentCount(@RequestBody PostDTO postDTO) {
        boolean isSave = communityService.saveCommentCount(postDTO);
        if(!isSave){
            return ResponseEntity.badRequest().body("댓글 수 저장 실패했습니다.");
        }

        return ResponseEntity.ok("댓글 수 저장 성공했습니다.");
    }


    
}
