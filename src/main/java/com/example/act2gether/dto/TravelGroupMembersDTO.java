package com.example.act2gether.dto;

import com.example.act2gether.entity.TravelGroupMembersEntity;
import com.example.act2gether.entity.UserEntity;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TravelGroupMembersDTO {
    private String memberId;
    private String groupId; 
    private String userId; 
    private String memberType; //role
    private String joinedAt;

    private String username;


    public static TravelGroupMembersDTO of (TravelGroupMembersEntity tgEntity, UserEntity userEntity){
        return TravelGroupMembersDTO.builder()
        .groupId(tgEntity.getGroupId())
        .userId(tgEntity.getUserId())
        .memberId(tgEntity.getMemberId())
        .memberType(tgEntity.getMemberType())
        .joinedAt(tgEntity.getJoinedAt())
        .username(userEntity.getUsername())
        .build();
    }
}
