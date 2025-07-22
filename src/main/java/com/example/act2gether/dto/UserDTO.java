package com.example.act2gether.dto;

import lombok.Data;

@Data
public class UserDTO {
    private String user_id;
    private String username;
    private String password;
    private String gender;
    private int age;
    private String phone_number;
    private String health_status;
    private String interests;
    private String status;
    private String created_at;
    private String updated_at;
}
