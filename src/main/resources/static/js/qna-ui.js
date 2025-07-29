/**
 * QnA UI 컴포넌트 모듈 - Spring Boot 백엔드 연동 수정버전
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
    }

    /**
     * 초기화
     */
    async initialize() {
        try {
            console.log('QnA UI 초기화 시작...');
            
            // 현재 사용자 정보 로드
            await this.loadCurrentUser();
            
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
                {code: '일반문의', displayName: '일반문의'},
                {code: '신고', displayName: '신고'}
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
        // 작성 버튼 표시/숨김
        const writeBtn = document.getElementById('writeBtn');
        if (writeBtn) {
            if (this.currentUser && this.currentUser.isAuthenticated) {
                writeBtn.style.display = 'inline-flex';
                writeBtn.addEventListener('click', () => this.showPostModal());
            } else {
                writeBtn.style.display = 'none';
            }
        }

        // 검색 이벤트 리스너
        this.setupSearchEvents();
    }

    /**
     * 검색 이벤트 설정
     */
    setupSearchEvents() {
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const myPostsOnly = document.getElementById('myPostsOnly');
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

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.handleSearch());
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.handleSearch());
        }

        if (myPostsOnly) {
            myPostsOnly.addEventListener('change', () => this.handleSearch());
        }

        if (resetFilters) {
            resetFilters.addEventListener('click', () => this.resetSearch());
        }
    }

    /**
     * QnA 목록 로드 및 렌더링
     */
    async loadAndRenderQnaPosts() {
        try {
            this.showLoading();
            const response = await qnaApi.getQnaPosts(this.currentSearchParams);
            console.log('QnA 목록 응답:', response);
            
            this.renderQnaPosts(response);
            this.renderPagination(response);
            this.updateTotalCount(response);
        } catch (error) {
            console.error('QnA 목록 로드 실패:', error);
            this.showError('목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * QnA 목록 렌더링
     */
    renderQnaPosts(response) {
        const postsList = document.getElementById('postsList');
        if (!postsList) return;

        // response가 Page 객체인 경우와 배열인 경우 모두 처리
        const posts = response.content || response;
        
        if (!posts || posts.length === 0) {
            postsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>등록된 문의가 없습니다</h3>
                    <p>새로운 문의를 작성해보세요.</p>
                </div>
            `;
            return;
        }

        const postsHtml = posts.map(post => this.renderPostItem(post)).join('');
        postsList.innerHTML = postsHtml;

        // 게시글 클릭 이벤트 리스너 추가
        this.attachPostClickEvents();
    }

    /**
     * 게시글 항목 렌더링
     */
    renderPostItem(post) {
        const isLocked = post.isPrivate || post.is_private;
        const canView = this.canViewPost(post);
        const status = post.status || '답변 대기';
        const inquiryType = post.inquiry_type || post.inquiryType || '일반문의';
        const createdAt = this.formatDate(post.createdAt || post.created_at);
        const viewCount = post.view_count || post.viewCount || 0;
        const authorId = post.user_id || '작성자';
        
        // 내 글 표시
        const isMyPost = this.currentUser && 
                         (post.user_id === this.currentUser.userId || post.userId === this.currentUser.userId);

        return `
            <div class="post-item ${isMyPost ? 'my-post' : ''} ${isLocked ? 'locked' : ''}" 
                 data-id="${post.support_id || post.id}" 
                 ${canView ? 'onclick="qnaUI.showDetailModal(\'' + (post.support_id || post.id) + '\')"' : ''}>
                <div class="post-header">
                    <div class="post-meta">
                        <span class="category-badge ${inquiryType}">${inquiryType}</span>
                        <span class="status-badge ${status.replace(' ', '')}">${status}</span>
                        ${isLocked ? '<i class="fas fa-lock" title="비공개"></i>' : ''}
                        ${isMyPost ? '<span class="my-indicator">내 글</span>' : ''}
                    </div>
                </div>
                <div class="post-title">
                    ${canView ? post.title : '비공개 문의입니다.'}
                </div>
                <div class="post-info">
                    <span class="author">${this.formatUserId(authorId)}</span>
                    <span class="date">${createdAt}</span>
                    <span class="views">조회 ${viewCount}</span>
                </div>
            </div>
        `;
    }

    /**
     * 게시글 접근 권한 확인
     */
    canViewPost(post) {
        // 관리자는 모든 글 조회 가능
        if (this.currentUser && this.currentUser.isAdmin) {
            return true;
        }
        
        // 작성자 본인은 조회 가능
        if (this.currentUser && 
            (post.user_id === this.currentUser.userId || post.userId === this.currentUser.userId)) {
            return true;
        }
        
        // 공개 글은 모든 사용자 조회 가능
        return !(post.isPrivate || post.is_private);
    }

    /**
     * 페이지네이션 렌더링
     */
    renderPagination(response) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        // Spring Boot Page 객체 구조에 맞춤
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

        // 페이지 번호 표시 (현재 페이지 기준으로 ±2 페이지)
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
     * 게시글 클릭 이벤트 추가
     */
    attachPostClickEvents() {
        // 이벤트는 이미 HTML에서 onclick으로 처리됨
    }

    /**
     * QnA 상세 모달 표시
     */
    async showDetailModal(id) {
        try {
            this.showLoading();
            const post = await qnaApi.getQnaPost(id);
            this.renderDetailModal(post);
        } catch (error) {
            console.error('QnA 상세 로드 실패:', error);
            this.showError('상세 정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 상세 모달 렌더링
     */
    renderDetailModal(post) {
        const modal = document.getElementById('detailModal');
        if (!modal) return;

        // 데이터 매핑
        const title = post.title;
        const content = post.content;
        const inquiryType = post.inquiry_type || post.inquiryType || '일반문의';
        const status = post.status || '답변 대기';
        const createdAt = this.formatDate(post.created_at || post.createdAt);
        const viewCount = post.view_count || post.viewCount || 0;
        const username = post.username || '작성자';
        const isPrivate = post.isPrivate || post.is_private;

        // 모달 내용 업데이트
        document.getElementById('detailTitle').textContent = title;
        document.getElementById('detailCategory').textContent = inquiryType;
        document.getElementById('detailCategory').className = `category-badge ${inquiryType}`;
        document.getElementById('detailStatus').textContent = status;
        document.getElementById('detailStatus').className = `status-badge ${status.replace(' ', '')}`;
        document.getElementById('detailAuthor').textContent = this.formatUserId(post.user_id);
        document.getElementById('detailDate').textContent = createdAt;
        document.getElementById('detailViews').textContent = `조회 ${viewCount}`;
        document.getElementById('detailContentText').innerHTML = this.formatContent(content);

        // 이미지 처리
        const detailImage = document.getElementById('detailImage');
        const detailImg = document.getElementById('detailImg');
        if (post.image_path || post.imagePath) {
            detailImg.src = `/uploads/qna/${post.image_path || post.imagePath}`;
            detailImage.style.display = 'block';
        } else {
            detailImage.style.display = 'none';
        }

        // 액션 버튼 표시/숨김
        const isOwner = this.currentUser && 
                       (post.user_id === this.currentUser.userId || post.userId === this.currentUser.userId);
        const editBtn = document.getElementById('editPostBtn');
        const deleteBtn = document.getElementById('deletePostBtn');
        
        if (editBtn && deleteBtn) {
            if (isOwner) {
                editBtn.style.display = 'inline-flex';
                deleteBtn.style.display = 'inline-flex';
                editBtn.onclick = () => this.showEditModal(post.support_id || post.id);
                deleteBtn.onclick = () => this.deletePost(post.support_id || post.id);
            } else {
                editBtn.style.display = 'none';
                deleteBtn.style.display = 'none';
            }
        }

        // 답변 섹션 렌더링
        this.renderRepliesSection(post);

        // 모달 표시
        modal.classList.add('show');
    }

    /**
     * 답변 섹션 렌더링
     */
    renderRepliesSection(post) {
        const repliesList = document.getElementById('repliesList');
        const replyForm = document.getElementById('replyForm');
        
        if (!repliesList) return;

        // 기존 답변이 있는 경우
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

        // 관리자인 경우 답변 작성 폼 표시
        if (replyForm && this.currentUser && this.currentUser.isAdmin) {
            replyForm.style.display = 'block';
            const submitReply = document.getElementById('submitReply');
            if (submitReply) {
                submitReply.onclick = () => this.submitReply(post.support_id || post.id);
            }
        } else if (replyForm) {
            replyForm.style.display = 'none';
        }
    }

    /**
     * 게시글 작성 모달 표시
     */
    showPostModal() {
        const modal = document.getElementById('postModal');
        if (!modal) return;

        // 폼 초기화
        this.resetPostForm();
        
        // 모달 제목 설정
        document.getElementById('modalTitle').textContent = '문의 작성';
        document.getElementById('submitText').textContent = '작성하기';

        // 모달 표시
        modal.classList.add('show');
        
        // 첫 번째 입력 필드에 포커스
        document.getElementById('postTitle').focus();
    }

    /**
     * 게시글 수정 모달 표시
     */
    async showEditModal(id) {
        try {
            const post = await qnaApi.getQnaPost(id);
            const modal = document.getElementById('postModal');
            if (!modal) return;

            // 폼에 기존 데이터 설정
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postContent').value = post.content;
            document.getElementById('postCategory').value = post.inquiry_type || post.inquiryType;
            document.getElementById('isLocked').checked = post.isPrivate || post.is_private;

            // 모달 제목 설정
            document.getElementById('modalTitle').textContent = '문의 수정';
            document.getElementById('submitText').textContent = '수정하기';

            // 수정 모드로 설정
            modal.dataset.mode = 'edit';
            modal.dataset.id = id;

            // 모달 표시
            modal.classList.add('show');
        } catch (error) {
            console.error('수정 모달 로드 실패:', error);
            this.showError('수정 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }

    /**
     * 게시글 폼 초기화
     */
    resetPostForm() {
        const form = document.getElementById('postForm');
        if (form) {
            form.reset();
            
            // 모드 초기화
            const modal = document.getElementById('postModal');
            if (modal) {
                modal.dataset.mode = 'create';
                delete modal.dataset.id;
            }

            // 이미지 미리보기 숨김
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) {
                imagePreview.style.display = 'none';
            }

            // 글자 수 카운터 초기화
            const titleCounter = document.getElementById('titleCounter');
            const contentCounter = document.getElementById('contentCounter');
            if (titleCounter) titleCounter.textContent = '0';
            if (contentCounter) contentCounter.textContent = '0';
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

        this.loadAndRenderQnaPosts();
    }

    /**
     * 검색 초기화
     */
    resetSearch() {
        // 검색 폼 초기화
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const myPostsOnly = document.getElementById('myPostsOnly');

        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (myPostsOnly) myPostsOnly.checked = false;

        // 검색 파라미터 초기화
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
     * 게시글 삭제
     */
    async deletePost(id) {
        if (!confirm('정말로 삭제하시겠습니까?')) {
            return;
        }

        try {
            await qnaApi.deleteQnaPost(id);
            this.closeModal('detailModal');
            this.showSuccess('문의가 삭제되었습니다.');
            await this.loadAndRenderQnaPosts();
        } catch (error) {
            console.error('삭제 실패:', error);
            this.showError('삭제 중 오류가 발생했습니다.');
        }
    }

    /**
     * 답변 제출
     */
    async submitReply(qnaId) {
        const replyContent = document.getElementById('replyContent')?.value?.trim();
        
        if (!replyContent) {
            this.showError('답변 내용을 입력해주세요.');
            return;
        }

        try {
            await qnaApi.createReply(qnaId, { replyContent });
            this.closeModal('detailModal');
            this.showSuccess('답변이 등록되었습니다.');
            await this.loadAndRenderQnaPosts();
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
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
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
     * 로딩 표시
     */
    showLoading() {
        const loading = document.getElementById('loadingIndicator');
        if (loading) {
            loading.style.display = 'flex';
        }
    }

    /**
     * 로딩 숨김
     */
    hideLoading() {
        const loading = document.getElementById('loadingIndicator');
        if (loading) {
            loading.style.display = 'none';
        }
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
            // 토스트 엘리먼트가 없으면 기본 alert 사용
            alert(message);
            return;
        }

        // 토스트 내용 설정
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        
        // 아이콘 설정
        if (type === 'success') {
            toastIcon.className = 'toast-icon fas fa-check-circle';
        } else if (type === 'error') {
            toastIcon.className = 'toast-icon fas fa-exclamation-circle';
        } else {
            toastIcon.className = 'toast-icon fas fa-info-circle';
        }

        // 토스트 표시
        toast.classList.add('show');

        // 3초 후 자동 숨김
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    /**
     * 모달 닫기
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }
}

// 전역 인스턴스 생성
const qnaUI = new QnaUI();