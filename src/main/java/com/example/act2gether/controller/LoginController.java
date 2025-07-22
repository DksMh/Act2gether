package com.example.act2gether.controller;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.act2gether.dto.UserDTO;
import com.example.act2gether.service.LoginService;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@Slf4j
@Controller 
@RequestMapping("/users")
public class LoginController {
    @Autowired
    LoginService loginService;

    private final Map<String, String> authCodes = new ConcurrentHashMap<>();
    private final Map<String, ScheduledFuture<?>> cleanupTasks = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    

    @PostMapping("/sendCode")
    public ResponseEntity<?> sendCode(@RequestBody String email) {
         // 1. 기존 인증번호 및 타이머 제거
        authCodes.remove(email);
        ScheduledFuture<?> oldTask = cleanupTasks.remove(email);
        if (oldTask != null && !oldTask.isDone()) {
            oldTask.cancel(true);
        }

        // 2. 새 인증번호 생성
        String code = loginService.generateCode();
        authCodes.put(email, code);

        // 3. 인증번호 자동 만료 예약 (3분)
        ScheduledFuture<?> cleanup = scheduler.schedule(() -> {
            authCodes.remove(email);
            cleanupTasks.remove(email);
            System.out.println("[만료] 인증번호 삭제됨: " + email);
        }, 3, TimeUnit.MINUTES);
        cleanupTasks.put(email, cleanup);

        // 4. 이메일 발송
        loginService.sendEmail(email, code);

        return ResponseEntity.ok("인증번호가 이메일로 전송되었습니다.");
        // loginService.checkEmail(code); 
        // return ResponseEntity.ok().body(null);
    }   

    /**
     * 인증번호 확인
     */
    @PostMapping("/verify-code")
    public ResponseEntity<String> verifyCode(@RequestParam String email, @RequestParam String code) {
        String storedCode = authCodes.get(email);
        if (storedCode != null && storedCode.equals(code)) {
            return ResponseEntity.ok("인증 성공");
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("인증 실패: 코드 불일치 또는 만료됨");
    }

    @PostMapping("/create")
    public ResponseEntity<?> createUser(@RequestBody UserDTO userDTO) {
        loginService.createUser(userDTO);
        return ResponseEntity.ok().body(null);
    }


    
}
