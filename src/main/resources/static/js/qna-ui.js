/**
 * QnA UI 컴포넌트 모듈 - 다중 이미지 지원
 */
class QnaUI {
    constructor() {
        this.currentUser = null;
        this.inquiryTypes = [];
        this.statuses = [];
        this.currentSearchParams = {
            page: 0,
            size: 10
        };
        this.currentView = 'list'; // 'list', 'write', 'detail'
        this.editMode = false;
        this.editPostId = null;
        this.currentPostId = null;
    }

    /**
     * 초기화
     */
    async initialize() {
        try {
            console.log('QnA UI 초기화 시작...');
            
            // 현재 사용자 정보 로드
            await this.loadCurrentUser();

            if (!this.currentUser.isAuthenticated) {
                this.showLoginRequiredUI();
                return;
            }

            // 문의 유형 및 상태 목록 로드
            await this.loadInquiryTypes();
            await this.loadStatuses();
            
            // UI 초기 설정
            this.setupUI();
            
            // QnA 목록 로드
            await this.loadAndRenderQnaPosts();
            
            console.log('QnA UI 초기화 완료');
        } catch (error) {
            console.error('QnA UI 초기화 실패:', error);
            this.showError('페이지 로드 중 오류가 발생했습니다.');
        }
    }

    /**
     * 비로그인자를 위한 UI 표시
     */
    showLoginRequiredUI() {
        const writeBtn = document.getElementById('writeBtn');
        const searchSection = document.querySelector('.qna-search-section');
        
        if (writeBtn) {
            writeBtn.style.display = 'none';
        }
        
        if (searchSection) {
            searchSection.style.opacity = '0.6';
            searchSection.style.pointerEvents = 'none';
        }
        
        const tableContainer = document.querySelector('.qna-table-container');
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        
        const boardView = document.getElementById('qnaBoardView');
        if (boardView) {
            const loginMessage = document.createElement('div');
            loginMessage.className = 'login-required-message';
            loginMessage.innerHTML = `
                <div class="login-prompt" style="text-align: center; padding: 4rem 2rem;">
                    <i class="fas fa-lock login-icon" style="font-size: 3rem; color: #6b7280; margin-bottom: 1rem;"></i>
                    <h3 style="color: #374151; margin-bottom: 0.5rem;">로그인이 필요합니다</h3>
                    <p style="color: #6b7280; margin-bottom: 1.5rem;">QnA 게시판을 이용하시려면 우측 상단의 로그인 버튼을 클릭해주세요.</p>
                    
                    <div class="login-benefits" style="background: #f9fafb; border-radius: 8px; padding: 1.5rem; margin-top: 2rem; text-align: left; max-width: 400px; margin-left: auto; margin-right: auto;">
                        <h4 style="color: #374151; margin-bottom: 1rem; font-size: 1.1rem; text-align: center;">
                            <i class="fas fa-star" style="color: #fbbf24; margin-right: 0.5rem;"></i>
                            로그인하면 이용할 수 있어요
                        </h4>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            <li style="display: flex; align-items: center; margin-bottom: 0.75rem; color: #4b5563;">
                                <i class="fas fa-check-circle" style="color: #10b981; margin-right: 0.75rem;"></i>
                                문의 작성 및 관리
                            </li>
                            <li style="display: flex; align-items: center; margin-bottom: 0.75rem; color: #4b5563;">
                                <i class="fas fa-check-circle" style="color: #10b981; margin-right: 0.75rem;"></i>
                                관리자 답변 확인
                            </li>
                            <li style="display: flex; align-items: center; margin-bottom: 0.75rem; color: #4b5563;">
                                <i class="fas fa-check-circle" style="color: #10b981; margin-right: 0.75rem;"></i>
                                문의 내역 조회
                            </li>
                            <li style="display: flex; align-items: center; color: #4b5563;">
                                <i class="fas fa-check-circle" style="color: #10b981; margin-right: 0.75rem;"></i>
                                다중 이미지 첨부
                            </li>
                        </ul>
                    </div>
                </div>
            `;
            boardView.appendChild(loginMessage);
        }

        this.updateTotalCount({ totalElements: 0 });
    }
    
