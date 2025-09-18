package com.example.act2gether.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.act2gether.dto.TravelGroupCreateDTO;
import com.example.act2gether.entity.TravelGroupsEntity;
import com.example.act2gether.repository.TravelGroupsRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 여행 그룹 관리 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TravelGroupsService {

  private final TravelGroupsRepository travelGroupsRepository;
  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * 여행 그룹 생성
   * 
   * @param dto    생성 요청 데이터
   * @param userId 생성자 ID
   * @return 생성된 그룹 ID
   */
  @Transactional
  public String createTravelGroup(TravelGroupCreateDTO dto, String userId) {
    try {
      // 고유 ID 생성
      String groupId = dto.getGroupId();
      // String groupId = UUID.randomUUID().toString();

      // 현재 시간
      String createdAt = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

      // intro JSON 생성 - UI 표시용 추가 정보
      Map<String, Object> introJson = new HashMap<>();
      introJson.put("title", dto.getGroupName()); // 모임 제목
      introJson.put("flexible", dto.isFlexible()); // 날짜 조율 가능
      introJson.put("departureRegion", dto.getDepartureRegion()); // 출발 지역
      introJson.put("spot", dto.getSpot()); // 관광지역

      // 출생연도를 나이로 변환 (현재 연도 기준)
      if (dto.getBirthYearStart() != null && dto.getBirthYearEnd() != null) {
        int currentYear = LocalDateTime.now().getYear();
        // 주의: birthYearEnd가 더 최근(젊은 나이), birthYearStart가 더 과거(많은 나이)
        introJson.put("fromAge", currentYear - dto.getBirthYearEnd()); // 최소 나이
        introJson.put("toAge", currentYear - dto.getBirthYearStart()); // 최대 나이
        introJson.put("noLimit", false);
      } else {
        introJson.put("noLimit", true); // 연령 제한 없음
      }

      // 성별 정책 설정
      String genderPolicy;
      switch (dto.getGenderLimit()) {
        case "male":
          genderPolicy = "남성";
          break;
        case "female":
          genderPolicy = "여성";
          break;
        default:
          genderPolicy = "성별무관"; // 성별 무관
          break;
      }
      introJson.put("genderPolicy", genderPolicy);
      introJson.put("description", dto.getDescription()); // 모임 설명

      // JSON 문자열로 변환
      String introJsonString = objectMapper.writeValueAsString(introJson);

      // 여행 일수 계산 (총 일수를 문자열로)
      String tourDays = String.valueOf(calculateDays(dto.getStartDate(), dto.getEndDate()));

      // Entity 생성 및 저장
      TravelGroupsEntity travelGroup = TravelGroupsEntity.builder()
          .groupId(groupId)
          .tourId(dto.getTourId())
          .tourDaysInfo(tourDays) // "4" 형식
          .intro(introJsonString)
          .currentMembers(1) // 생성자 포함
          .maxMembers(dto.getMaxMembers())
          .startDate(dto.getStartDate())
          .endDate(dto.getEndDate())
          .recruitDeadline(dto.getRecruitDeadline() != null ? dto.getRecruitDeadline() : dto.getStartDate()) // 미입력시출발일로
          .status("recruiting") // 초기 상태는 모집중
          .createdAt(createdAt)
          .hiddenAfterTrip(dto.isHiddenAfterTrip() ? 1 : 0)
          .build();

      travelGroupsRepository.save(travelGroup);

      log.info("여행 그룹 생성 완료: groupId={}, tourId={}, creator={}",
          groupId, dto.getTourId(), userId);

      return groupId;

    } catch (Exception e) {
      log.error("여행 그룹 생성 실패: {}", e.getMessage(), e);
      throw new RuntimeException("여행 그룹 생성에 실패했습니다.");
    }
  }

  /**
   * 여행 일수 계산
   * 
   * @param startDate 시작일 (YYYY-MM-DD)
   * @param endDate   종료일 (YYYY-MM-DD)
   * @return 총 일수
   */
  private long calculateDays(String startDate, String endDate) {
    try {
      LocalDate start = LocalDate.parse(startDate);
      LocalDate end = LocalDate.parse(endDate);
      return ChronoUnit.DAYS.between(start, end) + 1; // 당일 포함
    } catch (Exception e) {
      log.error("날짜 계산 실패: {}", e.getMessage());
      return 1;
    }
  }
}