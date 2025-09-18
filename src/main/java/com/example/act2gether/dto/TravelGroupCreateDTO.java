package com.example.act2gether.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 여행 그룹 생성 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelGroupCreateDTO {
  private String spot; //여행 지역
  private String groupId;
  private String tourId; // 투어 ID (필수)
  private String groupName; // 모임 이름/제목 (필수, 10자 이상)
  private String startDate; // 여행 시작일 (필수, YYYY-MM-DD)
  private String endDate; // 여행 종료일 (필수, YYYY-MM-DD)
  private int maxMembers; // 최대 인원 (필수, 2-10명)
  private String departureRegion; // 출발 지역 (필수)
  private Integer birthYearStart; // 모집 출생연도 시작 (선택)
  private Integer birthYearEnd; // 모집 출생연도 끝 (선택)
  private String genderLimit; // 성별 제한 (all/male/female)
  private String description; // 모임 설명 (선택)
  private boolean flexible; // 날짜 조율 가능 여부
  private boolean hiddenAfterTrip; // 여행 후 숨김 여부
  private String recruitDeadline; // 모집 마감일 (선택, YYYY-MM-DD)
}