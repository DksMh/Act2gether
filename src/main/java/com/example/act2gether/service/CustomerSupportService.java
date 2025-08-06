package com.example.act2gether.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
    private final UserRepository userRepository;
    private final String uploadDir = "uploads/qna/";
    private final int MAX_IMAGES = 5;

    public Page<CustomerSupportDTO> getSupportList(String userId, CustomerSupportDTO searchDto, boolean isAdmin) {
        Pageable pageable = PageRequest.of(searchDto.getPage(), searchDto.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<CustomerSupportEntity> entities;

        // 키워드 검색이 있는 경우
        if (searchDto.getSearchKeyword() != null && !searchDto.getSearchKeyword().trim().isEmpty()) {
            entities = searchWithKeyword(userId, searchDto, pageable, isAdmin);
        }
        // 키워드는 없지만 필터(status)가 있는 경우 - 이 로직이 빠져있었음!
        else if (searchDto.getStatus() != null && !searchDto.getStatus().trim().isEmpty()) {
            System.out.println(" 키워드 없이 상태 필터만 적용: " + searchDto.getStatus());

            if (isAdmin) {
                // 관리자는 모든 문의에서 상태별 필터링
                entities = customerSupportRepository.findByStatus(searchDto.getStatus(), pageable);
            } else {
                // 일반 사용자는 공개글 + 본인글에서 상태별 필터링
                entities = customerSupportRepository.findByStatusForUser(userId, searchDto.getStatus(), pageable);
            }
        }
        // 문의유형 필터만 있는 경우
        else if (searchDto.getInquiry_type() != null && !searchDto.getInquiry_type().trim().isEmpty()) {
            System.out.println(" 키워드 없이 문의유형 필터만 적용: " + searchDto.getInquiry_type());

            if (isAdmin) {
                entities = customerSupportRepository.findByInquiry_type(searchDto.getInquiry_type(), pageable);
            } else {
                entities = customerSupportRepository.findVisiblePosts(userId, pageable);
            }
        }
        // 아무 조건도 없는 경우
        else {
            if (isAdmin) {
                entities = customerSupportRepository.findAll(pageable);
            } else {
                entities = customerSupportRepository.findVisiblePosts(userId, pageable);
            }
        }

        // 성능 최적화: 사용자 정보를 한 번에 조회
        Map<String, String> userNameMap = new HashMap<>();
        if (isAdmin && entities.hasContent()) {
            Set<String> userIds = entities.getContent().stream()
                    .map(CustomerSupportEntity::getUserId)
                    .collect(Collectors.toSet());

            List<UserEntity> users = userRepository.findAllById(userIds);
            userNameMap = users.stream()
                    .collect(Collectors.toMap(
                            UserEntity::getUser_id,
                            UserEntity::getUsername,
                            (existing, replacement) -> existing));
        }

        // 람다에서 사용할 수 있도록 final 변수로 만들기
        final Map<String, String> finalUserNameMap = userNameMap;

        return entities.map(entity -> convertToDTO(entity, isAdmin, finalUserNameMap));
    }

    /**
     * 성능 최적화된 convertToDTO - 사용자 정보 맵 사용
     */
    private CustomerSupportDTO convertToDTO(CustomerSupportEntity entity, boolean isAdmin,
            Map<String, String> userNameMap) {
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

        // 성능 최적화: 미리 조회된 사용자 정보 사용
        if (isAdmin && userNameMap.containsKey(entity.getUserId())) {
            dto.setUserName(userNameMap.get(entity.getUserId()));
        } else if (isAdmin) {
            dto.setUserName("알 수 없는 사용자");
        }

        // 다중 이미지 지원
        List<String> imagePaths = entity.getImagePathList();
        dto.setImage_path(imagePaths.isEmpty() ? null : imagePaths.get(0));
        dto.setImage_paths(imagePaths);

        return dto;
    }

    /**
     * 기존 convertToDTO 메서드 (하위 호환성)
     */
    private CustomerSupportDTO convertToDTO(CustomerSupportEntity entity, boolean isAdmin) {
        // 단일 조회용 - 성능이 중요하지 않은 경우
        Map<String, String> userNameMap = new HashMap<>();
        if (isAdmin) {
            try {
                Optional<UserEntity> userEntity = userRepository.findById(entity.getUserId());
                if (userEntity.isPresent()) {
                    userNameMap.put(entity.getUserId(), userEntity.get().getUsername());
                }
            } catch (Exception e) {
                log.warn("사용자 정보 조회 실패: " + entity.getUserId(), e);
            }
        }
        return convertToDTO(entity, isAdmin, userNameMap);
    }

    /**
     * 기존 convertToDTO 메서드 (파라미터 1개 - 기존 호환성)
     */
    private CustomerSupportDTO convertToDTO(CustomerSupportEntity entity) {
        return convertToDTO(entity, false);
    }

    /**
     * 검색 기능 - 관리자 권한 지원 + 필터링 개선 - 메서드명 수정
     */
    private Page<CustomerSupportEntity> searchWithKeyword(String userId, CustomerSupportDTO searchDto,
            Pageable pageable, boolean isAdmin) {
        String keyword = searchDto.getSearchKeyword().trim();
        String searchType = searchDto.getSearchType();
        String inquiryType = searchDto.getInquiry_type(); // 수정: getInquiryType() → getInquiry_type()
        String status = searchDto.getStatus();

        if (isAdmin) {
            // 관리자는 모든 문의에서 검색 + 필터링
            if ("title".equals(searchType)) {
                return searchByTitleWithFilters(keyword, inquiryType, status, pageable);
            } else if ("content".equals(searchType)) {
                return searchByContentWithFilters(keyword, inquiryType, status, pageable);
            } else {
                return searchByTitleOrContentWithFilters(keyword, inquiryType, status, pageable);
            }
        } else {
            // 기존 로직 (일반 사용자)
            if ("title".equals(searchType)) {
                return customerSupportRepository.findByUserIdAndTitleContaining(userId, keyword, pageable);
            } else if ("content".equals(searchType)) {
                return customerSupportRepository.findByUserIdAndContentContaining(userId, keyword, pageable);
            } else {
                return customerSupportRepository.findByUserIdAndTitleOrContentContaining(userId, keyword, pageable);
            }
        }
    }

    /**
     * 제목 검색 + 필터링
     */
    private Page<CustomerSupportEntity> searchByTitleWithFilters(String keyword, String inquiryType, String status,
            Pageable pageable) {
        if (inquiryType != null && !inquiryType.isEmpty() && status != null && !status.isEmpty()) {
            return customerSupportRepository.findByTitleContainingAndInquiryTypeAndStatus(keyword, inquiryType, status,
                    pageable);
        } else if (inquiryType != null && !inquiryType.isEmpty()) {
            return customerSupportRepository.findByTitleContainingAndInquiryType(keyword, inquiryType, pageable);
        } else if (status != null && !status.isEmpty()) {
            return customerSupportRepository.findByTitleContainingAndStatus(keyword, status, pageable);
        } else {
            return customerSupportRepository.findByTitleContaining(keyword, pageable);
        }
    }

    /**
     * 내용 검색 + 필터링
     */
    private Page<CustomerSupportEntity> searchByContentWithFilters(String keyword, String inquiryType, String status,
            Pageable pageable) {
        if (inquiryType != null && !inquiryType.isEmpty() && status != null && !status.isEmpty()) {
            return customerSupportRepository.findByContentContainingAndInquiryTypeAndStatus(keyword, inquiryType,
                    status, pageable);
        } else if (inquiryType != null && !inquiryType.isEmpty()) {
            return customerSupportRepository.findByContentContainingAndInquiryType(keyword, inquiryType, pageable);
        } else if (status != null && !status.isEmpty()) {
            return customerSupportRepository.findByContentContainingAndStatus(keyword, status, pageable);
        } else {
            return customerSupportRepository.findByContentContaining(keyword, pageable);
        }
    }

    /**
     * 제목+내용 검색 + 필터링
     */
    private Page<CustomerSupportEntity> searchByTitleOrContentWithFilters(String keyword, String inquiryType,
            String status, Pageable pageable) {
        if (inquiryType != null && !inquiryType.isEmpty() && status != null && !status.isEmpty()) {
            return customerSupportRepository.findByTitleOrContentContainingAndInquiryTypeAndStatus(keyword, inquiryType,
                    status, pageable);
        } else if (inquiryType != null && !inquiryType.isEmpty()) {
            return customerSupportRepository.findByTitleOrContentContainingAndInquiryType(keyword, inquiryType,
                    pageable);
        } else if (status != null && !status.isEmpty()) {
            return customerSupportRepository.findByTitleOrContentContainingAndStatus(keyword, status, pageable);
        } else {
            return customerSupportRepository.findByTitleOrContentContaining(keyword, pageable);
        }
    }

    /**
     * 상세 조회
     */
    public CustomerSupportDTO getSupportDetail(String supportId, String userId, boolean isAdmin) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));

        if (!isAdmin && !entity.getUserId().equals(userId) && entity.getIsPrivate()) {
            throw new RuntimeException("접근 권한이 없습니다.");
        }

        entity.incrementViewCount();
        customerSupportRepository.save(entity);

        return convertToDTO(entity, isAdmin);
    }

    /**
     * 기존 메서드도 유지 (하위 호환성)
     */
    public CustomerSupportDTO getSupportDetail(String supportId, String userId) {
        return getSupportDetail(supportId, userId, false);
    }

    /**
     * 내 문의 목록 조회
     */
    public Page<CustomerSupportDTO> getMySupportList(String userId, CustomerSupportDTO searchDto) {
        Pageable pageable = PageRequest.of(searchDto.getPage(), searchDto.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<CustomerSupportEntity> entities;

        // 상태 필터가 있으면 적용
        if (searchDto.getStatus() != null && !searchDto.getStatus().trim().isEmpty()) {
            entities = customerSupportRepository.findByUserIdAndStatus(userId, searchDto.getStatus(), pageable);
        } else {
            entities = customerSupportRepository.findByUserId(userId, pageable);
        }

        return entities.map(this::convertToDTO);
    }

    /**
     * 다중 이미지 문의 작성
     */
    public String createSupport(CustomerSupportDTO dto, List<MultipartFile> imageFiles) {
        try {
            List<String> imagePaths = new ArrayList<>();

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
     * 문의 수정
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

                for (String existingPath : currentPaths) {
                    deleteImage(existingPath, userId, supportId);
                }

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

            if (deleteAllImages) {
                for (String path : currentPaths) {
                    deleteImage(path, userId, supportId);
                }
                currentPaths.clear();
            } else if (deleteImagePaths != null && !deleteImagePaths.isEmpty()) {
                for (String deletePath : deleteImagePaths) {
                    if (currentPaths.contains(deletePath)) {
                        deleteImage(deletePath, userId, supportId);
                        currentPaths.remove(deletePath);
                    }
                }
            }

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
     * 문의 삭제
     */
    public void deleteSupport(String supportId, String userId) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));

        if (!entity.getUserId().equals(userId)) {
            throw new RuntimeException("삭제 권한이 없습니다.");
        }

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
     * 관리자 답변 수정
     */
    public void updateResponse(String supportId, String responder, String response) {
        CustomerSupportEntity entity = customerSupportRepository.findById(supportId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 문의입니다."));

        if (entity.getResponse() == null || entity.getResponse().trim().isEmpty()) {
            throw new RuntimeException("수정할 답변이 존재하지 않습니다.");
        }

        entity.addResponse(responder, response);
        customerSupportRepository.save(entity);
    }

    /**
     * 이미지 저장
     */
    private String saveImage(MultipartFile file, String userId, String supportId) throws IOException {
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

        Path filePath = Paths.get(userSupportDir + filename);
        Files.write(filePath, file.getBytes());

        return userId + "/" + supportId + "/" + filename;
    }

    /**
     * 개별 이미지 삭제
     */
    private void deleteImage(String imagePath, String userId, String supportId) {
        try {
            Path filePath;
            if (imagePath.contains("/")) {
                filePath = Paths.get(uploadDir + imagePath);
            } else {
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
                Files.walk(supportPath)
                        .sorted((a, b) -> b.compareTo(a))
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