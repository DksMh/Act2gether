package com.example.act2gether.entity;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import com.example.act2gether.dto.UserDTO;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "login_attempts")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginAttemptsEntity {
    @Id
    @Column(name = "login_id")
    private String loginId; //uuid

    @Column(name = "user_id")
    private String userId; //userUUID

    @Column(name = "failure_count")
    private int failureCount;

    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "updated_at")
    private String updatedAt;


    public void setLoginFail(int nextCount) {
        this.failureCount = nextCount;
        this.updatedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }


    public static LoginAttemptsEntity of(UserDTO userDTO) {
        return LoginAttemptsEntity.builder()
        .loginId(userDTO.getLogin_id())
        .userId(userDTO.getUser_id())
        .failureCount(userDTO.getFailure_count())
        .createdAt(userDTO.getCreated_at())
        .build();
    }
   
}
