package com.example.act2gether.controller;

import java.util.HashMap;
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

import com.example.act2gether.dto.EmailDTO;
import com.example.act2gether.dto.FindEmailDTO;
import com.example.act2gether.dto.ResetPasswordDTO;
import com.example.act2gether.dto.UserDTO;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.dto.UserDTO;
import com.example.act2gether.service.LoginService;

import jakarta.servlet.http.HttpServletRequest;
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
            log.info("[만료] 인증번호 삭제됨: {}", email);
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
    @PostMapping("/verifyCode")
    public ResponseEntity<String> verifyCode(@RequestBody EmailDTO emailDto) {
        String storedCode = authCodes.get(emailDto.getEmail());
        if (storedCode != null && storedCode.equals(emailDto.getCode())) {
            return ResponseEntity.ok("인증 성공");
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("인증 실패: 코드 불일치 또는 만료됨");
    }
    
    // 이메일 중복체크
    @PostMapping("/checkEmail")
    public ResponseEntity<?> checkEmailDuplicate(@RequestBody String email) {
        boolean exists = loginService.isEmailExists(email); // LoginService 통해서 체크
        
        Map<String, Object> response = new HashMap<>();
        response.put("exists", exists);
        response.put("message", exists ? "이미 가입된 이메일입니다." : "사용 가능한 이메일입니다.");
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/create") 
    public ResponseEntity<?> createUser(@RequestBody UserDTO userDTO, HttpServletRequest request) {
        try {
            String userId = loginService.createUser(userDTO); // UUID 반환받음
            
            // 세션에는 둘 다 저장 (호환성)
            request.getSession().setAttribute("userid", userId);    // UUID
            request.getSession().setAttribute("email", userDTO.getEmail()); // 이메일
            request.getSession().setAttribute("username", userDTO.getUsername());
            request.getSession().setAttribute("isAuthenticated", true);
            
            return ResponseEntity.ok("회원가입이 완료되었습니다.");
        } catch (RuntimeException e) {
            if (e.getMessage().contains("이미 가입된 이메일")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("회원가입에 실패했습니다.");
        }
    }

    // 관심사 정보 담기
    @PostMapping("/interests")
    public ResponseEntity<?> updateInterests(@RequestBody Map<String, Object> interests, HttpServletRequest request) {
        String email = (String) request.getSession().getAttribute("email"); // 기존 방식 유지
        
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        
        try {
            loginService.updateUserInterests(email, interests); // 기존 메서드 사용
            return ResponseEntity.ok("관심사가 저장되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("관심사 저장에 실패했습니다.");
        }
    }

    @PostMapping("/findEmail")
    public ResponseEntity<?> findEmail(@RequestBody FindEmailDTO findEmailDTO) {
        UserEntity user = loginService.findEmail(findEmailDTO);

        if (user != null) {
            return ResponseEntity.ok(Map.of("email", user.getEmail()));
        }
        return ResponseEntity.badRequest().body("일치하는 계정을 찾을 수 없습니다.");
    }

    @PostMapping("/resetPassword")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordDTO resetPasswordDTO) {
        boolean isReset = loginService.resetPassword(resetPasswordDTO);
        if(isReset){
            return ResponseEntity.ok("비밀번호가 성공적으로 변경되었습니다.");
        }else {
            return ResponseEntity.badRequest().body("사용자를 찾을 수 없습니다.");
        }
    }
    
}