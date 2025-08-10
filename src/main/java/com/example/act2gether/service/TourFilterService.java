package com.example.act2gether.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class TourFilterService {
    
    @Value("${tourism.api.key}")
    private String serviceKey;
    
    @Value("${tourism.api.base-url}")
    private String baseUrl;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 🆕 이미지 URL 검증 및 최적화
     */
    private String optimizeImageUrl(String imageUrl, String category) {
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            return getDefaultImageUrl(category);
        }
        
        // 상대 경로를 절대 경로로 변환
        if (imageUrl.startsWith("//")) {
            return "https:" + imageUrl;
        } else if (imageUrl.startsWith("/")) {
            return "https://tong.visitkorea.or.kr" + imageUrl;
        }
        
        return imageUrl;
    }

    /**
     * 🆕 SVG 기반 데이터 URL 생성
     */
    private String getDefaultImageUrl(String category) {
        Map<String, String> defaultImages = new HashMap<>();
        defaultImages.put("A01", createSvgDataUrl("자연 관광지", "#4CAF50", "🌿"));
        defaultImages.put("A02", createSvgDataUrl("문화 시설", "#2196F3", "🏛️"));
        defaultImages.put("A03", createSvgDataUrl("레포츠", "#FF9800", "🏃‍♂️"));
        defaultImages.put("A05", createSvgDataUrl("음식점", "#F44336", "🍽️"));
        defaultImages.put("C01", createSvgDataUrl("추천 코스", "#607D8B", "🎯"));
        
        return defaultImages.getOrDefault(category, createSvgDataUrl("이미지 없음", "#9E9E9E", "📷"));
    }

    private String createSvgDataUrl(String text, String color, String emoji) {
        String svg = String.format(
            "<svg width='300' height='200' xmlns='http://www.w3.org/2000/svg'>" +
            "<defs>" +
            "<linearGradient id='grad' x1='0%%' y1='0%%' x2='100%%' y2='100%%'>" +
            "<stop offset='0%%' style='stop-color:%s;stop-opacity:1' />" +
            "<stop offset='100%%' style='stop-color:%s;stop-opacity:0.8' />" +
            "</linearGradient>" +
            "</defs>" +
            "<rect width='100%%' height='100%%' fill='url(#grad)'/>" +
            "<text x='50%%' y='45%%' text-anchor='middle' font-size='36' fill='white'>%s</text>" +
            "<text x='50%%' y='70%%' text-anchor='middle' font-size='14' font-family='Arial' fill='white'>%s</text>" +
            "</svg>",
            color, color, emoji, text
        );
        
        return "data:image/svg+xml;base64," + java.util.Base64.getEncoder().encodeToString(svg.getBytes());
    }

    /**
     * 🆕 관광지 데이터 후처리 (이미지 최적화 포함)
     */
    private JsonNode processTourData(JsonNode items) {
        if (!items.isArray()) {
            return items;
        }
        
        ArrayNode processedItems = objectMapper.createArrayNode();
        
        for (JsonNode item : items) {
            ObjectNode processedItem = (ObjectNode) item.deepCopy();
            
            // 이미지 URL 최적화
            String firstImage = item.path("firstimage").asText("");
            String firstImage2 = item.path("firstimage2").asText("");
            String cat1 = item.path("cat1").asText("");
            
            String optimizedImage = optimizeImageUrl(firstImage.isEmpty() ? firstImage2 : firstImage, cat1);
            
            processedItem.put("firstimage", optimizedImage);
            processedItem.put("optimizedImage", optimizedImage);
            processedItem.put("hasRealImage", !optimizedImage.startsWith("data:image/svg"));
            
            // 카테고리 이름 추가
            processedItem.put("categoryName", getCategoryDisplayName(cat1));
            
            // 주소 정보 정리
            String addr1 = item.path("addr1").asText("");
            String addr2 = item.path("addr2").asText("");
            String fullAddress = addr1 + (addr2.isEmpty() ? "" : " " + addr2);
            processedItem.put("fullAddress", fullAddress.trim());
            
            // 제목 및 설명 정리 (HTML 태그 제거)
            String title = item.path("title").asText("").replaceAll("<[^>]*>", "");
            processedItem.put("cleanTitle", title);
            
            processedItems.add(processedItem);
        }
        
        return processedItems;
    }

    /**
     * 🆕 카테고리 코드를 표시명으로 변환 (메인 3개만)
     */
    private String getCategoryDisplayName(String categoryCode) {
        Map<String, String> categories = new HashMap<>();
        categories.put("A01", "자연");
        categories.put("A02", "문화");
        categories.put("A03", "레포츠");
        categories.put("A05", "음식");
        categories.put("C01", "코스");
        
        return categories.getOrDefault(categoryCode, "기타");
    }

    /**
     * 🎯 개선된 관광지 검색 (다중 조건 지원)
     * 5개 질문 구조: 지역(1개) + 테마/활동/장소(각각 최대3개) + 편의시설(1개)
     */
    public Map<String, Object> searchTours(Map<String, String> params) {
        try {
            StringBuilder urlBuilder = new StringBuilder();
            urlBuilder.append(baseUrl).append("/areaBasedList2")
                    .append("?serviceKey=").append(serviceKey)
                    .append("&MobileOS=ETC&MobileApp=MyApp")
                    .append("&numOfRows=").append(params.getOrDefault("numOfRows", "20"))
                    .append("&pageNo=").append(params.getOrDefault("pageNo", "1"))
                    .append("&contentTypeId=12") // 관광지
                    .append("&_type=json");
            
            // 1. 지역코드 (단일 선택)
            if (params.containsKey("areaCode") && !params.get("areaCode").isEmpty()) {
                urlBuilder.append("&areaCode=").append(params.get("areaCode"));
            }
            
            // 시군구코드 (특별시/광역시가 아닌 경우만)
            if (params.containsKey("sigunguCode") && !params.get("sigunguCode").isEmpty() 
                && !isMetropolitanCity(params.get("areaCode"))) {
                urlBuilder.append("&sigunguCode=").append(params.get("sigunguCode"));
            }
            
            // 2. 테마 처리 (복수 값을 첫 번째 값으로 대표 처리)
            String themes = params.get("themes");
            if (themes != null && !themes.isEmpty()) {
                String primaryTheme = extractPrimaryTheme(themes);
                String categoryCode = mapThemeToCategory(primaryTheme);
                if (categoryCode != null && List.of("A01", "A02", "A03").contains(categoryCode)) {
                    urlBuilder.append("&cat1=").append(categoryCode);
                }
            }
            
            // 3. 활동/장소는 키워드 검색으로 처리
            String searchKeyword = buildSearchKeyword(params);
            if (!searchKeyword.isEmpty()) {
                urlBuilder.append("&keyword=").append(URLEncoder.encode(searchKeyword, StandardCharsets.UTF_8));
            }
            
            log.info("관광지 검색 URL: {}", urlBuilder.toString());
            
            ResponseEntity<String> response = restTemplate.getForEntity(urlBuilder.toString(), String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());
            
            // API 응답 검증
            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();
            String resultMsg = header.path("resultMsg").asText();
            
            if (!"0000".equals(resultCode)) {
                log.error("관광지 검색 API 오류 - 코드: {}, 메시지: {}", resultCode, resultMsg);
                return Map.of("success", false, "message", "검색 실패: " + resultMsg);
            }
            
            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            int totalCount = jsonNode.path("response").path("body").path("totalCount").asInt(0);
            
            // 🆕 데이터 후처리 (이미지 최적화)
            JsonNode processedItems = processTourData(items);
            
            log.info("관광지 검색 완료 - 총 {}개, 현재 페이지 {}개", totalCount, processedItems.size());
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", processedItems);
            result.put("totalCount", totalCount);
            result.put("currentPage", Integer.parseInt(params.getOrDefault("pageNo", "1")));
            result.put("itemsPerPage", Integer.parseInt(params.getOrDefault("numOfRows", "20")));
            result.put("searchKeywords", searchKeyword); // 디버깅용
            
            return result;
            
        } catch (Exception e) {
            log.error("관광지 검색 실패: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "관광지 검색에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 🆕 복수 테마에서 첫 번째 테마 추출
     */
    private String extractPrimaryTheme(String themes) {
        if (themes == null || themes.isEmpty()) return "";
        
        // "자연,문화/역사,체험" 형태나 JSON 배열 형태 처리
        if (themes.startsWith("[") && themes.endsWith("]")) {
            try {
                JsonNode themeArray = objectMapper.readTree(themes);
                if (themeArray.isArray() && themeArray.size() > 0) {
                    return themeArray.get(0).asText();
                }
            } catch (Exception e) {
                log.warn("테마 JSON 파싱 실패: {}", themes);
            }
        }
        
        // 콤마로 구분된 형태 처리
        String[] themeArray = themes.split(",");
        return themeArray.length > 0 ? themeArray[0].trim() : "";
    }

    /**
     * 🆕 검색 키워드 조합 생성 (활동 + 장소)
     */
    private String buildSearchKeyword(Map<String, String> params) {
        List<String> keywords = new ArrayList<>();
        
        // 활동 키워드
        String activities = params.get("activities");
        if (activities != null && !activities.isEmpty()) {
            List<String> activityKeywords = extractKeywordsFromActivities(activities);
            keywords.addAll(activityKeywords);
        }
        
        // 장소 키워드
        String places = params.get("places");
        if (places != null && !places.isEmpty()) {
            List<String> placeKeywords = extractKeywordsFromPlaces(places);
            keywords.addAll(placeKeywords);
        }
        
        // 최대 3개 키워드만 사용 (API 제한)
        return keywords.stream()
                .distinct()
                .limit(3)
                .reduce((a, b) -> a + " " + b)
                .orElse("");
    }

    /**
     * 🆕 활동을 검색 키워드로 변환
     */
    private List<String> extractKeywordsFromActivities(String activities) {
        List<String> keywords = new ArrayList<>();
        
        // JSON 배열이나 콤마 구분 문자열 처리
        List<String> activityList = parseMultiSelectValue(activities);
        
        for (String activity : activityList) {
            switch (activity.trim()) {
                case "문화체험":
                    keywords.addAll(Arrays.asList("문화", "체험", "전통"));
                    break;
                case "자연감상":
                    keywords.addAll(Arrays.asList("자연", "경치", "힐링"));
                    break;
                case "액티비티":
                    keywords.addAll(Arrays.asList("액티비티", "체험", "레포츠"));
                    break;
                case "쇼핑":
                    keywords.addAll(Arrays.asList("쇼핑", "시장"));
                    break;
                case "건강관리":
                    keywords.addAll(Arrays.asList("건강", "힐링", "휴양"));
                    break;
                case "휴식":
                    keywords.addAll(Arrays.asList("휴식", "힐링"));
                    break;
                case "사진촬영":
                    keywords.addAll(Arrays.asList("포토존", "경치"));
                    break;
                case "학습":
                    keywords.addAll(Arrays.asList("교육", "학습", "체험"));
                    break;
            }
        }
        
        return keywords;
    }

    /**
     * 🆕 장소를 검색 키워드로 변환
     */
    private List<String> extractKeywordsFromPlaces(String places) {
        List<String> keywords = new ArrayList<>();
        
        List<String> placeList = parseMultiSelectValue(places);
        
        for (String place : placeList) {
            switch (place.trim()) {
                case "해변":
                    keywords.addAll(Arrays.asList("해변", "바다", "해수욕장"));
                    break;
                case "산":
                    keywords.addAll(Arrays.asList("산", "등산", "자연"));
                    break;
                case "도시":
                    keywords.addAll(Arrays.asList("도시", "문화", "건물"));
                    break;
                case "시골":
                    keywords.addAll(Arrays.asList("시골", "농촌", "전통"));
                    break;
                case "호수":
                    keywords.addAll(Arrays.asList("호수", "물"));
                    break;
                case "온천지역":
                    keywords.addAll(Arrays.asList("온천", "스파", "힐링"));
                    break;
                case "섬지역":
                    keywords.addAll(Arrays.asList("섬", "바다"));
                    break;
            }
        }
        
        return keywords;
    }

    /**
     * 🆕 다중 선택 값 파싱 (JSON 배열 또는 콤마 구분 문자열)
     */
    private List<String> parseMultiSelectValue(String value) {
        List<String> result = new ArrayList<>();
        
        if (value == null || value.trim().isEmpty()) {
            return result;
        }
        
        // JSON 배열 형태 처리
        if (value.startsWith("[") && value.endsWith("]")) {
            try {
                JsonNode array = objectMapper.readTree(value);
                if (array.isArray()) {
                    for (JsonNode item : array) {
                        result.add(item.asText().trim());
                    }
                    return result;
                }
            } catch (Exception e) {
                log.warn("JSON 배열 파싱 실패, 콤마 구분으로 처리: {}", value);
            }
        }
        
        // 콤마 구분 문자열 처리
        String[] items = value.split(",");
        for (String item : items) {
            String trimmed = item.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        
        return result;
    }

    /**
     * 🆕 테마를 API 카테고리 코드로 매핑
     */
    private String mapThemeToCategory(String theme) {
        if (theme == null || theme.isEmpty()) return null;
        
        Map<String, String> themeMapping = new HashMap<>();
        themeMapping.put("자연", "A01");
        themeMapping.put("문화/역사", "A02");
        themeMapping.put("문화", "A02");
        themeMapping.put("역사", "A02");
        themeMapping.put("체험", "A03");
        themeMapping.put("액티비티", "A03");
        themeMapping.put("레포츠", "A03");
        themeMapping.put("힐링", "A01"); // 자연으로 매핑
        themeMapping.put("축제/공연", "A02"); // 문화로 매핑
        themeMapping.put("축제", "A02");
        themeMapping.put("공연", "A02");
        
        return themeMapping.get(theme.trim());
    }

    /**
     * 🆕 개선된 관심사 매핑 (5개 질문 구조)
     */
    public Map<String, Object> mapUserInterestsToFilters(String interestsJson) {
        Map<String, Object> filters = new HashMap<>();
        
        try {
            JsonNode interests = objectMapper.readTree(interestsJson);
            
            // 1. 지역 매핑 (17개 광역시도, 첫 번째만 선택)
            JsonNode regions = interests.path("preferredRegions");
            if (regions.isArray() && regions.size() > 0) {
                List<Object> regionList = new ArrayList<>();
                regionList.add(regions.get(0).asText()); // 첫 번째 지역만
                filters.put("regions", regionList);
            }
            
            // 2. 테마 매핑 (최대 3개)
            JsonNode themes = interests.path("themes");
            if (themes.isArray()) {
                Map<String, String> themeMapping = new HashMap<>();
                int count = 0;
                for (JsonNode theme : themes) {
                    if (count >= 3) break; // 최대 3개
                    
                    String themeValue = theme.asText();
                    String categoryCode = mapThemeToCategory(themeValue);
                    if (categoryCode != null) {
                        themeMapping.put(categoryCode, themeValue);
                        count++;
                    }
                }
                filters.put("themes", themeMapping);
            }
            
            // 3. 활동 매핑 (최대 3개)
            JsonNode activities = interests.path("activities");
            if (activities.isArray()) {
                List<Object> activityList = new ArrayList<>();
                int count = 0;
                for (JsonNode activity : activities) {
                    if (count >= 3) break; // 최대 3개
                    String activityValue = activity.asText();
                    if (!"맛집 탐방".equals(activityValue)) { // 맛집 제외
                        activityList.add(activityValue);
                        count++;
                    }
                }
                filters.put("activities", activityList);
            }
            
            // 4. 장소 매핑 (최대 3개)
            JsonNode places = interests.path("places");
            if (places.isArray()) {
                List<Object> placeList = new ArrayList<>();
                int count = 0;
                for (JsonNode place : places) {
                    if (count >= 3) break; // 최대 3개
                    placeList.add(place.asText());
                    count++;
                }
                filters.put("places", placeList);
            }
            
            // 5. 편의시설 매핑 (1개만)
            JsonNode needs = interests.path("needs");
            if (needs.isArray() && needs.size() > 0) {
                List<Object> needsList = new ArrayList<>();
                needsList.add(needs.get(0).asText()); // 첫 번째만
                filters.put("needs", needsList);
            }
            
        } catch (JsonProcessingException e) {
            log.error("사용자 관심사 파싱 실패: {}", e.getMessage());
        }
        
        return filters;
    }

    /**
     * 🆕 개선된 필터 옵션 조회 (5개 질문 구조)
     */
    public Map<String, Object> getFilterOptions() {
        Map<String, Object> options = new HashMap<>();
        
        // 1. 지역 옵션 (17개 광역시도)
        options.put("regions", new String[]{
            "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
            "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
        });
        
        // 2. 테마 옵션 (최대 3개 선택)
        options.put("themes", new String[]{
            "자연", "문화/역사", "체험", "힐링", "축제/공연"
        });
        
        // 3. 활동 옵션 (최대 3개 선택, 맛집 탐방 제거)
        options.put("activities", new String[]{
            "문화체험", "자연감상", "액티비티", "쇼핑", "건강관리", "휴식", "사진촬영", "학습"
        });
        
        // 4. 장소 옵션 (최대 3개 선택)
        options.put("places", new String[]{
            "해변", "산", "도시", "시골", "호수", "온천지역", "섬지역"
        });
        
        // 5. 편의시설 옵션 (1개 선택)
        options.put("needs", new String[]{
            "휠체어 접근", "유아시설", "의료시설 근처", "해당없음"
        });
        
        return options;
    }

    /**
     * 관광지 상세 정보 조회
     */
    public Map<String, Object> getTourDetail(String contentId) {
        try {
            String url = String.format("%s/detailCommon2?serviceKey=%s&MobileOS=ETC&MobileApp=MyApp&_type=json&contentId=%s&defaultYN=Y&firstImageYN=Y&areacodeYN=Y&catcodeYN=Y&addrinfoYN=Y&mapinfoYN=Y&overviewYN=Y",
                    baseUrl, serviceKey, contentId);
            
            log.info("관광지 상세 정보 조회: {}", contentId);
            
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());
            
            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();
            
            if (!"0000".equals(resultCode)) {
                return Map.of("success", false, "message", "상세 정보를 찾을 수 없습니다");
            }
            
            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            
            if (items.isArray() && items.size() > 0) {
                JsonNode item = items.get(0);
                
                // 이미지 최적화 적용
                ObjectNode processedItem = (ObjectNode) item.deepCopy();
                String firstImage = item.path("firstimage").asText("");
                String cat1 = item.path("cat1").asText("");
                String optimizedImage = optimizeImageUrl(firstImage, cat1);
                processedItem.put("optimizedImage", optimizedImage);
                processedItem.put("categoryName", getCategoryDisplayName(cat1));
                
                return Map.of("success", true, "data", processedItem);
            } else {
                return Map.of("success", false, "message", "상세 정보가 없습니다");
            }
            
        } catch (Exception e) {
            log.error("관광지 상세 정보 조회 실패: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "상세 정보 조회에 실패했습니다");
        }
    }

    /**
     * 지역 코드 목록 조회
     */
    public Map<String, Object> getAreaCodes() {
        try {
            String url = String.format("%s/areaCode2", baseUrl);
            
            log.info("지역 코드 조회 시작");
            
            String finalUrl = url + "?serviceKey=" + serviceKey + 
                             "&numOfRows=17&MobileOS=ETC&MobileApp=MyApp&_type=json";
            
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Accept", "application/json");
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                finalUrl, 
                org.springframework.http.HttpMethod.GET, 
                entity, 
                String.class
            );
            
            String responseBody = response.getBody();
            JsonNode jsonNode = objectMapper.readTree(responseBody);
            
            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();
            String resultMsg = header.path("resultMsg").asText();
            
            if (!"0000".equals(resultCode)) {
                log.error("API 오류 응답 - 코드: {}, 메시지: {}", resultCode, resultMsg);
                return Map.of("success", false, "message", "API 오류: " + resultMsg);
            }
            
            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            log.info("조회된 지역 개수: {}", items.size());
            
            return Map.of("success", true, "data", items);
            
        } catch (Exception e) {
            log.error("지역 코드 조회 중 예외 발생: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "네트워크 오류: " + e.getMessage());
        }
    }

    /**
     * 시군구 코드 목록 조회
     */
    public Map<String, Object> getSigunguCodes(String areaCode) {
        try {
            String url = String.format("%s/areaCode2", baseUrl);
            
            String finalUrl = url + "?serviceKey=" + serviceKey + 
                             "&areaCode=" + areaCode + 
                             "&numOfRows=50&pageNo=1&MobileOS=ETC&MobileApp=MyApp&_type=json";
            
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Accept", "application/json");
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                finalUrl, 
                org.springframework.http.HttpMethod.GET, 
                entity, 
                String.class
            );
            
            String responseBody = response.getBody();
            JsonNode jsonNode = objectMapper.readTree(responseBody);
            
            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();
            
            if (!"0000".equals(resultCode)) {
                return Map.of("success", false, "message", "시군구 정보를 불러오는데 실패했습니다");
            }
            
            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            return Map.of("success", true, "data", items);
            
        } catch (Exception e) {
            log.error("시군구 코드 조회 실패: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "시군구 정보를 불러오는데 실패했습니다");
        }
    }

    /**
     * 특별시/광역시 확인 (구 단위 검색 제외)
     */
    public boolean isMetropolitanCity(String areaCode) {
        if (areaCode == null || areaCode.isEmpty()) return false;
        
        // 1:서울, 2:인천, 3:대전, 4:대구, 5:광주, 6:부산, 7:울산, 8:세종
        List<String> metropolitanCities = List.of("1", "2", "3", "4", "5", "6", "7", "8");
        return metropolitanCities.contains(areaCode);
    }

    /**
     * 🆕 지역명을 지역코드로 변환
     */
    public String getAreaCodeByName(String areaName) {
        if (areaName == null || areaName.trim().isEmpty()) return "";
        
        Map<String, String> areaMap = new HashMap<>();
        areaMap.put("서울", "1");
        areaMap.put("서울특별시", "1");
        areaMap.put("인천", "2");
        areaMap.put("인천광역시", "2");
        areaMap.put("대전", "3");
        areaMap.put("대전광역시", "3");
        areaMap.put("대구", "4");
        areaMap.put("대구광역시", "4");
        areaMap.put("광주", "5");
        areaMap.put("광주광역시", "5");
        areaMap.put("부산", "6");
        areaMap.put("부산광역시", "6");
        areaMap.put("울산", "7");
        areaMap.put("울산광역시", "7");
        areaMap.put("세종", "8");
        areaMap.put("세종특별자치시", "8");
        areaMap.put("경기", "31");
        areaMap.put("경기도", "31");
        areaMap.put("강원", "32");
        areaMap.put("강원특별자치도", "32");
        areaMap.put("충북", "33");
        areaMap.put("충청북도", "33");
        areaMap.put("충남", "34");
        areaMap.put("충청남도", "34");
        areaMap.put("경북", "35");
        areaMap.put("경상북도", "35");
        areaMap.put("경남", "36");
        areaMap.put("경상남도", "36");
        areaMap.put("전북", "37");
        areaMap.put("전북특별자치도", "37");
        areaMap.put("전남", "38");
        areaMap.put("전라남도", "38");
        areaMap.put("제주", "39");
        areaMap.put("제주특별자치도", "39");
        
        return areaMap.getOrDefault(areaName.trim(), "");
    }

    /**
     * 🆕 추천 관광지 조회 (사용자 관심사 기반)
     */
    public Map<String, Object> getRecommendedTours(String userInterests, int numOfRows) {
        try {
            if (userInterests == null || userInterests.trim().isEmpty()) {
                return getPopularTours(numOfRows);
            }
            
            Map<String, Object> interests = mapUserInterestsToFilters(userInterests);
            
            // 관심사 기반 검색 파라미터 구성
            Map<String, String> searchParams = new HashMap<>();
            searchParams.put("numOfRows", String.valueOf(numOfRows));
            searchParams.put("pageNo", "1");
            
            // 첫 번째 관심 지역 적용
            @SuppressWarnings("unchecked")
            List<Object> regions = (List<Object>) interests.get("regions");
            if (regions != null && !regions.isEmpty()) {
                String regionName = regions.get(0).toString();
                String areaCode = getAreaCodeByName(regionName);
                if (!areaCode.isEmpty()) {
                    searchParams.put("areaCode", areaCode);
                }
            }
            
            // 첫 번째 관심 테마 적용 (메인 3개만)
            @SuppressWarnings("unchecked")
            Map<String, String> themes = (Map<String, String>) interests.get("themes");
            if (themes != null && !themes.isEmpty()) {
                String firstThemeCode = themes.keySet().iterator().next();
                if (List.of("A01", "A02", "A03").contains(firstThemeCode)) {
                    searchParams.put("cat1", firstThemeCode);
                }
            }
            
            // 활동을 JSON 배열 형태로 변환
            @SuppressWarnings("unchecked")
            List<Object> activities = (List<Object>) interests.get("activities");
            if (activities != null && !activities.isEmpty()) {
                try {
                    String activitiesJson = objectMapper.writeValueAsString(activities);
                    searchParams.put("activities", activitiesJson);
                } catch (Exception e) {
                    log.warn("활동 JSON 변환 실패: {}", e.getMessage());
                }
            }
            
            // 장소를 JSON 배열 형태로 변환
            @SuppressWarnings("unchecked")
            List<Object> places = (List<Object>) interests.get("places");
            if (places != null && !places.isEmpty()) {
                try {
                    String placesJson = objectMapper.writeValueAsString(places);
                    searchParams.put("places", placesJson);
                } catch (Exception e) {
                    log.warn("장소 JSON 변환 실패: {}", e.getMessage());
                }
            }
            
            Map<String, Object> result = searchTours(searchParams);
            
            if ((Boolean) result.get("success")) {
                result.put("recommendationType", "interests");
                result.put("message", "관심사 기반 추천");
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("추천 관광지 조회 실패: {}", e.getMessage(), e);
            return getPopularTours(numOfRows);
        }
    }

    /**
     * 🆕 인기 관광지 조회 (fallback)
     */
    public Map<String, Object> getPopularTours(int numOfRows) {
        Map<String, String> params = Map.of(
            "numOfRows", String.valueOf(numOfRows),
            "pageNo", "1",
            "areaCode", "1" // 서울 지역의 인기 관광지
        );
        
        Map<String, Object> result = searchTours(params);
        
        if ((Boolean) result.get("success")) {
            result.put("recommendationType", "popular");
            result.put("message", "인기 관광지");
        }
        
        return result;
    }

    /**
     * 🆕 큐레이션 투어 데이터 생성 (메인 3개 카테고리 균등분배)
     */
    public Map<String, Object> getCurationTourData(Map<String, String> params) {
        try {
            List<JsonNode> allTours = new ArrayList<>();
            String[] mainCategories = {"A01", "A02", "A03"}; // 자연, 인문, 레포츠
            String[] categoryNames = {"자연", "문화", "레포츠"};
            
            int totalCount = Integer.parseInt(params.getOrDefault("numOfRows", "9"));
            int perCategory = Math.max(1, totalCount / 3); // 카테고리당 최소 1개
            
            log.info("큐레이션 투어 생성 - 총 {}개, 카테고리당 {}개", totalCount, perCategory);
            
            // 각 메인 카테고리별로 검색
            for (int i = 0; i < mainCategories.length; i++) {
                Map<String, String> categoryParams = new HashMap<>(params);
                categoryParams.put("cat1", mainCategories[i]);
                categoryParams.put("numOfRows", String.valueOf(perCategory));
                categoryParams.put("pageNo", "1");
                
                Map<String, Object> categoryResult = searchTours(categoryParams);
                
                if ((Boolean) categoryResult.get("success")) {
                    JsonNode categoryTours = (JsonNode) categoryResult.get("data");
                    if (categoryTours.isArray()) {
                        for (JsonNode tour : categoryTours) {
                            allTours.add(tour);
                            if (allTours.size() >= totalCount) break;
                        }
                        log.info("{} 카테고리에서 {}개 추가", categoryNames[i], categoryTours.size());
                    }
                }
                
                if (allTours.size() >= totalCount) break;
            }
            
            // 결과가 부족한 경우 추가 검색
            if (allTours.size() < totalCount) {
                Map<String, String> additionalParams = new HashMap<>(params);
                additionalParams.put("numOfRows", String.valueOf(totalCount - allTours.size()));
                additionalParams.remove("cat1"); // 전체 카테고리에서 검색
                
                Map<String, Object> additionalResult = searchTours(additionalParams);
                if ((Boolean) additionalResult.get("success")) {
                    JsonNode additionalTours = (JsonNode) additionalResult.get("data");
                    if (additionalTours.isArray()) {
                        for (JsonNode tour : additionalTours) {
                            allTours.add(tour);
                            if (allTours.size() >= totalCount) break;
                        }
                    }
                }
            }
            
            // JSON 배열로 변환
            ArrayNode resultArray = objectMapper.createArrayNode();
            for (JsonNode tour : allTours) {
                resultArray.add(tour);
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", resultArray);
            result.put("totalCount", allTours.size());
            result.put("categoryDistribution", Map.of(
                "자연", Math.min(perCategory, allTours.size()),
                "문화", Math.min(perCategory, Math.max(0, allTours.size() - perCategory)), 
                "레포츠", Math.min(perCategory, Math.max(0, allTours.size() - 2 * perCategory))
            ));
            result.put("curationType", "balanced");
            result.put("message", "메인 3개 카테고리 균형잡힌 큐레이션 투어");
            
            log.info("큐레이션 투어 생성 완료 - 총 {}개 (균등분배)", allTours.size());
            
            return result;
            
        } catch (Exception e) {
            log.error("큐레이션 투어 생성 실패: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "큐레이션 투어 생성에 실패했습니다");
        }
    }

    /**
     * 🆕 빠른 필터 적용 (개선된 가이드 반영)
     */
    public Map<String, String> getQuickFilterParams(String filterType) {
        Map<String, String> params = new HashMap<>();
        params.put("numOfRows", "10");
        params.put("pageNo", "1");
        
        switch (filterType) {
            case "nature":
                params.put("cat1", "A01"); // 자연
                break;
            case "culture":
                params.put("cat1", "A02"); // 인문
                break;
            case "activity":
                params.put("cat1", "A03"); // 레포츠
                break;
            default:
                // 기본값: 인기 관광지
                params.put("areaCode", "1"); // 서울
                break;
        }
        
        return params;
    }

    /**
     * 🆕 검색 통계 정보 반환
     */
    public Map<String, Object> getSearchStatistics() {
        Map<String, Object> stats = new HashMap<>();
        
        // 실제 환경에서는 데이터베이스에서 조회
        stats.put("totalSearches", 12543);
        stats.put("popularRegions", List.of("서울", "부산", "제주", "경기", "강릉"));
        stats.put("popularThemes", List.of("자연", "문화/역사", "체험")); // 메인 3개 반영
        stats.put("todaySearches", 1247);
        
        return Map.of("success", true, "data", stats);
    }

    /**
     * 🎯 대분류 카테고리 목록 (메인 3개만)
     */
    public Map<String, Object> getCategoryMain() {
        Map<String, Object> categories = new HashMap<>();
        // 메인 검색 대상만 포함
        categories.put("A01", "자연");
        categories.put("A02", "인문(문화/예술/역사)");
        categories.put("A03", "레포츠");
        
        return Map.of("success", true, "data", categories);
    }

    /**
     * 중분류 카테고리 목록 (메인 3개 카테고리만)
     */
    public Map<String, Object> getCategoryMiddle(String cat1) {
        Map<String, Map<String, String>> middleCategories = new HashMap<>();
        
        // 자연 (A01)
        Map<String, String> nature = new HashMap<>();
        nature.put("A0101", "자연관광지");
        nature.put("A0102", "관광자원");
        middleCategories.put("A01", nature);
        
        // 인문 (A02)
        Map<String, String> culture = new HashMap<>();
        culture.put("A0201", "역사관광지");
        culture.put("A0202", "휴양관광지");
        culture.put("A0203", "체험관광지");
        culture.put("A0204", "산업관광지");
        culture.put("A0205", "건축/조형물");
        culture.put("A0206", "문화시설");
        culture.put("A0207", "축제");
        culture.put("A0208", "공연/행사");
        middleCategories.put("A02", culture);
        
        // 레포츠 (A03)
        Map<String, String> sports = new HashMap<>();
        sports.put("A0301", "레포츠소개");
        sports.put("A0302", "육상 레포츠");
        sports.put("A0303", "수상 레포츠");
        sports.put("A0304", "항공 레포츠");
        sports.put("A0305", "복합 레포츠");
        middleCategories.put("A03", sports);
        
        Map<String, String> result = middleCategories.get(cat1);
        if (result != null) {
            return Map.of("success", true, "data", result);
        } else {
            return Map.of("success", false, "message", "해당 대분류의 중분류를 찾을 수 없습니다.");
        }
    }

    /**
     * 소분류 카테고리 API 호출
     */
    public Map<String, Object> getCategorySmall(String cat1, String cat2) {
        try {
            String url = String.format("%s/categoryCode2?serviceKey=%s&MobileOS=ETC&MobileApp=MyApp&_type=json&cat1=%s&cat2=%s&numOfRows=50",
                    baseUrl, serviceKey, cat1, cat2);
            
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());
            
            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();
            
            if (!"0000".equals(resultCode)) {
                return Map.of("success", false, "message", "소분류 정보를 불러오는데 실패했습니다.");
            }
            
            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            return Map.of("success", true, "data", items);
            
        } catch (Exception e) {
            log.error("소분류 카테고리 조회 실패: {}", e.getMessage());
            return Map.of("success", false, "message", "소분류 정보를 불러오는데 실패했습니다.");
        }
    }

    /**
     * 🎨 지역+테마 조합 추천코스 조회
     */
    public Map<String, Object> getCoursesByTheme(String areaCode, String themeCode, String sigunguCode) {
        try {
            StringBuilder urlBuilder = new StringBuilder();
            urlBuilder.append(baseUrl).append("/areaBasedList2")
                    .append("?serviceKey=").append(serviceKey)
                    .append("&MobileOS=ETC&MobileApp=MyApp")
                    .append("&numOfRows=10&pageNo=1")
                    .append("&contentTypeId=25") // 여행코스
                    .append("&cat1=C01") // 추천코스 대분류
                    .append("&areaCode=").append(areaCode)
                    .append("&_type=json");

            // 시군구코드 (특별시/광역시가 아닌 경우만)
            if (sigunguCode != null && !sigunguCode.isEmpty() && !isMetropolitanCity(areaCode)) {
                urlBuilder.append("&sigunguCode=").append(sigunguCode);
            }

            // 테마코드가 있으면 추가 (A01, A02, A03만)
            if (themeCode != null && List.of("A01", "A02", "A03").contains(themeCode)) {
                // C01 코스 중에서 특정 테마와 관련된 코스 검색을 위한 키워드 추가
                String themeKeyword = getThemeKeywordForSearch(themeCode);
                if (!themeKeyword.isEmpty()) {
                    urlBuilder.append("&keyword=").append(URLEncoder.encode(themeKeyword, StandardCharsets.UTF_8));
                }
            }

            log.info("지역+테마 조합 코스 조회 URL: {}", urlBuilder.toString());

            ResponseEntity<String> response = restTemplate.getForEntity(urlBuilder.toString(), String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();

            if (!"0000".equals(resultCode)) {
                log.error("지역+테마 코스 API 오류 - 코드: {}", resultCode);
                return Map.of("success", false, "message", "지역+테마 조합 코스 조회 실패");
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            JsonNode processedItems = processTourData(items);

            log.info("지역+테마 조합 코스 조회 완료 - {}개", processedItems.size());

            return Map.of(
                "success", true, 
                "data", processedItems,
                "type", "coursesByTheme",
                "combination", areaCode + "+" + themeCode,
                "message", "선택하신 지역과 테마에 맞는 추천 코스"
            );

        } catch (Exception e) {
            log.error("지역+테마 조합 코스 조회 실패: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "지역+테마 조합 코스 조회에 실패했습니다");
        }
    }

    /**
     * 🎯 지역+활동 조합 추천코스 조회
     */
    public Map<String, Object> getCoursesByActivity(String areaCode, String activity, String sigunguCode) {
        try {
            StringBuilder urlBuilder = new StringBuilder();
            urlBuilder.append(baseUrl).append("/areaBasedList2")
                    .append("?serviceKey=").append(serviceKey)
                    .append("&MobileOS=ETC&MobileApp=MyApp")
                    .append("&numOfRows=10&pageNo=1")
                    .append("&contentTypeId=25") // 여행코스
                    .append("&cat1=C01") // 추천코스 대분류
                    .append("&areaCode=").append(areaCode)
                    .append("&_type=json");

            // 시군구코드 (특별시/광역시가 아닌 경우만)
            if (sigunguCode != null && !sigunguCode.isEmpty() && !isMetropolitanCity(areaCode)) {
                urlBuilder.append("&sigunguCode=").append(sigunguCode);
            }

            // 활동별 키워드 검색
            if (activity != null && !activity.trim().isEmpty()) {
                String activityKeyword = getActivityKeywordForSearch(activity);
                if (!activityKeyword.isEmpty()) {
                    urlBuilder.append("&keyword=").append(URLEncoder.encode(activityKeyword, StandardCharsets.UTF_8));
                }
            }

            log.info("지역+활동 조합 코스 조회 URL: {}", urlBuilder.toString());

            ResponseEntity<String> response = restTemplate.getForEntity(urlBuilder.toString(), String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();

            if (!"0000".equals(resultCode)) {
                log.error("지역+활동 코스 API 오류 - 코드: {}", resultCode);
                return Map.of("success", false, "message", "지역+활동 조합 코스 조회 실패");
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            JsonNode processedItems = processTourData(items);

            log.info("지역+활동 조합 코스 조회 완료 - {}개", processedItems.size());

            return Map.of(
                "success", true, 
                "data", processedItems,
                "type", "coursesByActivity",
                "combination", areaCode + "+" + activity,
                "message", "선택하신 지역과 활동에 맞는 추천 코스"
            );

        } catch (Exception e) {
            log.error("지역+활동 조합 코스 조회 실패: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "지역+활동 조합 코스 조회에 실패했습니다");
        }
    }

    /**
     * 🆕 테마코드를 검색 키워드로 변환
     */
    private String getThemeKeywordForSearch(String themeCode) {
        Map<String, String> themeKeywords = new HashMap<>();
        themeKeywords.put("A01", "자연 관광 힐링"); // 자연
        themeKeywords.put("A02", "문화 역사 전통"); // 인문
        themeKeywords.put("A03", "체험 액티비티 레포츠"); // 레포츠
        
        return themeKeywords.getOrDefault(themeCode, "");
    }

    /**
     * 🆕 활동을 검색 키워드로 변환
     */
    private String getActivityKeywordForSearch(String activity) {
        Map<String, String> activityKeywords = new HashMap<>();
        activityKeywords.put("문화체험", "문화 체험 전통");
        activityKeywords.put("자연감상", "자연 힐링 경치");
        activityKeywords.put("액티비티", "체험 활동 레포츠");
        activityKeywords.put("쇼핑", "쇼핑 시장 상가");
        activityKeywords.put("건강관리", "힐링 휴양 건강");
        activityKeywords.put("휴식", "휴양 힐링 휴식");
        activityKeywords.put("사진촬영", "포토존 사진 경치");
        activityKeywords.put("학습", "교육 학습 체험");
        
        return activityKeywords.getOrDefault(activity, activity);
    }
}