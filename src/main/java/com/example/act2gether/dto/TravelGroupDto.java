package com.example.act2gether.dto;

import java.time.LocalDate;

import com.example.act2gether.entity.TravelGroupsEntity;

import lombok.Data;

@Data
public class TravelGroupDto {
    private String groupId;
    private String intro;       // JSON 문자열
    private String startDate;
    private String endDate;
    private Integer maxMembers;
    private Integer currentMembers;

    public static TravelGroupDto from(TravelGroupsEntity e) {
        TravelGroupDto d = new TravelGroupDto();
        d.groupId = e.getGroupId();
        d.intro = e.getIntro();
        d.startDate = e.getStartDate();
        d.endDate = e.getEndDate();
        d.maxMembers = e.getMaxMembers();
        d.currentMembers = e.getCurrentMembers();
        return d;
    }
}