    /**
     * 현재 사용자 정보 로드
     */
    async loadCurrentUser() {
        try {
            this.currentUser = await qnaApi.getCurrentUser();
            console.log('현재 사용자:', this.currentUser);
        } catch (error) {
            console.warn('사용자 정보 로드 실패:', error);
            this.currentUser = {
                isAuthenticated: false,
                isAdmin: false,
                userId: null
            };
        }
    }

    /**
     * 문의 유형 목록 로드
     */
    async loadInquiryTypes() {
        try {
            this.inquiryTypes = await qnaApi.getInquiryTypes();
        } catch (error) {
            console.error('문의 유형 로드 실패:', error);
            this.inquiryTypes = [
                {code: '일반문의', displayName: '일반문의'}
            ];
        }
    }

    /**
     * 상태 목록 로드
     */
    async loadStatuses() {
        try {
            this.statuses = await qnaApi.getStatuses();
        } catch (error) {
            console.error('상태 목록 로드 실패:', error);
            this.statuses = [
                {code: '답변대기', displayName: '답변대기'},
                {code: '답변완료', displayName: '답변완료'}
            ];
        }
    }

    /**
     * UI 초기 설정
     */
    setupUI() {
        const writeBtn = document.getElementById('writeBtn');
        if (writeBtn) {
            if (this.currentUser && this.currentUser.isAuthenticated) {
                writeBtn.style.display = 'inline-flex';
                writeBtn.addEventListener('click', () => this.showWritePage());
            } else {
                writeBtn.style.display = 'none';
            }
        }

        this.setupSearchEvents();
        this.setupNavigationEvents();
    }

    /**
     * 검색 이벤트 설정
     */
    setupSearchEvents() {
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        const resetFilters = document.getElementById('resetFilters');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        if (resetFilters) {
            resetFilters.addEventListener('click', () => this.resetSearch());
        }
    }

    /**
     * 네비게이션 이벤트 설정
     */
    setupNavigationEvents() {
        const backToListBtn = document.getElementById('backToListBtn');
        const cancelWriteBtn = document.getElementById('cancelWriteBtn');
        const cancelBtn = document.getElementById('cancelBtn');

        if (backToListBtn) {
            backToListBtn.addEventListener('click', () => this.showListPage());
        }

        if (cancelWriteBtn) {
            cancelWriteBtn.addEventListener('click', () => this.showListPage());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.showListPage());
        }

        const editPostBtn = document.getElementById('editPostBtn');
        const deletePostBtn = document.getElementById('deletePostBtn');

        if (editPostBtn) {
            editPostBtn.addEventListener('click', () => this.showEditPage());
        }

        if (deletePostBtn) {
            deletePostBtn.addEventListener('click', () => this.deleteCurrentPost());
        }

