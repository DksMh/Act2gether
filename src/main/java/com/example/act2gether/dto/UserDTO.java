package com.example.act2gether.dto;

import java.util.List;
import java.util.Map;

import lombok.Data;

@Data
public class UserDTO {
    private String user_id; //uuid
    private String username; //사용자닉네임
    private String realname; //사용자이름
    private String password;
    private String gender;
    private String age;
    private String region;
    private String user_role;
    private String phone_number;
    private String health_status;
    private Map<String, List<String>> interests; 
    private String status;
    private String created_at;
    private String updated_at;
    private String email;
    private String agreement;
    private int failure_count;
    private String login_id;
    private String me;
}
