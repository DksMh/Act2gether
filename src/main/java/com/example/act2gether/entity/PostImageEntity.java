package com.example.act2gether.entity;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "post_image")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostImageEntity {
    @Id 
    @Column(name = "image_id")
    private String imageId;

    @Column(name = "post_id")
    private String postId;

    private String filename;

    private String contentType;
    private long size;

    @Lob @Basic(fetch = FetchType.LAZY)
    private byte[] data;
}