        const submitReply = document.getElementById('submitReply');
        if (submitReply) {
            submitReply.addEventListener('click', () => this.submitReply());
        }
    }

    /**
     * QnA 목록 로드 및 렌더링
     */
    async loadAndRenderQnaPosts() {
        try {
            const response = await qnaApi.getQnaPosts(this.currentSearchParams);
            console.log('QnA 목록 응답:', response);
            
            this.renderQnaPosts(response);
            this.renderPagination(response);
            this.updateTotalCount(response);
        } catch (error) {
            console.error('QnA 목록 로드 실패:', error);
            this.showError('목록을 불러오는 중 오류가 발생했습니다.');
        }
    }

    /**
     * QnA 목록 렌더링 (테이블 형태)
     */
    renderQnaPosts(response) {
        const postsList = document.getElementById('postsList');
        if (!postsList) return;

        let posts = response.content || response;
        
        if (this.currentSearchParams.myPostsOnly && this.currentUser && this.currentUser.isAuthenticated) {
            posts = posts.filter(post => {
                return post.user_id === this.currentUser.userid || post.userId === this.currentUser.userid;
            });
        }
        
        if (!posts || posts.length === 0) {
            const emptyMessage = this.currentSearchParams.myPostsOnly 
                ? '작성한 문의가 없습니다' 
                : '등록된 문의가 없습니다';
            const emptySubMessage = this.currentSearchParams.myPostsOnly 
                ? '새로운 문의를 작성해보세요.' 
                : '새로운 문의를 작성해보세요.';
                
            postsList.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state" style="text-align: center; padding: 3rem;">
                        <i class="fas fa-inbox" style="font-size: 2rem; color: #d1d5db; margin-bottom: 1rem; display: block;"></i>
                        <div style="color: #6b7280; font-size: 1rem;">${emptyMessage}</div>
                        <div style="color: #9ca3af; font-size: 0.875rem; margin-top: 0.5rem;">${emptySubMessage}</div>
                    </td>
                </tr>
            `;
            
            if (this.currentSearchParams.myPostsOnly) {
                this.updateTotalCount({ totalElements: 0 });
            }
            return;
        }

        const currentPage = response.number || response.page || 0;
        const pageSize = response.size || 10;
        const totalElements = this.currentSearchParams.myPostsOnly ? posts.length : (response.totalElements || posts.length);
        const startNum = totalElements - (currentPage * pageSize);

        const postsHtml = posts.map((post, index) => this.renderPostRow(post, startNum - index)).join('');
        postsList.innerHTML = postsHtml;

        if (this.currentSearchParams.myPostsOnly) {
            this.updateTotalCount({ totalElements: posts.length });
        }

        this.attachPostClickEvents();
    }

    /**
     * 게시글 행 렌더링
     */
    renderPostRow(post, rowNumber) {
        const isLocked = post.isPrivate || post.is_private;
        const canView = this.canViewPost(post);
        const status = post.status || '답변 대기';
        const inquiryType = post.inquiry_type || post.inquiryType || '일반문의';
        const createdAt = this.formatDate(post.createdAt || post.created_at);
        const viewCount = post.view_count || post.viewCount || 0;
        
        // 🎯 isMyPost를 먼저 정의
        const isMyPost = this.currentUser && this.currentUser.isAuthenticated && 
                         (post.user_id === this.currentUser.userid || post.userId === this.currentUser.userid);

        const postId = post.support_id || post.id;
        const titleDisplay = canView ? post.title : '비공개 문의입니다.';

        // 이미지 개수 표시
        const imageCount = this.getImageCount(post);
        const imageIndicator = imageCount > 0 ? `<i class="fas fa-image" title="${imageCount}개 이미지"></i>` : '';

        // 🎯 작성자 표시 (isMyPost를 정의한 후에 호출)
        const authorDisplay = this.formatUserId(post.user_id || post.userId, isMyPost);

        return `
            <tr class="post-row ${isMyPost ? 'my-post' : ''} ${isLocked ? 'locked' : ''}" 
                data-id="${postId}" 
                ${canView ? 'onclick="qnaUI.showDetailPage(\'' + postId + '\')"' : ''}>
                <td style="text-align: center; color: #6b7280;">${rowNumber}</td>
                <td>
                    <span class="category-badge ${inquiryType}">${inquiryType}</span>
                </td>
                <td class="title-cell">
                    <div class="title-text" style="${canView ? 'cursor: pointer;' : 'cursor: default;'}">${titleDisplay}</div>
                    <div class="title-meta">
                        ${isLocked ? '<i class="fas fa-lock lock-icon" title="비공개"></i>' : ''}
                        ${imageIndicator}
                        ${isMyPost ? '<span class="my-indicator">내 글</span>' : ''}
                    </div>
                </td>
                <td class="author-cell">${authorDisplay}</td>
                <td class="date-cell">${createdAt}</td>
                <td class="views-cell" style="text-align: center;">${viewCount}</td>
                <td>
                    <span class="status-badge ${status.replace(' ', '')}">${status}</span>
                </td>
            </tr>
        `;
    }

    /**
     * 게시글의 이미지 개수 가져오기
     */
    getImageCount(post) {
        if (post.image_paths && Array.isArray(post.image_paths)) {
            return post.image_paths.length;
        }
        if (post.image_path) {
            // JSON 배열 형태인지 확인
            if (post.image_path.startsWith('[') && post.image_path.endsWith(']')) {
                try {
                    const paths = JSON.parse(post.image_path);
                    return Array.isArray(paths) ? paths.length : 1;
                } catch (e) {
                    return 1;
                }
            }
            return 1;
        }
        return 0;
    }

    /**
     * 사용자 ID 포맷팅 - 개인정보 보호
     */
    formatUserId(userId, isMyPost) {
        if (!userId) return '사용자';
        
        if (isMyPost) {
            // 내 글인 경우: 현재 로그인한 사용자의 실제 사용자명 표시
            if (this.currentUser?.username) {
                return this.currentUser.username;
            }
            // username이 없으면 "내 글"로 표시
            return '내 글';
        } else {
            // 다른 사람 글인 경우: 그냥 "사용자"로 표시 (개인정보 보호)
            return '사용자';
        }
    }

    /**
     * 게시글 접근 권한 확인
     */
    canViewPost(post) {
        if (this.currentUser && this.currentUser.isAdmin) {
            return true;
        }
        
        if (this.currentUser && this.currentUser.isAuthenticated && 
            (post.user_id === this.currentUser.userid || post.userId === this.currentUser.userid)) {
            return true;
        }
        
        return !(post.isPrivate || post.is_private);
    }

    /**
     * 페이지 표시 관리
     */
    showListPage() {
        document.getElementById('qnaBoardView').style.display = 'block';
        document.getElementById('qnaWriteView').style.display = 'none';
        document.getElementById('qnaDetailView').style.display = 'none';
        this.currentView = 'list';
        this.editMode = false;
        this.editPostId = null;
    }

    showWritePage() {
        document.getElementById('qnaBoardView').style.display = 'none';
        document.getElementById('qnaWriteView').style.display = 'block';
        document.getElementById('qnaDetailView').style.display = 'none';
        this.currentView = 'write';
        
        this.resetPostForm();
        
        document.getElementById('writeTitle').textContent = '문의 작성';
        document.getElementById('submitText').textContent = '작성하기';
        
        setTimeout(() => {
            document.getElementById('postTitle')?.focus();
        }, 100);
    }

    async showDetailPage(id) {
        try {
            const post = await qnaApi.getQnaPost(id);
            
            document.getElementById('qnaBoardView').style.display = 'none';
            document.getElementById('qnaWriteView').style.display = 'none';
            document.getElementById('qnaDetailView').style.display = 'block';
            this.currentView = 'detail';
            this.currentPostId = id;
            
            this.renderDetailPage(post);
        } catch (error) {
            console.error('QnA 상세 로드 실패:', error);
            this.showError('상세 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }

    async showEditPage() {
        if (!this.currentPostId) return;
        
        try {
            const post = await qnaApi.getQnaPost(this.currentPostId);
            
            // 🎯 관리자 답변 여부 정확히 체크 (빈 문자열도 체크)
            const hasAdminReply = !!(post.response && post.response.trim()) || !!(post.replyContent && post.replyContent.trim());
            if (hasAdminReply) {
                this.showError('관리자 답변이 등록된 문의는 수정할 수 없습니다.');
                return;
            }
            
            document.getElementById('qnaBoardView').style.display = 'none';
            document.getElementById('qnaWriteView').style.display = 'block';
            document.getElementById('qnaDetailView').style.display = 'none';
            this.currentView = 'write';
            this.editMode = true;
            this.editPostId = this.currentPostId;

            document.getElementById('postTitle').value = post.title;
            document.getElementById('postContent').value = post.content;
            document.getElementById('postCategory').value = post.inquiry_type || post.inquiryType;
            document.getElementById('isLocked').checked = post.isPrivate || post.is_private;

            // 기존 이미지 미리보기 설정
            this.setupExistingImages(post);

            document.getElementById('writeTitle').textContent = '문의 수정';
            document.getElementById('submitText').textContent = '수정하기';

            this.updateCharacterCounters();
        } catch (error) {
            console.error('수정 페이지 로드 실패:', error);
            this.showError('수정 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }

    /**
     * 기존 이미지 설정 (수정 모드)
     */
    setupExistingImages(post) {
        const container = document.getElementById('imagePreviewContainer');
        const imageInfo = document.getElementById('imageInfo');
        const currentImageCount = document.getElementById('currentImageCount');

        if (!container) return;

        // 기존 이미지 목록 가져오기
        let existingImages = [];
        if (post.image_paths && Array.isArray(post.image_paths)) {
            existingImages = post.image_paths;
        } else if (post.image_path) {
            if (post.image_path.startsWith('[') && post.image_path.endsWith(']')) {
                try {
                    existingImages = JSON.parse(post.image_path);
                } catch (e) {
                    existingImages = [post.image_path];
                }
            } else {
                existingImages = [post.image_path];
            }
        }

        if (existingImages.length === 0) {
            container.style.display = 'none';
            imageInfo.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        imageInfo.style.display = 'flex';
        currentImageCount.textContent = existingImages.length;

        container.innerHTML = '';

        existingImages.forEach((imagePath, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.dataset.imagePath = imagePath;
            previewItem.dataset.existing = 'true';

            const img = document.createElement('img');
            img.src = `/uploads/qna/${imagePath}`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image-btn';
            removeBtn.innerHTML = '×';
            removeBtn.type = 'button';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                qnaMain.removeExistingImage(imagePath);
                previewItem.remove();
                this.updateImageCount();
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
     * 이미지 개수 업데이트
     */
    updateImageCount() {
        const container = document.getElementById('imagePreviewContainer');
        const currentImageCount = document.getElementById('currentImageCount');
        
        if (container && currentImageCount) {
            const count = container.children.length;
            currentImageCount.textContent = count;
            
            if (count === 0) {
                container.style.display = 'none';
                document.getElementById('imageInfo').style.display = 'none';
            }
        }
    }

    /**
     * 상세 페이지 렌더링
     */
    renderDetailPage(post) {
        const title = post.title;
        const content = post.content;
        const inquiryType = post.inquiry_type || post.inquiryType || '일반문의';
        const status = post.status || '답변 대기';
        const createdAt = this.formatDate(post.created_at || post.createdAt);
        const viewCount = post.view_count || post.viewCount || 0;

        // 🎯 isOwner를 먼저 정의
        const isOwner = this.currentUser && this.currentUser.isAuthenticated && 
                       (post.user_id === this.currentUser.userid || post.userId === this.currentUser.userid);

        document.getElementById('detailTitle').textContent = title;
        document.getElementById('detailCategory').textContent = inquiryType;
        document.getElementById('detailCategory').className = `category-badge ${inquiryType}`;
        document.getElementById('detailStatus').textContent = status;
        document.getElementById('detailStatus').className = `status-badge ${status.replace(' ', '')}`;
        document.getElementById('detailAuthor').textContent = this.formatUserId(post.user_id || post.userId, isOwner);
        document.getElementById('detailDate').textContent = createdAt;
        document.getElementById('detailViews').textContent = `조회 ${viewCount}`;
        document.getElementById('detailContentText').innerHTML = this.formatContent(content);

        // 다중 이미지 처리
        this.renderDetailImages(post);

        // 🎯 기존 알림 메시지 제거 (페이지 렌더링 시마다 초기화)
        const existingNotice = document.querySelector('.edit-disabled-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        // 🎯 관리자 답변 여부 정확히 체크 (빈 문자열도 체크)
        const hasAdminReply = !!(post.response && post.response.trim()) || !!(post.replyContent && post.replyContent.trim());
        
        const editBtn = document.getElementById('editPostBtn');
        const deleteBtn = document.getElementById('deletePostBtn');
        
        if (editBtn && deleteBtn) {
            if (isOwner) {
                // 작성자 본인인 경우
                if (hasAdminReply) {
                    // 관리자 답변이 있으면 수정만 불가, 삭제는 가능
                    editBtn.style.display = 'none';
                    deleteBtn.style.display = 'inline-flex';
                    
                    // 🎯 수정 불가 안내 메시지 표시
                    const detailActions = document.querySelector('.detail-actions');
                    if (detailActions) {
                        const notice = document.createElement('div');
                        notice.className = 'edit-disabled-notice';
                        notice.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 8px; color: #6b7280; font-size: 14px; background: #f9fafb; padding: 8px 12px; border-radius: 6px; border: 1px solid #e5e7eb; margin-right: 8px;">
                                <i class="fas fa-info-circle" style="color: #3b82f6;"></i>
                                <span>관리자 답변이 등록되어 수정할 수 없습니다</span>
                            </div>
                        `;
                        detailActions.insertBefore(notice, deleteBtn);
                    }
                } else {
                    // 관리자 답변이 없으면 수정/삭제 모두 가능
                    editBtn.style.display = 'inline-flex';
                    deleteBtn.style.display = 'inline-flex';
                }
            } else {
                // 작성자가 아닌 경우 수정/삭제 모두 불가
                editBtn.style.display = 'none';
                deleteBtn.style.display = 'none';
            }
        }

        this.renderRepliesSection(post);
    }

    /**
     * 상세 페이지 이미지 렌더링
     */
    renderDetailImages(post) {
        const imageGallery = document.getElementById('detailImageGallery');
        if (!imageGallery) return;

        // 이미지 목록 가져오기
        let images = [];
        if (post.image_paths && Array.isArray(post.image_paths)) {
            images = post.image_paths;
        } else if (post.image_path) {
            if (post.image_path.startsWith('[') && post.image_path.endsWith(']')) {
                try {
                    images = JSON.parse(post.image_path);
                } catch (e) {
                    images = [post.image_path];
                }
            } else {
                images = [post.image_path];
            }
        }

        if (images.length === 0) {
            imageGallery.style.display = 'none';
            return;
        }

        imageGallery.style.display = 'flex';
        imageGallery.innerHTML = '';

        images.forEach((imagePath) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'detail-image-item';
            
            const img = document.createElement('img');
            img.src = `/uploads/qna/${imagePath}`;
            img.alt = '첨부 이미지';
            
            // 이미지 클릭 시 모달로 확대
            imageItem.addEventListener('click', () => {
                qnaMain.openImageModal(img.src);
            });
            
            imageItem.appendChild(img);
            imageGallery.appendChild(imageItem);
        });
    }

    /**
     * 답변 섹션 렌더링
     */
    renderRepliesSection(post) {
        const repliesList = document.getElementById('repliesList');
        const replyForm = document.getElementById('replyForm');
        
        if (!repliesList) return;

        if (post.response || post.replyContent) {
            repliesList.innerHTML = `
                <div class="reply-item">
                    <div class="reply-header">
                        <span class="reply-author">관리자</span>
                        <span class="reply-date">${this.formatDate(post.updated_at || post.updatedAt)}</span>
                    </div>
                    <div class="reply-content">${this.formatContent(post.response || post.replyContent)}</div>
                </div>
            `;
        } else {
            repliesList.innerHTML = '<p class="no-reply">아직 답변이 등록되지 않았습니다.</p>';
        }

        if (replyForm && this.currentUser && this.currentUser.isAdmin) {
            replyForm.style.display = 'block';
        } else if (replyForm) {
            replyForm.style.display = 'none';
        }
    }

    /**
     * 게시글 폼 초기화
     */
    resetPostForm() {
        const form = document.getElementById('postForm');
        if (form) {
            form.reset();
            
            this.editMode = false;
            this.editPostId = null;

            // 이미지 미리보기 초기화
            const container = document.getElementById('imagePreviewContainer');
            const imageInfo = document.getElementById('imageInfo');
            if (container) {
                container.innerHTML = '';
                container.style.display = 'none';
            }
            if (imageInfo) {
                imageInfo.style.display = 'none';
            }

            // qnaMain의 선택된 파일들도 초기화
            if (window.qnaMain) {
                qnaMain.clearAllImages();
            }

            this.updateCharacterCounters();
        }
    }

    /**
     * 글자 수 카운터 업데이트
     */
    updateCharacterCounters() {
        const titleInput = document.getElementById('postTitle');
        const contentTextarea = document.getElementById('postContent');
        const titleCounter = document.getElementById('titleCounter');
        const contentCounter = document.getElementById('contentCounter');

        if (titleInput && titleCounter) {
            titleCounter.textContent = titleInput.value.length;
        }

        if (contentTextarea && contentCounter) {
            contentCounter.textContent = contentTextarea.value.length;
        }
    }

    /**
     * 게시글 클릭 이벤트 추가
     */
    attachPostClickEvents() {
        // 이벤트는 이미 HTML에서 onclick으로 처리됨
    }

    /**
     * 페이지네이션 렌더링
     */
    renderPagination(response) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        const totalPages = response.totalPages || 1;
        const currentPage = response.number || response.page || 0;
        const hasNext = !response.last;
        const hasPrevious = !response.first;

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = `
            <button class="page-btn" ${!hasPrevious ? 'disabled' : ''} 
                    onclick="qnaUI.goToPage(0)">처음</button>
            <button class="page-btn" ${!hasPrevious ? 'disabled' : ''} 
                    onclick="qnaUI.goToPage(${currentPage - 1})">이전</button>
        `;

        const startPage = Math.max(0, currentPage - 2);
        const endPage = Math.min(totalPages - 1, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage ? 'active' : '';
            paginationHtml += `
                <button class="page-btn ${isActive}" onclick="qnaUI.goToPage(${i})">
                    ${i + 1}
                </button>
            `;
        }

        paginationHtml += `
                <button class="page-btn" ${!hasNext ? 'disabled' : ''} 
                        onclick="qnaUI.goToPage(${currentPage + 1})">다음</button>
                <button class="page-btn" ${!hasNext ? 'disabled' : ''} 
                        onclick="qnaUI.goToPage(${totalPages - 1})">마지막</button>
        `;

        pagination.innerHTML = paginationHtml;
    }

    /**
     * 총 게시글 수 업데이트
     */
    updateTotalCount(response) {
        const totalCount = document.getElementById('totalCount');
        if (totalCount) {
            const count = response.totalElements || response.total || (response.content ? response.content.length : 0);
            totalCount.textContent = count;
        }
    }

    /**
     * 검색 처리
     */
    handleSearch() {
        const searchKeyword = document.getElementById('searchInput')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const myPostsOnly = document.getElementById('myPostsOnly')?.checked || false;

        this.currentSearchParams = {
            page: 0,
            size: 10,
            searchKeyword: searchKeyword,
            inquiryType: category,
            status: status,
            myPostsOnly: myPostsOnly
        };

        if (myPostsOnly && (!this.currentUser || !this.currentUser.isAuthenticated)) {
            this.showError('내 글만 보기는 로그인 후 이용 가능합니다.');
            document.getElementById('myPostsOnly').checked = false;
            this.currentSearchParams.myPostsOnly = false;
        }

        this.loadAndRenderQnaPosts();
    }

    /**
     * 검색 초기화
     */
    resetSearch() {
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const myPostsOnly = document.getElementById('myPostsOnly');

        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (myPostsOnly) myPostsOnly.checked = false;

        this.currentSearchParams = {
            page: 0,
            size: 10
        };

        this.loadAndRenderQnaPosts();
    }

    /**
     * 페이지 이동
     */
    goToPage(page) {
        this.currentSearchParams.page = page;
        this.loadAndRenderQnaPosts();
    }

    /**
     * 현재 게시글 삭제
     */
    async deleteCurrentPost() {
        if (!this.currentPostId) return;

        // 🎯 관리자 답변이 있어도 삭제는 가능하도록 변경
        if (!confirm('정말로 삭제하시겠습니까?')) {
            return;
        }

        try {
            await qnaApi.deleteQnaPost(this.currentPostId);
            this.showSuccess('문의가 삭제되었습니다.');
            
            this.showListPage();
            await this.loadAndRenderQnaPosts();
            
            if (window.location.pathname !== '/qna') {
                window.history.pushState({ view: 'list' }, '', '/qna');
            }
        } catch (error) {
            console.error('삭제 실패:', error);
            this.showError('삭제 중 오류가 발생했습니다.');
        }
    }

    /**
     * 답변 제출
     */
    async submitReply() {
        if (!this.currentPostId) return;

        const replyContent = document.getElementById('replyContent')?.value?.trim();
        
        if (!replyContent) {
            this.showError('답변 내용을 입력해주세요.');
            return;
        }

        try {
            await qnaApi.createReply(this.currentPostId, { replyContent });
            this.showSuccess('답변이 등록되었습니다.');
            
            document.getElementById('replyContent').value = '';
            document.getElementById('replyCounter').textContent = '0';
            
            await this.showDetailPage(this.currentPostId);
        } catch (error) {
            console.error('답변 등록 실패:', error);
            this.showError('답변 등록 중 오류가 발생했습니다.');
        }
    }

    // ========== Utility Methods ==========

    /**
     * 날짜 포맷팅
     */
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * 내용 포맷팅 (줄바꿈 처리)
     */
    formatContent(content) {
        if (!content) return '';
        return content.replace(/\n/g, '<br>').replace(/\r/g, '');
    }

    /**
     * 성공 메시지 표시
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * 에러 메시지 표시
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * 토스트 메시지 표시
     */
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastIcon = document.getElementById('toastIcon');
        const toastMessage = document.getElementById('toastMessage');

        if (!toast || !toastIcon || !toastMessage) {
            alert(message);
            return;
        }

        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        
        if (type === 'success') {
            toastIcon.className = 'toast-icon fas fa-check-circle';
        } else if (type === 'error') {
            toastIcon.className = 'toast-icon fas fa-exclamation-circle';
        } else {
            toastIcon.className = 'toast-icon fas fa-info-circle';
        }

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 전역 인스턴스 생성
const qnaUI = new QnaUI();