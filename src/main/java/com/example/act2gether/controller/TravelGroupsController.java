package com.example.act2gether.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.act2gether.dto.TravelGroupCreateDTO;
import com.example.act2gether.service.TravelGroupsService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 여행 그룹 관련 API 컨트롤러
 */
@RestController
@RequestMapping("/api/travel-groups")
@RequiredArgsConstructor
@Slf4j
public class TravelGroupsController {

  private final TravelGroupsService travelGroupsService;

  /**
   * 여행 그룹 생성 API
   * POST /api/travel-groups/create
   */
  @PostMapping("/create")
  public ResponseEntity<?> createTravelGroup(
      @RequestBody TravelGroupCreateDTO dto,
      HttpSession session) {

    try {
      // 로그인 체크
      String userId = (String) session.getAttribute("userid");
      if (userId == null) {
        return ResponseEntity.status(401).body(Map.of(
            "success", false,
            "message", "로그인이 필요합니다."));
      }

      // 유효성 검사 - 모임 이름
      if (dto.getGroupName() == null || dto.getGroupName().length() < 10) {
        return ResponseEntity.badRequest().body(Map.of(
            "success", false,
            "message", "모임 이름은 10자 이상이어야 합니다."));
      }

      // 유효성 검사 - 인원 수
      if (dto.getMaxMembers() < 2 || dto.getMaxMembers() > 11) {
        return ResponseEntity.badRequest().body(Map.of(
            "success", false,
            "message", "인원은 2명 이상 10명 이하여야 합니다."));
      }

      // 유효성 검사 - 필수 항목
      if (dto.getTourId() == null || dto.getStartDate() == null ||
          dto.getEndDate() == null || dto.getDepartureRegion() == null) {
        return ResponseEntity.badRequest().body(Map.of(
            "success", false,
            "message", "필수 항목을 모두 입력해주세요."));
      }

      // 여행 그룹 생성
      String groupId = travelGroupsService.createTravelGroup(dto, userId);

      // 성공 응답
      Map<String, Object> response = new HashMap<>();
      response.put("success", true);
      response.put("groupId", groupId);
      response.put("message", "여행 그룹이 성공적으로 생성되었습니다.");

      log.info("여행 그룹 생성 성공: userId={}, groupId={}", userId, groupId);

      return ResponseEntity.ok(response);

    } catch (Exception e) {
      log.error("여행 그룹 생성 실패: {}", e.getMessage(), e);
      return ResponseEntity.status(500).body(Map.of(
          "success", false,
          "message", "여행 그룹 생성에 실패했습니다: " + e.getMessage()));
    }
  }
}