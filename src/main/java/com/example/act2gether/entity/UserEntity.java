package com.example.act2gether.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
public class UserEntity {
    @Id
    private String user_id;
    private String username;
    private String password;
    private String gender;
    private int age;
    private String email;
    private String phone_number;
    private String health_status;
    private String interests;
    private String status;
    private String created_at;
    private String updated_at;

}
