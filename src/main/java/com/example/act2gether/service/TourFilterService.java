package com.example.act2gether.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
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
     * 이미지 URL 최적화
     */
    private String optimizeImageUrl(String imageUrl, String category) {
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            return "/uploads/tour/no-image.png";
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
     * ✅ 관광지 데이터 후처리
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
            processedItem.put("hasRealImage", !optimizedImage.equals("/uploads/tour/no-image.png"));
            processedItem.put("categoryName", getCategoryDisplayName(cat1));

            // 주소 정보 정리
            String addr1 = item.path("addr1").asText("");
            String addr2 = item.path("addr2").asText("");
            String fullAddress = addr1 + (addr2.isEmpty() ? "" : " " + addr2);
            processedItem.put("fullAddress", fullAddress.trim());

            // 제목 정리 (HTML 태그 제거)
            String title = item.path("title").asText("").replaceAll("<[^>]*>", "");
            processedItem.put("cleanTitle", title);

            processedItems.add(processedItem);
        }

        return processedItems;
    }

    /**
     * 카테고리 코드를 표시명으로 변환
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
     * 🎯 개선된 관광지 검색 (다중 조건 지원) - 파라미터 전달 문제 수정
     * 5개 질문 구조: 지역(1개) + 테마/활동/장소(각각 최대3개) + 편의시설(1개)
     * 지역 파라미터 누락 문제 해결
     */
    /**
     * 키워드 제거하고 cat2/cat3 정확히 매핑
     * TourFilterService.java의 searchTours() 메서드 수정
     */
    /**
     * 🆕 다중 선택 OR 검색 구현 (수정된 버전)
     */
    public Map<String, Object> searchTours(Map<String, String> params) {
        try {
            log.info("🔍 다중 선택 OR 검색 시작: {}", params);

            // 1. 기본 파라미터 추출
            String areaCode = params.get("areaCode");
            String sigunguCode = params.get("sigunguCode");
            int numOfRows = Integer.parseInt(params.getOrDefault("numOfRows", "6"));
            
            // 2. 다중 선택 값들 파싱 (수정됨)
            List<String> themes = extractSelectedThemes(params);
            List<String> activities = extractSelectedActivities(params);  
            List<String> places = extractSelectedPlaces(params);
            
            log.info("📋 선택된 값들 - 테마: {}, 활동: {}, 장소: {}", themes, activities, places);

            // 3. 검색 조합 생성
            List<SearchParam> searchParams = generateSearchCombinations(areaCode, sigunguCode, themes, activities, places);
            log.info("🔄 생성된 검색 조합: {}개", searchParams.size());

            // 조합 상세 로그 추가
            for (int i = 0; i < searchParams.size(); i++) {
                log.info("조합 {}: {}", i+1, searchParams.get(i));
            }

            // 4. 각 조합별로 API 호출
            List<JsonNode> allResults = new ArrayList<>();
            Set<String> seenContentIds = new HashSet<>();
            int successfulCalls = 0;
            
            for (SearchParam searchParam : searchParams) {
                List<JsonNode> results = callTourApiForCombination(searchParam);
                
                if (!results.isEmpty()) {
                    successfulCalls++;
                    // 중복 제거하며 병합
                    for (JsonNode result : results) {
                        String contentId = result.path("contentid").asText();
                        if (!seenContentIds.contains(contentId)) {
                            seenContentIds.add(contentId);
                            allResults.add(result);
                        }
                    }
                }
            }

            log.info("✅ API 호출 완료 - 총 {}회 시도, {}회 성공, 중복제거 후 {}개 결과", 
                    searchParams.size(), successfulCalls, allResults.size());

            // 5. 결과가 없을 때 fallback 검색
            if (allResults.isEmpty()) {
                log.info("🔄 결과 없음 - 단순 검색으로 fallback");
                return fallbackSimpleSearch(params);
            }

            // 6. 결과 선별 (numOfRows 개수만큼)
            List<JsonNode> finalResults = selectFinalResults(allResults, numOfRows, themes, activities, places);

            // 7. 데이터 후처리
            JsonNode processedItems = processTourData(objectMapper.valueToTree(finalResults));

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", processedItems);
            result.put("totalFound", allResults.size());
            result.put("finalCount", finalResults.size());
            result.put("apiCalls", searchParams.size());
            result.put("successfulCalls", successfulCalls);
            result.put("multiSearch", true);
            result.put("searchSummary", String.format("테마 %d개 × 활동 %d개 × 장소 %d개 = %d개 조합", 
                    themes.size(), activities.size(), places.size(), searchParams.size()));

            return result;

        } catch (Exception e) {
            log.error("❌ 다중 검색 실패: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "검색에 실패했습니다: " + e.getMessage());
        }
    }
    /**
     * 🆕 검색 파라미터 클래스
     */
    private static class SearchParam {
        String areaCode;
        String sigunguCode;
        String cat1;
        String cat2;
        String cat3;
        
        public SearchParam(String areaCode, String sigunguCode, String cat1, String cat2, String cat3) {
            this.areaCode = areaCode;
            this.sigunguCode = sigunguCode;
            this.cat1 = cat1;
            this.cat2 = cat2;
            this.cat3 = cat3;
        }
        
        @Override
        public String toString() {
            return String.format("SearchParam{cat1='%s', cat2='%s', cat3='%s'}", cat1, cat2, cat3);
        }
    }
    /**
     * 🔧 수정된 테마 추출 로직 (핵심 수정)
     */
    private List<String> extractSelectedThemes(Map<String, String> params) {
        List<String> themes = new ArrayList<>();
        
        // 1. themes 파라미터에서 추출 (JSON 배열 또는 콤마 구분)
        String themesParam = params.get("themes");
        if (themesParam != null && !themesParam.isEmpty()) {
            log.info("🔍 테마 파라미터 원본: {}", themesParam);
            
            List<String> themeNames = parseMultiSelectValue(themesParam);
            log.info("🔍 파싱된 테마들: {}", themeNames);
            
            for (String themeName : themeNames) {
                String cat1Code = mapThemeToCategory(themeName);
                log.info("🔍 테마 매핑: {} → {}", themeName, cat1Code);
                
                if (cat1Code != null && List.of("A01", "A02", "A03").contains(cat1Code)) {
                    if (!themes.contains(cat1Code)) {
                        themes.add(cat1Code);
                        log.info("✅ 테마 추가: {}", cat1Code);
                    }
                }
            }
        }
        
        // 2. cat1 파라미터에서도 추출 (fallback)
        String cat1 = params.get("cat1");
        if (cat1 != null && !cat1.isEmpty() && themes.isEmpty()) {
            themes.add(cat1);
            log.info("✅ fallback으로 cat1 사용: {}", cat1);
        }
        
        // 3. 기본값: 자연
        if (themes.isEmpty()) {
            themes.add("A01");
            log.info("✅ 기본 테마 설정: A01 (자연)");
        }
        
        log.info("🎯 최종 선택된 테마들: {}", themes);
        return themes.stream().distinct().collect(Collectors.toList());
    }

    /**
     * 🔧 수정된 활동 추출 로직
     */
    private List<String> extractSelectedActivities(Map<String, String> params) {
        List<String> activities = new ArrayList<>();
        
        String activitiesParam = params.get("activities");
        if (activitiesParam != null && !activitiesParam.isEmpty()) {
            log.info("🔍 활동 파라미터 원본: {}", activitiesParam);
            
            List<String> activityNames = parseMultiSelectValue(activitiesParam);
            log.info("🔍 파싱된 활동들: {}", activityNames);
            
            for (String activityName : activityNames) {
                String cat2Code = mapActivityToCat2(activityName);
                log.info("🔍 활동 매핑: {} → {}", activityName, cat2Code);
                
                if (cat2Code != null && !cat2Code.isEmpty()) {
                    if (!activities.contains(cat2Code)) {
                        activities.add(cat2Code);
                        log.info("✅ 활동 추가: {}", cat2Code);
                    }
                }
            }
        }
        
        // 활동이 없으면 null (cat2 없이 검색)
        if (activities.isEmpty()) {
            activities.add(null);
            log.info("✅ 활동 없음 - null 추가");
        }
        
        log.info("🎯 최종 선택된 활동들: {}", activities);
        return activities;
    }

    /**
     * 🔧 수정된 장소 추출 로직
     */
    private List<String> extractSelectedPlaces(Map<String, String> params) {
        List<String> places = new ArrayList<>();
        
        String placesParam = params.get("places");
        if (placesParam != null && !placesParam.isEmpty()) {
            log.info("🔍 장소 파라미터 원본: {}", placesParam);
            
            List<String> placeNames = parseMultiSelectValue(placesParam);
            log.info("🔍 파싱된 장소들: {}", placeNames);
            
            for (String placeName : placeNames) {
                String cat3Code = mapPlaceToCat3(placeName);
                log.info("🔍 장소 매핑: {} → {}", placeName, cat3Code);
                
                if (cat3Code != null && !cat3Code.isEmpty()) {
                    if (!places.contains(cat3Code)) {
                        places.add(cat3Code);
                        log.info("✅ 장소 추가: {}", cat3Code);
                    }
                }
            }
        }
        
        // 장소가 없으면 null (cat3 없이 검색)
        if (places.isEmpty()) {
            places.add(null);
            log.info("✅ 장소 없음 - null 추가");
        }
        
        log.info("🎯 최종 선택된 장소들: {}", places);
        return places;
    }
     /**
     * 🔧 수정된 검색 조합 생성 (데카르트 곱) (디버깅 로그 추가)
     */
    /**
     * 🎯 개선된 검색 조합 생성 - 논리적으로 유효한 조합만 생성
     */
    private List<SearchParam> generateSearchCombinations(String areaCode, String sigunguCode,
                                                        List<String> themes, 
                                                        List<String> activities, 
                                                        List<String> places) {
        List<SearchParam> combinations = new ArrayList<>();
        
        log.info("🔄 조합 생성 시작 - 테마:{}개, 활동:{}개, 장소:{}개", themes.size(), activities.size(), places.size());
        
        // 테마 × 활동 × 장소 조합 생성 (논리적 검증 포함)
        int combinationCount = 0;
        for (String theme : themes) {
            for (String activity : activities) {
                for (String place : places) {
                    
                    // 🎯 논리적 조합 검증
                    if (isLogicalCombination(theme, activity, place)) {
                        SearchParam param = new SearchParam(areaCode, sigunguCode, theme, activity, place);
                        combinations.add(param);
                        combinationCount++;
                        log.info("조합 {}: 테마:{}, 활동:{}, 장소:{} ✅", combinationCount, theme, activity, place);
                    } else {
                        log.info("❌ 논리적으로 맞지 않는 조합 스킵: 테마:{}, 활동:{}, 장소:{}", theme, activity, place);
                    }
                }
            }
        }
        
        // 동적 제한 (기존 로직 유지)
        int maxCombinations;
        int totalCombinations = combinations.size();
        
        if (totalCombinations <= 6) {
            maxCombinations = totalCombinations;
        } else if (totalCombinations <= 12) {
            maxCombinations = 12;
        } else if (totalCombinations <= 18) {
            maxCombinations = 15;
        } else {
            maxCombinations = 18;
        }
        
        if (combinations.size() > maxCombinations) {
            log.warn("⚠️ 검색 조합이 {}개로 많아서 {}개로 제한", combinations.size(), maxCombinations);
            
            // 우선순위 기반 선별 (첫 번째 테마 우선)
            List<SearchParam> prioritized = new ArrayList<>();
            String firstTheme = themes.get(0);
            
            for (SearchParam param : combinations) {
                if (firstTheme.equals(param.cat1)) {
                    prioritized.add(param);
                }
            }
            
            for (SearchParam param : combinations) {
                if (!firstTheme.equals(param.cat1) && prioritized.size() < maxCombinations) {
                    prioritized.add(param);
                }
            }
            
            combinations = prioritized.subList(0, Math.min(maxCombinations, prioritized.size()));
            log.info("🎯 우선순위 적용 완료 - 첫 번째 테마({}) 우선 선별", firstTheme);
        }
        
        log.info("🎯 최종 생성된 조합 수: {}개", combinations.size());
        return combinations;
    }
    
    /**
     * 🆕 논리적 조합 검증 메서드
     */
    private boolean isLogicalCombination(String cat1, String cat2, String cat3) {
        // cat2나 cat3가 null인 경우는 항상 허용 (넓은 검색)
        if (cat2 == null || cat3 == null) {
            return true;
        }
        
        // 🎯 테마-활동 조합 검증
        Map<String, List<String>> themeActivityMap = new HashMap<>();
        themeActivityMap.put("A01", List.of("A0101", "A0102")); // 자연 → 자연감상, 관광자원
        themeActivityMap.put("A02", List.of("A0201", "A0202", "A0203", "A0206", "A0207", "A0208")); // 문화 → 문화활동들
        themeActivityMap.put("A03", List.of("A0301", "A0302", "A0303", "A0304", "A0305")); // 레포츠 → 레포츠활동들
        
        List<String> validActivities = themeActivityMap.get(cat1);
        if (validActivities != null && !validActivities.contains(cat2)) {
            log.debug("❌ 테마-활동 불일치: {} + {}", cat1, cat2);
            return false;
        }
        
        // 🎯 테마-장소 조합 검증 (더 유연하게)
        Map<String, List<String>> themePlaceMap = new HashMap<>();
        
        // 자연 테마는 자연 장소 + 일부 문화 장소(산속 사찰 등) 허용
        themePlaceMap.put("A01", List.of(
            "A01011200", "A01010400", "A01010900", "A01011700", "A01011300", 
            "A01011900", "A01010700", "A01010600", // 자연 장소
            "A02010800" // 사찰 (자연 속 사찰 허용)
        ));
        
        // 문화 테마는 모든 문화 장소 + 자연 장소 허용 (문화유적지가 자연 속에 있을 수 있음)
        themePlaceMap.put("A02", List.of(
            "A02010800", "A02010100", "A02010600", "A02010700", 
            "A02060100", "A02060500", "A02060300", "A02060700", // 문화 장소
            "A01011200", "A01010400" // 해변/산 (해변가 문화재, 산속 사찰 등)
        ));
        
        // 레포츠 테마는 레포츠 장소 + 자연 장소 허용
        themePlaceMap.put("A03", List.of(
            "A03020700", "A03021200", "A03021700", // 레포츠 장소
            "A01011200", "A01010400", "A01010900", "A01011700" // 자연 장소 (자연 레포츠)
        ));
        
        List<String> validPlaces = themePlaceMap.get(cat1);
        if (validPlaces != null && !validPlaces.contains(cat3)) {
            log.debug("❌ 테마-장소 불일치: {} + {}", cat1, cat3);
            return false;
        }
        
        log.debug("✅ 유효한 조합: cat1={}, cat2={}, cat3={}", cat1, cat2, cat3);
        return true;
    }


    /**
     * 🆕 단일 조합에 대한 API 호출
     */
    private List<JsonNode> callTourApiForCombination(SearchParam searchParam) {
        try {
            StringBuilder urlBuilder = new StringBuilder();
            urlBuilder.append(baseUrl).append("/areaBasedList2")
                    .append("?serviceKey=").append(serviceKey)
                    .append("&MobileOS=ETC&MobileApp=MyApp")
                    .append("&contentTypeId=12")
                    .append("&_type=json");

            // 지역 파라미터
            if (searchParam.areaCode != null) {
                urlBuilder.append("&areaCode=").append(searchParam.areaCode);
            }
            
            if (searchParam.sigunguCode != null && !isMetropolitanCity(searchParam.areaCode)) {
                urlBuilder.append("&sigunguCode=").append(searchParam.sigunguCode);
            }
            
            // 카테고리 파라미터
            if (searchParam.cat1 != null) {
                urlBuilder.append("&cat1=").append(searchParam.cat1);
            }
            
            if (searchParam.cat2 != null) {
                urlBuilder.append("&cat2=").append(searchParam.cat2);
            }
            
            if (searchParam.cat3 != null) {
                urlBuilder.append("&cat3=").append(searchParam.cat3);
            }
            
            urlBuilder.append("&numOfRows=10"); // 조합당 10개씩
            urlBuilder.append("&pageNo=1");

            String url = urlBuilder.toString();
            log.debug("🔍 API 호출: {}", searchParam);

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();
            
            if (!"0000".equals(resultCode)) {
                log.warn("⚠️ API 호출 실패: {} - {}", searchParam, header.path("resultMsg").asText());
                return new ArrayList<>();
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            List<JsonNode> results = new ArrayList<>();
            
            if (items.isArray()) {
                for (JsonNode item : items) {
                    results.add(item);
                }
            } else if (!items.isMissingNode()) {
                results.add(items);
            }

            log.debug("✅ API 결과: {} → {}개", searchParam, results.size());
            return results;

        } catch (Exception e) {
            log.warn("❌ API 호출 오류: {} - {}", searchParam, e.getMessage());
            return new ArrayList<>();
        }
    }
    /**
     * 🆕 최종 결과 선별 (관련성 기반)
     */
    private List<JsonNode> selectFinalResults(List<JsonNode> allResults, int targetCount,
                                             List<String> themes, List<String> activities, List<String> places) {
        if (allResults.size() <= targetCount) {
            return allResults;
        }
        
        // 관련성 점수로 정렬
        allResults.sort((a, b) -> {
            int scoreA = calculateRelevanceScore(a, themes, activities, places);
            int scoreB = calculateRelevanceScore(b, themes, activities, places);
            return Integer.compare(scoreB, scoreA);
        });
        
        return allResults.subList(0, targetCount);
    }
     /**
     * 🆕 관련성 점수 계산
     */
    private int calculateRelevanceScore(JsonNode item, List<String> themes, List<String> activities, List<String> places) {
        int score = 0;
        
        String cat1 = item.path("cat1").asText();
        String cat2 = item.path("cat2").asText();
        String cat3 = item.path("cat3").asText();
        
        // 카테고리 매칭 점수
        if (themes.contains(cat1)) score += 30;
        if (activities.contains(cat2)) score += 20;
        if (places.contains(cat3)) score += 15;
        
        // 이미지 보너스
        if (!item.path("firstimage").asText().isEmpty()) score += 5;
        
        // 제목 키워드 보너스
        String title = item.path("title").asText().toLowerCase();
        if (title.contains("자연") && themes.contains("A01")) score += 3;
        if (title.contains("문화") && themes.contains("A02")) score += 3;
        if (title.contains("해변") && places.contains("A01011200")) score += 3;
        if (title.contains("산") && places.contains("A01010400")) score += 3;
        
        return score;
    }
     /**
     * 🆕 fallback 단순 검색 (결과 없을 때)
     */
    private Map<String, Object> fallbackSimpleSearch(Map<String, String> params) {
        log.info("🔄 Fallback 단순 검색 시도");
        
        try {
            StringBuilder simpleUrl = new StringBuilder();
            simpleUrl.append(baseUrl).append("/areaBasedList2")
                    .append("?serviceKey=").append(serviceKey)
                    .append("&MobileOS=ETC&MobileApp=MyApp")
                    .append("&contentTypeId=12")
                    .append("&_type=json")
                    .append("&numOfRows=").append(params.getOrDefault("numOfRows", "10"))
                    .append("&pageNo=1");

            // 지역코드만 추가
            if (params.containsKey("areaCode")) {
                simpleUrl.append("&areaCode=").append(params.get("areaCode"));
            }

            // 카테고리 하나만 추가
            if (params.containsKey("cat1")) {
                simpleUrl.append("&cat1=").append(params.get("cat1"));
            }

            log.info("🔄 Fallback URL: {}", simpleUrl.toString());

            ResponseEntity<String> response = restTemplate.getForEntity(simpleUrl.toString(), String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();

            if ("0000".equals(resultCode)) {
                JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
                JsonNode processedItems = processTourData(items);
                int totalCount = jsonNode.path("response").path("body").path("totalCount").asInt(0);

                log.info("✅ Fallback 검색 성공: {} 개", totalCount);

                return Map.of(
                    "success", true,
                    "data", processedItems,
                    "totalCount", totalCount,
                    "fallback", true,
                    "message", "조건을 완화하여 검색 결과를 찾았습니다"
                );
            }

        } catch (Exception e) {
            log.error("❌ Fallback 검색도 실패: {}", e.getMessage());
        }

        return Map.of("success", false, "message", "검색 결과가 없습니다", "fallback", true);
    }
     /**
     * 활동을 cat2 코드로 매핑
     */
    private String mapActivityToCat2(String activityName) {
        Map<String, String> activityMapping = new HashMap<>();
        
        // === 문화 그룹 ===
        activityMapping.put("문화체험", "A0203");
        activityMapping.put("역사탐방", "A0201");
        activityMapping.put("박물관/전시", "A0206");
        activityMapping.put("축제/공연", "A0207");
        
        // === 자연 그룹 ===
        activityMapping.put("자연감상", "A0101");
        activityMapping.put("산책/트래킹", "A0101");
        activityMapping.put("드라이브", "A0101");
        
        // === 휴양 그룹 ===
        activityMapping.put("온천/스파", "A0202");
        activityMapping.put("휴식/힐링", "A0202");
        activityMapping.put("공원산책", "A0202");
        
        // === 레포츠 그룹 ===
        activityMapping.put("골프", "A0302");
        activityMapping.put("낚시", "A0303");
        activityMapping.put("수상레포츠", "A0303");
        activityMapping.put("액티비티", "A0302");
        
        // === 기타 ===
        activityMapping.put("쇼핑", "A04");
        
        return activityMapping.get(activityName != null ? activityName.trim() : "");
    }

    /**
     * 🎯 인수인계 문서 기반 완전한 장소 매핑
     * TourFilterService.java의 mapPlaceToCat3 메서드 완전 교체
     */
    private String mapPlaceToCat3(String placeName) {
        Map<String, String> placeMapping = new HashMap<>();
        
        // === 자연 그룹 === (A01)
        placeMapping.put("해변", "A01011200");
        placeMapping.put("산", "A01010400");
        placeMapping.put("계곡/폭포", "A01010900");
        placeMapping.put("호수", "A01011700");
        placeMapping.put("섬", "A01011300");
        placeMapping.put("동굴", "A01011900");
        placeMapping.put("수목원", "A01010700");
        placeMapping.put("자연휴양림", "A01010600");
        
        // === 문화/역사 그룹 === (A02)
        placeMapping.put("사찰", "A02010800");
        placeMapping.put("고궁", "A02010100");
        placeMapping.put("민속마을", "A02010600");
        placeMapping.put("유적지", "A02010700");
        placeMapping.put("박물관", "A02060100");
        placeMapping.put("미술관", "A02060500");
        placeMapping.put("전시관", "A02060300");
        placeMapping.put("문화원", "A02060700");
        
        // === 휴양 그룹 === (A02)
        placeMapping.put("온천", "A02020300");
        placeMapping.put("테마파크", "A02020600");
        placeMapping.put("공원", "A02020700");
        placeMapping.put("관광단지", "A02020200");
        
        // === 레저 그룹 === (A03)
        placeMapping.put("골프장", "A03020700");
        placeMapping.put("스키장", "A03021200");
        placeMapping.put("캠핑장", "A03021700");
        placeMapping.put("유람선", "A02020800");
        
        // === 기존 호환성 === (현재 사용 중인 것들)
        //placeMapping.put("도시", null);        // cat3 없이 검색
        //placeMapping.put("시골", null);        // cat3 없이 검색  
        placeMapping.put("온천지역", "A02020300"); // 온천과 동일
        placeMapping.put("섬지역", "A01011300");   // 섬과 동일
        
        String result = placeMapping.get(placeName != null ? placeName.trim() : "");
        log.info("🔍 장소 매핑: {} → {}", placeName, result);
        
        return result;
    }

    /**
     * 🆕 복수 테마에서 첫 번째 테마 추출
     */
    private String extractPrimaryTheme(String themes) {
        if (themes == null || themes.isEmpty())
            return "";

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
     * ✅ 검색 키워드 조합 생성 (활동 + 장소)
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
     * ✅ 활동을 검색 키워드로 변환
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
     * ✅ 장소를 검색 키워드로 변환
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
     * 다중 선택 값 파싱
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
     * 테마를 API 카테고리 코드로 매핑
     */
    private String mapThemeToCategory(String theme) {
        if (theme == null || theme.isEmpty())
            return null;

        Map<String, String> themeMapping = new HashMap<>();
        themeMapping.put("자연", "A01");
        themeMapping.put("문화/역사", "A02");
        themeMapping.put("문화", "A02");
        themeMapping.put("역사", "A02");
        themeMapping.put("체험", "A03");
        themeMapping.put("액티비티", "A03");
        themeMapping.put("레포츠", "A03");
        themeMapping.put("힐링", "A01");
        themeMapping.put("축제/공연", "A02");
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
                    if (count >= 3)
                        break; // 최대 3개

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
                    if (count >= 3)
                        break; // 최대 3개
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
                    if (count >= 3)
                        break; // 최대 3개
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
     * ✅ 개선된 필터 옵션 조회 (5개 질문 구조)
     */
    public Map<String, Object> getFilterOptions() {
        Map<String, Object> options = new HashMap<>();

        // 1. 지역 옵션 (17개 광역시도)
        options.put("regions", new String[] {
                "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
                "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
        });

        // 2. 테마 옵션 (대분류 - 최대 3개 선택)
        options.put("themes", new String[] {
                "자연", "문화/역사", "체험", "힐링", "축제/공연"
        });

        // 3. 활동 옵션 (중분류 - 최대 3개 선택)
        options.put("activities", new String[] {
                "문화체험", "자연감상", "액티비티", "쇼핑", "건강관리", "휴식", "사진촬영", "학습"
        });

        // 🎯 4. 장소 옵션 (소분류 - 인수인계 문서 기반 체계적 구성)
        options.put("places", new String[] {
                // === 자연 그룹 ===
                "해변", "산", "계곡/폭포", "호수", "섬", "동굴", "수목원", "자연휴양림",
                
                // === 문화/역사 그룹 ===  
                "사찰", "고궁", "민속마을", "유적지", "박물관", "미술관", "전시관", "문화원",
                
                // === 휴양 그룹 ===
                "온천", "테마파크", "공원", "관광단지",
                
                // === 레저 그룹 ===
                "골프장", "스키장", "캠핑장", "유람선",
                
                // === 기타 (기존 호환성) ===
                "도시", "시골", "온천지역", "섬지역"
        });

        // 5. 편의시설 옵션 (1개 선택)
        options.put("needs", new String[] {
                "휠체어 접근", "유아시설", "의료시설 근처", "해당없음"
        });

        return options;
    }

    /**
     * 관광지 상세 정보 조회
     */
    public Map<String, Object> getTourDetail(String contentId) {
        try {
            String url = String.format(
                    "%s/detailCommon2?serviceKey=%s&MobileOS=ETC&MobileApp=MyApp&_type=json&contentId=%s&defaultYN=Y&firstImageYN=Y&areacodeYN=Y&catcodeYN=Y&addrinfoYN=Y&mapinfoYN=Y&overviewYN=Y",
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
                    String.class);

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

            log.info("🔍 시군구 코드 조회 URL: {}", finalUrl);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Accept", "application/json");
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    finalUrl,
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    String.class);

            String responseBody = response.getBody();
            JsonNode jsonNode = objectMapper.readTree(responseBody);

            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();

            if (!"0000".equals(resultCode)) {
                log.error("시군구 API 오류 - 코드: {}", resultCode);
                return Map.of("success", false, "message", "시군구 정보를 불러오는데 실패했습니다");
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            log.info("🔍 조회된 시군구 개수: {}", items.size());

            return Map.of("success", true, "data", items);

        } catch (Exception e) {
            log.error("시군구 코드 조회 실패: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "시군구 정보를 불러오는데 실패했습니다");
        }
    }

    /**
     * 특별시/광역시 확인
     */
    public boolean isMetropolitanCity(String areaCode) {
        if (areaCode == null || areaCode.isEmpty()) {
            return false;
        }
        // 1:서울, 2:인천, 3:대전, 4:대구, 5:광주, 6:부산, 7:울산
        List<String> metropolitanCities = List.of("1", "2", "3", "4", "5", "6", "7");
        return metropolitanCities.contains(areaCode);
    }

    /**
     * 지역명을 지역코드로 변환
     */
    public String getAreaCodeByName(String areaName) {
        if (areaName == null || areaName.trim().isEmpty()) {
            return "";
        }

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
            String[] mainCategories = { "A01", "A02", "A03" }; // 자연, 인문, 레포츠
            String[] categoryNames = { "자연", "문화", "레포츠" };

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
                            if (allTours.size() >= totalCount)
                                break;
                        }
                        log.info("{} 카테고리에서 {}개 추가", categoryNames[i], categoryTours.size());
                    }
                }

                if (allTours.size() >= totalCount)
                    break;
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
                            if (allTours.size() >= totalCount)
                                break;
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
                    "레포츠", Math.min(perCategory, Math.max(0, allTours.size() - 2 * perCategory))));
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
            String url = String.format(
                    "%s/categoryCode2?serviceKey=%s&MobileOS=ETC&MobileApp=MyApp&_type=json&cat1=%s&cat2=%s&numOfRows=50",
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
                    "message", "선택하신 지역과 테마에 맞는 추천 코스");

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
                    "message", "선택하신 지역과 활동에 맞는 추천 코스");

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

    /**
     * 🍽️ 음식점 정보 별도 조회 (큐레이션 투어 상세 페이지용)
     */
    public Map<String, Object> getFoodInfo(String areaCode, String sigunguCode) {
        try {
            StringBuilder urlBuilder = new StringBuilder();
            urlBuilder.append(baseUrl).append("/areaBasedList2")
                    .append("?serviceKey=").append(serviceKey)
                    .append("&MobileOS=ETC&MobileApp=MyApp")
                    .append("&numOfRows=20&pageNo=1")
                    .append("&contentTypeId=39") // 음식점
                    .append("&cat1=A05") // 음식 대분류
                    .append("&areaCode=").append(areaCode)
                    .append("&_type=json");

            // 시군구코드 (특별시/광역시가 아닌 경우만)
            if (sigunguCode != null && !sigunguCode.isEmpty() && !isMetropolitanCity(areaCode)) {
                urlBuilder.append("&sigunguCode=").append(sigunguCode);
            }

            log.info("음식점 정보 조회 URL: {}", urlBuilder.toString());

            ResponseEntity<String> response = restTemplate.getForEntity(urlBuilder.toString(), String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();

            if (!"0000".equals(resultCode)) {
                log.error("음식점 API 오류 - 코드: {}", resultCode);
                return Map.of("success", false, "message", "음식점 정보 조회 실패");
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            JsonNode processedItems = processTourData(items);

            log.info("음식점 정보 조회 완료 - {}개", processedItems.size());

            return Map.of(
                    "success", true,
                    "data", processedItems,
                    "type", "food",
                    "message", "이 지역 맛집 정보");

        } catch (Exception e) {
            log.error("음식점 정보 조회 실패: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "음식점 정보 조회에 실패했습니다");
        }
    }

    /**
     * 🎨 추천코스 정보 별도 조회 (사용자 투어 하단 추천용)
     */
    public Map<String, Object> getRecommendedCourses(String areaCode, String themeCode) {
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

            log.info("추천코스 조회 URL: {}", urlBuilder.toString());

            ResponseEntity<String> response = restTemplate.getForEntity(urlBuilder.toString(), String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();

            if (!"0000".equals(resultCode)) {
                log.error("추천코스 API 오류 - 코드: {}", resultCode);
                return Map.of("success", false, "message", "추천코스 조회 실패");
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            JsonNode processedItems = processTourData(items);

            log.info("추천코스 조회 완료 - {}개", processedItems.size());

            return Map.of(
                    "success", true,
                    "data", processedItems,
                    "type", "course",
                    "message", "이런 코스는 어떠세요?");

        } catch (Exception e) {
            log.error("추천코스 조회 실패: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "추천코스 조회에 실패했습니다");
        }
    }

    /**
     * 🆕 검색 파라미터 검증 및 정규화
     */
    public Map<String, String> validateAndNormalizeParams(Map<String, String> params) {
        Map<String, String> normalizedParams = new HashMap<>();

        // 필수 파라미터 기본값 설정
        try {
            int numOfRows = Integer.parseInt(params.getOrDefault("numOfRows", "10"));
            normalizedParams.put("numOfRows", String.valueOf(Math.min(Math.max(numOfRows, 1), 50)));
        } catch (NumberFormatException e) {
            normalizedParams.put("numOfRows", "10");
        }

        try {
            int pageNo = Integer.parseInt(params.getOrDefault("pageNo", "1"));
            normalizedParams.put("pageNo", String.valueOf(Math.max(pageNo, 1)));
        } catch (NumberFormatException e) {
            normalizedParams.put("pageNo", "1");
        }

        // 지역코드 검증
        String areaCode = params.get("areaCode");
        if (areaCode != null && !areaCode.trim().isEmpty()) {
            normalizedParams.put("areaCode", areaCode.trim());
        }

        // 시군구코드 검증 (특별시/광역시 제외)
        String sigunguCode = params.get("sigunguCode");
        if (sigunguCode != null && !sigunguCode.trim().isEmpty() &&
                areaCode != null && !isMetropolitanCity(areaCode)) {
            normalizedParams.put("sigunguCode", sigunguCode.trim());
        }

        // 카테고리 코드 검증 (메인 3개만 허용)
        String cat1 = params.get("cat1");
        if (cat1 != null && List.of("A01", "A02", "A03").contains(cat1.trim())) {
            normalizedParams.put("cat1", cat1.trim());
        }

        String cat2 = params.get("cat2");
        if (cat2 != null && !cat2.trim().isEmpty()) {
            normalizedParams.put("cat2", cat2.trim());
        }

        String cat3 = params.get("cat3");
        if (cat3 != null && !cat3.trim().isEmpty()) {
            normalizedParams.put("cat3", cat3.trim());
        }

        log.debug("파라미터 정규화 완료: {}", normalizedParams);

        return normalizedParams;
    }
}