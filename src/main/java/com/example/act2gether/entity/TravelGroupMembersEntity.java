package com.example.act2gether.entity;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import com.example.act2gether.dto.MembersDTO;

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

    public static TravelGroupMembersEntity of(MembersDTO membersDTO) {
       return TravelGroupMembersEntity.builder()
            .memberId(UUID.randomUUID().toString())
            .groupId(membersDTO.getGroupId())
            .userId(membersDTO.getUserId())
            .memberType(membersDTO.getMemberType())
            .joinedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
            .build();
    }
}
