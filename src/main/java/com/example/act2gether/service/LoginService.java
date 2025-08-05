package com.example.act2gether.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Random;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.example.act2gether.dto.FindEmailDTO;
import com.example.act2gether.dto.ResetPasswordDTO;
import com.example.act2gether.dto.UserDTO;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class LoginService {
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;

    // 수정
    public String createUser(UserDTO userDTO) {
        try {
            // 이메일 중복 체크 추가
            if (userRepository.findByEmail(userDTO.getEmail()).isPresent()) {
                throw new RuntimeException("이미 가입된 이메일입니다: " + userDTO.getEmail());
            }
            
            ObjectMapper objectMapper = new ObjectMapper();
            String interestsStr = objectMapper.writeValueAsString(userDTO.getInterests());
            
            // 비밀번호 암호화
            String encodedPassword = passwordEncoder.encode(userDTO.getPassword());
            userDTO.setPassword(encodedPassword);
            
            // UserEntity 생성 및 저장
            UserEntity savedUser = userRepository.save(UserEntity.of(userDTO, interestsStr));
            
            // 생성된 UUID 반환
            return savedUser.getUser_id();
            
        } catch (JsonProcessingException e) {
            throw new RuntimeException("사용자 생성 중 오류가 발생했습니다.");
        }
    }

    public void checkEmail(String code) {
        
    }
    // 이메일 중복 체크 메서드 추가
    public boolean isEmailExists(String email) {
        return userRepository.findByEmail(email).isPresent();
    }

    // 인증번호 생성 (6자리)
    public String generateCode() {
        return String.valueOf(100000 + new Random().nextInt(900000));
    }

    // 이메일 발송 메서드
    public void sendEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setFrom("whtndud98@gmail.com"); //바꿔야함 발신자 메일 정보
        message.setSubject("이메일 인증번호");
        message.setText("인증번호: " + code + "\n\n3분 이내에 입력해주세요.");
        mailSender.send(message);
    }

    // 관심사 업데이트 메서드 추가
    @Transactional
    public void updateUserInterests(String email, Map<String, Object> interests) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            String interestsJson = objectMapper.writeValueAsString(interests);
            String updatedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            userRepository.updateInterestsByEmail(email, interestsJson, updatedAt);
            
            log.info("사용자 관심사 업데이트 완료: {}", email);
            
        } catch (JsonProcessingException e) {
            log.error("관심사 JSON 변환 실패: {}", e.getMessage());
            throw new RuntimeException("관심사 처리 중 오류가 발생했습니다.");
        }
    }

    public UserEntity findEmail(FindEmailDTO findEmailDTO) {
        // realname + username으로 email 조회
        return userRepository.findByRealnameAndUsername(
            findEmailDTO.getName(),
            findEmailDTO.getUsername()
        ).orElse(null);
    }

    @Transactional
    public boolean resetPassword(ResetPasswordDTO resetPasswordDTO) {
        UserEntity user = userRepository.findByEmail(resetPasswordDTO.getEmail()).orElse(null);
        if(user != null){
            // 비밀번호 암호화 후 업데이트
            String encodedPassword = passwordEncoder.encode(resetPasswordDTO.getNewPassword());
            user.resetPassword(encodedPassword); 
            return true;
        }

        return false;
    }
 
}