package com.example.act2gether.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "tours")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ToursEntity {
    @Id
    @Column(name = "tour_id", length = 50)
    private String tourId;

    @Column(name = "created_at", length = 30)
    private String createdAt;

    @Column(name = "updated_at", length = 30)
    private String updatedAt;

    @Column(name = "region", length = 20)
    private String region; // 한국관광공사 지역코드 (1,2,3 등)

    @Column(name = "url", columnDefinition = "TEXT")
    private String url;

    @Column(name = "`tour_explain`", length = 255)
    private String tourExplain;
}