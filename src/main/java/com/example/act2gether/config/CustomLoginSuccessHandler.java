package com.example.act2gether.config;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

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
public class CustomLoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final LoginAttemsRepository loginAttemsRepository;

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

                log.info("=== 로그인 성공 핸들러 시작 ===");
                    
                String userid = authentication.getName(); // userid 반환
                log.info("Authentication에서 가져온 userid: {}", userid);
                
                // try {
                    // userid로 사용자 정보 조회
                    UserEntity userEntity = userRepository.findById(userid).orElse(null);
                    
                    if (userEntity != null) {
                        LoginAttemptsEntity loginAttemptsEntity = loginAttemsRepository.findByUserId(userEntity.getUserId()).orElse(null);

                        if(loginAttemptsEntity != null){
                            //로그인 횟수 초기화, 잠긴거 풀음
                            loginAttemptsEntity.setLoginFail(0);
                            userEntity.setStatus("Active");
                        }
                        // 세션에 사용자 정보 저장
                        request.getSession().setAttribute("userid", userEntity.getUserId());
                        request.getSession().setAttribute("user_role", userEntity.getUserRole());
                        request.getSession().setAttribute("email", userEntity.getEmail());
                        request.getSession().setAttribute("username", userEntity.getUsername());
                        request.getSession().setAttribute("isAuthenticated", true);
                        
                        log.info("=== 세션에 저장된 정보 ===");
                        log.info("- userid: " + userEntity.getUserId());
                        log.info("- email: " + userEntity.getEmail());
                        log.info("- username: " + userEntity.getUsername());
                        log.info("- user_role: " + userEntity.getUserRole());
                        log.info("- isAuthenticated: true");
                    } else {
                        log.info("사용자 정보를 찾을 수 없음: " + userid);
                    }
                // } catch (Exception e) {
                //     log.error("사용자 정보 조회 중 오류", e);
                // }
                
                log.info("=== 로그인 성공 핸들러 종료 ===");
                response.sendRedirect("/");
    }
}
