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
@Table(name = "tours")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ToursEntity {
    @Id
    @Column(name = "tour_id")
    private String tourId; //uuid

    @Column(name = "tour_code")
    private String tourCode;

    @Column(name = "tour_days")
    private String tourDays;
    
    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "updated_at")
    private String updatedAt;
}
