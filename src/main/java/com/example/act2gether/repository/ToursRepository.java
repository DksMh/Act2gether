package com.example.act2gether.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.act2gether.entity.ToursEntity;
import java.util.List;

@Repository
public interface ToursRepository extends JpaRepository<ToursEntity, String> {

  // 지역별 투어 조회 (해당 지역 전체)
  List<ToursEntity> findByRegion(String region);

  // 지역별 투어 조회 (정렬)
  List<ToursEntity> findByRegionOrderByTourIdAsc(String region);

  // 여러 지역 조회
  List<ToursEntity> findByRegionIn(List<String> regions);

  // 지역별 투어 개수 조회
  long countByRegion(String region);
  
  // 시군구
  List<ToursEntity> findByRegionAndSigunguCode(String region, String sigunguCode);
    
  @Query("SELECT t FROM ToursEntity t WHERE t.region = :region AND (t.sigunguCode = :sigunguCode OR t.sigunguCode IS NULL)")
  List<ToursEntity> findByRegionWithFallback(@Param("region") String region, @Param("sigunguCode") String sigunguCode);

}