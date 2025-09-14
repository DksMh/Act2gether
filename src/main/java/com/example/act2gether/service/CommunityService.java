package com.example.act2gether.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.example.act2gether.dto.CommentCreateRequest;
import com.example.act2gether.dto.CommentResponse;
import com.example.act2gether.dto.CommentUpdateRequest;
import com.example.act2gether.dto.GroupMetaResponse;
import com.example.act2gether.dto.PostDTO;
import com.example.act2gether.dto.TravelGroupMembersDTO;
import com.example.act2gether.entity.PostCommentEntity;
import com.example.act2gether.entity.PostImageEntity;
import com.example.act2gether.entity.PostLikesEntity;
import com.example.act2gether.entity.PostsEntity;
import com.example.act2gether.entity.TravelGroupMembersEntity;
import com.example.act2gether.entity.TravelGroupsEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.PostCommentRepository;
import com.example.act2gether.repository.PostImageRepository;
import com.example.act2gether.repository.PostLikesRepository;
import com.example.act2gether.repository.PostsRepository;
import com.example.act2gether.repository.TravelGroupMembersRepository;
import com.example.act2gether.repository.TravelGroupsRepository;
import com.example.act2gether.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;

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
    private final PostLikesRepository postLikesRepository;
    private final PostCommentRepository commentRepository;

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

    @Transactional
    public boolean saveCount(PostDTO postDTO) {
        PostsEntity postOpt = postsRepository.findById(postDTO.getPostId()).orElse(null);
        if (postOpt == null) {
            return false;
        }

        postOpt.saveLikesCount(postDTO.getLikesCount());
        
        return true;
    }

    @Transactional
    public boolean saveCommentCount(PostDTO postDTO) {
        PostsEntity postOpt = postsRepository.findById(postDTO.getPostId()).orElse(null);
        if (postOpt == null) {
            return false;
        }

        postOpt.saveCommentCount(postDTO.getCommentCount());
        
        return true;
    }

     @Transactional
    public boolean savePostLike(PostDTO postDTO) {
        // 1) 사용자/멤버 확인
        UserEntity user = userRepository.findByUsername(postDTO.getUsername()).orElse(null);
        if (user == null) return false;

        List<PostLikesEntity> entity = postLikesRepository.findByUserIdAndPostId(user.getUserId(), postDTO.getPostId());
        
        if(entity.size() == 0){
            log.info("좋아요 사용자 정보 저장했습니다.");
            postLikesRepository.save(PostLikesEntity.of(postDTO, user.getUserId()));
            return true;
        }else {
            log.info("좋아요 사용자 정보 삭제했습니다.");
            postLikesRepository.deleteById(entity.get(0).getLikeId()); //likeId
            return true;
        }

    }

     public boolean isPostLikeByUser(PostDTO postDTO) {
        // 1) 사용자/멤버 확인
        UserEntity user = userRepository.findByUsername(postDTO.getUsername()).orElse(null);
        if (user == null) return false;

        List<PostLikesEntity> entity = postLikesRepository.findByUserIdAndPostId(user.getUserId(), postDTO.getPostId());
        
        if(entity.size() == 0){
            log.info("좋아요 사용자 정보 없습니다");
            return false;
        }else {
            log.info("좋아요 사용자 정보 있습니다");
            return true;
        }
     }

     private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Transactional
    public UpdateResult updatePost(String postId,
                                   String newContent,
                                   List<String> removeImageIds,
                                   List<MultipartFile> images) {

        var postOpt = postsRepository.findById(postId);
        if (postOpt.isEmpty()) {
            return UpdateResult.fail("게시글을 찾을 수 없습니다.");
        }
        var post = postOpt.get();

        // 1) 본문 수정
        if (newContent != null) {
            post.setContent(newContent);
        }

        // 2) 이미지 삭제 (removeImageIds가 JSON 문자열 1개로 올 수도 있어 방어)
        List<String> toRemove = normalizeIdList(removeImageIds);
        if (!toRemove.isEmpty()) {
            // JPA 기본 메서드: 한 번에 삭제(성능 좋음)
            postImageRepository.deleteAllByIdInBatch(toRemove);
        }

        // 3) 이미지 추가 저장
        if (images != null) {
            for (MultipartFile img : images) {
                if (img == null || img.isEmpty()) continue;

                PostImageEntity pi = new PostImageEntity();
                pi.setImageId(UUID.randomUUID().toString());
                pi.setPostId(post.getPostId()); // String
                pi.setFilename(
                        Optional.ofNullable(img.getOriginalFilename()).orElse("image"));
                pi.setContentType(
                        Optional.ofNullable(img.getContentType()).orElse("application/octet-stream"));
                pi.setSize(img.getSize());
                try {
                    pi.setData(img.getBytes()); // LONGBLOB
                } catch (IOException e) {
                    throw new RuntimeException("이미지 읽기 실패", e);
                }
                postImageRepository.save(pi);
            }
        }

        // 4) 최종 pictures 재계산 (DB 기준으로 남은/추가된 모든 이미지 조회)
        List<String> finalUrls = postImageRepository.findByPostId(postId).stream()
                .map(ent -> "/attachments/" + ent.getImageId())
                .toList();

        post.setPictures(finalUrls); // JSON 컬럼/컨버터로 저장
        post.setUpdatedAt(LocalDateTime.now().format(TS));
        postsRepository.save(post);

        return UpdateResult.ok(post.getContent(), finalUrls);
    }

    // removeImageIds가 ["id1","id2"] 형태로 반복 파라미터 또는
    // ["[\"id1\",\"id2\"]"] 같은 JSON 문자열 한 개로 올 때를 모두 수용
    private List<String> normalizeIdList(List<String> removeImageIds) {
        if (removeImageIds == null || removeImageIds.isEmpty()) return List.of();
        if (removeImageIds.size() == 1) {
            String single = removeImageIds.get(0);
            if (single != null) {
                String s = single.trim();
                if (s.startsWith("[") && s.endsWith("]")) {
                    try {
                        // 간단 파서 (Jackson 사용 가능하면 ObjectMapper 사용)
                        s = s.substring(1, s.length() - 1); // [] 제거
                        if (s.isBlank()) return List.of();
                        return Arrays.stream(s.split(","))
                                .map(x -> x.replaceAll("^\\s*\"|\"\\s*$", "")) // 앞뒤 따옴표 제거
                                .filter(str -> !str.isBlank())
                                .toList();
                    } catch (Exception ignore) {}
                } else if (s.contains(",")) {
                    return Arrays.stream(s.split(","))
                            .map(String::trim).filter(str -> !str.isBlank()).toList();
                }
            }
        }
        return removeImageIds.stream().filter(Objects::nonNull).map(String::trim).filter(s->!s.isEmpty()).toList();
    }

    /* === 응답 DTO === */
    public record UpdateResult(boolean success, String message, String content, List<String> pictures) {
        static UpdateResult ok(String content, List<String> pictures) {
            return new UpdateResult(true, null, content, pictures);
        }
        static UpdateResult fail(String msg) {
            return new UpdateResult(false, msg, null, List.of());
        }
    }

    public List<CommentResponse> list(String postId, @Nullable String currentUsername) {
        String cur = currentUsername;
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(e -> {
                    String uname = userRepository.findById(e.getUserId())
                            .map(UserEntity::getUsername)
                            .orElse(null);
                    boolean canEdit = (cur != null && cur.equals(uname));
                    return new CommentResponse(
                            e.getCommentId(),
                            e.getPostId(),
                            uname,
                            e.getComment(),
                            e.getCreatedAt(),
                            canEdit
                    );
                })
                .toList();
    }

    @Transactional
    public CommentResponse add(CommentCreateRequest req) {
        if (req == null || req.postId() == null || req.username() == null || req.comment() == null || req.comment().isBlank()) {
            throw new IllegalArgumentException("invalid payload");
        }
        var user = userRepository.findByUsername(req.username())
                .orElseThrow(() -> new IllegalArgumentException("user not found"));

        var ent = PostCommentEntity.of(req.postId(), user.getUserId(), req.comment());
        var saved = commentRepository.save(ent);

        return new CommentResponse(
                saved.getCommentId(),
                saved.getPostId(),
                user.getUsername(),
                saved.getComment(),
                saved.getCreatedAt(),
                true
        );
    }

    @Transactional
    public CommentResponse update(String commentId, CommentUpdateRequest req) {
        if (req == null || req.comment() == null || req.comment().isBlank()) {
            throw new IllegalArgumentException("empty comment");
        }
        var ent = commentRepository.findById(commentId)
                .orElseThrow(() -> new NoSuchElementException("comment not found"));
        ent.setComment(req.comment());
        var saved = commentRepository.save(ent);

        String uname = userRepository.findById(saved.getUserId())
                .map(UserEntity::getUsername)
                .orElse(null);

        return new CommentResponse(
                saved.getCommentId(),
                saved.getPostId(),
                uname,
                saved.getComment(),
                saved.getCreatedAt(),
                true
        );
    }

    @Transactional
    public void delete(String commentId) {
        commentRepository.deleteById(commentId);
    }

    public GroupMetaResponse getMeta(String groupId) {
        var g = travelGroupsRepository.findById(groupId)
                .orElseThrow(() -> new NoSuchElementException("group not found"));

        long members = travelGroupMembersRepository.countByGroupId(groupId);
        String introJson = g.getIntro();          // e.g. {"title":"...","region":"서울","tags":["국내","여행"]}
        ObjectMapper om = new ObjectMapper();

        // 1) Map으로 읽기
        Map<String, Object> intro;
        try {
            intro = om.readValue(introJson, new TypeReference<>() {});
            String title = (String) intro.get("title");
            String description = (String) intro.get("description");
            String flexible = String.valueOf(intro.get("flexible"));
            String noLimit =  String.valueOf(intro.get("noLimit"));
            String departureRegion = (String) intro.get("departureRegion");
            String genderPolicy = (String) intro.get("genderPolicy");
            String s = g.getStartDate();
            String e = g.getEndDate();
            String schedule = (s != null && e != null) ? (s + "~" + e.substring(5)) // "YYYY.MM.DD~MM.DD"
                            : (s != null ? s : (e != null ? e : null));

            return new GroupMetaResponse(
                    g.getGroupId(),
                    title,
                    description,
                    departureRegion,
                    flexible,
                    noLimit,
                    s,
                    e,
                    schedule,
                    genderPolicy,
                    members
            );
        } catch (JsonMappingException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        } catch (JsonProcessingException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
        return null;
        
    }

}
