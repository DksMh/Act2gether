package com.example.act2gether.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExperienceDTO {
  private String id;
  private String title;
  private String description;
  private String meta;
  private String regionCode; // 지역 코드 추가 (1, 2, 31 등)
  private String regionName; // 지역명 추가 (서울, 인천, 경기 등)
  private String url; // URL 추가
}