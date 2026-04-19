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
 * 🆕 v2.4 무장애여행 API 통합 서비스 (수정됨)
 * 한국관광공사 무장애여행 API (areaBasedSyncList2 + detailWithTour2)를 사용하여
 * 액티브 시니어를 위한 편의시설 정보를 제공
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BarrierFreeService {

    @Value("${tourism.api.nobarrier-url}")
    private String baseUrl;

    @Value("${tourism.api.key}")
    private String serviceKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // 병렬 처리를 위한 스레드 풀 (성능 최적화)
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);

    // 액티브 시니어 핵심 3개 편의시설 그룹
    private static final Map<String, String[]> ACCESSIBILITY_GROUPS = Map.of(
            "주차 편의", new String[] { "parking", "publictransport" },
            "접근 편의", new String[] { "route", "exit" },
            "시설 편의", new String[] { "restroom", "elevator" });

    // 액티브 시니어 중요도 기반 가중치
    private static final Map<String, Integer> ACCESSIBILITY_WEIGHTS = Map.of(
            "parking", 25, // 주차 편의성 (높은 중요도)
            "route", 25, // 접근로 편의성 (높은 중요도)
            "exit", 20, // 출입 편의성
            "elevator", 15, // 층간 이동
            "restroom", 10, // 화장실 편의성
            "publictransport", 5 // 대중교통 (차량 이용 많음)
    );

    /**
     * 🎯 핵심 메서드: Tour API 결과에 무장애여행 정보 통합 (JsonNode 기반)
     * 
     * @param tourNodes   Tour API에서 받은 JsonNode 리스트
     * @param areaCode    지역코드 (무장애 관광지 사전 조회용)
     * @param sigunguCode 시군구코드 (옵션)
     * @return 편의시설 정보가 통합된 JsonNode 리스트
     */
    public List<JsonNode> enrichWithBarrierFreeInfo(List<JsonNode> tourNodes, String areaCode, String sigunguCode) {
        if (tourNodes == null || tourNodes.isEmpty()) {
            log.info("무장애여행 정보 통합 대상이 없음");
            return new ArrayList<>();
        }

        log.info("무장애여행 정보 통합 시작: {}개 관광지", tourNodes.size());

        // 1. 전체 서울 지역 무장애 관광지 조회 (시군구 제한 없이)
        Set<String> barrierFreeContentIds = getBarrierFreeContentIds(areaCode, null); // sigunguCode 제거!
        log.info("📋 무장애 정보 보유 관광지: {}개", barrierFreeContentIds.size());

        // 2. 교집합 방식 대신 각 contentId 개별 체크
        List<String> contentIdsToCheck = tourNodes.stream()
                .map(node -> node.path("contentid").asText())
                .filter(id -> !id.isEmpty())
                .collect(Collectors.toList());

        log.info("🎯 무장애 정보 조회 대상: {}개", contentIdsToCheck.size());

        // 3. 각 contentId에 대해 직접 detailWithTour2 호출
        List<CompletableFuture<JsonNode>> futures = tourNodes.stream()
                .map(node -> CompletableFuture.supplyAsync(() -> {
                    try {
                        String contentId = node.path("contentid").asText();

                        // 무조건 시도 (교집합 체크 없이)
                        Map<String, String> barrierFreeInfo = getBarrierFreeInfo(contentId);

                        ObjectNode enrichedNode = (ObjectNode) node.deepCopy();

                        if (!barrierFreeInfo.isEmpty()) {
                            int accessibilityScore = calculateAccessibilityScore(barrierFreeInfo);
                            enrichedNode.put("accessibilityScore", accessibilityScore);
                            enrichedNode.put("hasBarrierFreeInfo", true);
                            enrichedNode.put("barrierFreeInfo", objectMapper.writeValueAsString(barrierFreeInfo));
                            log.info("✅ {} 무장애 정보 발견 - 점수: {}", contentId, accessibilityScore);
                        } else {
                            enrichedNode.put("accessibilityScore", 0);
                            enrichedNode.put("hasBarrierFreeInfo", false);
                            enrichedNode.put("barrierFreeInfo", "{}");
                            log.info("⚠️ {} 무장애 정보 없음", contentId);
                        }

                        return (JsonNode) enrichedNode;

                    } catch (Exception e) {
                        log.warn("무장애 정보 조회 실패: {}", e.getMessage());
                        // 실패해도 원본 반환
                        ObjectNode fallbackNode = (ObjectNode) node.deepCopy();
                        fallbackNode.put("accessibilityScore", 0);
                        fallbackNode.put("hasBarrierFreeInfo", false);
                        fallbackNode.put("barrierFreeInfo", "{}");
                        return (JsonNode) fallbackNode;
                    }
                }, executorService))
                .collect(Collectors.toList());

        // 모든 호출 완료 대기
        // 모든 detailWithTour2 호출 완료 대기
        List<JsonNode> enrichedResults = futures.stream()
                .map(CompletableFuture::join)
                .filter(node -> node != null)
                .collect(Collectors.toList());

        log.info("✅ 무장애여행 정보 통합 완료: {}개 중 {}개 처리",
                tourNodes.size(), enrichedResults.size());

        return enrichedResults;

    }

    /**
     * 📍 지역별 무장애 관광지 ContentId 목록 사전 조회 (성능 최적화)
     * 
     * @param areaCode    지역코드
     * @param sigunguCode 시군구코드 (옵션)
     * @return 무장애 정보가 있는 ContentId Set
     */
    private Set<String> getBarrierFreeContentIds(String areaCode, String sigunguCode) {
        Set<String> contentIds = new HashSet<>();

        try {
            // 🔧 수정: 올바른 무장애여행 API 엔드포인트 사용
            // StringBuilder urlBuilder = new StringBuilder();
            // urlBuilder.append("https://apis.data.go.kr/B551011/KorWithService2/areaBasedSyncList2")
            // .append("?serviceKey=").append(serviceKey)
            // .append("&MobileOS=ETC&MobileApp=Act2gether&_type=json")
            // .append("&contentTypeId=12") // 관광지만
            // .append("&showflag=1") // 표출되는 것만
            // .append("&numOfRows=1000") // 충분한 개수
            // .append("&pageNo=1");
            String url = String.format(
                    "%s/areaBasedSyncList2?serviceKey=%s&MobileOS=ETC&MobileApp=Act2gether&_type=json" +
                            "&contentTypeId=12&showflag=1&numOfRows=1000&pageNo=1&areaCode=%s",
                    baseUrl, // https://apis.data.go.kr/B551011/KorWithService2
                    serviceKey,
                    areaCode != null ? areaCode : "");
            // sigunguCode가 있으면 추가
            if (sigunguCode != null && !sigunguCode.isEmpty()) {
                url += "&sigunguCode=" + sigunguCode;
            }

            // if (areaCode != null && !areaCode.isEmpty()) {
            // urlBuilder.append("&areaCode=").append(areaCode);
            // }

            // if (sigunguCode != null && !sigunguCode.isEmpty()) {
            // urlBuilder.append("&sigunguCode=").append(sigunguCode);
            // }

            log.info("무장애여행 API 호출 areaBasedSyncList2: {}", url);// urlBuilder.toString());

            ResponseEntity<String> response = restTemplate.getForEntity(url.toString(), String.class);
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
     * 🔍 무장애여행 API 호출하여 편의시설 정보 조회 (수정됨)
     * 
     * @param contentId 관광지 콘텐츠 ID
     * @return 편의시설 정보 Map (필드명 -> 값)
     */
    private Map<String, String> getBarrierFreeInfo(String contentId) throws Exception {
        // String url =
        // "https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2" +
        // "?serviceKey=" + serviceKey +
        // "&contentId=" + contentId +
        // "&MobileOS=ETC&MobileApp=Act2gether&_type=json";
        String url = String.format(
                "%s/detailWithTour2?serviceKey=%s&contentId=%s&MobileOS=ETC&MobileApp=Act2gether&_type=json",
                baseUrl, // https://apis.data.go.kr/B551011/KorWithService2
                serviceKey,
                contentId);
        try {
            log.info("🌐 detailWithTour2 API 호출 시작: contentId={}", contentId);
            log.debug("📡 요청 URL: {}", url);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            log.info("📥 detailWithTour2 응답 받음: contentId={}, 응답크기={}바이트",
                    contentId, response.getBody().length());

            // 🔍 디버깅: 실제 응답 내용 로깅
            log.debug("📋 실제 응답 내용: {}", response.getBody());

            JsonNode root = objectMapper.readTree(response.getBody());

            // 응답 코드 확인
            JsonNode resultCode = root.path("response").path("header").path("resultCode");
            String code = resultCode.asText();

            if (!"0000".equals(code)) {
                String errorMsg = getErrorMessage(code);
                if ("03".equals(code)) {
                    log.info("📋 무장애 정보 없음: contentId={}", contentId);
                    return new HashMap<>();
                } else {
                    log.error("❌ detailWithTour2 API 오류: contentId={}, code={}, msg={}",
                            contentId, code, errorMsg);
                    throw new RuntimeException("무장애여행 API 오류: " + code + " - " + errorMsg);
                }
            }

            // 🔥 핵심 수정: 배열 처리 로직 개선
            JsonNode items = root.path("response").path("body").path("items").path("item");
            JsonNode item = null;

            if (items.isArray() && items.size() > 0) {
                // 배열인 경우 첫 번째 요소 사용
                item = items.get(0);
                log.info("✅ 배열 형태 응답: contentId={}, 배열크기={}", contentId, items.size());
            } else if (!items.isMissingNode()) {
                // 단일 객체인 경우
                item = items;
                log.info("✅ 객체 형태 응답: contentId={}", contentId);
            } else {
                log.warn("⚠️ item 노드를 찾을 수 없음: contentId={}", contentId);
                return new HashMap<>();
            }

            Map<String, String> barrierFreeInfo = new HashMap<>();

            // 🔥 핵심 수정: 편의시설 정보 추출 로직 개선
            String[] coreFields = { "parking", "route", "exit", "elevator", "restroom", "publictransport" };

            for (String field : coreFields) {
                String value = item.path(field).asText("");
                log.info("🔍 편의시설 체크: contentId={}, field={}, value='{}'", contentId, field, value);

                // 🔥 중요: 빈 값이 아니고 의미있는 정보가 있는 경우만 추가
                if (!value.isEmpty() && !value.equals("0") && !value.trim().isEmpty() && !value.equals("null")) {
                    // 추가 검증: 실제 편의시설 정보인지 확인
                    if (containsValidBarrierFreeInfo(value)) {
                        barrierFreeInfo.put(field, value);
                        log.info("✅ 편의시설 발견: contentId={}, {}={}", contentId, field, value);
                    } else {
                        log.debug("⚠️ 무의미한 정보 스킵: contentId={}, {}={}", contentId, field, value);
                    }
                }
            }

            log.info("📊 detailWithTour2 완료: contentId={}, 편의시설수={}", contentId, barrierFreeInfo.size());

            // 🔍 디버깅: 최종 결과 로깅
            if (!barrierFreeInfo.isEmpty()) {
                log.info("🎯 최종 편의시설 정보: contentId={}, 정보={}", contentId, barrierFreeInfo);
            }

            return barrierFreeInfo;

        } catch (Exception e) {
            log.error("💥 detailWithTour2 호출 실패: contentId={}, 오류={}", contentId, e.getMessage(), e);
            return new HashMap<>();
        }
    }

    /**
     * 🔍 유효한 편의시설 정보인지 검증
     */
    private boolean containsValidBarrierFreeInfo(String value) {
        if (value == null || value.trim().isEmpty()) {
            return false;
        }

        String lowerValue = value.toLowerCase().trim();

        // 의미없는 기본값들 제외
        if (lowerValue.equals("없음") || lowerValue.equals("no") ||
                lowerValue.equals("해당없음") || lowerValue.equals("n/a") ||
                lowerValue.equals("-") || lowerValue.equals(".") ||
                lowerValue.equals("정보없음") || lowerValue.equals("미확인")) {
            return false;
        }

        // 긍정적인 편의시설 정보 키워드 포함 확인
        String[] positiveKeywords = {
                "가능", "있음", "설치", "완비", "지원", "제공",
                "대여", "운영", "이용가능", "편의", "접근가능",
                "휠체어", "엘리베이터", "화장실", "주차"
        };

        for (String keyword : positiveKeywords) {
            if (value.contains(keyword)) {
                return true;
            }
        }

        // 최소 길이 확인 (너무 짧은 정보는 제외)
        return value.trim().length() >= 2;
    }

    /**
     * 📊 접근성 점수 계산 (액티브 시니어 가중치 기반)
     * 
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
     * 🎯 편의시설 그룹별 필터링 (수정됨)
     */
    public List<JsonNode> filterByAccessibilityNeeds(List<JsonNode> results, String needs) {
        if (needs == null || needs.isEmpty() || "필요없음".equals(needs)) {
            return results;
        }

        log.info("🎯 편의시설 필터 적용: {} 조건", needs);

        // 편의시설 그룹에서 해당 필드들 가져오기
        String[] requiredFields = ACCESSIBILITY_GROUPS.get(needs);
        if (requiredFields == null) {
            log.warn("⚠️ 알 수 없는 편의시설 그룹: {}", needs);
            return results;
        }

        List<JsonNode> filteredResults = results.stream()
                .filter(node -> {
                    try {
                        String barrierFreeInfoJson = node.path("barrierFreeInfo").asText("{}");
                        JsonNode barrierFreeInfo = objectMapper.readTree(barrierFreeInfoJson);

                        // 해당 그룹의 편의시설 중 하나라도 있는지 확인
                        boolean hasRequiredFeature = hasAnyFeature(barrierFreeInfo, requiredFields);

                        if (hasRequiredFeature) {
                            log.debug("✅ 편의시설 조건 만족: {} - {}", node.path("contentid").asText(), needs);
                        } else {
                            log.debug("❌ 편의시설 조건 불만족: {} - {}", node.path("contentid").asText(), needs);
                        }

                        return hasRequiredFeature;

                    } catch (Exception e) {
                        log.warn("편의시설 정보 파싱 실패: {}", node.path("contentid").asText());
                        return false;
                    }
                })
                .collect(Collectors.toList());

        log.info("🎯 편의시설 필터 적용 완료 - {}개 → {}개", results.size(), filteredResults.size());
        return filteredResults;
    }

    /**
     * 편의시설 그룹 내 편의시설 중 하나라도 있는지 확인 (수정됨)
     */
    private boolean hasAnyFeature(JsonNode barrierFreeInfo, String... features) {
        for (String feature : features) {
            String value = barrierFreeInfo.path(feature).asText("");
            if (!value.isEmpty() && !value.equals("0") && !value.trim().isEmpty()) {
                log.debug("✅ 편의시설 발견: {} = {}", feature, value);
                return true;
            }
        }
        log.debug("❌ 해당 그룹 편의시설 없음: {}", String.join(", ", features));
        return false;
    }

    /**
     * 🚨 API 오류 코드별 메시지 반환
     */
    private String getErrorMessage(String code) {
        Map<String, String> errorMessages = Map.of(
                "03", "데이터없음에러(NODATA_ERROR)",
                "02", "데이터베이스에러(DB_ERROR)",
                "05", "서비스연결실패에러(SERVICETIMEOUT_ERROR)",
                "10", "잘못된요청파라메터에러(INVALID_REQUEST_PARAMETER_ERROR)",
                "11", "필수요청파라메터가없음(NO_MANDATORY_REQUEST_PARAMETERS_ERROR)",
                "21", "일시적으로서비스를사용할수없습니다(TEMPORARILY_DISABLE_THE_SERVICEKEY_ERROR)",
                "33", "서명되지않은호출(UNSIGNED_CALL_ERROR)");
        return errorMessages.getOrDefault(code, "알 수 없는 오류");
    }

    /**
     * 🔧 리소스 정리
     */
    public void shutdown() {
        executorService.shutdown();
    }
}