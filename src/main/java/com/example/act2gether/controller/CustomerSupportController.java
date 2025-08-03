package com.example.act2gether.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    
    // ========== API 엔드포인트들 ==========
    
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
            @RequestParam(required = false) Boolean myPostsOnly,
            HttpSession session) {
        
        try {
            String currentUserId = (String) session.getAttribute("userid");
            if (currentUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            CustomerSupportDTO searchDto = new CustomerSupportDTO();
            searchDto.setPage(page);
            searchDto.setSize(size);
            searchDto.setSearchType(searchType);
            searchDto.setSearchKeyword(searchKeyword);
            
            Page<CustomerSupportDTO> supportList;
            if (myPostsOnly != null && myPostsOnly) {
                supportList = customerSupportService.getMySupportList(currentUserId, searchDto);
            } else {
                supportList = customerSupportService.getSupportList(currentUserId, searchDto);
            }
            
            return ResponseEntity.ok(supportList);
        } catch (Exception e) {
            log.error("QnA 목록 조회 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("목록 조회에 실패했습니다: " + e.getMessage());
        }
    }
    
    @GetMapping("/api/current-user")
    @ResponseBody
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        String userid = (String) session.getAttribute("userid");
        String userRole = (String) session.getAttribute("user_role");
        String username = (String) session.getAttribute("username");

        if (userid == null) {
            return ResponseEntity.ok(Map.of("isAuthenticated", false));
        }

        boolean isAdmin = userRole != null && "ADMIN".equals(userRole);

        Map<String, Object> userInfo = Map.of(
            "isAuthenticated", true,
            "userid", userid,
            "username",username,
            "isAdmin", isAdmin,
            "roles", userRole != null ? userRole : "USER"
        );
        
        return ResponseEntity.ok(userInfo);
    }
    
    @GetMapping("/api/inquiry-types")
    @ResponseBody
    public ResponseEntity<?> getInquiryTypes() {
        List<Map<String, String>> types = List.of(
            Map.of("code", "일반문의", "displayName", "일반문의")
        );
        return ResponseEntity.ok(types);
    }
    
    @GetMapping("/api/statuses")
    @ResponseBody
    public ResponseEntity<?> getStatuses() {
        List<Map<String, String>> statuses = List.of(
            Map.of("code", "답변 대기", "displayName", "답변대기"),
            Map.of("code", "답변 완료", "displayName", "답변완료")
        );
        return ResponseEntity.ok(statuses);
    }
    
    @GetMapping("/api/{supportId}")
    @ResponseBody
    public ResponseEntity<?> getQnaDetail(@PathVariable String supportId, HttpSession session) {
        try {
            String userid = (String) session.getAttribute("userid");
            if (userid == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            CustomerSupportDTO support = customerSupportService.getSupportDetail(supportId, userid);
            return ResponseEntity.ok(support);
        } catch (Exception e) {
            log.error("문의 상세 조회 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("상세 조회에 실패했습니다: " + e.getMessage());
        }
    }

    @PostMapping("/api")
    @ResponseBody
    public ResponseEntity<?> createQnaPost(
            CustomerSupportDTO dto,
            @RequestParam(required = false) List<MultipartFile> imageFiles,
            HttpSession session) {
        
        try {
            String userid = (String) session.getAttribute("userid");
            if (userid == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            dto.setUserId(userid);
            
            String supportId = customerSupportService.createSupport(dto, imageFiles);
            
            int imageCount = imageFiles != null ? (int) imageFiles.stream()
                .filter(f -> f != null && !f.isEmpty()).count() : 0;
            
            return ResponseEntity.ok(Map.of(
                "id", supportId, 
                "message", "문의가 성공적으로 등록되었습니다.",
                "imageCount", imageCount
            ));
        } catch (Exception e) {
            log.error("문의 작성 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("문의 등록에 실패했습니다: " + e.getMessage());
        }
    }

    @PutMapping("/api/{supportId}")
    @ResponseBody
    public ResponseEntity<?> updateQnaPost(
            @PathVariable String supportId,
            CustomerSupportDTO dto,
            @RequestParam(required = false) List<MultipartFile> imageFiles,
            @RequestParam(required = false) List<String> deleteImagePaths,
            @RequestParam(required = false, defaultValue = "false") boolean deleteAllImages,
            HttpSession session) {
        
        try {
            String userid = (String) session.getAttribute("userid");
            if (userid == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            int newImageCount = imageFiles != null ? (int) imageFiles.stream()
                .filter(f -> f != null && !f.isEmpty()).count() : 0;
            int deleteCount = deleteImagePaths != null ? deleteImagePaths.size() : 0;
            
            // 🎯 개별 삭제인 경우 deleteAllImages를 false로 강제 설정
            if (deleteImagePaths != null && !deleteImagePaths.isEmpty() && !deleteAllImages) {
                customerSupportService.updateSupportWithImageDelete(
                    supportId, userid, dto, imageFiles, deleteImagePaths, false); // 🎯 명시적으로 false
            } else if (deleteAllImages) {
                customerSupportService.updateSupportWithImageDelete(
                    supportId, userid, dto, imageFiles, deleteImagePaths, true);
            } else {
                customerSupportService.updateSupport(supportId, userid, dto, imageFiles);
            }
            
            return ResponseEntity.ok(Map.of(
                "message", "문의가 성공적으로 수정되었습니다.",
                "newImageCount", newImageCount,
                "deletedCount", deleteCount
            ));
        } catch (Exception e) {
            log.error("문의 수정 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("문의 수정에 실패했습니다: " + e.getMessage());
        }
    }

    @DeleteMapping("/api/{supportId}")
    @ResponseBody
    public ResponseEntity<?> deleteQnaPost(@PathVariable String supportId, HttpSession session) {
        try {
            String userid = (String) session.getAttribute("userid");
            if (userid == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            customerSupportService.deleteSupport(supportId, userid);
            
            return ResponseEntity.ok(Map.of("message", "문의가 성공적으로 삭제되었습니다."));
        } catch (Exception e) {
            log.error("문의 삭제 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("문의 삭제에 실패했습니다: " + e.getMessage());
        }
    }

    @PostMapping("/api/{supportId}/reply")
    @ResponseBody
    public ResponseEntity<?> addResponse(
            @PathVariable String supportId,
            @RequestBody Map<String, String> requestBody,
            HttpSession session) {
        
        try {
            String userid = (String) session.getAttribute("userid");
            String userRole = (String) session.getAttribute("user_role");
            
            if (userid == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("로그인이 필요합니다.");
            }
            
            if (userRole == null || !"ADMIN".equals(userRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("관리자 권한이 필요합니다.");
            }
            
            String replyContent = requestBody.get("replyContent");
            customerSupportService.addResponse(supportId, userid, replyContent);
            
            return ResponseEntity.ok(Map.of("message", "답변이 성공적으로 등록되었습니다."));
        } catch (Exception e) {
            log.error("답변 등록 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("답변 등록에 실패했습니다: " + e.getMessage());
        }
    }
}