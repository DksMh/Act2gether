package com.example.act2gether.entity;

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
    private String group_id; 
    private String tour_id;
    private String tour_days_info; 
    private String intro;
    private int current_members;
    private int max_members;
    private String start_date;
    private String end_date;
    private String recruit_deadline;
    private String status;
    private String created_at;
    private boolean hidden_after_trip;
}
