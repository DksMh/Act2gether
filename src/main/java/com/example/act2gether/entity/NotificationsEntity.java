package com.example.act2gether.entity;

import jakarta.persistence.Column;
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
     @Column(name = "notification_id")
    private String notificationId; 

    @Column(name = "receivcer_user_id")
    private String receivcerUserId;

    @Column(name = "sender_user_id")
    private String senderUserId; 

    @Column(name = "post_id")
    private String postId; 

    @Column(name = "group_id")
    private String groupId; 

    @Column(name = "notification_type")
    private String notificationType; 
    private String message; 

    @Column(name = "is_read")
    private boolean isRead; 

    @Column(name = "is_enabled")
    private boolean isEnabled;
    
    @Column(name = "created_at")
    private String createdAt;
}
