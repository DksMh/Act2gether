package com.example.act2gether.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * SpotDetailService - 관광지별 상세정보 서비스
 * 기존 TourFilterService와 동일한 패턴으로 구현
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SpotDetailService {

    @Value("${tourism.api.key}")
    private String serviceKey;

    @Value("${tourism.api.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 관광지 상세정보 통합 조회 (3개 API 호출)
     */
    public Map<String, Object> getSpotDetail(String contentId) {
        try {
            log.info("관광지 상세정보 조회 시작: contentId={}", contentId);

            // 1. detailCommon2 - 기본정보
            Map<String, Object> commonData = getDetailCommon(contentId);
            if (!((Boolean) commonData.get("success"))) {
                return commonData; // 기본정보 실패시 바로 반환
            }

            // 2. detailIntro2 - 이용정보  
            Map<String, Object> introData = getDetailIntro(contentId);
            
            // 3. detailInfo2 - 반복정보
            Map<String, Object> infoData = getDetailInfo(contentId);

            // 4. 데이터 통합
            Map<String, Object> combinedData = new HashMap<>();
            
            // 기본정보는 필수
            JsonNode commonItem = (JsonNode) commonData.get("data");
            if (commonItem != null) {
                combinedData.put("title", commonItem.path("title").asText(""));
                combinedData.put("homepage", extractHomepageUrl(commonItem.path("homepage").asText("")));
                combinedData.put("addr1", commonItem.path("addr1").asText(""));
                combinedData.put("tel", commonItem.path("tel").asText(""));
                combinedData.put("overview", cleanOverview(commonItem.path("overview").asText("")));
            }

            // 이용정보 추가 (실패해도 무시)
            if ((Boolean) introData.get("success")) {
                JsonNode introItem = (JsonNode) introData.get("data");
                if (introItem != null) {
                    combinedData.put("restdate", introItem.path("restdate").asText(""));
                    combinedData.put("usetime", introItem.path("usetime").asText(""));
                    combinedData.put("parking", introItem.path("parking").asText(""));
                }
            }

            // 반복정보에서 입장료 추출 (실패해도 무시)
            String admission = "정보 없음";
            if ((Boolean) infoData.get("success")) {
                JsonNode infoItems = (JsonNode) infoData.get("data");
                admission = extractAdmissionFromInfo(infoItems);
            }
            combinedData.put("admission", admission);

            log.info("관광지 상세정보 조회 완료: contentId={}", contentId);
            return Map.of("success", true, "data", combinedData);

        } catch (Exception e) {
            log.error("관광지 상세정보 조회 실패: contentId={}, error={}", contentId, e.getMessage(), e);
            return Map.of("success", false, "message", "상세정보를 불러올 수 없습니다: " + e.getMessage());
        }
    }

    /**
     * detailCommon2 API 호출 - 기본정보 (에러 처리 강화)
     */
    private Map<String, Object> getDetailCommon(String contentId) {
        try {
            String url = String.format(
                "%s/detailCommon2?serviceKey=%s&MobileOS=ETC&MobileApp=Act2gether&_type=json&contentId=%s&defaultYN=Y&firstImageYN=Y&areacodeYN=Y&catcodeYN=Y&addrinfoYN=Y&mapinfoYN=Y&overviewYN=Y",
                baseUrl, serviceKey, contentId);

            log.debug("detailCommon2 API 호출: {}", url);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            String responseBody = response.getBody();
            
            if (responseBody == null || responseBody.trim().isEmpty()) {
                log.warn("detailCommon2 응답이 비어있음: contentId={}", contentId);
                return Map.of("success", false, "message", "API 응답이 비어있습니다");
            }

            JsonNode jsonNode = objectMapper.readTree(responseBody);
            JsonNode header = jsonNode.path("response").path("header");
            String resultCode = header.path("resultCode").asText();
            String resultMsg = header.path("resultMsg").asText();
            
            log.debug("API 응답 코드: {} - {}", resultCode, resultMsg);

            if (!"0000".equals(resultCode)) {
                log.warn("API 오류 응답: contentId={}, code={}, message={}", contentId, resultCode, resultMsg);
                // 특정 에러 코드에 대한 대안 처리
                if ("4005".equals(resultCode) || "9999".equals(resultCode)) {
                    // 해당 contentId가 존재하지 않거나 서비스 오류인 경우, 세션 데이터로 대체
                    return createFallbackData(contentId);
                }
                return Map.of("success", false, "message", "기본정보를 찾을 수 없습니다: " + resultMsg);
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            if (items.isArray() && items.size() > 0) {
                return Map.of("success", true, "data", items.get(0));
            } else if (!items.isMissingNode()) {
                return Map.of("success", true, "data", items);
            }

            log.warn("API 응답에 데이터가 없음: contentId={}", contentId);
            return createFallbackData(contentId);

        } catch (Exception e) {
            log.warn("detailCommon2 API 호출 실패: contentId={}, error={}", contentId, e.getMessage());
            return createFallbackData(contentId);
        }
    }

    /**
     * API 실패시 세션 데이터 기반 fallback 생성
     */
    private Map<String, Object> createFallbackData(String contentId) {
        log.info("세션 데이터 기반 fallback 생성: contentId={}", contentId);
        return Map.of(
            "success", true, 
            "fallback", true,
            "data", Map.of(
                "contentid", contentId,
                "title", "관광지 정보",
                "homepage", "",
                "addr1", "주소 정보 없음",
                "tel", "",
                "overview", "상세 정보는 현재 제공되지 않습니다."
            )
        );
    }

    /**
     * detailIntro2 API 호출 - 이용정보
     */
    private Map<String, Object> getDetailIntro(String contentId) {
        try {
            String url = String.format(
                "%s/detailIntro2?serviceKey=%s&MobileOS=ETC&MobileApp=Act2gether&_type=json&contentId=%s&contentTypeId=12",
                baseUrl, serviceKey, contentId);

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            if (!"0000".equals(header.path("resultCode").asText())) {
                return Map.of("success", false, "message", "이용정보를 찾을 수 없습니다");
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            if (items.isArray() && items.size() > 0) {
                return Map.of("success", true, "data", items.get(0));
            } else if (!items.isMissingNode()) {
                return Map.of("success", true, "data", items);
            }

            return Map.of("success", false, "message", "이용정보가 없습니다");

        } catch (Exception e) {
            log.warn("detailIntro2 API 호출 실패: contentId={}, error={}", contentId, e.getMessage());
            return Map.of("success", false, "message", "이용정보 조회 실패");
        }
    }

    /**
     * detailInfo2 API 호출 - 반복정보
     */
    private Map<String, Object> getDetailInfo(String contentId) {
        try {
            String url = String.format(
                "%s/detailInfo2?serviceKey=%s&MobileOS=ETC&MobileApp=Act2gether&_type=json&contentId=%s&contentTypeId=12",
                baseUrl, serviceKey, contentId);

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode jsonNode = objectMapper.readTree(response.getBody());

            JsonNode header = jsonNode.path("response").path("header");
            if (!"0000".equals(header.path("resultCode").asText())) {
                return Map.of("success", false, "message", "반복정보를 찾을 수 없습니다");
            }

            JsonNode items = jsonNode.path("response").path("body").path("items").path("item");
            return Map.of("success", true, "data", items);

        } catch (Exception e) {
            log.warn("detailInfo2 API 호출 실패: contentId={}, error={}", contentId, e.getMessage());
            return Map.of("success", false, "message", "반복정보 조회 실패");
        }
    }

    /**
     * 홈페이지 URL 추출 및 이스케이프 처리
     */
    private String extractHomepageUrl(String homepage) {
        if (homepage == null || homepage.trim().isEmpty()) {
            return "";
        }

        String extractedUrl = "";

        // HTML 태그가 포함된 경우
        if (homepage.contains("href=")) {
            try {
                int hrefStart = homepage.indexOf("href=\"");
                if (hrefStart != -1) {
                    hrefStart += 6; // "href=\"" 길이
                    int hrefEnd = homepage.indexOf("\"", hrefStart);
                    if (hrefEnd != -1) {
                        extractedUrl = homepage.substring(hrefStart, hrefEnd);
                    }
                }
            } catch (Exception e) {
                log.debug("홈페이지 URL 추출 실패: {}", e.getMessage());
            }
        }
        // 일반 URL인 경우
        else if (homepage.startsWith("http")) {
            extractedUrl = homepage;
        }

        // 유니코드 이스케이프 디코딩
        if (!extractedUrl.isEmpty()) {
            extractedUrl = extractedUrl
                .replace("\\u003d", "=")
                .replace("\\u0026", "&")
                .replace("\\u003c", "<")
                .replace("\\u003e", ">")
                .replace("\\u0022", "\"");
        }

        return extractedUrl;
    }

    /**
     * 개요 텍스트 정리
     */
    private String cleanOverview(String overview) {
        if (overview == null || overview.trim().isEmpty()) {
            return "";
        }
        
        // HTML 태그 제거
        String cleaned = overview.replaceAll("<[^>]*>", "");
        
        // 연속된 공백 정리
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        
        return cleaned;
    }

    /**
     * 반복정보에서 입장료 정보 추출
     */
    private String extractAdmissionFromInfo(JsonNode infoItems) {
        if (infoItems == null || infoItems.isMissingNode()) {
            return "정보 없음";
        }

        try {
            // 배열인 경우
            if (infoItems.isArray()) {
                for (JsonNode item : infoItems) {
                    String infoname = item.path("infoname").asText("").toLowerCase();
                    String infotext = item.path("infotext").asText("");
                    
                    if (infoname.contains("입장료") || infoname.contains("이용요금") || infoname.contains("요금")) {
                        return cleanInfoText(infotext);
                    }
                }
            } 
            // 단일 객체인 경우
            else {
                String infoname = infoItems.path("infoname").asText("").toLowerCase();
                String infotext = infoItems.path("infotext").asText("");
                
                if (infoname.contains("입장료") || infoname.contains("이용요금") || infoname.contains("요금")) {
                    return cleanInfoText(infotext);
                }
            }

        } catch (Exception e) {
            log.debug("입장료 정보 추출 실패: {}", e.getMessage());
        }

        return "정보 없음";
    }

    /**
     * 정보 텍스트 정리
     */
    private String cleanInfoText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return "정보 없음";
        }
        
        String cleaned = text.replaceAll("<[^>]*>", "").trim();
        
        // 너무 긴 경우 자르기
        if (cleaned.length() > 200) {
            cleaned = cleaned.substring(0, 200) + "...";
        }
        
        return cleaned.isEmpty() ? "정보 없음" : cleaned;
    }
}