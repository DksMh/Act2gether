package com.example.act2gether.dto;

import com.example.act2gether.entity.TravelGroupMembersEntity;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TravelGroupMembersDTO {
    private String memberId;
    private String groupId; 
    private String userId; 
    private String memberType;
    private String joinedAt;

    public static TravelGroupMembersDTO of (TravelGroupMembersEntity travelGroupMembersEntity){
        return TravelGroupMembersDTO.builder()
        .groupId(travelGroupMembersEntity.getGroupId())
        .userId(travelGroupMembersEntity.getUserId())
        .memberId(travelGroupMembersEntity.getMemberId())
        .memberType(travelGroupMembersEntity.getMemberType())
        .joinedAt(travelGroupMembersEntity.getJoinedAt())
        .build();
    }
}
