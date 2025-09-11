package com.example.act2gether.controller;

import com.example.act2gether.dto.TourDTO;
import com.example.act2gether.dto.ExperienceDTO;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;
import com.example.act2gether.service.TourFilterService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.Month;
import java.util.*;

@Controller
@RequiredArgsConstructor
@Slf4j
public class MainController {

  private final TourFilterService tourFilterService;
  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;

  @GetMapping("/")
  public String mainPage(Model model, HttpSession session, Authentication authentication) {
    log.info("🔍 메인 페이지 접속");

    // PageController와 동일한 방식으로 인증 정보 처리
    boolean isAuthenticated = authentication != null &&
            authentication.isAuthenticated() &&
            !"anonymousUser".equals(authentication.getPrincipal());

    log.info("Spring Security 인증: {}", isAuthenticated);

    UserEntity user = null;
    
    if (isAuthenticated) {
      try {
        String userid = authentication.getName(); // UUID
        log.info("Authentication에서 가져온 userid: {}", userid);
        
        user = userRepository.findById(userid).orElse(null);
        
        if (user != null) {
          // 모델에 사용자 정보 설정 - PageController와 동일하게
          model.addAttribute("isAuthenticated", true);
          model.addAttribute("userid", user.getUserId());           // UUID
          model.addAttribute("username", user.getUsername());        // 닉네임 
          model.addAttribute("email", user.getEmail());
          model.addAttribute("user_role", user.getUserRole());
          
          boolean isAdmin = "ADMIN".equals(user.getUserRole());
          model.addAttribute("isAdmin", isAdmin);
          
          // 세션에도 저장
          session.setAttribute("userid", user.getUserId());
          session.setAttribute("username", user.getUsername());
          session.setAttribute("email", user.getEmail());
          session.setAttribute("user_role", user.getUserRole());
          session.setAttribute("isAdmin", isAdmin);
          
          log.info("=== 사용자 정보 설정 완료 ===");
          log.info("- userid: {}", user.getUserId());
          log.info("- username: {}", user.getUsername());
          log.info("- email: {}", user.getEmail());
          log.info("- user_role: {}", user.getUserRole());
          log.info("- isAdmin: {}", isAdmin);
        } else {
          log.warn("사용자 정보를 찾을 수 없음: {}", userid);
          model.addAttribute("isAuthenticated", false);
          model.addAttribute("isAdmin", false);
        }
      } catch (Exception e) {
        log.error("사용자 정보 조회 중 오류: {}", e.getMessage(), e);
        model.addAttribute("isAuthenticated", false);
        model.addAttribute("isAdmin", false);
      }
    } else {
      log.info("비인증 상태");
      model.addAttribute("isAuthenticated", false);
      model.addAttribute("isAdmin", false);
      
      // 세션 정리
      session.removeAttribute("userid");
      session.removeAttribute("username");
      session.removeAttribute("email");
      session.removeAttribute("user_role");
      session.removeAttribute("isAdmin");
    }

    // 사용자 맞춤 추천
    if (isAuthenticated && user != null) {
      loadPersonalizedRecommendations(model, user);
    } else {
      loadDefaultRecommendations(model);
    }

    // 계절별 추천
    loadSeasonalRecommendations(model);

    // 지역별 체험
    loadRegionalExperiences(model);

    // 동행 모임
    loadCompanionGroups(model);

    return "main";
  }
  
  private void loadPersonalizedRecommendations(Model model, UserEntity user) {
    try {
      String interests = user.getInterests();
      if (interests == null || interests.trim().isEmpty()) {
        loadDefaultRecommendations(model);
        return;
      }

      JsonNode interestsJson = objectMapper.readTree(interests);

      Map<String, String> searchParams = new HashMap<>();
      searchParams.put("numOfRows", "6");

      // 지역 설정
      JsonNode regions = interestsJson.path("preferredRegions");
      if (regions.isArray() && regions.size() > 0) {
        String region = regions.get(0).asText();
        String areaCode = tourFilterService.getAreaCodeByName(region);
        if (!areaCode.isEmpty()) {
          searchParams.put("areaCode", areaCode);
        }
      }

      // 장소 설정
      JsonNode places = interestsJson.path("places");
      if (places.isArray() && places.size() > 0) {
        List<String> placeList = new ArrayList<>();
        for (JsonNode place : places) {
          placeList.add(place.asText());
        }
        searchParams.put("places", objectMapper.writeValueAsString(placeList));

        String keyword = generateKeywordFromPlaces(placeList);
        model.addAttribute("userInterest", keyword);
      } else {
        model.addAttribute("userInterest", "맞춤");
      }

      // API 호출 및 DTO 변환
      Map<String, Object> result = tourFilterService.searchTours(searchParams);

      if (result != null && Boolean.TRUE.equals(result.get("success"))) {
        JsonNode tours = (JsonNode) result.get("data");
        List<TourDTO> tourList = convertToTourDTOs(tours);
        model.addAttribute("recommendedTours", tourList);
        log.info("✅ 맞춤 추천 로드 성공: {}개", tourList.size());
      } else {
        loadDefaultRecommendations(model);
      }

    } catch (Exception e) {
      log.error("맞춤 추천 로드 실패: {}", e.getMessage());
      loadDefaultRecommendations(model);
    }
  }

