package com.example.act2gether.entity;

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
    private String login_id; //uuid
    private String user_id; //userUUID
    private int failure_count;
    private String create_time;
    private String update_time;
   
}
