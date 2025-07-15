package com.example.act2gether;

import java.sql.Connection;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DbConnectionCheck implements CommandLineRunner {

    @Autowired
    private DataSource dataSource;

    @Override //test용,,, 없어질 코드
    public void run(String... args) throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            System.out.println("✅ DB 연결 성공: " + conn.getMetaData().getURL());
        } catch (Exception e) {
            System.out.println("❌ DB 연결 실패:");
            e.printStackTrace();
        }
    }
}