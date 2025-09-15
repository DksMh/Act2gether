package com.example.act2gether.dto;


import java.util.List;
import java.util.stream.Collectors;

import com.example.act2gether.entity.ReviewsEntity;
import com.example.act2gether.entity.UserEntity;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProfileDTO {
     private String user_id; //uuid
    private String username; //사용자닉네임
    private String realname; //사용자이름
    private String gender;
    private String age;
    private String region;
    private String user_role;
    private String phone_number;
    private String health_status;
    private String interests; 
    private String status;
    private String created_at;
    private String updated_at;
    private String email;
    private String login_id;
    private List<ReviewsDTO> reviews;


    public static ProfileDTO setData(UserEntity userEntity, List<ReviewsEntity> reviewsEntity) {
        List<ReviewsDTO> reviews = reviewsEntity.stream().map(ReviewsDTO::of).collect(Collectors.toList());
        
        return ProfileDTO.builder()
        .user_id(userEntity.getUserId())
        .username(userEntity.getUsername())
        .realname(userEntity.getRealname())
        .gender(userEntity.getGender())
        .age(userEntity.getAge())
        .region(userEntity.getRegion())
        .user_role(userEntity.getUserRole())
        .phone_number(userEntity.getPhoneNumber())
        .health_status(userEntity.getHealthStatus())
        .interests(userEntity.getInterests())
        .status(userEntity.getStatus())
        .email(userEntity.getEmail())
        .reviews(reviews)
        .build();
    }
}
