package com.example.act2gether.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.act2gether.entity.TravelGroupsEntity;

public interface TravelGroupsRepository extends JpaRepository<TravelGroupsEntity, String> {

  /**
   * tourId로 여행 그룹 조회
   */
  List<TravelGroupsEntity> findByTourId(String tourId);

  /**
   * tourId로 여행 그룹 존재 여부 확인
   */
  boolean existsByTourId(String tourId);

  /**
   * tourId로 모집중인 여행 그룹 조회 (status가 'recruiting' 또는 'open'인 경우)
   */
  @Query("SELECT t FROM TravelGroupsEntity t WHERE t.tourId = :tourId AND t.status IN ('recruiting', 'open', 'active')")
  List<TravelGroupsEntity> findActiveGroupsByTourId(@Param("tourId") String tourId);

  /**
   * tourId로 참여 가능한 그룹 수 조회
   */
  @Query("SELECT COUNT(t) FROM TravelGroupsEntity t WHERE t.tourId = :tourId AND t.status IN ('recruiting', 'open') AND t.currentMembers < t.maxMembers")
  long countAvailableGroupsByTourId(@Param("tourId") String tourId);

  /**
   * 메인페이지에서 활용 : 최신 모집중인 그룹 3개 조회
   */
  @Query(value = "SELECT * FROM travel_groups " +
      "WHERE status IN ('recruiting', 'open', 'active') " +
      "AND hidden_after_trip = 0 " +
      "ORDER BY created_at DESC " +
      "LIMIT 3", nativeQuery = true)
  List<TravelGroupsEntity> findLatestRecruitingGroups();

  /**
   * 메인페이지에서 활용 : 상태 무관 최신 그룹 3개 조회 (백업용)
   */
  @Query(value = "SELECT * FROM travel_groups " +
      "WHERE hidden_after_trip = 0 " +
      "ORDER BY created_at DESC " +
      "LIMIT 3", nativeQuery = true)
  List<TravelGroupsEntity> findLatestGroups();

  @Query(value = """
        SELECT *
        FROM travel_groups tg
        WHERE (:region = '전체' OR :region = 'all')
           OR JSON_UNQUOTE(JSON_EXTRACT(CAST(tg.intro AS JSON), '$.departureRegion')) = :region
        ORDER BY tg.start_date ASC
        """, nativeQuery = true)
    List<TravelGroupsEntity> findByRegionOrAll(@Param("region") String region);

    // 전체 (정렬만)
    @Query(value = """
            SELECT * FROM travel_groups t ORDER BY t.start_date ASC
            """, nativeQuery = true)
    List<TravelGroupsEntity> findAllOrderByStartDate();

    // 전체(최신순) – 필요에 따라 LIMIT 조절
    @Query(value = """
        SELECT * 
        FROM travel_groups
        ORDER BY created_at DESC
        LIMIT 200
        """, nativeQuery = true)
    List<TravelGroupsEntity> findRecent();

    // 조건 검색
    @Query(value = """
        SELECT *
        FROM travel_groups
        WHERE (:from IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(intro, '$.departureRegion')) = :from)
          AND (:to   IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(intro, '$.spot'))   = :to)
          AND (:start IS NULL OR start_date >= :start)
          AND (:end   IS NULL OR end_date   <= :end)
        ORDER BY start_date ASC, created_at DESC
        LIMIT 300
        """, nativeQuery = true)
    List<TravelGroupsEntity> search(
            @Param("from")  String from,
            @Param("to")    String to,
            @Param("start") String start,
            @Param("end")   String end
    );
  
}