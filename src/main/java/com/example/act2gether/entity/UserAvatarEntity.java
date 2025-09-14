package com.example.act2gether.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_avatar")
@Getter
@Setter
@NoArgsConstructor 
@AllArgsConstructor
@Builder
public class UserAvatarEntity {
    @Id
    @Column(name="image_id")
    private String imageId;

    @Column(name="user_id", nullable=false)
    private String userId;

    @Column(name="content_type", nullable=false)
    private String contentType;

    @Column(name="size_bytes", nullable=false)
    private long sizeBytes;

    @Lob @Basic(fetch = FetchType.LAZY)
    private byte[] data;

    @Column(name="created_at")
    private LocalDateTime createdAt;
}
