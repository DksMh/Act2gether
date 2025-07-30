package com.example.act2gether.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import com.example.act2gether.dto.CustomerSupportDTO;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.UserRepository;
import com.example.act2gether.service.CustomerSupportService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@RequestMapping("/qna")
@RequiredArgsConstructor
@Slf4j
public class CustomerSupportController {
    
    private final CustomerSupportService customerSupportService;
    private final UserRepository userRepository;
    
    // API 엔드포인트들을 /api/qna로 매핑
    @GetMapping("/api/list")
    @ResponseBody
    public ResponseEntity<?> getQnaList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String searchType,
            @RequestParam(required = false) String searchKeyword,
            @RequestParam(required = false) String inquiryType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean isPrivate,
            @RequestParam(required = false) String userId,
            Authentication authentication) {
        
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            String currentUserId = userRepository.findByEmail(authentication.getName()).map(UserEntity::getUsername).orElse(""); //DB의 username 이메일로 보고싶으면 밑에 주석이랑 바꾸면 됨
            // String currentUserId = authentication.getName(); //email
            
            CustomerSupportDTO searchDto = new CustomerSupportDTO();
            searchDto.setPage(page);
            searchDto.setSize(size);
            searchDto.setSearchType(searchType);
            searchDto.setSearchKeyword(searchKeyword);
            
            Page<CustomerSupportDTO> supportList = customerSupportService.getSupportList(currentUserId, searchDto);
            
            return ResponseEntity.ok(supportList);
        } catch (Exception e) {
            log.error("QnA 목록 조회 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("목록 조회에 실패했습니다: " + e.getMessage());
        }
    }
    
    // 현재 사용자 정보 조회
    @GetMapping("/api/current-user")
    @ResponseBody
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
       if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("isAuthenticated", false));
        }

        String userId = authentication.getName(); // 기본적으로 username(email)
        
        boolean isAdmin = authentication.getAuthorities().stream()
            .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));

        String roles = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.joining(","));

        Map<String, Object> userInfo = Map.of(
            "isAuthenticated", true,
            "userId", userId,
            "isAdmin", isAdmin,
            "roles", roles
        );
        
        return ResponseEntity.ok(userInfo);
    }
    
    // 문의 유형 목록
    @GetMapping("/api/inquiry-types")
    @ResponseBody
    public ResponseEntity<?> getInquiryTypes() {
        List<Map<String, String>> types = List.of(
            Map.of("code", "일반문의", "displayName", "일반문의"),
            Map.of("code", "신고", "displayName", "신고")
        );
        return ResponseEntity.ok(types);
    }
    
    // 상태 목록
    @GetMapping("/api/statuses")
    @ResponseBody
    public ResponseEntity<?> getStatuses() {
        List<Map<String, String>> statuses = List.of(
            Map.of("code", "답변 대기", "displayName", "답변대기"),
            Map.of("code", "답변 완료", "displayName", "답변완료")
        );
        return ResponseEntity.ok(statuses);
    }

    // // QnA 게시판 페이지 (HTML 반환)
    // @GetMapping
    // public String qnaPage() {
    //     return "qna";
    // }

    // API - QnA 상세 조회
    @GetMapping("/api/{supportId}")
    @ResponseBody
    public ResponseEntity<?> getQnaDetail(@PathVariable String supportId, HttpSession session) {
        try {
            String userId = (String) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            CustomerSupportDTO support = customerSupportService.getSupportDetail(supportId, userId);
            return ResponseEntity.ok(support);
        } catch (Exception e) {
            log.error("문의 상세 조회 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("상세 조회에 실패했습니다: " + e.getMessage());
        }
    }

    // API - QnA 등록
    @PostMapping("/api")
    @ResponseBody
    public ResponseEntity<?> createQnaPost(
            @RequestBody CustomerSupportDTO dto,
            HttpSession session) {
        
        try {
            String userId = (String) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            dto.setUserId(userId);
            String supportId = customerSupportService.createSupport(dto, null);
            
            return ResponseEntity.ok(Map.of("id", supportId, "message", "문의가 성공적으로 등록되었습니다."));
        } catch (Exception e) {
            log.error("문의 작성 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("문의 등록에 실패했습니다: " + e.getMessage());
        }
    }

    // API - QnA 수정
    @PutMapping("/api/{supportId}")
    @ResponseBody
    public ResponseEntity<?> updateQnaPost(
            @PathVariable String supportId,
            @RequestBody CustomerSupportDTO dto,
            HttpSession session) {
        
        try {
            String userId = (String) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            customerSupportService.updateSupport(supportId, userId, dto, null);
            
            return ResponseEntity.ok(Map.of("message", "문의가 성공적으로 수정되었습니다."));
        } catch (Exception e) {
            log.error("문의 수정 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("문의 수정에 실패했습니다: " + e.getMessage());
        }
    }

    // API - QnA 삭제
    @DeleteMapping("/api/{supportId}")
    @ResponseBody
    public ResponseEntity<?> deleteQnaPost(@PathVariable String supportId, HttpSession session) {
        try {
            String userId = (String) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            customerSupportService.deleteSupport(supportId, userId);
            
            return ResponseEntity.ok(Map.of("message", "문의가 성공적으로 삭제되었습니다."));
        } catch (Exception e) {
            log.error("문의 삭제 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("문의 삭제에 실패했습니다: " + e.getMessage());
        }
    }

    // API - 관리자 답변 등록
    @PostMapping("/api/{supportId}/reply")
    @ResponseBody
    public ResponseEntity<?> addResponse(
            @PathVariable String supportId,
            @RequestBody Map<String, String> requestBody,
            HttpSession session) {
        
        try {
            String userId = (String) session.getAttribute("userId");
            String userRoles = (String) session.getAttribute("user_roles");
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            // 관리자 권한 확인
            if (userRoles == null || !userRoles.contains("ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("관리자 권한이 필요합니다.");
            }
            
            String replyContent = requestBody.get("replyContent");
            customerSupportService.addResponse(supportId, userId, replyContent);
            
            return ResponseEntity.ok(Map.of("message", "답변이 성공적으로 등록되었습니다."));
        } catch (Exception e) {
            log.error("답변 등록 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("답변 등록에 실패했습니다: " + e.getMessage());
        }
    }
        
    // QnA 작성 페이지
    @GetMapping("/write")
    public String writeForm(Model model) {
        model.addAttribute("customerSupport", new CustomerSupportDTO());
        return "qna-write";
    }
    
    // QnA 작성 처리 (파일 업로드 포함)
    @PostMapping("/write")
    @ResponseBody
    public ResponseEntity<?> writeSupport(
            CustomerSupportDTO dto,
            @RequestParam(required = false) MultipartFile imageFile,
            HttpSession session) {
        
        try {
            String userId = (String) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            dto.setUserId(userId);
            String supportId = customerSupportService.createSupport(dto, imageFile);
            
            return ResponseEntity.ok()
                .body("문의가 성공적으로 등록되었습니다. ID: " + supportId);
        } catch (Exception e) {
            log.error("문의 작성 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("문의 등록에 실패했습니다: " + e.getMessage());
        }
    }
    
    // QnA 수정 처리 (파일 업로드 포함)
    @PutMapping("/{supportId}")
    @ResponseBody
    public ResponseEntity<?> updateSupport(
            @PathVariable String supportId,
            CustomerSupportDTO dto,
            @RequestParam(required = false) MultipartFile imageFile,
            HttpSession session) {
        
        try {
            String userId = (String) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            customerSupportService.updateSupport(supportId, userId, dto, imageFile);
            
            return ResponseEntity.ok()
                .body("문의가 성공적으로 수정되었습니다.");
        } catch (Exception e) {
            log.error("문의 수정 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("문의 수정에 실패했습니다: " + e.getMessage());
        }
    }
    
    // QnA 삭제 처리 (기존 방식)
    @DeleteMapping("/{supportId}")
    @ResponseBody
    public ResponseEntity<?> deleteSupport(@PathVariable String supportId, HttpSession session) {
        try {
            String userId = (String) session.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            customerSupportService.deleteSupport(supportId, userId);
            
            return ResponseEntity.ok()
                .body("문의가 성공적으로 삭제되었습니다.");
        } catch (Exception e) {
            log.error("문의 삭제 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("문의 삭제에 실패했습니다: " + e.getMessage());
        }
    }

    // 관리자 답변 추가 (기존 방식)
    @PostMapping("/{supportId}/response")
    @ResponseBody
    public ResponseEntity<?> addResponseLegacy(
            @PathVariable String supportId,
            @RequestParam String response,
            HttpSession session) {
        
        try {
            String userId = (String) session.getAttribute("userId");
            String userRoles = (String) session.getAttribute("user_roles");
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            // 관리자 권한 확인
            if (userRoles == null || !userRoles.contains("ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("관리자 권한이 필요합니다.");
            }
            
            customerSupportService.addResponse(supportId, userId, response);
            
            return ResponseEntity.ok()
                .body("답변이 성공적으로 등록되었습니다.");
        } catch (Exception e) {
            log.error("답변 등록 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("답변 등록에 실패했습니다: " + e.getMessage());
        }
    }
    
    // 내 문의 목록
    @GetMapping("/my")
    public String myQnaList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Model model,
            HttpSession session) {
        
        String userId = (String) session.getAttribute("userId");
        if (userId == null) {
            return "redirect:/login";
        }
        
        CustomerSupportDTO searchDto = new CustomerSupportDTO();
        searchDto.setPage(page);
        searchDto.setSize(size);
        
        Page<CustomerSupportDTO> supportList = customerSupportService.getMySupportList(userId, searchDto);
        
        model.addAttribute("supportList", supportList);
        model.addAttribute("currentPage", page);
        
        return "my-qna";
    }
}