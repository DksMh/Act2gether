package com.example.act2gether.entity;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEntity {
    @Id
    @Column(name = "user_id")
    private String userId; //uuid
    
    private String username; //사용자 닉네임이 여기로 들어가서 닉네임
    private String realname; // 사용자 이름
    private String password;
    private String gender;
    private String age;
    private String region;

    @Column(name = "user_role")
    private String userRole;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "health_status")
    private String healthStatus;
    private String interests; 
    @Setter
    private String status;

    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "updated_at")
    private String updatedAt;
    private String email;
    private String agreement;

    public static UserEntity of (UserDTO userDTO, String interests){
        return UserEntity.builder()
        .userId(UUID.randomUUID().toString())
        .username(userDTO.getUsername())
        .realname(userDTO.getRealname())
        .password(userDTO.getPassword())
        .gender(userDTO.getGender())
        .age(userDTO.getAge())
        .region(userDTO.getRegion())
        .userRole("USER")// 기본값은 null대신 user로 줌
        .phoneNumber(null)
        .interests(interests)
        .status("Active")
        .createdAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
        .email(userDTO.getEmail())
        .agreement(userDTO.getAgreement())
        .build();
    }

    public void resetPassword(String encodedPassword) {
       this.password = encodedPassword;
    }

    public void updateInterestsByEmail(String interestsJson, String updatedAt2) {
        this.interests = interestsJson;
        this.updatedAt = updatedAt2;
    }

    public void setUsernameAndRegion(String username2, String region2) {
        this.username = username2;
        this.region = region2;
    }

    public void setPassword(String password2) {
        this.password = password2;
    }

    public void setPolicy(String agreement2) {
        this.agreement = agreement2;
    }

}
