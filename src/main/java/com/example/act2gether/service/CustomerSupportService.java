package com.example.act2gether.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private final int MAX_IMAGES = 5;
    
    /**
     * 다중 이미지 문의 작성
     */
    public String createSupport(CustomerSupportDTO dto, List<MultipartFile> imageFiles) {
        try {
            List<String> imagePaths = new ArrayList<>();
            
            // 먼저 Entity 생성하여 support_id 확보
            CustomerSupportEntity entity = CustomerSupportEntity.of(dto);
            String supportId = entity.getSupport_id();
            String userId = dto.getUserId();
            
            if (imageFiles != null && !imageFiles.isEmpty()) {
                long validFileCount = imageFiles.stream()
                    .filter(f -> f != null && !f.isEmpty())
                    .count();
                    
                if (validFileCount > MAX_IMAGES) {
                    throw new RuntimeException("최대 " + MAX_IMAGES + "개의 이미지만 업로드 가능합니다.");
                }
                
                for (MultipartFile imageFile : imageFiles) {
                    if (imageFile != null && !imageFile.isEmpty()) {
                        String imagePath = saveImage(imageFile, userId, supportId);
                        imagePaths.add(imagePath);
                    }
                }
            }
            
            entity.setImagePathList(imagePaths);
            customerSupportRepository.save(entity);
            return supportId;
        } catch (Exception e) {
            log.error("문의 작성 중 오류 발생: ", e);
            throw new RuntimeException("문의 작성에 실패했습니다.");
        }
    }
    
    /**
     * 문의 목록 조회 (페이징)
     */
    public Page<CustomerSupportDTO> getSupportList(String userId, CustomerSupportDTO searchDto) {
        Pageable pageable = PageRequest.of(searchDto.getPage(), searchDto.getSize(), 
                                         Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<CustomerSupportEntity> entities;
        
        if (searchDto.getSearchKeyword() != null && !searchDto.getSearchKeyword().trim().isEmpty()) {
            entities = searchWithKeyword(userId, searchDto, pageable);
        } else {
            entities = customerSupportRepository.findVisiblePosts(userId, pageable);
        }
        
        return entities.map(this::convertToDTO);
    }
    
    /**
     * 검색 기능
     */
    private Page<CustomerSupportEntity> searchWithKeyword(String userId, CustomerSupportDTO searchDto, Pageable pageable) {
        String keyword = searchDto.getSearchKeyword().trim();
        String searchType = searchDto.getSearchType();
        
        if ("title".equals(searchType)) {
            return customerSupportRepository.findByUserIdAndTitleContaining(userId, keyword, pageable);
        } else if ("content".equals(searchType)) {
            return customerSupportRepository.findByUserIdAndContentContaining(userId, keyword, pageable);
        } else {
            return customerSupportRepository.findByUserIdAndTitleOrContentContaining(userId, keyword, pageable);
        }
    }
    
    /**
     * 문의 상세 조회
     */
    public CustomerSupportDTO getSupportDetail(String supportId, String userId) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));
        
        if (!entity.getUserId().equals(userId) && entity.getIsPrivate()) {
            throw new RuntimeException("접근 권한이 없습니다.");
        }
        
        entity.incrementViewCount();
        customerSupportRepository.save(entity);
        
        return convertToDTO(entity);
    }
    
    /**
     * 다중 이미지 문의 수정
     */
    public void updateSupport(String supportId, String userId, CustomerSupportDTO dto, 
                             List<MultipartFile> imageFiles) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));
        
        if (!entity.getUserId().equals(userId)) {
            throw new RuntimeException("수정 권한이 없습니다.");
        }
        
        try {
            if (imageFiles != null && !imageFiles.isEmpty()) {
                List<String> currentPaths = entity.getImagePathList();
                
                // 기존 이미지들 삭제
                for (String existingPath : currentPaths) {
                    deleteImage(existingPath, userId, supportId);
                }
                
                // 새 이미지들 저장
                List<String> newPaths = new ArrayList<>();
                for (MultipartFile imageFile : imageFiles) {
                    if (imageFile != null && !imageFile.isEmpty()) {
                        String imagePath = saveImage(imageFile, userId, supportId);
                        newPaths.add(imagePath);
                    }
                }
                
                entity.setImagePathList(newPaths);
            }
            
            entity.updateFromDTO(dto);
            customerSupportRepository.save(entity);
        } catch (Exception e) {
            log.error("문의 수정 중 오류 발생: ", e);
            throw new RuntimeException("문의 수정에 실패했습니다.");
        }
    }

    /**
     * 다중 이미지 개별 삭제 지원 수정
     */
    public void updateSupportWithImageDelete(String supportId, String userId, CustomerSupportDTO dto, 
                                           List<MultipartFile> imageFiles, List<String> deleteImagePaths, 
                                           boolean deleteAllImages) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));
        
        if (!entity.getUserId().equals(userId)) {
            throw new RuntimeException("수정 권한이 없습니다.");
        }
        
        try {
            List<String> currentPaths = new ArrayList<>(entity.getImagePathList());
            
            // 전체 이미지 삭제
            if (deleteAllImages) {
                for (String path : currentPaths) {
                    deleteImage(path, userId, supportId);
                }
                currentPaths.clear();
            }
            // 선택적 이미지 삭제
            else if (deleteImagePaths != null && !deleteImagePaths.isEmpty()) {
                for (String deletePath : deleteImagePaths) {
                    if (currentPaths.contains(deletePath)) {
                        deleteImage(deletePath, userId, supportId);
                        currentPaths.remove(deletePath);
                    }
                }
            }
            
            // 새 이미지들 추가
            if (imageFiles != null && !imageFiles.isEmpty()) {
                long newImageCount = imageFiles.stream()
                    .filter(f -> f != null && !f.isEmpty())
                    .count();
                    
                if (currentPaths.size() + newImageCount > MAX_IMAGES) {
                    throw new RuntimeException("전체 이미지는 최대 " + MAX_IMAGES + "개까지 가능합니다.");
                }
                
                for (MultipartFile imageFile : imageFiles) {
                    if (imageFile != null && !imageFile.isEmpty()) {
                        String imagePath = saveImage(imageFile, userId, supportId);
                        currentPaths.add(imagePath);
                    }
                }
            }
            
            entity.setImagePathList(currentPaths);
            entity.updateFromDTO(dto);
            customerSupportRepository.save(entity);
        } catch (Exception e) {
            log.error("문의 수정 중 오류 발생: ", e);
            throw new RuntimeException("문의 수정에 실패했습니다.");
        }
    }
    
    /**
     * 문의 삭제 - 다중 이미지 지원
     */
    public void deleteSupport(String supportId, String userId) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));
        
        if (!entity.getUserId().equals(userId)) {
            throw new RuntimeException("삭제 권한이 없습니다.");
        }
        
        // 게시글 폴더 전체 삭제 (더 효율적)
        deleteSupportFolder(userId, supportId);
        
        customerSupportRepository.delete(entity);
    }
    
    /**
     * 관리자 답변 추가
     */
    public void addResponse(String supportId, String responder, String response) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));
        
        entity.addResponse(responder, response);
        customerSupportRepository.save(entity);
    }
    
    /**
     * 내 문의 목록 조회
     */
    public Page<CustomerSupportDTO> getMySupportList(String userId, CustomerSupportDTO searchDto) {
        Pageable pageable = PageRequest.of(searchDto.getPage(), searchDto.getSize(), 
                                         Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<CustomerSupportEntity> entities = customerSupportRepository.findByUserId(userId, pageable);
        return entities.map(this::convertToDTO);
    }
    
    /**
     * Entity를 DTO로 변환 - 다중 이미지 지원
     */
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
        dto.setView_count(entity.getView_count());
        
        // 다중 이미지 지원
        List<String> imagePaths = entity.getImagePathList();
        dto.setImage_path(imagePaths.isEmpty() ? null : imagePaths.get(0));
        dto.setImage_paths(imagePaths);
        
        return dto;
    }
    
    /**
     * 이미지 저장 - 사용자별/게시글별 폴더 구조
     */
    private String saveImage(MultipartFile file, String userId, String supportId) throws IOException {
        // 사용자별/게시글별 폴더 생성: uploads/qna/userId/supportId/
        String userSupportDir = uploadDir + userId + "/" + supportId + "/";
        File uploadDirectory = new File(userSupportDir);
        if (!uploadDirectory.exists()) {
            uploadDirectory.mkdirs();
        }
        
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
        Path filePath = Paths.get(userSupportDir + filename);
        Files.write(filePath, file.getBytes());
        
        // 상대 경로 반환 (userId/supportId/filename.png)
        return userId + "/" + supportId + "/" + filename;
    }
    
    /**
     * 개별 이미지 삭제
     */
    private void deleteImage(String imagePath, String userId, String supportId) {
        try {
            // imagePath가 상대경로면 전체 경로 구성
            Path filePath;
            if (imagePath.contains("/")) {
                // 새로운 구조: userId/supportId/filename.png
                filePath = Paths.get(uploadDir + imagePath);
            } else {
                // 기존 구조: filename.png (하위 호환성)
                filePath = Paths.get(uploadDir + imagePath);
            }
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.error("이미지 삭제 중 오류 발생: ", e);
        }
    }
    
    /**
     * 게시글 폴더 전체 삭제
     */
    private void deleteSupportFolder(String userId, String supportId) {
        try {
            String supportDir = uploadDir + userId + "/" + supportId + "/";
            Path supportPath = Paths.get(supportDir);
            
            if (Files.exists(supportPath)) {
                // 폴더 안의 모든 파일 삭제
                Files.walk(supportPath)
                    .sorted((a, b) -> b.compareTo(a)) // 파일 먼저, 폴더 나중에
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            log.error("파일 삭제 실패: " + path, e);
                        }
                    });
            }
        } catch (IOException e) {
            log.error("게시글 폴더 삭제 중 오류 발생: ", e);
        }
    }
}