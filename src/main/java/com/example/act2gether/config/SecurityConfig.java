package com.example.act2gether.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

@Configuration
@EnableWebSecurity
@Slf4j
public class SecurityConfig {

    @Autowired
    private UserRepository userRepository;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/", "/login", "/signup", "/forgot-loginfo", "/users/**", "/onboarding",
                                "/qna", "/faq", "tour-search")
                        .permitAll()
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/uploads/**").permitAll()
                        .requestMatchers("/qna/api/inquiry-types", "/qna/api/statuses").permitAll()
                        .anyRequest().authenticated())
                .formLogin(form -> form
                        .loginPage("/login")
                        .loginProcessingUrl("/users/login")
                        .usernameParameter("email")
                        .passwordParameter("password")
                        .failureUrl("/login?error=true")
                        .successHandler((request, response, authentication) -> {
                            log.info("=== 로그인 성공 핸들러 시작 ===");

                            String userid = authentication.getName(); // userid 반환
                            log.info("Authentication에서 가져온 userid: {}", userid);

                            try {
                                // userid로 사용자 정보 조회
                                UserEntity userEntity = userRepository.findById(userid).orElse(null);

                                if (userEntity != null) {
                                    // 세션에 사용자 정보 저장
                                    request.getSession().setAttribute("userid", userEntity.getUser_id());
                                    request.getSession().setAttribute("user_role", userEntity.getUser_role());
                                    request.getSession().setAttribute("email", userEntity.getEmail());
                                    request.getSession().setAttribute("username", userEntity.getUsername());
                                    request.getSession().setAttribute("isAuthenticated", true);

                                    log.info("=== 세션에 저장된 정보 ===");
                                    log.info("- userid: " + userEntity.getUser_id());
                                    log.info("- email: " + userEntity.getEmail());
                                    log.info("- username: " + userEntity.getUsername());
                                    log.info("- user_role: " + userEntity.getUser_role());
                                    log.info("- isAuthenticated: true");
                                } else {
                                    log.info("사용자 정보를 찾을 수 없음: " + userid);
                                }
                            } catch (Exception e) {
                                log.error("사용자 정보 조회 중 오류", e);
                            }

                            log.info("=== 로그인 성공 핸들러 종료 ===");
                            response.sendRedirect("/");
                        })
                        .failureHandler((request, response, exception) -> {
                            log.info("로그인 실패 원인: {}", exception.getMessage());
                            response.sendRedirect("/login?error=true");
                        })
                        .permitAll())
                .logout(logout -> logout
                        .logoutUrl("/users/logout")
                        .logoutSuccessUrl("/login?logout=true")
                        .deleteCookies("JSESSIONID")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .permitAll());

        return http.build();
    }
}