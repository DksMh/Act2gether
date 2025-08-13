package com.example.act2gether.config;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import com.example.act2gether.dto.UserDTO;
import com.example.act2gether.entity.LoginAttemptsEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.LoginAttemsRepository;
import com.example.act2gether.repository.UserRepository;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class CustomLoginFailureHandler implements AuthenticationFailureHandler {

    private final UserRepository userRepository;
    private final LoginAttemsRepository loginAttemsRepository;
    private static final int MAX_FAIL_COUNT = 5; //로그인 시도 제한 횟수

    @Override
    @Transactional
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {
                String email = request.getParameter("email");
                UserEntity userEntity = userRepository.findByEmail(email).orElse(null);
                if(userEntity != null){
                    String userId = userEntity.getUserId();
                    log.info("userId : {}", userId);
                    LoginAttemptsEntity loginAttemptsEntity = loginAttemsRepository.findByUserId(userId).orElse(null);
                    if(loginAttemptsEntity != null){
                        //이미 시도한 흔적이 있는경우
                        int count = loginAttemptsEntity.getFailureCount();
                        if(count >= MAX_FAIL_COUNT){
                            log.error("5번 로그인 실패로 계정이 잠깁니다. 관리자에게 문의하세요.");
                            userEntity.setStatus("Lock");
                            response.sendRedirect("/login?locked=true"); // ★ 잠김 전용
                            return;
                        }
                        int nextCount = count + 1;
                        loginAttemptsEntity.setLoginFail(nextCount);
                    }else {
                        //처음 로그인 하는 경우
                        UserDTO userDTO = new UserDTO();
                        userDTO.setLogin_id(UUID.randomUUID().toString());
                        userDTO.setUser_id(userId);
                        userDTO.setFailure_count(1);
                        userDTO.setCreated_at(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
                        loginAttemsRepository.save(LoginAttemptsEntity.of(userDTO));
                    } 
                }
                
                log.info("로그인 실패 원인: {}", exception.getMessage());
                response.sendRedirect("/login?error=true");
        
    }
}
