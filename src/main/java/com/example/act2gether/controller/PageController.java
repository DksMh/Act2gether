package com.example.act2gether.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.ResponseBody;

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
                String userid = authentication.getName();
                log.info("Authentication에서 가져온 userid: {}", userid);

                UserEntity userEntity = userRepository.findById(userid).orElse(null);

                if (userEntity != null) {
                    // 모델에 사용자 정보 설정 -> 페이지 최초 렌더링 시점에만 사용 가능
                    model.addAttribute("isAuthenticated", true);
                    model.addAttribute("userid", userEntity.getUserId());
                    model.addAttribute("user_role", userEntity.getUserRole());
                    model.addAttribute("email", userEntity.getEmail());
                    model.addAttribute("username", userEntity.getUsername());

                    // 🎯 세션에도 저장 추가
                    session.setAttribute("userid", userEntity.getUserId());
                    session.setAttribute("username", userEntity.getUsername());
                    session.setAttribute("email", userEntity.getEmail());
                    session.setAttribute("user_role", userEntity.getUserRole());

                    boolean isAdmin = "ADMIN".equals(userEntity.getUserRole());
                    model.addAttribute("isAdmin", isAdmin);
                    session.setAttribute("isAdmin", isAdmin);

                    log.info("=== 사용자 정보 설정 완료 (세션 포함) ===");
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

            // 🎯 세션 정리
            session.removeAttribute("userid");
            session.removeAttribute("username");
            session.removeAttribute("email");
            session.removeAttribute("user_role");
            session.removeAttribute("isAdmin");
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

    // API 엔드포인트가 없어서 JS가 사용자 정보를 가져올 방법이 없음 -> 새로운 API 엔드포인트 추가
    @GetMapping("/api/current-user")
    @ResponseBody
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        String userid = (String) session.getAttribute("userid");

        if (userid == null) {
            return ResponseEntity.ok(Map.of("isAuthenticated", false));
        }

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("isAuthenticated", true);
        userInfo.put("userid", userid);
        userInfo.put("username", session.getAttribute("username"));
        userInfo.put("email", session.getAttribute("email"));
        userInfo.put("userRole", session.getAttribute("user_role"));
        userInfo.put("isAdmin", session.getAttribute("isAdmin"));

        return ResponseEntity.ok(userInfo);
    }

    @GetMapping("/tour-search")
    public String tourSearchPage() {
        return "tour-search";
    }

    @GetMapping("/tour-detail")
    public String tourDetailPage() {
        return "tour-detail";
    }

    @GetMapping("/community-search")
    public String communitySearchPage() {
        return "community-search";
    }

    @GetMapping("/community")
    public String tourCommunityPage() {
        return "community";
    }

    @GetMapping("/mypage")
    public String myPage() {
        return "mypage";
    }

    @GetMapping("/guide")
    public String guide() {
        return "guide";
    }

    @GetMapping("/brand-story")
    public String brandStory() {
        return "brand-story";
    }
    // 메인 페이지 수정사항
    // @GetMapping(value = { "/" })
    // public String main() {
    // return "main";
    // }

}