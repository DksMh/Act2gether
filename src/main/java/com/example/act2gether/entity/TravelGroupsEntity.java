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
    private String groupId; // UUID 형식의 고유 ID

    @Column(name = "tour_id")
    private String tourId; // 연결된 투어 ID

    @Column(name = "tour_days_info")
    private String tourDaysInfo; // 여행 일수 (예: "4")

    @Column(columnDefinition = "JSON")
    private String intro; // 추가 정보 JSON (제목, 지역, 연령대 등)

    @Column(name = "current_members")
    private int currentMembers; // 현재 참여 인원

    @Column(name = "max_members")
    private int maxMembers; // 최대 인원

    @Column(name = "start_date")
    private String startDate; // 여행 시작일 (YYYY-MM-DD)

    @Column(name = "end_date")
    private String endDate; // 여행 종료일 (YYYY-MM-DD)

    @Column(name = "recruit_deadline")
    private String recruitDeadline; // 모집 마감일 (YYYY-MM-DD)

    private String status; // 모집 상태 (recruiting, closed 등)

    @Column(name = "created_at")
    private String createdAt; // 생성 일시

    @Column(name = "hidden_after_trip")
    private int hiddenAfterTrip; // 여행 후 숨김 여부 (0: 표시, 1: 숨김)
}
