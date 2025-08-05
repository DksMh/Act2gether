package com.example.act2gether.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationsEntity {
     @Id
    private String notification_id; 
    private String receivcer_user_id;
    private String sender_user_id; 
    private String post_id; 
    private String group_id; 
    private String notification_type; 
    private String message; 
    private boolean is_read; 
    private boolean is_enabled; 
    private String created_at;
}
