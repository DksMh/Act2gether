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
            .csrf(csrf -> csrf.disable()) // CSRF 비활성화 (필요시 활성화)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/signup", "/users/**", "/onboarding", "/qna", "/faq").permitAll() // "/qna", "/faq" 추가
                .requestMatchers("/css/**", "/js/**", "/images/**", "/uploads/**").permitAll() // 이미지 업로드 기능과 정적 이미지 파일 접근을 위해 필요
                .requestMatchers("/qna/api/inquiry-types", "/qna/api/statuses").permitAll()  //  QnA API 중 일부는 인증 불필요: 문의 유형, 상태 목록은 공개 정보이므로 누구나 조회 가능
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                //.loginPage("/dummy-login") // 사용자 정의 로그인 페이지 (GET) // 250730 비로그인자 qna접근 불가 리다이렉트되면서 팬딩
                .loginProcessingUrl("/users/login") // 실제 로그인 요청 처리 URL (POST)
                .usernameParameter("email") // ★ 프론트에서 email 파라미터로 보낼 경우 필요 // user_id ==> uuid 사용하므로 불필요
                .successHandler((request, response, authentication) -> {
                    // 추가: HttpSession에 사용자 정보 저장 (QnA 컨트롤러용)
                    // 이유: QnA 컨트롤러에서 HttpSession을 사용하므로 로그인 시 세션에 정보 저장
                    request.getSession().setAttribute("userId", authentication.getName());
                    // 사용자 권한도 세션에 저장 (관리자 권한 확인용)
                    String roles = authentication.getAuthorities().stream()
                        .map(auth -> auth.getAuthority())
                        .reduce("", (a, b) -> a + "," + b);
                    request.getSession().setAttribute("user_roles", roles);
                    
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
                .deleteCookies("JSESSIONID") // 로그아웃 시 세션 쿠키를 명시적으로 삭제
            );

        return http.build();
    }
}
