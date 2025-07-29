package com.example.act2gether.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.act2gether.dto.CustomerSupportDTO;
import com.example.act2gether.entity.CustomerSupportEntity;
import com.example.act2gether.entity.UserEntity;
import com.example.act2gether.repository.CustomerSupportRepository;
import com.example.act2gether.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class CustomerSupportService {
    
    private final CustomerSupportRepository customerSupportRepository;
    private final String uploadDir = "uploads/qna/";
    
    // 문의 작성
    public String createSupport(CustomerSupportDTO dto, MultipartFile imageFile) {
        try {
            // 이미지 파일 처리
            if (imageFile != null && !imageFile.isEmpty()) {
                String imagePath = saveImage(imageFile);
                dto.setImage_path(imagePath);
            }
            
            CustomerSupportEntity entity = CustomerSupportEntity.of(dto);
            customerSupportRepository.save(entity);
            return entity.getSupport_id();
        } catch (Exception e) {
            log.error("문의 작성 중 오류 발생: ", e);
            throw new RuntimeException("문의 작성에 실패했습니다.");
        }
    }
    
    // 문의 목록 조회 (페이징)
    public Page<CustomerSupportDTO> getSupportList(String userId, CustomerSupportDTO searchDto) {
        Pageable pageable = PageRequest.of(searchDto.getPage(), searchDto.getSize(), 
                                         Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<CustomerSupportEntity> entities;
        
        // 검색 조건에 따른 조회
        
        if (searchDto.getSearchKeyword() != null && !searchDto.getSearchKeyword().trim().isEmpty()) {
            entities = searchWithKeyword(userId, searchDto, pageable);
        } else {
            // 사용자가 볼 수 있는 게시글 조회 (자신의 글 + 공개 글)
            entities = customerSupportRepository.findVisiblePosts(userId, pageable);
        }
        
        return entities.map(this::convertToDTO);
    }
    
    // 검색 기능
    private Page<CustomerSupportEntity> searchWithKeyword(String userId, CustomerSupportDTO searchDto, Pageable pageable) {
        String keyword = searchDto.getSearchKeyword().trim();
        String searchType = searchDto.getSearchType();
        
        if ("title".equals(searchType)) {
            return customerSupportRepository.findByUserIdAndTitleContaining(userId, keyword, pageable);
        } else if ("content".equals(searchType)) {
            return customerSupportRepository.findByUserIdAndContentContaining(userId, keyword, pageable);
        } else {
            // 제목 + 내용 검색
            return customerSupportRepository.findByUserIdAndTitleOrContentContaining(userId, keyword, pageable);
        }
    }
    
    // 문의 상세 조회
    public CustomerSupportDTO getSupportDetail(String supportId, String userId) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));
        
        // 접근 권한 확인 (작성자 본인이거나 공개 글이어야 함)
        if (!entity.getUserId().equals(userId) && entity.getIsPrivate()) {
            throw new RuntimeException("접근 권한이 없습니다.");
        }
        
        // 조회수 증가
        entity.incrementViewCount();
        customerSupportRepository.save(entity);
        
        return convertToDTO(entity);
    }
    
    // 문의 수정
    public void updateSupport(String supportId, String userId, CustomerSupportDTO dto, MultipartFile imageFile) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));
        
        // 작성자 본인 확인
        if (!entity.getUserId().equals(userId)) {
            throw new RuntimeException("수정 권한이 없습니다.");
        }
        
        try {
            // 이미지 파일 처리
            if (imageFile != null && !imageFile.isEmpty()) {
                // 기존 이미지 삭제
                if (entity.getImage_path() != null) {
                    deleteImage(entity.getImage_path());
                }
                String imagePath = saveImage(imageFile);
                dto.setImage_path(imagePath);
            }
            
            entity.updateFromDTO(dto);
            customerSupportRepository.save(entity);
        } catch (Exception e) {
            log.error("문의 수정 중 오류 발생: ", e);
            throw new RuntimeException("문의 수정에 실패했습니다.");
        }
    }
    
    // 문의 삭제
    public void deleteSupport(String supportId, String userId) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));
        
        // 작성자 본인 확인
        if (!entity.getUserId().equals(userId)) {
            throw new RuntimeException("삭제 권한이 없습니다.");
        }
        
        // 이미지 파일 삭제
        if (entity.getImage_path() != null) {
            deleteImage(entity.getImage_path());
        }
        
        customerSupportRepository.delete(entity);
    }
    
    // 관리자 답변 추가
    public void addResponse(String supportId, String responder, String response) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));
        
        entity.addResponse(responder, response);
        customerSupportRepository.save(entity);
    }
    
    // 내 문의 목록 조회
    public Page<CustomerSupportDTO> getMySupportList(String userId, CustomerSupportDTO searchDto) {
        Pageable pageable = PageRequest.of(searchDto.getPage(), searchDto.getSize(), 
                                         Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<CustomerSupportEntity> entities = customerSupportRepository.findByUserId(userId, pageable);
        return entities.map(this::convertToDTO);
    }
    
    // Entity를 DTO로 변환
    private CustomerSupportDTO convertToDTO(CustomerSupportEntity entity) {
        CustomerSupportDTO dto = new CustomerSupportDTO();
        dto.setSupport_id(entity.getSupport_id());
        dto.setUserId(entity.getUserId());
        dto.setTitle(entity.getTitle());
        dto.setContent(entity.getContent());
        dto.setResponder(entity.getResponder());
        dto.setResponse(entity.getResponse());
        dto.setInquiry_type(entity.getInquiry_type());
        dto.setStatus(entity.getStatus());
        dto.setIsPrivate(entity.getIsPrivate());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setImage_path(entity.getImage_path());
        dto.setView_count(entity.getView_count());
        
        return dto;
    }
    
    // 이미지 저장
    private String saveImage(MultipartFile file) throws IOException {
        // 업로드 디렉터리 생성
        File uploadDirectory = new File(uploadDir);
        if (!uploadDirectory.exists()) {
            uploadDirectory.mkdirs();
        }
        
        // 파일명 생성 (UUID + 확장자)
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new IOException("파일명이 올바르지 않습니다.");
        }
        
        String extension = "";
        int lastDotIndex = originalFilename.lastIndexOf(".");
        if (lastDotIndex > 0) {
            extension = originalFilename.substring(lastDotIndex);
        }
        
        String filename = UUID.randomUUID().toString() + extension;
        
        // 파일 저장
        Path filePath = Paths.get(uploadDir + filename);
        Files.write(filePath, file.getBytes());
        
        return filename;
    }
    
    // 이미지 삭제
    private void deleteImage(String filename) {
        try {
            Path filePath = Paths.get(uploadDir + filename);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.error("이미지 삭제 중 오류 발생: ", e);
        }
    }
}