  private void loadDefaultRecommendations(Model model) {
    try {
      Map<String, Object> result = tourFilterService.getRecommendedTours(null, 6);

      if (result != null && Boolean.TRUE.equals(result.get("success"))) {
        JsonNode tours = (JsonNode) result.get("data");
        List<TourDTO> tourList = convertToTourDTOs(tours);
        model.addAttribute("recommendedTours", tourList);
        log.info("✅ 기본 추천 로드 성공: {}개", tourList.size());
      } else {
        model.addAttribute("recommendedTours", new ArrayList<>());
      }

      model.addAttribute("userInterest", "인기");

    } catch (Exception e) {
      log.error("기본 추천 로드 실패: {}", e.getMessage());
      model.addAttribute("recommendedTours", new ArrayList<>());
    }
  }

  private void loadSeasonalRecommendations(Model model) {
    try {
      String season = getCurrentSeason();
      model.addAttribute("currentSeason", season);

      List<String> seasonPlaces = getSeasonPlaces(season);

      Map<String, String> params = new HashMap<>();
      params.put("numOfRows", "6");
      params.put("places", objectMapper.writeValueAsString(seasonPlaces));

      Map<String, Object> result = tourFilterService.searchTours(params);

      if (result != null && Boolean.TRUE.equals(result.get("success"))) {
        JsonNode tours = (JsonNode) result.get("data");
        List<TourDTO> tourList = convertToTourDTOs(tours);
        model.addAttribute("seasonTours", tourList);
        log.info("✅ {} 테마 로드 성공: {}개", season, tourList.size());
      } else {
        model.addAttribute("seasonTours", new ArrayList<>());
      }

    } catch (Exception e) {
      log.error("계절별 추천 로드 실패: {}", e.getMessage());
      model.addAttribute("seasonTours", new ArrayList<>());
      model.addAttribute("currentSeason", "가을");
    }
  }

  private void loadRegionalExperiences(Model model) {
    try {
      Map<String, String> params = new HashMap<>();
      params.put("numOfRows", "4");
      params.put("areaCode", "1"); // 서울
      params.put("places", "[\"체험\"]");

      Map<String, Object> result = tourFilterService.searchTours(params);

      if (result != null && Boolean.TRUE.equals(result.get("success"))) {
        JsonNode tours = (JsonNode) result.get("data");
        List<ExperienceDTO> experiences = convertToExperienceDTOs(tours);

        // 부족하면 기본 데이터 추가
        if (experiences.size() < 2) {
          experiences.addAll(createDefaultExperiences());
        }

        model.addAttribute("regionalExperiences", experiences);
      } else {
        model.addAttribute("regionalExperiences", createDefaultExperiences());
      }

    } catch (Exception e) {
      log.error("지역 체험 로드 실패: {}", e.getMessage());
      model.addAttribute("regionalExperiences", createDefaultExperiences());
    }
  }

  private void loadCompanionGroups(Model model) {
    List<Map<String, Object>> groups = new ArrayList<>();

    Map<String, Object> group1 = new HashMap<>();
    group1.put("id", 1);
    group1.put("title", "중년 여성끼리 소박하게 국내 여행 가요~");
    group1.put("description", "50대 이상 / 힐링 여행 / 여성 전용");
    groups.add(group1);

    Map<String, Object> group2 = new HashMap<>();
    group2.put("id", 2);
    group2.put("title", "청춘 배낭 여행 동아리");
    group2.put("description", "20-30대 / 배낭여행 / 성별무관");
    groups.add(group2);

    Map<String, Object> group3 = new HashMap<>();
    group3.put("id", 3);
    group3.put("title", "가족과 함께하는 캠핑 모임");
    group3.put("description", "가족 단위 / 캠핑 / 아이 동반 가능");
    groups.add(group3);

    Map<String, Object> group4 = new HashMap<>();
    group4.put("id", 4);
    group4.put("title", "전국 맛집 탐방 모임");
    group4.put("description", "전연령 / 맛집 투어 / 미식가 환영");
    groups.add(group4);

    model.addAttribute("companionGroups", groups);
  }

