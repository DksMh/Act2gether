/**
 * QnA 메인 컨트롤러 - 다중 이미지 지원 (중복 삭제 문제 해결)
 */
class QnaMain {
    constructor() {
        this.isInitialized = false;
        this.selectedFiles = [];  // 선택된 파일들
        this.imagesToDelete = []; // 삭제할 이미지 경로들
        this.maxImages = 5;       // 최대 이미지 개수
    }

    /**
     * 애플리케이션 초기화
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('QnA 애플리케이션 초기화 시작...');

            // UI 초기화
            await qnaUI.initialize();
            
            // 전역 이벤트 리스너 등록
            this.attachGlobalEvents();
            
            // 폼 이벤트 리스너 등록
            this.attachFormEvents();
            
            this.isInitialized = true;
            console.log('QnA 애플리케이션 초기화 완료');
            
        } catch (error) {
            console.error('QnA 애플리케이션 초기화 실패:', error);
            this.showInitializationError();
        }
    }

    /**
     * 전역 이벤트 리스너 등록
     */
    attachGlobalEvents() {
        // ESC 키로 확인 다이얼로그 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeConfirmDialog();
                this.closeImageModal();
            }
        });

        // 확인 다이얼로그 외부 클릭으로 닫기
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('qna-modal')) {
                e.target.classList.remove('show');
            }
            if (e.target.classList.contains('image-modal')) {
                this.closeImageModal();
            }
        });

        // 확인 다이얼로그 취소 버튼
        const confirmCancel = document.getElementById('confirmCancel');
        if (confirmCancel) {
            confirmCancel.addEventListener('click', () => {
                this.closeConfirmDialog();
            });
        }

        // 이미지 모달 닫기
        const modalClose = document.querySelector('.image-modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.closeImageModal();
            });
        }
    }

    /**
     * 폼 이벤트 리스너 등록
     */
    attachFormEvents() {
        // 게시글 작성/수정 폼
        const postForm = document.getElementById('postForm');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePostSubmit();
            });
        }

        // 글자 수 카운터
        this.setupCharacterCounters();

        // 파일 업로드
        this.setupFileUpload();

        // 답변 글자 수 카운터
        const replyContent = document.getElementById('replyContent');
        const replyCounter = document.getElementById('replyCounter');
        if (replyContent && replyCounter) {
            replyContent.addEventListener('input', () => {
                replyCounter.textContent = replyContent.value.length;
            });
        }
    }

    /**
     * 글자 수 카운터 설정
     */
    setupCharacterCounters() {
        const titleInput = document.getElementById('postTitle');
        const contentTextarea = document.getElementById('postContent');
        const titleCounter = document.getElementById('titleCounter');
        const contentCounter = document.getElementById('contentCounter');

        if (titleInput && titleCounter) {
            titleInput.addEventListener('input', () => {
                titleCounter.textContent = titleInput.value.length;
            });
        }

        if (contentTextarea && contentCounter) {
            contentTextarea.addEventListener('input', () => {
                contentCounter.textContent = contentTextarea.value.length;
            });
        }
    }

    /**
     * 파일 업로드 설정 - 다중 이미지 지원
     */
    setupFileUpload() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('postImage');

        if (!fileUploadArea || !fileInput) return;

        // 파일 업로드 영역 클릭 시 파일 선택
        fileUploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // 드래그 앤 드롭
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleMultipleFiles(files);
        });

        // 파일 선택 변경
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleMultipleFiles(files);
        });
    }

    /**
     * 다중 파일 처리
     */
    handleMultipleFiles(files) {
        // 현재 선택된 파일 수 확인
        const currentCount = this.selectedFiles.length;
        const newFilesCount = files.length;
        
        if (currentCount + newFilesCount > this.maxImages) {
            qnaUI.showError(`최대 ${this.maxImages}개의 이미지만 업로드 가능합니다. (현재: ${currentCount}개)`);
            return;
        }

        // 각 파일 유효성 검사 및 추가
        const validFiles = [];
        for (const file of files) {
            if (this.validateFile(file)) {
                validFiles.push(file);
            }
        }

        if (validFiles.length > 0) {
            this.selectedFiles.push(...validFiles);
            this.updateImagePreview();
        }
    }

    /**
     * 파일 유효성 검사
     */
    validateFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 3 * 1024 * 1024; // 3MB

        if (!allowedTypes.includes(file.type)) {
            qnaUI.showError('JPG, PNG, WebP 파일만 업로드 가능합니다.');
            return false;
        }

        if (file.size > maxSize) {
            qnaUI.showError('파일 크기는 3MB 이하여야 합니다.');
            return false;
        }

        return true;
    }

    /**
     * 이미지 미리보기 업데이트
     */
    updateImagePreview() {
        const container = document.getElementById('imagePreviewContainer');
        const imageInfo = document.getElementById('imageInfo');
        const currentImageCount = document.getElementById('currentImageCount');

        if (!container) return;

        // 컨테이너 비우기
        container.innerHTML = '';

        if (this.selectedFiles.length === 0) {
            container.style.display = 'none';
            imageInfo.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        imageInfo.style.display = 'flex';
        currentImageCount.textContent = this.selectedFiles.length;

        // 각 파일에 대한 미리보기 생성
        this.selectedFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.dataset.index = index;

            const img = document.createElement('img');
            const reader = new FileReader();
            
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image-btn';
            removeBtn.innerHTML = '×';
            removeBtn.type = 'button';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeImageByIndex(index);
            });

            const badge = document.createElement('div');
            badge.className = 'image-count-badge';
            badge.textContent = index + 1;

            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            previewItem.appendChild(badge);
            container.appendChild(previewItem);
        });
    }

    /**
     * 인덱스로 이미지 제거
     */
    removeImageByIndex(index) {
        if (index >= 0 && index < this.selectedFiles.length) {
            this.selectedFiles.splice(index, 1);
            this.updateImagePreview();
        }
    }

    /**
     * 기존 이미지 제거 (수정 모드용) - 🎯 중복 방지 개선
     */
    removeExistingImage(imagePath) {
        // 🎯 중복 추가 방지
        if (!this.imagesToDelete.includes(imagePath)) {
            this.imagesToDelete.push(imagePath);
            console.log('🎯 삭제 목록에 추가:', imagePath);
            console.log('🎯 현재 삭제 목록:', this.imagesToDelete);
        } else {
            console.log('🎯 이미 삭제 목록에 있음 (중복 방지):', imagePath);
            return; // 중복이면 더 이상 진행하지 않음
        }
        
        // UI에서 해당 이미지 미리보기 제거
        const imageItem = document.querySelector(`[data-image-path="${imagePath}"]`);
        if (imageItem) {
            imageItem.remove();
        }
        
        // 이미지 개수 업데이트
        if (qnaUI && qnaUI.updateImageCount) {
            qnaUI.updateImageCount();
        }
    }

    /**
     * 모든 이미지 제거
     */
    clearAllImages() {
        this.selectedFiles = [];
        this.imagesToDelete = [];
        this.updateImagePreview();
        
        console.log('🎯 모든 이미지 데이터 초기화됨');
    }

    /**
     * 게시글 작성/수정 제출
     */
    async handlePostSubmit() {
        const isEditMode = qnaUI.editMode;
        const postId = qnaUI.editPostId;

        // 폼 데이터 수집
        const formData = this.collectFormData();
        if (!formData) return; // 유효성 검사 실패

        try {
            if (isEditMode && postId) {
                await qnaApi.updateQnaPost(postId, formData);
                qnaUI.showSuccess('문의가 수정되었습니다.');
                
                // 🎯 수정 모드: 삭제 목록만 초기화, 새 파일은 유지하지 않음
                this.imagesToDelete = [];
                this.selectedFiles = [];
                console.log('🎯 수정 완료 - 삭제 목록 및 새 파일 목록 초기화');
            } else {
                await qnaApi.createQnaPost(formData);
                qnaUI.showSuccess('문의가 등록되었습니다.');
                
                // 🎯 새 글 작성: 모든 이미지 데이터 초기화
                this.clearAllImages();
            }

            // 목록 페이지로 이동 및 새로고침
            qnaUI.showListPage();
            await qnaUI.loadAndRenderQnaPosts();

        } catch (error) {
            console.error('게시글 저장 실패:', error);
            qnaUI.showError(error.message || '저장 중 오류가 발생했습니다.');
        }
    }

    /**
     * 폼 데이터 수집 (다중 이미지 지원) - 🎯 중복 제거 개선
     */
    collectFormData() {
        const title = document.getElementById('postTitle')?.value?.trim();
        const content = document.getElementById('postContent')?.value?.trim();
        const category = document.getElementById('postCategory')?.value;
        const isPrivate = document.getElementById('isLocked')?.checked;

        // 유효성 검사
        if (!title) {
            qnaUI.showError('제목을 입력해주세요.');
            document.getElementById('postTitle')?.focus();
            return null;
        }

        if (title.length > 255) {
            qnaUI.showError('제목은 255자 이하여야 합니다.');
            document.getElementById('postTitle')?.focus();
            return null;
        }

        if (!content) {
            qnaUI.showError('내용을 입력해주세요.');
            document.getElementById('postContent')?.focus();
            return null;
        }

        if (content.length > 5000) {
            qnaUI.showError('내용은 5000자 이하여야 합니다.');
            document.getElementById('postContent')?.focus();
            return null;
        }

        if (!category) {
            qnaUI.showError('카테고리를 선택해주세요.');
            document.getElementById('postCategory')?.focus();
            return null;
        }

        // FormData 생성
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('inquiry_type', category);
        formData.append('isPrivate', isPrivate ? 'true' : 'false');
        
        // 🎯 다중 이미지 파일 추가
        if (this.selectedFiles.length > 0) {
            this.selectedFiles.forEach(file => {
                formData.append('imageFiles', file);
            });
            console.log('🎯 새로 추가할 이미지:', this.selectedFiles.length + '개');
        }

        // 🎯 삭제할 이미지 경로들 추가 (수정 모드) - 중복 제거
        if (qnaUI.editMode && this.imagesToDelete.length > 0) {
            // Set을 사용해서 중복 제거
            const uniqueDeletePaths = [...new Set(this.imagesToDelete)];
            uniqueDeletePaths.forEach(path => {
                formData.append('deleteImagePaths', path);
            });
            console.log('🎯 삭제할 이미지 (중복제거):', uniqueDeletePaths);
            console.log('🎯 원본 삭제 목록:', this.imagesToDelete);
        }

        // 🎯 디버깅: FormData 내용 확인
        console.log('🎯 FormData 내용:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value instanceof File ? `${value.name} (${value.size}bytes)` : value);
        }

        return formData;
    }

    /**
     * 이미지 상세보기 모달 열기
     */
    openImageModal(imageSrc) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        
        if (modal && modalImage) {
            modalImage.src = imageSrc;
            modal.style.display = 'block';
        }
    }

    /**
     * 이미지 상세보기 모달 닫기
     */
    closeImageModal() {
        const modal = document.getElementById('imageModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 확인 다이얼로그 표시
     */
    showConfirmDialog(title, message, onConfirm) {
        const dialog = document.getElementById('confirmDialog');
        if (!dialog) {
            if (confirm(message)) {
                onConfirm();
            }
            return;
        }

        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;

        const confirmOk = document.getElementById('confirmOk');
        const confirmCancel = document.getElementById('confirmCancel');

        const handleConfirm = () => {
            dialog.classList.remove('show');
            onConfirm();
            cleanup();
        };

        const handleCancel = () => {
            dialog.classList.remove('show');
            cleanup();
        };

        const cleanup = () => {
            confirmOk.removeEventListener('click', handleConfirm);
            confirmCancel.removeEventListener('click', handleCancel);
        };

        confirmOk.addEventListener('click', handleConfirm);
        confirmCancel.addEventListener('click', handleCancel);

        dialog.classList.add('show');
    }

    /**
     * 확인 다이얼로그 닫기
     */
    closeConfirmDialog() {
        const dialog = document.getElementById('confirmDialog');
        if (dialog) {
            dialog.classList.remove('show');
        }
    }

    /**
     * 페이지 상태를 브라우저 히스토리에 추가
     */
    pushHistory(view, data = {}) {
        const state = { view, ...data };
        let url = window.location.pathname;
        
        switch (view) {
            case 'write':
                url += '?mode=write';
                break;
            case 'detail':
                if (data.postId) {
                    url += `?id=${data.postId}`;
                }
                break;
            case 'list':
            default:
                break;
        }
        
        window.history.pushState(state, '', url);
    }

    /**
     * 초기화 오류 표시
     */
    showInitializationError() {
        const container = document.querySelector('.customerservice-section') || document.body;
        container.innerHTML = `
            <div class="error-container" style="text-align: center; padding: 2rem;">
                <h3>오류가 발생했습니다</h3>
                <p>페이지를 새로고침하여 다시 시도해주세요.</p>
                <button onclick="location.reload()" class="btn btn-primary">새로고침</button>
            </div>
        `;
    }

    /**
     * 애플리케이션 종료 시 정리 작업
     */
    cleanup() {
        this.selectedFiles = [];
        this.imagesToDelete = [];
        console.log('QnA 애플리케이션 정리 완료');
    }
}

// 전역 인스턴스 생성
const qnaMain = new QnaMain();

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await qnaMain.initialize();
    } catch (error) {
        console.error('애플리케이션 시작 실패:', error);
    }
});

// 페이지 종료 시 정리
window.addEventListener('beforeunload', () => {
    qnaMain.cleanup();
});

// 전역 접근을 위한 window 객체에 등록
window.qnaMain = qnaMain;
window.qnaUI = qnaUI;
window.qnaApi = qnaApi;