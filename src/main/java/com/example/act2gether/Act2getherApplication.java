package com.example.act2gether;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

@SpringBootApplication
public class Act2getherApplication extends SpringBootServletInitializer {

	// WAR 배포를 위한 configure 메소드 추가
	@Override
	protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
		return application.sources(Act2getherApplication.class);
	}

	// 기존 main 메소드는 그대로 유지 (로컬 테스트용)
	public static void main(String[] args) {
		SpringApplication.run(Act2getherApplication.class, args);
	}

}