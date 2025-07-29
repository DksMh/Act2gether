package com.example.act2gether.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
public class PageController {
	// 로그인
	@GetMapping(value = { "/login" })
	public String login() {
		return "login";
	}

	// 메인
	@GetMapping(value = { "/" })
	public String main() {
		return "main";
	}

	// 관심사 온보딩 페이지
	@GetMapping("/onboarding")
	public String onboarding() {
		return "interestonboarding"; // interestonboarding.html을 반환
	}

	// qna
	// @GetMapping(value = { "/page/qna" })
	// public String getQna() {
	// 	return "qna";
	// }
	@GetMapping("/qna")
	public String qnaPage(HttpSession session, Model model) {
		Object userId = session.getAttribute("user_id");
		Object userRole = session.getAttribute("user_role");

		// 로그인 안 된 경우 로그인 페이지로 리다이렉트
		if (userId == null || userRole == null) {
				return "redirect:/login";
		}

		// 로그인된 경우 세션 정보를 모델에 담아 전달
		model.addAttribute("userId", userId);
		model.addAttribute("userRole", userRole);

		return "qna"; // qna.html 렌더링
	}

	// faq
	@GetMapping(value = { "/page/faq" })
	public String getFaq() {
		return "faq";
	}
}
