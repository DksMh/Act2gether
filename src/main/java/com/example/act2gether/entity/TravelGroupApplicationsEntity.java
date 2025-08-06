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
@Table(name = "travel_group_applications")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelGroupApplicationsEntity {
    @Id
    @Column(name = "application_id")
    private String applicationId;

    @Column(name = "group_id")
    private String groupId; 

    @Column(name = "applicant_user_id")
    private String applicantUserId; 

    @Column(name = "application_message")
    private String applicationMessage;

    private String status;

    @Column(name = "applied_at")
    private String appliedAt;

    @Column(name = "processed_at")
    private String processedAt;
}
