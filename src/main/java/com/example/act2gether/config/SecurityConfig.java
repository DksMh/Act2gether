package com.example.act2gether.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
     // 1. 비밀번호 암호화를 위한 Bean 등록
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // 테스트용 평문 비밀번호 (주석 해제)
    // @Bean
    // @SuppressWarnings("deprecation")
    // public PasswordEncoder passwordEncoder() {
    //     return NoOpPasswordEncoder.getInstance();
    // }
    
    // 2. Spring Security 필터 체인 설정 (작업 필요)
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/users/**", "/login", "/signup", "/css/**", "/js/**", "/onboarding").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/dummy-login") // 사용자 정의 로그인 페이지 (GET)
                .loginProcessingUrl("/users/login") // 실제 로그인 요청 처리 URL (POST)
                .usernameParameter("email") // ★ 프론트에서 email 파라미터로 보낼 경우 필요
                .successHandler((request, response, authentication) -> {
                    response.setStatus(HttpServletResponse.SC_OK); // 200 OK 반환
                })
                .failureHandler((request, response, exception) -> {
                    // System.out.println("로그인 실패 원인: " + exception.getMessage());
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401 반환
                    response.getWriter().write("로그인 실패: " + exception.getMessage());
                })
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/")
            );

        return http.build();
    }
}
