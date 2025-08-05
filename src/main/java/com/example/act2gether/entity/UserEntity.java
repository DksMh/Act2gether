package com.example.act2gether.entity;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
@Table(name = "users")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEntity {
    @Id
    private String user_id; //uuid
    private String username; //사용자 닉네임이 여기로 들어가서 닉네임
    private String realname; // 사용자 이름
    private String password;
    private String gender;
    private String age;
    private String regin;
    private String user_role;
    private String phone_number;
    private String health_status;
    private String interests; 
    private String status;
    private String created_at;
    private String updated_at;
    private String email;
    private String agreement;

    public static UserEntity of (UserDTO userDTO, String interests){
        return UserEntity.builder()
        .user_id(UUID.randomUUID().toString())
        .username(userDTO.getUsername())
        .realname(userDTO.getRealname())
        .password(userDTO.getPassword())
        .gender(userDTO.getGender())
        .age(userDTO.getAge())
        .regin(userDTO.getRegin())
        .user_role("USER")// 기본값은 null대신 user로 줌
        .phone_number(null)
        .interests(interests)
        .status("Active")
        .created_at(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
        .email(userDTO.getEmail())
        .agreement(userDTO.getAgreement())
        .build();
    }

    public void resetPassword(String encodedPassword) {
       this.password = encodedPassword;
    }

}
