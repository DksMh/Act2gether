package com.example.act2gether.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
public class PageController {
    //로그인
    @GetMapping(value = { "/login" })
	public String login() {
		return "login";
	}
    
    // 메인
	@GetMapping(value = { "/" })
	public String main() {
		return "main";
	}

    // qna
	@GetMapping(value = { "/page/qna" })
	public String getQna() {
		return "qna";
	}

    // faq
	@GetMapping(value = { "/page/faq" })
	public String getFaq() {
		return "faq";
	}
}
