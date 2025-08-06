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
@Table(name = "travel_groups")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelGroupsEntity {
    @Id
    @Column(name = "group_id")
    private String groupId; 

    @Column(name = "tour_id")
    private String tourId;

    @Column(name = "tour_days_info")
    private String tourDaysInfo; 
    private String intro;

    @Column(name = "current_members")
    private int currentMembers;

    @Column(name = "max_members")
    private int maxMembers;

    @Column(name = "start_date")
    private String startDate;

    @Column(name = "end_date")
    private String endDate;

    @Column(name = "recruit_deadline")
    private String recruitDeadline;
    
    private String status;

    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "hidden_after_trip")
    private boolean hiddenAfterTrip;
}
