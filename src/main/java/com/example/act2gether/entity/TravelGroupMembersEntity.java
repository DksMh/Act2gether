package com.example.act2gether.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "travel_group_members")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelGroupMembersEntity {
     @Id
    private String member_id;
    private String group_id; 
    private String user_id; 
    private String member_type;
    private String joined_at;
}
