package com.example.act2gether.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Set;
import java.util.HashSet;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 🆕 v2.4 무장애여행 API 통합 서비스
 * 한국관광공사 무장애여행 API (areaBasedSyncList2 + detailWithTour2)를 사용하여
 * 액티브 시니어를 위한 편의시설 정보를 제공
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BarrierFreeService {
    
    @Value("${tourism.api.base-url}")
    private String baseUrl;
    
    @Value("${tourism.api.key}")
    private String serviceKey;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    // 병렬 처리를 위한 스레드 풀 (성능 최적화)
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);
    
    // 액티브 시니어 핵심 6개 편의시설 필드
    private static final String[] CORE_ACCESSIBILITY_FIELDS = {
        "parking",        // 주차장 (장애인 주차장 포함)
        "route",          // 접근로 (경사로 설치)
        "exit",           // 출입통로 (휠체어 접근)
        "elevator",       // 엘리베이터
        "restroom",       // 화장실 (장애인 화장실 포함)
        "publictransport" // 대중교통 접근성
    };
    
    // 액티브 시니어 중요도 기반 가중치
    private static final Map<String, Integer> ACCESSIBILITY_WEIGHTS = Map.of(
        "parking", 25,        // 주차 편의성 (높은 중요도)
        "route", 25,          // 접근로 편의성 (높은 중요도)
        "exit", 20,           // 출입 편의성
        "elevator", 15,       // 층간 이동
        "restroom", 10,       // 화장실 편의성
        "publictransport", 5  // 대중교통 (차량 이용 많음)
    );

    /**
     * 🎯 핵심 메서드: Tour API 결과에 무장애여행 정보 통합 (JsonNode 기반)
     * @param tourNodes Tour API에서 받은 JsonNode 리스트
     * @param areaCode 지역코드 (무장애 관광지 사전 조회용)
     * @param sigunguCode 시군구코드 (옵션)
     * @return 편의시설 정보가 통합된 JsonNode 리스트
     */
    public List<JsonNode> enrichWithBarrierFreeInfo(List<JsonNode> tourNodes, String areaCode, String sigunguCode) {
        if (tourNodes == null || tourNodes.isEmpty()) {
            log.info("무장애여행 정보 통합 대상이 없음");
            return new ArrayList<>();
        }
        
        log.info("🔄 무장애여행 정보 통합 시작: {}개 관광지", tourNodes.size());
        
        // 1단계: 해당 지역의 무장애 관광지 목록 사전 조회 (성능 최적화)
        Set<String> barrierFreeContentIds = getBarrierFreeContentIds(areaCode, sigunguCode);
        log.info("📋 무장애 정보 보유 관광지: {}개", barrierFreeContentIds.size());
        
        // 2단계: Tour API 결과와 교집합 찾기
        List<JsonNode> barrierFreeCandidates = tourNodes.stream()
            .filter(node -> barrierFreeContentIds.contains(node.path("contentid").asText()))
            .collect(Collectors.toList());
        
        List<JsonNode> regularTours = tourNodes.stream()
            .filter(node -> !barrierFreeContentIds.contains(node.path("contentid").asText()))
            .collect(Collectors.toList());
        
        log.info("🎯 무장애 정보 조회 대상: {}개, 일반 관광지: {}개", 
                barrierFreeCandidates.size(), regularTours.size());
        
        List<JsonNode> allResults = new ArrayList<>();
        
        // 3단계: 무장애 정보가 있는 관광지만 상세 조회 (병렬 처리)
        if (!barrierFreeCandidates.isEmpty()) {
            List<CompletableFuture<JsonNode>> futures = barrierFreeCandidates.stream()
                .map(node -> CompletableFuture.supplyAsync(() -> {
                    try {
                        String contentId = node.path("contentid").asText();
                        
                        // 무장애여행 정보 조회
                        Map<String, String> barrierFreeInfo = getBarrierFreeInfo(contentId);
                        
                        // 접근성 점수 계산
                        int accessibilityScore = calculateAccessibilityScore(barrierFreeInfo);
                        
                        // JsonNode에 무장애 정보 추가
                        ObjectNode enrichedNode = (ObjectNode) node.deepCopy();
                        enrichedNode.put("accessibilityScore", accessibilityScore);
                        enrichedNode.put("hasBarrierFreeInfo", !barrierFreeInfo.isEmpty());
                        
                        // 편의시설 정보를 JSON 문자열로 저장
                        try {
                            enrichedNode.put("barrierFreeInfo", objectMapper.writeValueAsString(barrierFreeInfo));
                        } catch (Exception e) {
                            enrichedNode.put("barrierFreeInfo", "{}");
                        }
                        
                        log.debug("✅ {} 무장애 정보 통합 완료 - 점수: {}", contentId, accessibilityScore);
                        return (JsonNode) enrichedNode;
                        
                    } catch (Exception e) {
                        log.warn("⚠️ 무장애여행 정보 조회 실패 - contentId: {}", 
                            node.path("contentid").asText());
                        
                        // 실패한 경우 기본값 설정
                        ObjectNode enrichedNode = (ObjectNode) node.deepCopy();
                        enrichedNode.put("accessibilityScore", 0);
                        enrichedNode.put("hasBarrierFreeInfo", false);
                        enrichedNode.put("barrierFreeInfo", "{}");
                        return (JsonNode) enrichedNode;
                    }
                }, executorService))
                .collect(Collectors.toList());
            
            // 무장애 정보 조회 완료 대기
            List<JsonNode> barrierFreeResults = futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());
            
            allResults.addAll(barrierFreeResults);
        }
        
        // 4단계: 일반 관광지는 기본 정보만 설정
        List<JsonNode> regularResults = regularTours.stream()
            .map(node -> {
                ObjectNode enrichedNode = (ObjectNode) node.deepCopy();
                enrichedNode.put("accessibilityScore", 0);
                enrichedNode.put("hasBarrierFreeInfo", false);
                enrichedNode.put("barrierFreeInfo", "{}");
                return (JsonNode) enrichedNode;
            })
            .collect(Collectors.toList());
        
        allResults.addAll(regularResults);
        
        int barrierFreeCount = (int) allResults.stream()
            .mapToInt(node -> node.path("hasBarrierFreeInfo").asBoolean() ? 1 : 0)
            .sum();
        
        log.info("✅ 무장애여행 정보 통합 완료: 전체 {}개, 무장애 정보 포함 {}개", 
                 allResults.size(), barrierFreeCount);
        
        return allResults;
    }    
    /**
     * 📍 지역별 무장애 관광지 ContentId 목록 사전 조회 (성능 최적화)
     * @param areaCode 지역코드
     * @param sigunguCode 시군구코드 (옵션)
     * @return 무장애 정보가 있는 ContentId Set
     */
    private Set<String> getBarrierFreeContentIds(String areaCode, String sigunguCode) {
        Set<String> contentIds = new HashSet<>();
        
        try {
            // areaBasedSyncList2 API 호출 URL 구성
            StringBuilder urlBuilder = new StringBuilder();
            urlBuilder.append(baseUrl.replace("areaBasedList2", "areaBasedSyncList2"))
                    .append("?serviceKey=").append(serviceKey)
                    .append("&MobileOS=ETC&MobileApp=Act2gether&_type=json")
                    .append("&contentTypeId=12")  // 관광지만
                    .append("&showflag=1")        // 표출되는 것만
                    .append("&numOfRows=1000")    // 충분한 개수
                    .append("&pageNo=1");
            
            if (areaCode != null && !areaCode.isEmpty()) {
                urlBuilder.append("&areaCode=").append(areaCode);
            }
            
            if (sigunguCode != null && !sigunguCode.isEmpty()) {
                urlBuilder.append("&sigunguCode=").append(sigunguCode);
            }
            
            ResponseEntity<String> response = restTemplate.getForEntity(urlBuilder.toString(), String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            
            // 응답 코드 확인
            JsonNode resultCode = root.path("response").path("header").path("resultCode");
            if (!"0000".equals(resultCode.asText())) {
                log.warn("무장애 관광지 목록 조회 실패: {}", resultCode.asText());
                return contentIds;
            }
            
            JsonNode items = root.path("response").path("body").path("items").path("item");
            
            if (items.isArray()) {
                for (JsonNode item : items) {
                    String contentId = item.path("contentid").asText();
                    if (!contentId.isEmpty()) {
                        contentIds.add(contentId);
                    }
                }
            } else if (!items.isMissingNode()) {
                String contentId = items.path("contentid").asText();
                if (!contentId.isEmpty()) {
                    contentIds.add(contentId);
                }
            }
            
            log.info("📋 지역 {} 무장애 관광지 {}개 발견", areaCode, contentIds.size());
            
        } catch (Exception e) {
            log.error("무장애 관광지 목록 조회 중 오류: {}", e.getMessage());
        }
        
        return contentIds;
    }
    
    /**
     * 📍 무장애여행 API 호출하여 편의시설 정보 조회
     * @param contentId 관광지 콘텐츠 ID
     * @return 편의시설 정보 Map (필드명 -> 값)
     */
    private Map<String, String> getBarrierFreeInfo(String contentId) throws Exception {
        // detailWithTour2 API 호출 URL 구성
        String url = baseUrl.replace("areaBasedList2", "detailWithTour2") +
            "?serviceKey=" + serviceKey +
            "&contentId=" + contentId +
            "&MobileOS=ETC&MobileApp=Act2gether&_type=json";
        
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            
            // 응답 코드 확인 (공식 API 스펙 기준)
            JsonNode resultCode = root.path("response").path("header").path("resultCode");
            String code = resultCode.asText();
            
            if (!"0000".equals(code)) {
                String errorMsg = getErrorMessage(code);
                if ("03".equals(code)) {
                    // 데이터 없음은 정상적인 경우 (모든 관광지에 무장애 정보가 있는 건 아님)
                    log.debug("무장애여행 정보 없음 - contentId: {}", contentId);
                    return new HashMap<>();
                } else {
                    throw new RuntimeException("무장애여행 API 오류: " + code + " - " + errorMsg);
                }
            }
            
            JsonNode item = root.path("response").path("body").path("items").path("item");
            
            Map<String, String> barrierFreeInfo = new HashMap<>();
            
            // 액티브 시니어 핵심 6개 필드만 추출
            for (String field : CORE_ACCESSIBILITY_FIELDS) {
                String value = item.path(field).asText("");
                if (!value.isEmpty() && !"0".equals(value)) {
                    barrierFreeInfo.put(field, value);
                }
            }
            
            return barrierFreeInfo;
            
        } catch (Exception e) {
            log.warn("무장애여행 API 호출 실패 - contentId: {}, 오류: {}", contentId, e.getMessage());
            return new HashMap<>();
        }
    }
    
    /**
     * 📊 접근성 점수 계산 (액티브 시니어 가중치 기반)
     * @param barrierFreeInfo 편의시설 정보
     * @return 접근성 점수 (0-100)
     */
    private int calculateAccessibilityScore(Map<String, String> barrierFreeInfo) {
        if (barrierFreeInfo.isEmpty()) {
            return 0;
        }
        
        int score = 0;
        
        for (Map.Entry<String, String> entry : barrierFreeInfo.entrySet()) {
            String field = entry.getKey();
            String info = entry.getValue();
            
            Integer weight = ACCESSIBILITY_WEIGHTS.get(field);
            if (weight != null && !info.trim().isEmpty()) {
                // 정보의 질에 따라 점수 차등 부여
                if (info.contains("가능") || info.contains("있음") || info.contains("대여") || info.contains("설치")) {
                    score += weight; // 완전한 편의시설
                } else if (info.contains("일부") || info.contains("제한적")) {
                    score += weight / 2; // 부분적 편의시설
                } else {
                    score += weight / 4; // 정보만 있어도 기본 점수
                }
            }
        }
        
        return Math.min(score, 100); // 최대 100점
    }
    
    /**
     * 🚨 API 오류 코드별 메시지 반환
     */
    private String getErrorMessage(String code) {
        Map<String, String> errorMessages = Map.of(
            "03", "데이터없음에러(NODATA_ERROR)",
            "02", "데이터베이스에러(DB_ERROR)", 
            "05", "서비스연결실패에러(SERVICETIMEOUT_ERROR)",
            "10", "잘못된요청파라미터에러(INVALID_REQUEST_PARAMETER_ERROR)",
            "11", "필수요청파라미터가없음(NO_MANDATORY_REQUEST_PARAMETERS_ERROR)",
            "21", "일시적으로서비스를사용할수없습니다(TEMPORARILY_DISABLE_THE_SERVICEKEY_ERROR)",
            "33", "서명되지않은호출(UNSIGNED_CALL_ERROR)"
        );
        return errorMessages.getOrDefault(code, "알 수 없는 오류");
    }
    
    /**
     * 🔧 리소스 정리
     */
    public void shutdown() {
        executorService.shutdown();
    }
}