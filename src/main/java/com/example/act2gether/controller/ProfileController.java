package com.example.act2gether.controller;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import com.example.act2gether.dto.EmailDTO;
import com.example.act2gether.dto.ProfileDTO;
import com.example.act2gether.dto.TravelGroupCreateDTO;
import com.example.act2gether.dto.UserDTO;
import com.example.act2gether.dto.WithdrawDTO;
import com.example.act2gether.entity.TravelGroupsEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;
import com.example.act2gether.service.ProfileService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller 
@RequestMapping("/profile")
public class ProfileController {
    @Autowired
    private ProfileService profileService;
    @Autowired
    private UserRepository userRepository;


    @PostMapping("/user")
    public ResponseEntity<?> verifyCode(@RequestBody EmailDTO emailDto) {
        log.info("email : {}", emailDto.getEmail());
        // UserEntity userEntity = profileService.getProfile(emailDto.getEmail());
        ProfileDTO profileDto = profileService.getProfile(emailDto.getEmail());
        return ResponseEntity.status(HttpStatus.OK).body(profileDto);
    }

     @PostMapping("/user/username")
    public ResponseEntity<?> user(@RequestBody UserDTO userDTO) {
        UserEntity user = profileService.getProfileByUsername(userDTO.getUsername());
        return ResponseEntity.status(HttpStatus.OK).body(user);
    }

    // 업로드(대표 사진 변경)
    @PostMapping(path="/account/avatar", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAvatar(
            @RequestParam("username") String username,
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "파일이 비어 있습니다."));
        }

        String imageId = profileService.saveAvatar(username, file);

        // 프론트는 이 URL을 <img src>로 사용
        var user = userRepository.findByUsername(username).orElseThrow();
        String url = "/avatars/user/" + user.getUserId();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "imageId", imageId,
                "avatarUrl", url
        ));
    }

    // 아바타 조회(캐시 방지 쿼리스트링 사용 권장: ?v=timestamp)
    @GetMapping("/avatars/user/{username}")
    public ResponseEntity<byte[]> getAvatar(@PathVariable String username) {
        var avatar = profileService.getAvatarByUserId(username);
        if (avatar == null) {
            // 기본 이미지 제공(정적 리소스 경로에 파일을 두었다고 가정)
            // 필요하면 302로 default로 리다이렉트하거나, 투명 1x1 PNG 바이트 리턴해도 됨
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatar.getContentType()))
                .cacheControl(CacheControl.noCache().mustRevalidate())
                .body(avatar.getData());
    }

    @PostMapping("/updateNR")
    public ResponseEntity<?> updateNR(@RequestBody UserDTO userDTO) {
        log.info("me : {}", userDTO.getMe());
        UserEntity user = profileService.updateNR(userDTO.getUsername(), userDTO.getRegion(), userDTO.getMe());
        return ResponseEntity.status(HttpStatus.OK).body(user);
    }

    @GetMapping("/username")
    public ResponseEntity<?> getAllUserName() {
        List<String> usernames = profileService.getUserNames();
        return ResponseEntity.status(HttpStatus.OK).body(usernames);
    }

    @PostMapping("/password")
    public ResponseEntity<?> setPassword(@RequestBody UserDTO userDTO) {
        boolean password = profileService.setPassword(userDTO);
        if(!password){
            return ResponseEntity.badRequest().body("비밀번호를 잘못 입력했습니다.");
        }
        return ResponseEntity.status(HttpStatus.OK).body("비밀번호 변경 성공했습니다.");
    }

    @PostMapping("/policy")
    public ResponseEntity<?> setPolicy(@RequestBody UserDTO userDTO) {
        profileService.setPolicy(userDTO);
        
        return ResponseEntity.status(HttpStatus.OK).body("정책 업데이트에 성공했습니다.");
    }

    @PostMapping("/agreement")
    public ResponseEntity<?> getAgreement(@RequestBody UserDTO userDTO) {
        String user = profileService.getAgreement(userDTO);
        
        return ResponseEntity.status(HttpStatus.OK).body(user);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<?> withdraw(@RequestBody WithdrawDTO withdrawDTO) {
        profileService.withdraw(withdrawDTO);
        return ResponseEntity.status(HttpStatus.OK).body("회원 탈퇴에 성공했습니다.");
    }

    @PostMapping("/gathering")
    public ResponseEntity<?> withdraw(@RequestBody UserDTO userDTO) {
        List<TravelGroupsEntity> travelgroups = profileService.getTravelGroups(userDTO);
        return ResponseEntity.status(HttpStatus.OK).body(travelgroups);
    }
}


