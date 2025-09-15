package com.example.act2gether.service;

import com.example.act2gether.entity.ToursEntity;
import com.example.act2gether.repository.ToursRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ToursService {

  private final ToursRepository toursRepository;

  // 지역 코드와 이름 매핑
  private static final Map<String, String> REGION_NAME_MAP = new HashMap<>() {
    {
      put("1", "서울");
      put("2", "인천");
      put("3", "대전");
      put("4", "대구");
      put("5", "광주");
      put("6", "부산");
      put("7", "울산");
      put("8", "세종");
      put("31", "경기");
      put("32", "강원");
      put("33", "충북");
      put("34", "충남");
      put("35", "전북");
      put("36", "전남");
      put("37", "경북");
      put("38", "경남");
      put("39", "제주");
    }
  };

  /**
   * 지역별 투어 조회 (해당 지역 전체)
   * 트랜잭션 제거 또는 새로운 트랜잭션으로 분리
   */
  @Transactional(readOnly = true, noRollbackFor = Exception.class)
  public List<Map<String, Object>> getToursByRegion(String region) {
    List<Map<String, Object>> result = new ArrayList<>();

    try {
      List<ToursEntity> tours = toursRepository.findByRegion(region);

      for (ToursEntity tour : tours) {
        Map<String, Object> tourMap = new HashMap<>();
        tourMap.put("tourId", tour.getTourId());
        tourMap.put("region", tour.getRegion());
        tourMap.put("regionName", REGION_NAME_MAP.getOrDefault(tour.getRegion(), "기타"));
        tourMap.put("url", tour.getUrl());
        tourMap.put("tourExplain", tour.getTourExplain());

        // 제목과 설명 파싱
        String explain = tour.getTourExplain();
        if (explain != null && explain.contains(" - ")) {
          String[] parts = explain.split(" - ", 2);
          tourMap.put("title", parts[0]);
          tourMap.put("description", parts.length > 1 ? parts[1] : "");
        } else {
          tourMap.put("title", explain != null ? explain : "지역 투어");
          tourMap.put("description", "특별한 체험 프로그램");
        }

        result.add(tourMap);
      }

      log.info("지역 {} 투어 조회 성공: {}개", REGION_NAME_MAP.get(region), result.size());

    } catch (Exception e) {
      log.error("지역별 투어 조회 실패: region={}, error={}", region, e.getMessage());
      // 예외를 던지지 않고 빈 리스트 반환
    }

    return result;
  }

  /**
   * 지역 코드로 지역명 조회
   */
  public String getRegionName(String regionCode) {
    return REGION_NAME_MAP.getOrDefault(regionCode, "기타");
  }

  /**
   * 지역별 투어 개수 조회
   */
  @Transactional(readOnly = true)
  public long countByRegion(String region) {
    try {
      return toursRepository.countByRegion(region);
    } catch (Exception e) {
      log.error("지역별 투어 개수 조회 실패: region={}, error={}", region, e.getMessage());
      return 0;
    }
  }

  // ToursService.java에 추가
  /**
   * 지역 코드로 해당 지역 투어 정보 조회
   */
  public List<ToursEntity> getToursByRegionCode(String regionCode) {
      try {
          // 지역코드를 region 문자열로 변환
          String regionName = REGION_NAME_MAP.get(regionCode);
          if (regionName == null) {
              log.warn("알 수 없는 지역 코드: {}", regionCode);
              return new ArrayList<>();
          }
          
          // region 컬럼으로 조회
          return toursRepository.findByRegion(regionName);
      } catch (Exception e) {
          log.error("지역별 투어 조회 실패: regionCode={}, error={}", regionCode, e.getMessage());
          return new ArrayList<>();
      }
  }

  /**
   * 랜덤 지역 투어 1개 조회 (여행 꿀정보용)
   */
  public ToursEntity getRandomTourByRegion(String regionCode) {
      try {
          List<ToursEntity> tours = getToursByRegionCode(regionCode);
          if (tours.isEmpty()) {
              return null;
          }
          
          // 랜덤으로 하나 선택
          Random random = new Random();
          return tours.get(random.nextInt(tours.size()));
      } catch (Exception e) {
          log.error("랜덤 투어 조회 실패: {}", e.getMessage());
          return null;
      }
  }

}