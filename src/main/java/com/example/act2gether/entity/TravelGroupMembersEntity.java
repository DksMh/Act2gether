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
@Table(name = "travel_group_members")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelGroupMembersEntity {
     @Id
     @Column(name = "member_id")
    private String memberId;

    @Column(name = "group_id")
    private String groupId; 

    @Column(name = "user_id")
    private String userId; 

    @Column(name = "member_type")
    private String memberType;

    @Column(name = "joined_at")
    private String joinedAt;
}
