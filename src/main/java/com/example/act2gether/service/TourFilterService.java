package com.example.act2gether.service;

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

    // ========================================
    // 핵심 검색 메서드
    // ========================================

    public Map<String, Object> searchTours(Map<String, String> params) {
        try {
            log.info("🔍 다중 선택 OR 검색 시작: {}", params);

            // 1. 기본 파라미터 추출
            String areaCode = params.get("areaCode");
            String sigunguCode = params.get("sigunguCode");
            int numOfRows = Integer.parseInt(params.getOrDefault("numOfRows", "6"));

            // 2. 다중 선택 값들 파싱
            List<String> themes = extractSelectedThemes(params);
            List<String> activities = extractSelectedActivities(params);
            List<String> places = extractSelectedPlaces(params);

            log.info("📋 선택된 값들 - 테마: {}, 활동: {}, 장소: {}", themes, activities, places);

            // 3. 수정된 조합 생성 - 논리적 검색 조합만 생성
            List<SearchParam> searchParams = generateSearchCombinations(areaCode, sigunguCode, themes, activities, places);
            log.info("🔄 생성된 검색 조합: {}개", searchParams.size());

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
            List<JsonNode> finalResults = selectBalancedResults(allResults, numOfRows, themes, activities, places);

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

    // ========================================
    // 공정한 균형 선별 알고리즘
    // ========================================

    private List<JsonNode> selectBalancedResults(List<JsonNode> allResults, int targetCount,
            List<String> themes, List<String> activities, List<String> places) {

        if (allResults.size() <= targetCount) {
            return allResults;
        }

        log.info("🎯 균형 선별 시작: {}개 → {}개", allResults.size(), targetCount);

        // 카테고리별 그룹화
        Map<String, List<JsonNode>> categoryGroups = allResults.stream()
                .collect(Collectors.groupingBy(result -> result.path("cat1").asText()));

        List<JsonNode> balancedResults = new ArrayList<>();
        Set<String> categories = categoryGroups.keySet();
        int categoriesCount = categories.size();
        int basePerCategory = Math.max(1, targetCount / categoriesCount);
        int extraSlots = targetCount % categoriesCount;

        log.info("📊 카테고리 균형: {}개 카테고리, 기본 {}개씩 할당", categoriesCount, basePerCategory);

        // 카테고리 우선순위 계산
        Map<String, Double> categoryPriority = calculateCategoryPriority(themes, activities, places, categories);
        
        List<String> sortedCategories = categories.stream()
                .sorted((cat1, cat2) -> Double.compare(
                        categoryPriority.getOrDefault(cat2, 0.0),
                        categoryPriority.getOrDefault(cat1, 0.0)))
                .collect(Collectors.toList());

        // 각 카테고리에서 선별
        for (int i = 0; i < sortedCategories.size(); i++) {
            String category = sortedCategories.get(i);
            List<JsonNode> categoryResults = categoryGroups.get(category);

            int assignedSlots = basePerCategory + (i < extraSlots ? 1 : 0);
            int actualSlots = Math.min(assignedSlots, categoryResults.size());

            // 카테고리 내에서 관련성 점수로 정렬
            categoryResults.sort((a, b) -> {
                int scoreA = calculateRelevanceScore(a, themes, activities, places);
                int scoreB = calculateRelevanceScore(b, themes, activities, places);
                return Integer.compare(scoreB, scoreA);
            });

            // 선별
            for (int j = 0; j < actualSlots; j++) {
                balancedResults.add(categoryResults.get(j));
            }

            log.info("✅ {} ({}): {}개 선별 (전체 {}개 중)",
                    getCategoryDisplayName(category), category, actualSlots, categoryResults.size());
        }

        return balancedResults;
    }

    // ========================================
    // 공정한 점수 계산
    // ========================================

    private int calculateRelevanceScore(JsonNode item, List<String> themes, 
            List<String> activities, List<String> places) {
        int score = 0;

        String cat1 = item.path("cat1").asText();
        String cat2 = item.path("cat2").asText();
        String cat3 = item.path("cat3").asText();

        // 테마 매칭 (30점)
        for (String theme : themes) {
            String themeCode = mapThemeToCategory(theme);
            if (themeCode != null && themeCode.equals(cat1)) {
                score += 30;
                break;
            }
        }

        // 활동 매칭 (20점)
        for (String activity : activities) {
            String activityCode = mapActivityToCat2(activity);
            if (activityCode != null && activityCode.equals(cat2)) {
                score += 20;
                break;
            }
        }

        // 장소 매칭 (15점)
        for (String place : places) {
            List<String> placeCodes = mapPlaceToMultipleCat3(place);
            if (placeCodes != null && placeCodes.contains(cat3)) {
                score += 15;
                break;
            }
        }

        // 품질 점수 (17점)
        if (!item.path("firstimage").asText().isEmpty()) score += 5;
        if (!item.path("addr1").asText().isEmpty()) score += 3;
        if (!item.path("addr2").asText().isEmpty()) score += 2;
        if (!item.path("tel").asText().isEmpty()) score += 2;

        String modifiedTime = item.path("modifiedtime").asText();
        if (modifiedTime.startsWith("2024") || modifiedTime.startsWith("2025")) {
            score += 3;
        } else if (modifiedTime.startsWith("2023") || modifiedTime.startsWith("2022")) {
            score += 1;
        }

        String mapx = item.path("mapx").asText();
        String mapy = item.path("mapy").asText();
        if (!mapx.isEmpty() && !mapy.isEmpty() && !mapx.equals("0") && !mapy.equals("0")) {
            score += 2;
        }

        return score;
    }

    // ========================================
    // 검색 파라미터 처리
    // ========================================

    private List<String> extractSelectedThemes(Map<String, String> params) {
        List<String> themes = new ArrayList<>();

        String themesParam = params.get("themes");
        if (themesParam != null && !themesParam.isEmpty()) {
            List<String> themeNames = parseMultiSelectValue(themesParam);
            for (String themeName : themeNames) {
                String cat1Code = mapThemeToCategory(themeName);
                if (cat1Code != null && List.of("A01", "A02", "A03").contains(cat1Code)) {
                    if (!themes.contains(cat1Code)) {
                        themes.add(cat1Code);
                    }
                }
            }
        }

        String cat1 = params.get("cat1");
        if (cat1 != null && !cat1.isEmpty() && themes.isEmpty()) {
            themes.add(cat1);
        }

        if (themes.isEmpty()) {
            themes.add("A01");
        }

        return themes.stream().distinct().collect(Collectors.toList());
    }

    private List<String> extractSelectedActivities(Map<String, String> params) {
        List<String> activities = new ArrayList<>();

        String activitiesParam = params.get("activities");
        if (activitiesParam != null && !activitiesParam.isEmpty()) {
            List<String> activityNames = parseMultiSelectValue(activitiesParam);
            for (String activityName : activityNames) {
                String cat2Code = mapActivityToCat2(activityName);
                if (cat2Code != null && !cat2Code.isEmpty()) {
                    if (!activities.contains(cat2Code)) {
                        activities.add(cat2Code);
                    }
                }
            }
        }

        if (activities.isEmpty()) {
            activities.add(null);
        }

        return activities;
    }

    private List<String> extractSelectedPlaces(Map<String, String> params) {
        List<String> places = new ArrayList<>();

        String placesParam = params.get("places");
        if (placesParam != null && !placesParam.isEmpty()) {
            List<String> placeNames = parseMultiSelectValue(placesParam);
            for (String placeName : placeNames) {
                List<String> cat3Codes = mapPlaceToMultipleCat3(placeName);
                if (cat3Codes != null && !cat3Codes.isEmpty()) {
                    for (String code : cat3Codes) {
                        if (!places.contains(code)) {
                            places.add(code);
                        }
                    }
                }
            }
        }

        if (places.isEmpty()) {
            places.add(null);
        }

        return places;
    }

    // ========================================
    // 조합 생성 및 API 호출
    // ========================================

    private List<SearchParam> generateSearchCombinations(String areaCode, String sigunguCode,
        List<String> themes, List<String> activities, List<String> places) {
        List<SearchParam> combinations = new ArrayList<>();
        
        // 전체 가능한 조합 수 계산
        int totalPossible = themes.size() * activities.size() * places.size();
        int validCombinations = 0;
        int skippedCombinations = 0;

        for (String theme : themes) {
            for (String activity : activities) {
                for (String place : places) {
                    // ✅ 논리적 조합인지 검증 (핵심 수정!)
                    if (isValidHierarchyCombination(theme, activity, place)) {
                        SearchParam param = new SearchParam(areaCode, sigunguCode, theme, activity, place);
                        combinations.add(param);
                        validCombinations++;
                        
                        log.debug("✅ 유효한 조합: {} + {} + {}", theme, activity, place);
                    } else {
                        skippedCombinations++;
                        log.debug("❌ 무효한 조합 스킵: {} + {} + {}", theme, activity, place);
                    }
                }
            }
        }

        log.info("🎯 조합 생성 완료 - 전체 {}개 중 유효 {}개, 스킵 {}개", 
                totalPossible, validCombinations, skippedCombinations);
        
        // 조합 수 제한 (기존 30에서 80으로 증가)
        int maxCombinations = 80;
        if (combinations.size() > maxCombinations) {
            combinations = combinations.subList(0, maxCombinations);
            log.info("🔧 조합 수 제한 적용: {}개 → {}개", validCombinations, maxCombinations);
        }

        return combinations;
    }

    private boolean isLogicalCombination(String cat1, String cat2, String cat3) {
        // 새로운 메서드로 위임
        return isValidHierarchyCombination(cat1, cat2, cat3);
    }
    /**
     * ✅ 완전한 계층 구조 검증 로직
     */
    private boolean isValidHierarchyCombination(String cat1, String cat2, String cat3) {
        if (cat2 == null || cat3 == null) return true; // null인 경우는 허용
        
        // 완전한 한국관광공사 API 계층 구조 정의
        Map<String, Map<String, List<String>>> validHierarchy = new HashMap<>();
        
        // A01 자연관광지 계층
        Map<String, List<String>> natureHierarchy = new HashMap<>();
        natureHierarchy.put("A0101", Arrays.asList(
            "A01010100", "A01010200", "A01010300", "A01010400", // 산, 공원
            "A01010500", "A01010600", "A01010700",             // 생태, 휴양림, 수목원  
            "A01010800", "A01010900",                          // 계곡, 폭포
            "A01011100", "A01011200", "A01011400",             // 해변, 해수욕장
            "A01011700", "A01011800"                           // 호수, 강
        ));
        validHierarchy.put("A01", natureHierarchy);
        
        // A02 문화/역사 계층
        Map<String, List<String>> cultureHierarchy = new HashMap<>();
        // 역사관광지
        cultureHierarchy.put("A0201", Arrays.asList(
            "A02010100", "A02010200", "A02010300",             // 고궁, 성
            "A02010400", "A02010500", "A02010600",             // 민속마을, 가옥
            "A02010700", "A02010800", "A02010900"              // 유적지, 사찰, 종교성지
        ));
        // 휴양관광지  
        cultureHierarchy.put("A0202", Arrays.asList(
            "A02020200", "A02020300", "A02020400",             // 관광단지, 온천, 찜질방
            "A02020600", "A02020800"                           // 테마파크, 유람선
        ));
        // 체험관광지
        cultureHierarchy.put("A0203", Arrays.asList(
            "A02030100", "A02030200", "A02030300", "A02030400" // 농어촌체험, 전통체험
        ));
        // 문화시설
        cultureHierarchy.put("A0206", Arrays.asList(
            "A02060100", "A02060200", "A02060300", "A02060500" // 박물관, 미술관
        ));
        validHierarchy.put("A02", cultureHierarchy);
        
        // A03 레포츠 계층
        Map<String, List<String>> sportsHierarchy = new HashMap<>();
        // 육상레포츠
        sportsHierarchy.put("A0302", Arrays.asList(
            "A03020700", "A03021200", "A03021300", "A03021400", // 골프, 스키
            "A03021700", "A03022700"                            // 캠핑, 트래킹
        ));
        // 수상레포츠  
        sportsHierarchy.put("A0303", Arrays.asList(
            "A03030500", "A03030600"                           // 낚시
        ));
        validHierarchy.put("A03", sportsHierarchy);
        
        // 계층 구조 검증
        if (!validHierarchy.containsKey(cat1)) {
            log.debug("❌ 잘못된 대분류: {}", cat1);
            return false;
        }
        
        Map<String, List<String>> middleCategories = validHierarchy.get(cat1);
        if (!middleCategories.containsKey(cat2)) {
            log.debug("❌ 대분류 {}에 중분류 {} 없음", cat1, cat2);
            return false;
        }
        
        List<String> smallCategories = middleCategories.get(cat2);
        if (!smallCategories.contains(cat3)) {
            log.debug("❌ 중분류 {}에 소분류 {} 없음", cat2, cat3);
            return false;
        }
        
        log.debug("✅ 유효한 계층: {} → {} → {}", cat1, cat2, cat3);
        return true;
    }


    private List<JsonNode> callTourApiForCombination(SearchParam searchParam) {
        try {
            StringBuilder urlBuilder = new StringBuilder();
            urlBuilder.append(baseUrl).append("/areaBasedList2")
                    .append("?serviceKey=").append(serviceKey)
                    .append("&MobileOS=ETC&MobileApp=Act2gether")
                    .append("&contentTypeId=12")
                    .append("&_type=json");

            if (searchParam.areaCode != null) {
                urlBuilder.append("&areaCode=").append(searchParam.areaCode);
            }

            if (searchParam.sigunguCode != null && !isMetropolitanCity(searchParam.areaCode)) {
                urlBuilder.append("&sigunguCode=").append(searchParam.sigunguCode);
            }

            if (searchParam.cat1 != null) {
                urlBuilder.append("&cat1=").append(searchParam.cat1);
            }

            if (searchParam.cat2 != null) {
                urlBuilder.append("&cat2=").append(searchParam.cat2);
            }

            if (searchParam.cat3 != null) {
                urlBuilder.append("&cat3=").append(searchParam.cat3);
            }

            urlBuilder.append("&numOfRows=10&pageNo=1");

            ResponseEntity<String> response = restTemplate.getForEntity(urlBuilder.toString(), String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            if (!"0000".equals(header.path("resultCode").asText())) {
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

            return results;

        } catch (Exception e) {
            log.warn("❌ API 호출 오류: {} - {}", searchParam, e.getMessage());
            return new ArrayList<>();
        }
    }

    // ========================================
    // 매핑 메서드들 (기존 코드 유지)
    // ========================================

    private String mapThemeToCategory(String theme) {
        if (theme == null || theme.isEmpty()) return null;

        Map<String, String> themeMapping = new HashMap<>();
        themeMapping.put("자연", "A01");
        themeMapping.put("문화/역사", "A02");
        themeMapping.put("역사", "A02");
        themeMapping.put("휴양", "A02");
        themeMapping.put("체험", "A02");
        themeMapping.put("문화", "A02");
        themeMapping.put("레포츠", "A03");
        themeMapping.put("육상레포츠", "A03");
        themeMapping.put("수상레포츠", "A03");

        return themeMapping.get(theme.trim());
    }

    private String mapActivityToCat2(String activityName) {
        Map<String, String> activityMapping = new HashMap<>();
        
        activityMapping.put("자연관광지", "A0101");
        activityMapping.put("역사관광지", "A0201");
        activityMapping.put("휴양관광지", "A0202");
        activityMapping.put("체험관광지", "A0203");
        activityMapping.put("문화시설", "A0206");
        activityMapping.put("육상레포츠", "A0302");
        activityMapping.put("수상레포츠", "A0303");

        return activityMapping.get(activityName != null ? activityName.trim() : "");
    }

    private List<String> mapPlaceToMultipleCat3(String placeName) {
        Map<String, List<String>> placeMapping = new HashMap<>();

        // 자연 그룹 (A01)
        placeMapping.put("해변", Arrays.asList("A01011100", "A01011200", "A01011400"));
        placeMapping.put("산/공원", Arrays.asList("A01010100", "A01010200", "A01010300", "A01010400"));
        placeMapping.put("계곡/폭포", Arrays.asList("A01010800", "A01010900"));
        placeMapping.put("호수/강", Arrays.asList("A01011700", "A01011800"));
        placeMapping.put("수목원", Arrays.asList("A01010700"));
        placeMapping.put("자연휴양림", Arrays.asList("A01010600"));
        placeMapping.put("자연생태관광지", Arrays.asList("A01010500"));

        // 문화/역사 그룹 (A02)
        placeMapping.put("고궁/문", Arrays.asList("A02010100", "A02010200", "A02010300"));
        placeMapping.put("민속마을/가옥", Arrays.asList("A02010600", "A02010400", "A02010500"));
        placeMapping.put("유적지", Arrays.asList("A02010700"));
        placeMapping.put("사찰", Arrays.asList("A02010800"));
        placeMapping.put("종교성지", Arrays.asList("A02010900"));
        placeMapping.put("박물관", Arrays.asList("A02060100", "A02060200", "A02060300"));
        placeMapping.put("미술관", Arrays.asList("A02060500"));
        placeMapping.put("체험", Arrays.asList("A02030200", "A02030300", "A02030400"));

        // 휴양 그룹 (A02)
        placeMapping.put("온천", Arrays.asList("A02020300"));
        placeMapping.put("찜질방", Arrays.asList("A02020400"));
        placeMapping.put("테마파크", Arrays.asList("A02020600"));
        placeMapping.put("관광단지", Arrays.asList("A02020200"));
        placeMapping.put("유람선/잠수함관광", Arrays.asList("A02020800"));

        // 레저 그룹 (A03)
        placeMapping.put("트래킹", Arrays.asList("A03022700"));
        placeMapping.put("골프장", Arrays.asList("A03020700"));
        placeMapping.put("스키장", Arrays.asList("A03021200", "A03021300", "A03021400"));
        placeMapping.put("캠핑장", Arrays.asList("A03021700"));
        placeMapping.put("낚시", Arrays.asList("A03030500", "A03030600"));

        List<String> codes = placeMapping.get(placeName);
        return codes != null ? codes : Arrays.asList();
    }

    // ========================================
    // 우선순위 계산
    // ========================================

    private Map<String, Double> calculateCategoryPriority(List<String> themes, List<String> activities,
            List<String> places, Set<String> availableCategories) {

        Map<String, Double> priorities = new HashMap<>();
        for (String category : availableCategories) {
            priorities.put(category, 1.0);
        }

        Map<String, String> themeToCategory = Map.of("자연", "A01", "문화/역사", "A02", "레포츠", "A03");
        for (String theme : themes) {
            String categoryCode = themeToCategory.get(theme);
            if (categoryCode != null && priorities.containsKey(categoryCode)) {
                priorities.put(categoryCode, priorities.get(categoryCode) + 0.5);
            }
        }

        return priorities;
    }

    // ========================================
    // 헬퍼 클래스 및 유틸리티
    // ========================================

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

    private List<String> parseMultiSelectValue(String value) {
        List<String> result = new ArrayList<>();

        if (value == null || value.trim().isEmpty()) {
            return result;
        }

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

        String[] items = value.split(",");
        for (String item : items) {
            String trimmed = item.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }

        return result;
    }

    private String getCategoryDisplayName(String categoryCode) {
        Map<String, String> categoryNames = Map.of(
                "A01", "자연",
                "A02", "문화/역사",
                "A03", "레포츠");
        return categoryNames.getOrDefault(categoryCode, categoryCode);
    }

    private JsonNode processTourData(JsonNode items) {
        if (!items.isArray()) {
            return items;
        }

        ArrayNode processedItems = objectMapper.createArrayNode();

        for (JsonNode item : items) {
            ObjectNode processedItem = (ObjectNode) item.deepCopy();

            String firstImage = item.path("firstimage").asText("");
            String firstImage2 = item.path("firstimage2").asText("");
            String cat1 = item.path("cat1").asText("");

            String optimizedImage = optimizeImageUrl(firstImage.isEmpty() ? firstImage2 : firstImage, cat1);

            processedItem.put("firstimage", optimizedImage);
            processedItem.put("optimizedImage", optimizedImage);
            processedItem.put("hasRealImage", !optimizedImage.equals("/uploads/tour/no-image.png"));
            processedItem.put("categoryName", getCategoryDisplayName(cat1));

            String addr1 = item.path("addr1").asText("");
            String addr2 = item.path("addr2").asText("");
            String fullAddress = addr1 + (addr2.isEmpty() ? "" : " " + addr2);
            processedItem.put("fullAddress", fullAddress.trim());

            String title = item.path("title").asText("").replaceAll("<[^>]*>", "");
            processedItem.put("cleanTitle", title);

            processedItems.add(processedItem);
        }

        return processedItems;
    }

    private String optimizeImageUrl(String imageUrl, String category) {
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            return "/uploads/tour/no-image.png";
        }
        if (imageUrl.startsWith("//")) {
            return "https:" + imageUrl;
        } else if (imageUrl.startsWith("/")) {
            return "https://tong.visitkorea.or.kr" + imageUrl;
        }
        return imageUrl;
    }

    private Map<String, Object> fallbackSimpleSearch(Map<String, String> params) {
        try {
            StringBuilder simpleUrl = new StringBuilder();
            simpleUrl.append(baseUrl).append("/areaBasedList2")
                    .append("?serviceKey=").append(serviceKey)
                    .append("&MobileOS=ETC&MobileApp=Act2gether")
                    .append("&contentTypeId=12")
                    .append("&_type=json")
                    .append("&numOfRows=").append(params.getOrDefault("numOfRows", "10"))
                    .append("&pageNo=1");

            if (params.containsKey("areaCode")) {
                simpleUrl.append("&areaCode=").append(params.get("areaCode"));
            }

            if (params.containsKey("cat1")) {
                simpleUrl.append("&cat1=").append(params.get("cat1"));
            }

            ResponseEntity<String> response = restTemplate.getForEntity(simpleUrl.toString(), String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            if ("0000".equals(header.path("resultCode").asText())) {
                JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
                JsonNode processedItems = processTourData(items);
                int totalCount = jsonNode.path("response").path("body").path("totalCount").asInt(0);

                return Map.of(
                        "success", true,
                        "data", processedItems,
                        "totalCount", totalCount,
                        "fallback", true,
                        "message", "조건을 완화하여 검색 결과를 찾았습니다");
            }

        } catch (Exception e) {
            log.error("❌ Fallback 검색도 실패: {}", e.getMessage());
        }

        return Map.of("success", false, "message", "검색 결과가 없습니다", "fallback", true);
    }

    // ========================================
    // 🚨 필수 메서드들 (컨트롤러에서 호출됨)
    // ========================================

    public Map<String, Object> getFilterOptions() {
        Map<String, Object> options = new HashMap<>();

        options.put("regions", new String[] {
                "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
                "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
        });

        options.put("themes", new String[] { "자연", "문화/역사", "레포츠" });

        options.put("activities", new String[] {
                "자연관광지", "역사관광지", "휴양관광지", "체험관광지", "문화시설", "육상레포츠", "수상레포츠"
        });

        Map<String, Object> placeGroups = new HashMap<>();
        placeGroups.put("자연관광지", new String[] { "해변", "산/공원", "계곡/폭포", "호수/강", "수목원", "자연휴양림", "자연생태관광지" });
        placeGroups.put("역사관광지", new String[] { "고궁/문", "민속마을/가옥", "유적지", "사찰", "종교성지" });
        placeGroups.put("휴양관광지", new String[] { "온천", "테마파크", "관광단지", "찜질방", "유람선/잠수함관광" });
        placeGroups.put("체험관광지", new String[] { "체험" });
        placeGroups.put("문화시설", new String[] { "박물관", "미술관" });
        placeGroups.put("육상레포츠", new String[] { "트래킹", "골프장", "스키장", "캠핑장" });
        placeGroups.put("수상레포츠", new String[] { "낚시" });

        options.put("placeGroups", placeGroups);
    
        // ✅ 선택 제한 정보 추가
        options.put("maxSelections", Map.of(
            "themes", 4,      // 3→4
            "activities", 5,  // 3→5
            "places", 6       // 3→6
        ));
        options.put("needs", new String[] { "휠체어 접근", "유아시설", "의료시설 근처", "해당없음" });

        return options;
    }

    public boolean isMetropolitanCity(String areaCode) {
        if (areaCode == null || areaCode.isEmpty()) return false;
        List<String> metropolitanCities = List.of("1", "2", "3", "4", "5", "6", "7");
        return metropolitanCities.contains(areaCode);
    }

    public String getAreaCodeByName(String areaName) {
        if (areaName == null || areaName.trim().isEmpty()) return "";

        Map<String, String> areaMap = new HashMap<>();
        areaMap.put("서울", "1"); areaMap.put("서울특별시", "1");
        areaMap.put("인천", "2"); areaMap.put("인천광역시", "2");
        areaMap.put("대전", "3"); areaMap.put("대전광역시", "3");
        areaMap.put("대구", "4"); areaMap.put("대구광역시", "4");
        areaMap.put("광주", "5"); areaMap.put("광주광역시", "5");
        areaMap.put("부산", "6"); areaMap.put("부산광역시", "6");
        areaMap.put("울산", "7"); areaMap.put("울산광역시", "7");
        areaMap.put("세종", "8"); areaMap.put("세종특별자치시", "8");
        areaMap.put("경기", "31"); areaMap.put("경기도", "31");
        areaMap.put("강원", "32"); areaMap.put("강원특별자치도", "32");
        areaMap.put("충북", "33"); areaMap.put("충청북도", "33");
        areaMap.put("충남", "34"); areaMap.put("충청남도", "34");
        areaMap.put("경북", "35"); areaMap.put("경상북도", "35");
        areaMap.put("경남", "36"); areaMap.put("경상남도", "36");
        areaMap.put("전북", "37"); areaMap.put("전북특별자치도", "37");
        areaMap.put("전남", "38"); areaMap.put("전라남도", "38");
        areaMap.put("제주", "39"); areaMap.put("제주특별자치도", "39");

        return areaMap.getOrDefault(areaName.trim(), "");
    }

    /**
     * 🚨 관광지 상세 정보 조회 (필수)
     */
    public Map<String, Object> getTourDetail(String contentId) {
        try {
            String url = String.format(
                    "%s/detailCommon2?serviceKey=%s&MobileOS=ETC&MobileApp=Act2gether&_type=json&contentId=%s&defaultYN=Y&firstImageYN=Y&areacodeYN=Y&catcodeYN=Y&addrinfoYN=Y&mapinfoYN=Y&overviewYN=Y",
                    baseUrl, serviceKey, contentId);

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            if (!"0000".equals(header.path("resultCode").asText())) {
                return Map.of("success", false, "message", "상세 정보를 찾을 수 없습니다");
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");

            if (items.isArray() && items.size() > 0) {
                JsonNode item = items.get(0);
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
     * 🚨 지역 코드 목록 조회 (필수)
     */
    public Map<String, Object> getAreaCodes() {
        try {
            String finalUrl = baseUrl + "/areaCode2?serviceKey=" + serviceKey +
                    "&numOfRows=17&MobileOS=ETC&MobileApp=Act2gether&_type=json";

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Accept", "application/json");
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    finalUrl, org.springframework.http.HttpMethod.GET, entity, String.class);

            JsonNode jsonNode = objectMapper.readTree(response.getBody());
            JsonNode header = jsonNode.path("response").path("header");
            
            if (!"0000".equals(header.path("resultCode").asText())) {
                return Map.of("success", false, "message", "API 오류: " + header.path("resultMsg").asText());
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            return Map.of("success", true, "data", items);

        } catch (Exception e) {
            log.error("지역 코드 조회 중 예외 발생: {}", e.getMessage(), e);
            return Map.of("success", false, "message", "네트워크 오류: " + e.getMessage());
        }
    }

    /**
     * 🚨 시군구 코드 목록 조회 (필수)
     */
    public Map<String, Object> getSigunguCodes(String areaCode) {
        try {
            String finalUrl = baseUrl + "/areaCode2?serviceKey=" + serviceKey +
                    "&areaCode=" + areaCode +
                    "&numOfRows=50&pageNo=1&MobileOS=ETC&MobileApp=Act2gether&_type=json";

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Accept", "application/json");
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    finalUrl, org.springframework.http.HttpMethod.GET, entity, String.class);

            JsonNode jsonNode = objectMapper.readTree(response.getBody());
            JsonNode header = jsonNode.path("response").path("header");
            
            if (!"0000".equals(header.path("resultCode").asText())) {
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
     * 🚨 사용자 관심사 매핑 (필수)
     */
    public Map<String, Object> mapUserInterestsToFilters(String interestsJson) {
        Map<String, Object> filters = new HashMap<>();

        try {
            JsonNode interests = objectMapper.readTree(interestsJson);

            // 지역 매핑
            JsonNode regions = interests.path("preferredRegions");
            if (regions.isArray() && regions.size() > 0) {
                List<Object> regionList = new ArrayList<>();
                regionList.add(regions.get(0).asText());
                filters.put("regions", regionList);
            }

            // 테마 매핑
            JsonNode themes = interests.path("themes");
            if (themes.isArray()) {
                Map<String, String> themeMapping = new HashMap<>();
                int count = 0;
                for (JsonNode theme : themes) {
                    if (count >= 3) break;
                    String themeValue = theme.asText();
                    String categoryCode = mapThemeToCategory(themeValue);
                    if (categoryCode != null) {
                        themeMapping.put(categoryCode, themeValue);
                        count++;
                    }
                }
                filters.put("themes", themeMapping);
            }

            // 활동 매핑
            JsonNode activities = interests.path("activities");
            if (activities.isArray()) {
                List<Object> activityList = new ArrayList<>();
                int count = 0;
                for (JsonNode activity : activities) {
                    if (count >= 3) break;
                    String activityValue = activity.asText();
                    if (!"맛집 탐방".equals(activityValue)) {
                        activityList.add(activityValue);
                        count++;
                    }
                }
                filters.put("activities", activityList);
            }

            // 장소 매핑
            JsonNode places = interests.path("places");
            if (places.isArray()) {
                List<Object> placeList = new ArrayList<>();
                int count = 0;
                for (JsonNode place : places) {
                    if (count >= 3) break;
                    placeList.add(place.asText());
                    count++;
                }
                filters.put("places", placeList);
            }

            // 편의시설 매핑
            JsonNode needs = interests.path("needs");
            if (needs.isArray() && needs.size() > 0) {
                List<Object> needsList = new ArrayList<>();
                needsList.add(needs.get(0).asText());
                filters.put("needs", needsList);
            }

        } catch (JsonProcessingException e) {
            log.error("사용자 관심사 파싱 실패: {}", e.getMessage());
        }

        return filters;
    }

    /**
     * 🚨 추천 관광지 조회 (필수)
     */
    public Map<String, Object> getRecommendedTours(String userInterests, int numOfRows) {
        try {
            if (userInterests == null || userInterests.trim().isEmpty()) {
                Map<String, String> params = Map.of(
                        "numOfRows", String.valueOf(numOfRows),
                        "pageNo", "1",
                        "areaCode", "1");
                Map<String, Object> result = searchTours(params);
                if ((Boolean) result.get("success")) {
                    result.put("recommendationType", "popular");
                    result.put("message", "인기 관광지");
                }
                return result;
            }

            Map<String, Object> interests = mapUserInterestsToFilters(userInterests);
            Map<String, String> searchParams = new HashMap<>();
            searchParams.put("numOfRows", String.valueOf(numOfRows));
            searchParams.put("pageNo", "1");

            @SuppressWarnings("unchecked")
            List<Object> regions = (List<Object>) interests.get("regions");
            if (regions != null && !regions.isEmpty()) {
                String regionName = regions.get(0).toString();
                String areaCode = getAreaCodeByName(regionName);
                if (!areaCode.isEmpty()) {
                    searchParams.put("areaCode", areaCode);
                }
            }

            @SuppressWarnings("unchecked")
            Map<String, String> themes = (Map<String, String>) interests.get("themes");
            if (themes != null && !themes.isEmpty()) {
                String firstThemeCode = themes.keySet().iterator().next();
                if (List.of("A01", "A02", "A03").contains(firstThemeCode)) {
                    searchParams.put("cat1", firstThemeCode);
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
            Map<String, String> params = Map.of("numOfRows", String.valueOf(numOfRows), "pageNo", "1", "areaCode", "1");
            return searchTours(params);
        }
    }
}