package com.example.act2gether.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "travel_group_applications")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelGroupApplicationsEntity {
    @Id
    private String application_id;
    private String group_id; 
    private String applicant_user_id; 
    private String application_message;
    private String status;
    private String applied_at;
    private String processed_at;
}
