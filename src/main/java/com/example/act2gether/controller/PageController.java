package com.example.act2gether.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;

import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;

import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
public class PageController {

    @Autowired
    private UserRepository userRepository;

    @ModelAttribute
    private void addAuthInfoToModel(HttpSession session, Model model) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        log.info("=== 인증 상태 확인 ===");

        boolean isAuthenticated = authentication != null &&
                authentication.isAuthenticated() &&
                !"anonymousUser".equals(authentication.getPrincipal());

        log.info("Spring Security 인증: {}", isAuthenticated);

        if (isAuthenticated) {
            try {
                String userid = authentication.getName(); // userid 반환
                log.info("Authentication에서 가져온 userid: {}", userid);

                // userid로 사용자 정보 조회
                UserEntity userEntity = userRepository.findById(userid).orElse(null);

                if (userEntity != null) {
                    // 모델에 사용자 정보 설정
                    model.addAttribute("isAuthenticated", true);
                    model.addAttribute("userid", userEntity.getUserId());
                    model.addAttribute("user_role", userEntity.getUserRole());
                    model.addAttribute("email", userEntity.getEmail());
                    model.addAttribute("username", userEntity.getUsername());

                    // 관리자 권한 확인
                    boolean isAdmin = "ADMIN".equals(userEntity.getUserRole());
                    model.addAttribute("isAdmin", isAdmin);

                    log.info("=== 사용자 정보 설정 완료 ===");
                    log.info("- userid: {}", userEntity.getUserId());
                    log.info("- email: {}", userEntity.getEmail());
                    log.info("- username: {}", userEntity.getUsername());
                    log.info("- user_role: {}", userEntity.getUserRole());
                    log.info("- isAdmin: {}", isAdmin);
                } else {
                    log.warn("사용자 정보를 찾을 수 없음: {}", userid);
                    model.addAttribute("isAuthenticated", false);
                    model.addAttribute("isAdmin", false);
                }
            } catch (Exception e) {
                log.error("사용자 정보 조회 중 오류: {}", e.getMessage(), e);
                model.addAttribute("isAuthenticated", false);
                model.addAttribute("isAdmin", false);
            }
        } else {
            log.info("비인증 상태");
            model.addAttribute("isAuthenticated", false);
            model.addAttribute("isAdmin", false);
        }
    }

    @GetMapping(value = { "/login" })
    public String login() {
        return "login";
    }

    @GetMapping("/signup")
    public String signup() {
        log.info("회원가입 페이지 요청");
        return "signup";
    }

    @GetMapping("/forgot-loginfo")
    public String forgotLoginInfoPage() {
        return "forgot-loginfo";
    }

    @GetMapping(value = { "/" })
    public String main() {
        return "main";
    }

    @GetMapping("/onboarding")
    public String onboarding() {
        return "interestonboarding";
    }

    @GetMapping("/qna")
    public String qnaPage() {
        return "qna";
    }

    @GetMapping(value = { "/faq" })
    public String getFaq() {
        return "faq";
    }

    @GetMapping("/tour-search")
    public String tourSearchPage() {
        return "tour-search";
    }

    @GetMapping("/community-search")
    public String communitySearchPage() {
        return "community-search";
    }

    @GetMapping("/tour-community")
    public String tourCommunityPage() {
        return "community";
    }

     @GetMapping("/mypage")
    public String myPage() {
        return "mypage";
    }
}