package com.example.act2gether.entity;

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
    private String tour_id; //uuid
    private String tour_code;
    private String tour_days; 
    private String created_at;
    private String updated_at;
}
