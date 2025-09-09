package com.example.act2gether.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TourDTO { // 메인페이지용도
  private String contentId;
  private String title;
  private String addr1;
  private String addr2;
  private String firstimage;
  private String firstimage2;
  private String optimizedImage;
  private String categoryName;
  private String cat1;
  private String cat2;
  private String cat3;
  private String mapx;
  private String mapy;
  private String tel;
  private String zipcode;
  private Integer accessibilityScore;
  private Boolean hasBarrierFreeInfo;
  private String barrierFreeInfo;

  // 전체 주소 반환
  public String getFullAddress() {
    if (addr2 != null && !addr2.isEmpty()) {
      return addr1 + " " + addr2;
    }
    return addr1;
  }

  // 이미지 URL 반환 (우선순위 적용)
  public String getDisplayImage() {
    if (optimizedImage != null && !optimizedImage.isEmpty()) {
      return optimizedImage;
    }
    if (firstimage != null && !firstimage.isEmpty()) {
      return firstimage;
    }
    if (firstimage2 != null && !firstimage2.isEmpty()) {
      return firstimage2;
    }
    return "/uploads/tour/no-image.png";
  }
}