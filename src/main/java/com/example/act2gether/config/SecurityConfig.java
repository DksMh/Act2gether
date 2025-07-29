package com.example.act2gether.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
     // 1. 비밀번호 암호화를 위한 Bean 등록
    // @Bean
    // public PasswordEncoder passwordEncoder() {
    //     return new BCryptPasswordEncoder();
    // }

    // 테스트용 평문 비밀번호 (주석 해제)
    @Bean
    @SuppressWarnings("deprecation")
    public PasswordEncoder passwordEncoder() {
        return NoOpPasswordEncoder.getInstance();
    }
    
    // 2. Spring Security 필터 체인 설정 (작업 필요)
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // 필요 시 CSRF 비활성화
            .authorizeHttpRequests(auth -> auth
                // .requestMatchers("/","/users/**", "/login", "/signup", "/css/**", "/js/**", "/onboarding").permitAll() // 인증 없이 허용할 경로
                // 페이지 추가250729
                .requestMatchers("/","/users/**", "/login", "/signup", "/qna/**", "/css/**", "/js/**", "/onboarding", "/page/**", "/uploads/**").permitAll()
                .anyRequest().permitAll()  // 테스트용: 모든 요청 허용
                //.anyRequest().authenticated() // 나머지는 인증 필요
            )
            .formLogin(form -> form
                .loginPage("/login") // 사용자 정의 로그인 페이지 경로
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/")
            );

        return http.build();
    }
}