  // JsonNode를 TourDTO로 변환
  private List<TourDTO> convertToTourDTOs(JsonNode tours) {
    List<TourDTO> tourList = new ArrayList<>();

    if (tours != null && tours.isArray()) {
      for (JsonNode node : tours) {
        TourDTO dto = TourDTO.builder()
            .contentId(node.path("contentid").asText())
            .title(node.path("title").asText())
            .addr1(node.path("addr1").asText())
            .addr2(node.path("addr2").asText())
            .firstimage(node.path("firstimage").asText())
            .firstimage2(node.path("firstimage2").asText())
            .optimizedImage(node.path("optimizedImage").asText())
            .categoryName(node.path("categoryName").asText())
            .cat1(node.path("cat1").asText())
            .cat2(node.path("cat2").asText())
            .cat3(node.path("cat3").asText())
            .mapx(node.path("mapx").asText())
            .mapy(node.path("mapy").asText())
            .tel(node.path("tel").asText())
            .accessibilityScore(node.path("accessibilityScore").asInt(0))
            .hasBarrierFreeInfo(node.path("hasBarrierFreeInfo").asBoolean(false))
            .build();

        tourList.add(dto);
      }
    }

    return tourList;
  }

  // JsonNode를 ExperienceDTO로 변환
  private List<ExperienceDTO> convertToExperienceDTOs(JsonNode tours) {
    List<ExperienceDTO> experiences = new ArrayList<>();

    if (tours != null && tours.isArray()) {
      int count = 0;
      for (JsonNode node : tours) {
        if (count >= 2)
          break;

        ExperienceDTO dto = ExperienceDTO.builder()
            .id(node.path("contentid").asText())
            .title(node.path("title").asText("서울 체험"))
            .description(node.path("addr1").asText("특별한 체험 프로그램"))
            .meta("체험 프로그램 운영 중")
            .build();

        experiences.add(dto);
        count++;
      }
    }

    return experiences;
  }

  private List<ExperienceDTO> createDefaultExperiences() {
    List<ExperienceDTO> experiences = new ArrayList<>();

    experiences.add(ExperienceDTO.builder()
        .title("서울 시티투어 버스")
        .description("서울의 주요 명소를 편하게 둘러보는 투어")
        .meta("매일 운행")
        .build());

    experiences.add(ExperienceDTO.builder()
        .title("경복궁 한복 체험")
        .description("전통 한복 체험과 궁궐 관람")
        .meta("예약 필수")
        .build());

    return experiences;
  }

  // 유틸리티 메서드들
  private String getCurrentSeason() {
    LocalDate now = LocalDate.now();
    Month month = now.getMonth();

    if (month == Month.MARCH || month == Month.APRIL || month == Month.MAY) {
      return "봄";
    } else if (month == Month.JUNE || month == Month.JULY || month == Month.AUGUST) {
      return "여름";
    } else if (month == Month.SEPTEMBER || month == Month.OCTOBER || month == Month.NOVEMBER) {
      return "가을";
    } else {
      return "겨울";
    }
  }

  private List<String> getSeasonPlaces(String season) {
    Map<String, List<String>> seasonMap = new HashMap<>();
    seasonMap.put("봄", Arrays.asList("수목원", "자연휴양림", "테마파크"));
    seasonMap.put("여름", Arrays.asList("해변", "계곡/폭포", "캠핑장"));
    seasonMap.put("가을", Arrays.asList("산/공원", "트래킹", "자연생태관광지"));
    seasonMap.put("겨울", Arrays.asList("온천", "스키장", "찜질방"));

    return seasonMap.getOrDefault(season, Arrays.asList("관광단지"));
  }

  private String generateKeywordFromPlaces(List<String> places) {
    if (places.isEmpty())
      return "특별한";

    String firstPlace = places.get(0);
    Map<String, String> keywordMap = new HashMap<>();
    keywordMap.put("해변", "시원한 바다가 있는");
    keywordMap.put("산/공원", "푸른 자연 속");
    keywordMap.put("온천", "따뜻한 휴식이 있는");
    keywordMap.put("체험", "즐거운 체험이 가득한");
    keywordMap.put("박물관", "문화가 숨쉬는");

    return keywordMap.getOrDefault(firstPlace, "맞춤");
  }

  // 여행 타입별 장소 매핑 헬퍼 메서드
  private Map<String, List<String>> getTravelTypePlaceMapping() {
    Map<String, List<String>> mapping = new HashMap<>();

    // 자연관광지
    mapping.put("nature", Arrays.asList(
        "해변", "산/공원", "계곡/폭포", "호수/강",
        "수목원", "자연휴양림", "자연생태관광지"));

    // 역사관광지 (인문)
    mapping.put("culture", Arrays.asList(
        "고궁/문", "민속마을/가옥", "유적지",
        "사찰", "종교성지", "박물관", "미술관"));

    // 휴양관광지
    mapping.put("healing", Arrays.asList(
        "온천", "테마파크", "관광단지",
        "찜질방", "유람선/잠수함관광"));

    // 체험관광지
    mapping.put("experience", Arrays.asList("체험"));

    // 레포츠
    mapping.put("sports", Arrays.asList(
        "트래킹", "골프장", "스키장", "캠핑장", "낚시"));

    return mapping;
  }

}