package com.example.act2gether.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    // 이미지 파일올리기 관리 uploads 다음에 각자의 폴더 생성 위치 만들기
    // 예시) uploads/user -> 유저 이미지
    // uploads/qna -> 게시판 이미지
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}