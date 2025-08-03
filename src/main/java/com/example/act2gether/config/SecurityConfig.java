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

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
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
                .requestMatchers("/", "/login", "/signup", "/forgot-loginfo", "/users/**", "/onboarding", "/qna", "/faq").permitAll()
                .requestMatchers("/css/**", "/js/**", "/images/**", "/uploads/**").permitAll()
                .requestMatchers("/qna/api/inquiry-types", "/qna/api/statuses").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/users/login")
                .usernameParameter("email")
                .passwordParameter("password")
                .failureUrl("/login?error=true")
                .successHandler((request, response, authentication) -> {
                    System.out.println("=== 로그인 성공 핸들러 시작 ===");
                    
                    String userid = authentication.getName(); // userid 반환
                    System.out.println("Authentication에서 가져온 userid: " + userid);
                    
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
                            
                            System.out.println("=== 세션에 저장된 정보 ===");
                            System.out.println("- userid: " + userEntity.getUser_id());
                            System.out.println("- email: " + userEntity.getEmail());
                            System.out.println("- username: " + userEntity.getUsername());
                            System.out.println("- user_role: " + userEntity.getUser_role());
                            System.out.println("- isAuthenticated: true");
                        } else {
                            System.out.println("사용자 정보를 찾을 수 없음: " + userid);
                        }
                    } catch (Exception e) {
                        System.out.println("사용자 정보 조회 중 오류: " + e.getMessage());
                        e.printStackTrace();
                    }
                    
                    System.out.println("=== 로그인 성공 핸들러 종료 ===");
                    response.sendRedirect("/");
                })
                .failureHandler((request, response, exception) -> {
                    System.out.println("로그인 실패 원인: " + exception.getMessage());
                    response.sendRedirect("/login?error=true");
                })
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/users/logout")
                .logoutSuccessUrl("/login?logout=true")
                .deleteCookies("JSESSIONID")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .permitAll()
            );

        return http.build();
    }
}