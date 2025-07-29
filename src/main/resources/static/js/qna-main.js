/**
 * QnA 메인 컨트롤러 - Spring Boot 백엔드 연동 수정버전
 */
class QnaMain {
    constructor() {
        this.isInitialized = false;
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
        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // 모달 외부 클릭으로 닫기
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('qna-modal')) {
                e.target.classList.remove('show');
            }
        });

        // 모달 닫기 버튼
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-close') || e.target.id === 'closeModal' || e.target.id === 'closeDetailModal') {
                const modal = e.target.closest('.qna-modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            }
        });

        // 취소 버튼
        document.addEventListener('click', (e) => {
            if (e.target.id === 'cancelBtn') {
                const modal = e.target.closest('.qna-modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            }
        });
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

        // 이미지 삭제 버튼
        document.addEventListener('click', (e) => {
            if (e.target.id === 'removeImage') {
                this.removeImage();
            }
        });

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
     * 파일 업로드 설정
     */
    setupFileUpload() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('postImage');
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');

        if (!fileUploadArea || !fileInput) return;

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
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // 파일 선택
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
    }

    /**
     * 파일 선택 처리
     */
    handleFileSelect(file) {
        // 파일 유효성 검사
        if (!this.validateFile(file)) return;

        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');

        if (imagePreview && previewImg) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
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
     * 이미지 제거
     */
    removeImage() {
        const fileInput = document.getElementById('postImage');
        const imagePreview = document.getElementById('imagePreview');

        if (fileInput) fileInput.value = '';
        if (imagePreview) imagePreview.style.display = 'none';
    }

    /**
     * 게시글 작성/수정 제출
     */
    async handlePostSubmit() {
        const modal = document.getElementById('postModal');
        const isEditMode = modal.dataset.mode === 'edit';
        const postId = modal.dataset.id;

        // 폼 데이터 수집
        const formData = this.collectFormData();
        if (!formData) return; // 유효성 검사 실패

        try {
            if (isEditMode && postId) {
                await qnaApi.updateQnaPost(postId, formData);
                qnaUI.showSuccess('문의가 수정되었습니다.');
            } else {
                await qnaApi.createQnaPost(formData);
                qnaUI.showSuccess('문의가 등록되었습니다.');
            }

            // 모달 닫기 및 목록 새로고침
            modal.classList.remove('show');
            await qnaUI.loadAndRenderQnaPosts();

        } catch (error) {
            console.error('게시글 저장 실패:', error);
            qnaUI.showError(error.message || '저장 중 오류가 발생했습니다.');
        }
    }

    /**
     * 폼 데이터 수집
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

        return {
            title: title,
            content: content,
            inquiry_type: category,
            isPrivate: isPrivate !== null ? isPrivate : true
        };
    }

    /**
     * 확인 다이얼로그 표시
     */
    showConfirmDialog(title, message, onConfirm) {
        const dialog = document.getElementById('confirmDialog');
        if (!dialog) {
            // 다이얼로그가 없으면 기본 confirm 사용
            if (confirm(message)) {
                onConfirm();
            }
            return;
        }

        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;

        // 확인 버튼 이벤트
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
     * 모든 모달 닫기
     */
    closeAllModals() {
        const modals = document.querySelectorAll('.qna-modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
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

// 전역 접근을 위한 window 객체에 등록
window.qnaMain = qnaMain;
window.qnaUI = qnaUI;
window.qnaApi = qnaApi;