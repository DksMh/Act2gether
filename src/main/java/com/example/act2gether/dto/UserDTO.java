package com.example.act2gether.dto;

import lombok.Data;

@Data
public class UserDTO {
    private String user_id; //uuid
    private String username; //사용자이름
    private String password;
    private String gender;
    private int age;
    private String phone_number;
    private String health_status;
    private String interests;
    private String status;
    private String created_at;
    private String updated_at;
    private String email;
}
