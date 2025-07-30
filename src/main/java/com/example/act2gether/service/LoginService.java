package com.example.act2gether.service;

import java.util.Random;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.example.act2gether.dto.UserDTO;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class LoginService {
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;

    public void createUser(UserDTO userDTO){
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            String interestsStr = objectMapper.writeValueAsString(userDTO.getInterests());
            // 비밀번호 암호화
            String encodedPassword = passwordEncoder.encode(userDTO.getPassword());
            userDTO.setPassword(encodedPassword);
            userRepository.save(UserEntity.of(userDTO, interestsStr));
        } catch (JsonProcessingException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
        
    }

    public void checkEmail(String code) {
        
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

    // public boolean verifyLogin(UserDTO userDTO) {
    //     UserEntity userEntity = userRepository.findByEmail(userDTO.getEmail()).orElse(null);
    //     if(userEntity != null){
    //         String userPw = userEntity.getPassword();
    //         // if(userPw.equals(userDTO.getPassword())){
    //         //     return true;
    //         // }

    //         if (passwordEncoder.matches(userDTO.getPassword(), userPw)) {
    //             // 로그인 성공
    //             return true;
    //         } 
    //     }
    //     return false;
    // }
}
