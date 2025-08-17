// 커뮤니티 상세페이지 JavaScript

// 사용자 권한 설정 (실제로는 서버에서 받아옴)
const USER_PERMISSIONS = {
    isHost: true,        // 커뮤니티 생성자 (리더)
    isMember: false,     // 일반 멤버
    currentUserId: 'user123'
};

$(document).ready(function() {
    // 초기화 함수들
    initPostWrite();
    initPostInteractions();
    initSortFunction();
    initMemberManagement();
    initImageModal();
    initPagination();
    
    // 권한에 따른 UI 표시/숨김
    initPermissionBasedUI();
});

// 권한에 따른 UI 초기화
function initPermissionBasedUI() {
    // 호스트인 경우 멤버 관리 버튼과 관리 기능 표시
    if (USER_PERMISSIONS.isHost) {
        $('.btn-member-manage').show();
        $('.btn-member-admin').show();
        $('.member-card-menu').show();
    }
}

// 게시글 작성 기능 초기화
function initPostWrite() {
    const $postBtn = $('.btn-post');
    const $textarea = $('.write-content textarea');
    
    // 게시 버튼 클릭
    $postBtn.on('click', function() {
        const content = $textarea.val().trim();
        
        if (content === '') {
            showToast('내용을 입력해주세요.', 'error');
            return;
        }
        
        createNewPost(content);
        $textarea.val('');
        showToast('게시글이 작성되었습니다.', 'success');
    });
    
    // 텍스트 영역 자동 높이 조절
    $textarea.on('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
    
    // 엔터키로 게시 (Ctrl+Enter)
    $textarea.on('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            $postBtn.click();
        }
    });
}

// 새 게시글 생성
function createNewPost(content) {
    const currentUser = '현재로그인사람'; // 실제로는 세션에서 가져옴
    const currentTime = getCurrentTime();
    
    const newPostHtml = `
        <article class="post-item" data-post-id="${Date.now()}">
            <div class="post-header">
                <div class="post-profile">
                    <div class="profile-avatar">👩</div>
                    <div class="profile-info">
                        <span class="profile-name">${currentUser}</span>
                        <span class="post-time">방금 전</span>
                    </div>
                </div>
                <button class="btn-menu">⋯</button>
            </div>
            <div class="post-content">
                <p>${escapeHtml(content)}</p>
            </div>
            <div class="post-actions">
                <button class="action-btn like-btn" data-liked="false">❤️ 좋아요 0개</button>
                <button class="action-btn comment-btn">💬 댓글 0개</button>
            </div>
            <div class="post-time-info">
                <span>게시됨</span>
                <span>${currentTime}</span>
            </div>
        </article>
    `;
    
    // 새 게시글을 맨 위에 추가
    $('.post-list').prepend(newPostHtml);
    
    // 새 게시글에 이벤트 리스너 추가
    const $newPost = $('.post-list .post-item').first();
    initPostItemEvents($newPost);
    
    // 게시글 수 업데이트
    updatePostCount();
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 현재 시간 반환
function getCurrentTime() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${month}월 ${date}일 ${hours}:${minutes}`;
}

// 게시글 수 업데이트
function updatePostCount() {
    const count = $('.post-list .post-item').length;
    $('.write-header span').text(`${count}개의 글`);
}

// 게시글 상호작용 기능 초기화
function initPostInteractions() {
    $('.post-item').each(function() {
        initPostItemEvents($(this));
    });
}

// 개별 게시글 이벤트 초기화
function initPostItemEvents($post) {
    const $likeBtn = $post.find('.like-btn');
    const $commentBtn = $post.find('.comment-btn');
    const $menuBtn = $post.find('.btn-menu');
    
    // 좋아요 버튼
    $likeBtn.off('click').on('click', function() {
        toggleLike($(this));
    });
    
    // 댓글 버튼
    $commentBtn.off('click').on('click', function() {
        toggleComments($post);
    });
    
    // 메뉴 버튼
    $menuBtn.off('click').on('click', function(e) {
        e.stopPropagation();
        showPostMenu(e, $post);
    });
}

// 좋아요 토글
function toggleLike($btn) {
    const isLiked = $btn.data('liked') === 'true';
    const currentText = $btn.text();
    const likeCount = parseInt(currentText.match(/\d+/)[0]) || 0;
    
    if (isLiked) {
        $btn.data('liked', 'false');
        $btn.removeClass('liked');
        $btn.text(`❤️ 좋아요 ${Math.max(0, likeCount - 1)}개`);
    } else {
        $btn.data('liked', 'true');
        $btn.addClass('liked');
        $btn.text(`❤️ 좋아요 ${likeCount + 1}개`);
    }
}

// 댓글 토글
function toggleComments($post) {
    let $commentSection = $post.find('.comment-section');
    
    if ($commentSection.length > 0) {
        $commentSection.slideUp(300, function() {
            $(this).remove();
        });
    } else {
        createCommentSection($post);
    }
}

// 댓글 섹션 생성
function createCommentSection($post) {
    const commentSectionHtml = `
        <div class="comment-section" style="display: none;">
            <div class="comment-write">
                <div class="profile-avatar">👩</div>
                <input type="text" placeholder="댓글을 입력하세요..." class="comment-input">
                <button class="btn-comment-submit">등록</button>
            </div>
            <div class="comment-list">
                <div class="comment-item">
                    <div class="profile-avatar">👩</div>
                    <div class="comment-content">
                        <span class="comment-author">다른사용자</span>
                        <p>좋은 정보 감사합니다!</p>
                        <span class="comment-time">5분 전</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $post.append(commentSectionHtml);
    
    const $commentSection = $post.find('.comment-section');
    $commentSection.slideDown(300);
    
    // 댓글 입력 이벤트
    const $commentInput = $commentSection.find('.comment-input');
    const $submitBtn = $commentSection.find('.btn-comment-submit');
    
    $submitBtn.on('click', function() {
        const content = $commentInput.val().trim();
        if (content) {
            addComment($commentSection, content);
            $commentInput.val('');
        }
    });
    
    $commentInput.on('keypress', function(e) {
        if (e.key === 'Enter') {
            const content = $(this).val().trim();
            if (content) {
                addComment($commentSection, content);
                $(this).val('');
            }
        }
    });
}

// 댓글 추가
function addComment($commentSection, content) {
    const newCommentHtml = `
        <div class="comment-item">
            <div class="profile-avatar">👩</div>
            <div class="comment-content">
                <span class="comment-author">현재로그인사람</span>
                <p>${escapeHtml(content)}</p>
                <span class="comment-time">방금 전</span>
            </div>
        </div>
    `;
    
    const $commentList = $commentSection.find('.comment-list');
    $commentList.append(newCommentHtml);
    
    // 댓글 수 업데이트
    const $post = $commentSection.closest('.post-item');
    const $commentBtn = $post.find('.comment-btn');
    const currentCount = parseInt($commentBtn.text().match(/\d+/)[0]) || 0;
    $commentBtn.text(`💬 댓글 ${currentCount + 1}개`);
}

// 게시글 메뉴 표시
function showPostMenu(e, $post) {
    // 기존 메뉴 제거
    $('.post-menu').remove();
    
    const menuHtml = `
        <div class="post-menu">
            <button class="menu-item edit-btn">수정</button>
            <button class="menu-item delete-btn">삭제</button>
            <button class="menu-item report-btn">신고</button>
        </div>
    `;
    
    $('body').append(menuHtml);
    
    const $menu = $('.post-menu');
    const rect = e.target.getBoundingClientRect();
    
    $menu.css({
        position: 'fixed',
        top: rect.bottom + 5 + 'px',
        left: rect.left + 'px',
        background: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '0.375rem',
        boxShadow: '0 0.25rem 1rem rgba(0,0,0,0.15)',
        zIndex: 1000,
        minWidth: '6rem'
    });
    
    // 메뉴 항목 스타일
    $menu.find('.menu-item').css({
        display: 'block',
        width: '100%',
        padding: '0.5rem 0.75rem',
        border: 'none',
        background: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '0.875rem',
        color: '#495057'
    });
    
    // 메뉴 항목 이벤트
    $menu.find('.edit-btn').on('click', function() {
        editPost($post);
        $menu.remove();
    });
    
    $menu.find('.delete-btn').on('click', function() {
        showConfirmDialog('게시글 삭제', '정말 삭제하시겠습니까?', function() {
            deletePost($post);
        });
        $menu.remove();
    });
    
    $menu.find('.report-btn').on('click', function() {
        showToast('신고가 접수되었습니다.', 'success');
        $menu.remove();
    });
    
    // 메뉴 항목 호버 효과
    $menu.find('.menu-item').hover(
        function() { $(this).css('background', '#f8f9fa'); },
        function() { $(this).css('background', 'none'); }
    );
    
    // 외부 클릭 시 메뉴 닫기
    setTimeout(function() {
        $(document).one('click', function() {
            $menu.remove();
        });
    }, 0);
}

// 게시글 수정
function editPost($post) {
    const $content = $post.find('.post-content p');
    const currentText = $content.text();
    
    const editHtml = `
        <textarea class="edit-textarea" style="width: 100%; min-height: 5rem; padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 0.375rem; font-family: inherit; font-size: 0.875rem; line-height: 1.5; resize: vertical;">${currentText}</textarea>
        <div class="edit-actions" style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
            <button class="btn-save" style="background: #007bff; color: white; border: none; padding: 0.375rem 0.75rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem;">저장</button>
            <button class="btn-cancel" style="background: #6c757d; color: white; border: none; padding: 0.375rem 0.75rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem;">취소</button>
        </div>
    `;
    
    $content.html(editHtml);
    
    const $textarea = $content.find('.edit-textarea');
    const $saveBtn = $content.find('.btn-save');
    const $cancelBtn = $content.find('.btn-cancel');
    
    $saveBtn.on('click', function() {
        const newText = $textarea.val().trim();
        if (newText) {
            $content.html(`<p>${escapeHtml(newText)}</p>`);
            showToast('게시글이 수정되었습니다.', 'success');
        }
    });
    
    $cancelBtn.on('click', function() {
        $content.html(`<p>${escapeHtml(currentText)}</p>`);
    });
    
    $textarea.focus();
}

// 게시글 삭제
function deletePost($post) {
    $post.fadeOut(300, function() {
        $(this).remove();
        updatePostCount();
        showToast('게시글이 삭제되었습니다.', 'success');
    });
}

// 정렬 기능 초기화
function initSortFunction() {
    $('.sort-btn').on('click', function() {
        const sortType = $(this).data('sort');
        
        // 활성 상태 변경
        $('.sort-btn').removeClass('active');
        $(this).addClass('active');
        
        // 정렬 실행
        sortPosts(sortType);
    });
}

// 게시글 정렬
function sortPosts(sortType) {
    const $postList = $('.post-list');
    const $posts = $postList.find('.post-item').detach();
    
    let sortedPosts;
    
    switch (sortType) {
        case 'latest':
            // 최신순 (기본 순서 유지)
            sortedPosts = $posts;
            break;
        case 'popular':
            // 인기순 (좋아요 수 기준)
            sortedPosts = $posts.sort(function(a, b) {
                const likesA = parseInt($(a).find('.like-btn').text().match(/\d+/)[0]) || 0;
                const likesB = parseInt($(b).find('.like-btn').text().match(/\d+/)[0]) || 0;
                return likesB - likesA;
            });
            break;
        case 'oldest':
            // 오래된순
            sortedPosts = $posts.get().reverse();
            break;
        default:
            sortedPosts = $posts;
    }
    
    // 정렬된 순서로 다시 배치
    $postList.append(sortedPosts);
    
    showToast(`${getSortTypeName(sortType)}로 정렬되었습니다.`, 'info');
}

// 정렬 타입 이름 반환
function getSortTypeName(sortType) {
    const names = {
        'latest': '최신순',
        'popular': '인기순',
        'oldest': '오래된순'
    };
    return names[sortType] || '최신순';
}

// 멤버 관리 기능 초기화
function initMemberManagement() {
    // 전체 멤버 보기 버튼 클릭
    $('.btn-more').on('click', function() {
        openMemberListModal();
    });
    
    // 멤버 관리 버튼 클릭 (사이드바)
    $('.btn-member-manage').on('click', function() {
        if (USER_PERMISSIONS.isHost) {
            openMemberManageModal();
        } else {
            showToast('멤버 관리 권한이 없습니다.', 'error');
        }
    });
    
    // 멤버 관리 버튼 클릭 (팝업 내)
    $(document).on('click', '.btn-member-admin', function() {
        if (USER_PERMISSIONS.isHost) {
            $('#memberListModal').fadeOut(300);
            setTimeout(() => openMemberManageModal(), 300);
        } else {
            showToast('멤버 관리 권한이 없습니다.', 'error');
        }
    });
    
    // 멤버 카드 메뉴 버튼 클릭
    $(document).on('click', '.member-card-menu', function(e) {
        e.stopPropagation();
        const $memberCard = $(this).closest('.member-card');
        const memberId = $memberCard.data('member-id');
        const memberRole = $memberCard.data('role');
        
        if (memberRole !== 'leader') { // 리더는 관리할 수 없음
            showMemberContextMenu(e, memberId, memberRole);
        }
    });
    
    // 멤버 검색 기능
    $(document).on('input', '.member-search .search-input', function() {
        const searchTerm = $(this).val().toLowerCase();
        filterMembers(searchTerm);
    });
    
    // 탭 버튼 클릭
    $(document).on('click', '.tab-btn', function() {
        const tabId = $(this).data('tab');
        switchTab(tabId);
    });
    
    // 모달 닫기
    $('.modal-close, .modal').on('click', function(e) {
        if (e.target === this) {
            $('.modal').fadeOut(300);
        }
    });
}

// 멤버 목록 팝업 모달 열기
function openMemberListModal() {
    loadMemberListData();
    $('#memberListModal').fadeIn(300);
}

// 멤버 목록 데이터 로드
function loadMemberListData() {
    // 실제로는 서버에서 데이터를 가져옴
    const memberData = {
        leader: {
            id: 1, 
            name: '멤버닉네임1', 
            role: 'leader', 
            gender: '여성', 
            joinDate: '2024-01-15', 
            isOnline: true
        },
        members: [
            { id: 2, name: '멤버닉네임2', role: 'member', gender: '여성', joinDate: '2024-02-01', isOnline: true },
            { id: 3, name: '멤버닉네임3', role: 'member', gender: '여성', joinDate: '2024-02-15', isOnline: false },
            { id: 4, name: '멤버닉네임4', role: 'member', gender: '여성', joinDate: '2024-03-01', isOnline: true },
            { id: 5, name: '멤버닉네임5', role: 'member', gender: '여성', joinDate: '2024-03-10', isOnline: false },
            { id: 6, name: '멤버닉네임6', role: 'member', gender: '여성', joinDate: '2024-03-12', isOnline: true },
            { id: 7, name: '멤버닉네임7', role: 'member', gender: '여성', joinDate: '2024-03-15', isOnline: true },
            { id: 8, name: '멤버닉네임8', role: 'member', gender: '여성', joinDate: '2024-03-18', isOnline: false },
            { id: 9, name: '멤버닉네임9', role: 'member', gender: '여성', joinDate: '2024-03-20', isOnline: true },
            { id: 10, name: '멤버닉네임10', role: 'member', gender: '여성', joinDate: '2024-03-22', isOnline: false }
        ]
    };
    
    renderMemberListPopup(memberData);
    updateMemberStats(memberData);
}

// 멤버 목록 팝업 렌더링
function renderMemberListPopup(data) {
    // 리더 섹션
    const $leaderGrid = $('.member-section:first .member-grid');
    $leaderGrid.empty();
    
    const leaderHtml = createMemberCard(data.leader);
    $leaderGrid.append(leaderHtml);
    
    // 일반 멤버 섹션
    const $memberGrid = $('.member-section:last .member-grid');
    $memberGrid.empty();
    
    data.members.forEach(member => {
        const memberHtml = createMemberCard(member);
        $memberGrid.append(memberHtml);
    });
    
    // 멤버 수 업데이트
    $('.member-section:last .section-title').text(`멤버 (${data.members.length}명)`);
}

// 멤버 카드 생성
function createMemberCard(member) {
    const canManage = USER_PERMISSIONS.isHost && member.role !== 'leader';
    
    return `
        <div class="member-card" data-member-id="${member.id}" data-role="${member.role}">
            <div class="member-avatar-large">👩</div>
            <div class="member-card-info">
                <span class="member-name">${member.name}</span>
                <span class="member-meta">${getRoleDisplayName(member.role)} • ${member.gender}</span>
                <span class="member-online ${member.isOnline ? 'online' : ''}">${member.isOnline ? '온라인' : '오프라인'}</span>
            </div>
            ${canManage ? '<button class="member-card-menu">⋯</button>' : ''}
        </div>
    `;
}

// 멤버 통계 업데이트
function updateMemberStats(data) {
    const totalMembers = 1 + data.members.length; // 리더 + 멤버들
    const onlineMembers = (data.leader.isOnline ? 1 : 0) + data.members.filter(m => m.isOnline).length;
    
    $('#totalMembers').text(`${totalMembers}명`);
    $('.stat-value.online').text(`${onlineMembers}명`);
}

// 멤버 검색 필터
function filterMembers(searchTerm) {
    $('.member-card').each(function() {
        const memberName = $(this).find('.member-name').text().toLowerCase();
        const memberMeta = $(this).find('.member-meta').text().toLowerCase();
        
        if (memberName.includes(searchTerm) || memberMeta.includes(searchTerm)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

// 멤버 관리 모달 열기 (호스트 전용)
function openMemberManageModal() {
    loadMemberManageData();
    $('#memberManageModal').fadeIn(300);
}

// 멤버 관리 데이터 로드
function loadMemberManageData() {
    // 실제로는 서버에서 데이터를 가져옴
    const memberData = [
        { id: 1, name: '멤버닉네임1', role: 'leader', gender: '여', joinDate: '2024-01-15', status: 'active' },
        { id: 2, name: '멤버닉네임2', role: 'member', gender: '여', joinDate: '2024-02-01', status: 'active' },
        { id: 3, name: '멤버닉네임3', role: 'member', gender: '여', joinDate: '2024-02-15', status: 'active' },
        { id: 4, name: '멤버닉네임4', role: 'member', gender: '여', joinDate: '2024-03-01', status: 'active' },
        { id: 5, name: '멤버닉네임5', role: 'member', gender: '여', joinDate: '2024-03-10', status: 'active' }
    ];
    
    const pendingRequests = [
        { id: 101, name: '신청자1', gender: '여', requestDate: '2024-03-20', message: '국내여행에 관심이 많습니다.' },
        { id: 102, name: '신청자2', gender: '여', requestDate: '2024-03-21', message: '함께 여행하고 싶어요!' }
    ];
    
    const bannedMembers = [
        { id: 201, name: '차단된사용자1', banDate: '2024-03-18', reason: '스팸 행위' }
    ];
    
    renderMemberManageList(memberData);
    renderPendingRequests(pendingRequests);
    renderBannedMembers(bannedMembers);
}

// 멤버 관리 목록 렌더링
function renderMemberList(members) {
    const $container = $('.member-manage-list');
    $container.empty();
    
    members.forEach(member => {
        const canManage = USER_PERMISSIONS.isHost && member.role !== 'leader';
        
        const memberHtml = `
            <div class="manage-member-item" data-member-id="${member.id}">
                <div class="manage-member-info">
                    <div class="profile-avatar">👩</div>
                    <div class="manage-member-details">
                        <div class="member-name-row">
                            <span class="member-name">${member.name}</span>
                            <span class="member-role-badge role-${member.role}">${getRoleDisplayName(member.role)}</span>
                        </div>
                        <div class="member-meta">
                            <span>${member.gender} • 가입일: ${member.joinDate}</span>
                        </div>
                    </div>
                </div>
                <div class="manage-member-actions">
                    ${canManage ? '<button class="btn btn-small btn-danger kick-btn" data-member-id="' + member.id + '">추방</button>' : ''}
                </div>
            </div>
        `;
        
        $container.append(memberHtml);
    });
}

// 역할 표시명 반환
function getRoleDisplayName(role) {
    const roleNames = {
        'leader': '리더',
        'member': '멤버'
    };
    return roleNames[role] || '멤버';
}

// 멤버 액션 버튼 생성
function getMemberActionButtons(member) {
    let buttons = '';
    
    if (USER_PERMISSIONS.isHost && member.role !== 'leader') {
        buttons += '<button class="btn btn-small btn-danger kick-btn" data-member-id="' + member.id + '">추방</button>';
    }
    
    return buttons;
}

// 가입 신청 목록 렌더링
function renderPendingRequests(requests) {
    const $container = $('.pending-list');
    $container.empty();
    
    if (requests.length === 0) {
        $container.html('<div class="empty-state">대기 중인 가입 신청이 없습니다.</div>');
        return;
    }
    
    requests.forEach(request => {
        const requestHtml = `
            <div class="manage-member-item" data-request-id="${request.id}">
                <div class="manage-member-info">
                    <div class="profile-avatar">👤</div>
                    <div class="manage-member-details">
                        <div class="member-name-row">
                            <span class="member-name">${request.name}</span>
                        </div>
                        <div class="member-meta">
                            <span>${request.gender} • 신청일: ${request.requestDate}</span>
                        </div>
                        <div class="request-message">
                            <small>"${request.message}"</small>
                        </div>
                    </div>
                </div>
                <div class="manage-member-actions">
                    <button class="btn btn-small btn-primary approve-btn" data-request-id="${request.id}">승인</button>
                    <button class="btn btn-small btn-danger reject-btn" data-request-id="${request.id}">거절</button>
                </div>
            </div>
        `;
        
        $container.append(requestHtml);
    });
}

// 차단된 멤버 목록 렌더링
function renderBannedMembers(bannedMembers) {
    const $container = $('.banned-list');
    $container.empty();
    
    if (bannedMembers.length === 0) {
        $container.html('<div class="empty-state">차단된 멤버가 없습니다.</div>');
        return;
    }
    
    bannedMembers.forEach(member => {
        const memberHtml = `
            <div class="manage-member-item" data-banned-id="${member.id}">
                <div class="manage-member-info">
                    <div class="profile-avatar">🚫</div>
                    <div class="manage-member-details">
                        <div class="member-name-row">
                            <span class="member-name">${member.name}</span>
                        </div>
                        <div class="member-meta">
                            <span>차단일: ${member.banDate} • 사유: ${member.reason}</span>
                        </div>
                    </div>
                </div>
                <div class="manage-member-actions">
                    ${USER_PERMISSIONS.isHost ? '<button class="btn btn-small btn-outline unban-btn" data-banned-id="' + member.id + '">차단 해제</button>' : ''}
                </div>
            </div>
        `;
        
        $container.append(memberHtml);
    });
}

// 탭 전환
function switchTab(tabId) {
    $('.tab-btn').removeClass('active');
    $(`.tab-btn[data-tab="${tabId}"]`).addClass('active');
    
    $('.tab-content').hide();
    $(`#${tabId}-tab`).show();
}

// 멤버 컨텍스트 메뉴 표시
function showMemberContextMenu(e, memberId, memberRole) {
    const $menu = $('#memberMenu');
    
    // 메뉴 위치 설정
    const rect = e.target.getBoundingClientRect();
    $menu.css({
        top: rect.bottom + 5 + 'px',
        left: rect.left + 'px'
    }).show();
    
    // 메뉴 항목 이벤트 (기존 이벤트 제거 후 재바인딩)
    $menu.find('.menu-item').off('click').on('click', function() {
        const action = $(this).attr('class').split(' ')[1].replace('-btn', '');
        handleMemberAction(action, memberId);
        $menu.hide();
    });
    
    // 외부 클릭 시 메뉴 닫기
    setTimeout(() => {
        $(document).one('click', () => $menu.hide());
    }, 0);
}

// 멤버 액션 처리
function handleMemberAction(action, memberId) {
    const memberName = $(`.member-card[data-member-id="${memberId}"] .member-name`).text();
    
    switch (action) {
        case 'kick':
            showConfirmDialog(
                '멤버 추방',
                `${memberName}님을 커뮤니티에서 추방하시겠습니까?`,
                () => kickMember(memberId)
            );
            break;
        case 'ban':
            showConfirmDialog(
                '멤버 차단',
                `${memberName}님을 차단하시겠습니까? 차단된 멤버는 다시 가입할 수 없습니다.`,
                () => banMember(memberId)
            );
            break;
    }
}

// 멤버 추방
function kickMember(memberId) {
    // 실제로는 서버 API 호출
    $(`.member-card[data-member-id="${memberId}"]`).fadeOut(300, function() {
        $(this).remove();
        updateMemberCounts();
    });
    showToast('멤버가 추방되었습니다.', 'success');
}

// 멤버 강등
function demoteMember(memberId) {
    // 실제로는 서버 API 호출
    const $memberItem = $(`.member-item[data-member-id="${memberId}"]`);
    $memberItem.attr('data-role', 'member');
    $memberItem.find('.member-status').text('멤버, 여');
    showToast('멤버가 일반 멤버로 강등되었습니다.', 'success');
}

// 멤버 차단
function banMember(memberId) {
    // 실제로는 서버 API 호출
    kickMember(memberId); // 일단 목록에서 제거
    showToast('멤버가 차단되었습니다.', 'success');
}

// 멤버 수 업데이트
function updateMemberCount() {
    const count = $('.member-item').length;
    $('.members-header h3').text(`모임 멤버 (총 ${count}명)`);
}

// 일반 사용자용 전체 멤버 보기 (읽기 전용)
function showAllMembersReadOnly() {
    //showToast('전체 멤버 목록을 표시합니다.', 'info');
    // 실제 구현에서는 읽기 전용 모달을 표시
    openMemberListModal();
}

// 멤버 관리 목록 렌더링
function renderMemberManageList(members) {
    const $container = $('.member-manage-list');
    $container.empty();
    
    members.forEach(member => {
        const canManage = USER_PERMISSIONS.isHost && member.role !== 'leader';
        
        const memberHtml = `
            <div class="manage-member-item" data-member-id="${member.id}">
                <div class="manage-member-info">
                    <div class="profile-avatar">👩</div>
                    <div class="manage-member-details">
                        <div class="member-name-row">
                            <span class="member-name">${member.name}</span>
                            <span class="member-role-badge role-${member.role}">${getRoleDisplayName(member.role)}</span>
                        </div>
                        <div class="member-meta">
                            <span>${member.gender} • 가입일: ${member.joinDate}</span>
                        </div>
                    </div>
                </div>
                <div class="manage-member-actions">
                    ${canManage ? '<button class="btn btn-small btn-danger kick-btn" data-member-id="' + member.id + '">추방</button>' : ''}
                </div>
            </div>
        `;
        
        $container.append(memberHtml);
    });
    
    // 추방 버튼 이벤트
    $(document).off('click', '.kick-btn').on('click', '.kick-btn', function() {
        const memberId = $(this).data('member-id');
        const memberName = $(this).closest('.manage-member-item').find('.member-name').text();
        
        showConfirmDialog(
            '멤버 추방',
            `${memberName}님을 커뮤니티에서 추방하시겠습니까?`,
            () => kickMemberFromManage(memberId)
        );
    });
}

// 역할 표시명 반환
function getRoleDisplayName(role) {
    const roleNames = {
        'leader': '리더',
        'member': '멤버'
    };
    return roleNames[role] || '멤버';
}

// 가입 신청 목록 렌더링
function renderPendingRequests(requests) {
    const $container = $('.pending-list');
    $container.empty();
    
    if (requests.length === 0) {
        $container.html('<div class="empty-state">대기 중인 가입 신청이 없습니다.</div>');
        return;
    }
    
    requests.forEach(request => {
        const requestHtml = `
            <div class="manage-member-item" data-request-id="${request.id}">
                <div class="manage-member-info">
                    <div class="profile-avatar">👤</div>
                    <div class="manage-member-details">
                        <div class="member-name-row">
                            <span class="member-name">${request.name}</span>
                        </div>
                        <div class="member-meta">
                            <span>${request.gender} • 신청일: ${request.requestDate}</span>
                        </div>
                        <div class="request-message" style="margin-top: 0.5rem; font-size: 0.8125rem; color: #6c757d;">
                            "${request.message}"
                        </div>
                    </div>
                </div>
                <div class="manage-member-actions">
                    <button class="btn btn-small btn-primary approve-btn" data-request-id="${request.id}">승인</button>
                    <button class="btn btn-small btn-danger reject-btn" data-request-id="${request.id}">거절</button>
                </div>
            </div>
        `;
        
        $container.append(requestHtml);
    });
    
    // 승인/거절 버튼 이벤트
    $(document).off('click', '.approve-btn, .reject-btn')
               .on('click', '.approve-btn', function() {
                   const requestId = $(this).data('request-id');
                   approveJoinRequest(requestId);
               })
               .on('click', '.reject-btn', function() {
                   const requestId = $(this).data('request-id');
                   rejectJoinRequest(requestId);
               });
}

// 차단된 멤버 목록 렌더링
function renderBannedMembers(bannedMembers) {
    const $container = $('.banned-list');
    $container.empty();
    
    if (bannedMembers.length === 0) {
        $container.html('<div class="empty-state">차단된 멤버가 없습니다.</div>');
        return;
    }
    
    bannedMembers.forEach(member => {
        const memberHtml = `
            <div class="manage-member-item" data-banned-id="${member.id}">
                <div class="manage-member-info">
                    <div class="profile-avatar">🚫</div>
                    <div class="manage-member-details">
                        <div class="member-name-row">
                            <span class="member-name">${member.name}</span>
                        </div>
                        <div class="member-meta">
                            <span>차단일: ${member.banDate} • 사유: ${member.reason}</span>
                        </div>
                    </div>
                </div>
                <div class="manage-member-actions">
                    <button class="btn btn-small btn-outline unban-btn" data-banned-id="${member.id}">차단 해제</button>
                </div>
            </div>
        `;
        
        $container.append(memberHtml);
    });
    
    // 차단 해제 버튼 이벤트
    $(document).off('click', '.unban-btn').on('click', '.unban-btn', function() {
        const bannedId = $(this).data('banned-id');
        const memberName = $(this).closest('.manage-member-item').find('.member-name').text();
        
        showConfirmDialog(
            '차단 해제',
            `${memberName}님의 차단을 해제하시겠습니까?`,
            () => unbanMember(bannedId)
        );
    });
}

// 탭 전환
function switchTab(tabId) {
    $('.tab-btn').removeClass('active');
    $(`.tab-btn[data-tab="${tabId}"]`).addClass('active');
    
    $('.tab-content').hide();
    $(`#${tabId}-tab`).show();
}

// 멤버 컨텍스트 메뉴 표시
function showMemberContextMenu(e, memberId, memberRole) {
    const $menu = $('#memberMenu');
    
    // 메뉴 위치 설정
    const rect = e.target.getBoundingClientRect();
    $menu.css({
        top: rect.bottom + 5 + 'px',
        left: rect.left + 'px'
    }).show();
    
    // 메뉴 항목 이벤트 (기존 이벤트 제거 후 재바인딩)
    $menu.find('.menu-item').off('click').on('click', function() {
        const action = $(this).attr('class').split(' ')[1].replace('-btn', '');
        handleMemberAction(action, memberId);
        $menu.hide();
    });
    
    // 외부 클릭 시 메뉴 닫기
    setTimeout(() => {
        $(document).one('click', () => $menu.hide());
    }, 0);
}

// 멤버 액션 처리
function handleMemberAction(action, memberId) {
    const memberName = $(`.member-card[data-member-id="${memberId}"] .member-name`).text();
    
    switch (action) {
        case 'kick':
            showConfirmDialog(
                '멤버 추방',
                `${memberName}님을 커뮤니티에서 추방하시겠습니까?`,
                () => kickMember(memberId)
            );
            break;
        case 'ban':
            showConfirmDialog(
                '멤버 차단',
                `${memberName}님을 차단하시겠습니까? 차단된 멤버는 다시 가입할 수 없습니다.`,
                () => banMember(memberId)
            );
            break;
    }
}

// 멤버 추방 (팝업에서)
function kickMember(memberId) {
    // 실제로는 서버 API 호출
    $(`.member-card[data-member-id="${memberId}"]`).fadeOut(300, function() {
        $(this).remove();
        updateMemberCounts();
    });
    showToast('멤버가 추방되었습니다.', 'success');
}

// 멤버 추방 (관리 모달에서)
function kickMemberFromManage(memberId) {
    // 실제로는 서버 API 호출
    $(`.manage-member-item[data-member-id="${memberId}"]`).fadeOut(300, function() {
        $(this).remove();
    });
    showToast('멤버가 추방되었습니다.', 'success');
}

// 멤버 차단
function banMember(memberId) {
    // 실제로는 서버 API 호출
    kickMember(memberId); // 일단 목록에서 제거
    showToast('멤버가 차단되었습니다.', 'success');
}

// 가입 신청 승인
function approveJoinRequest(requestId) {
    // 실제로는 서버 API 호출
    $(`.manage-member-item[data-request-id="${requestId}"]`).fadeOut(300, function() {
        $(this).remove();
    });
    showToast('가입 신청이 승인되었습니다.', 'success');
}

// 가입 신청 거절
function rejectJoinRequest(requestId) {
    // 실제로는 서버 API 호출
    $(`.manage-member-item[data-request-id="${requestId}"]`).fadeOut(300, function() {
        $(this).remove();
    });
    showToast('가입 신청이 거절되었습니다.', 'success');
}

// 차단 해제
function unbanMember(bannedId) {
    // 실제로는 서버 API 호출
    $(`.manage-member-item[data-banned-id="${bannedId}"]`).fadeOut(300, function() {
        $(this).remove();
    });
    showToast('차단이 해제되었습니다.', 'success');
}

// 멤버 수 업데이트
function updateMemberCounts() {
    const memberCount = $('.member-card').length;
    $('.members-header h3').text(`모임 멤버 (총 ${memberCount}명)`);
    $('#totalMembers').text(`${memberCount}명`);
    
    const onlineCount = $('.member-card .member-online.online').length;
    $('.stat-value.online').text(`${onlineCount}명`);
}

// 멤버 목록 렌더링
function renderMemberList(members) {
    const $container = $('.member-manage-list');
    $container.empty();
    
    members.forEach(member => {
        const canManage = USER_PERMISSIONS.isHost || 
                         (USER_PERMISSIONS.isSubLeader && member.role === 'member');
        
        const memberHtml = `
            <div class="manage-member-item" data-member-id="${member.id}">
                <div class="manage-member-info">
                    <div class="profile-avatar">👩</div>
                    <div class="manage-member-details">
                        <div class="member-name-row">
                            <span class="member-name">${member.name}</span>
                            <span class="member-role-badge role-${member.role}">${getRoleDisplayName(member.role)}</span>
                        </div>
                        <div class="member-meta">
                            <span>${member.gender} • 가입일: ${member.joinDate}</span>
                        </div>
                    </div>
                </div>
                <div class="manage-member-actions">
                    ${canManage ? getMemberActionButtons(member) : ''}
                </div>
            </div>
        `;
        
        $container.append(memberHtml);
    });
}

// 역할 표시명 반환
function getRoleDisplayName(role) {
    const roleNames = {
        'leader': '리더',
        'sub-leader': '부리더',
        'member': '멤버'
    };
    return roleNames[role] || '멤버';
}

// 멤버 액션 버튼 생성
function getMemberActionButtons(member) {
    let buttons = '';
    
    if (USER_PERMISSIONS.isHost) {
        if (member.role === 'member') {
            buttons += '<button class="btn btn-small btn-outline promote-btn" data-member-id="' + member.id + '">부리더 승격</button>';
        } else if (member.role === 'sub-leader') {
            buttons += '<button class="btn btn-small btn-outline demote-btn" data-member-id="' + member.id + '">일반멤버로</button>';
        }
        
        if (member.role !== 'leader') {
            buttons += '<button class="btn btn-small btn-danger kick-btn" data-member-id="' + member.id + '">추방</button>';
        }
    } else if (USER_PERMISSIONS.isSubLeader && member.role === 'member') {
        buttons += '<button class="btn btn-small btn-danger kick-btn" data-member-id="' + member.id + '">추방</button>';
    }
    
    return buttons;
}

// 가입 신청 목록 렌더링
function renderPendingRequests(requests) {
    const $container = $('.pending-list');
    $container.empty();
    
    if (requests.length === 0) {
        $container.html('<div class="empty-state">대기 중인 가입 신청이 없습니다.</div>');
        return;
    }
    
    requests.forEach(request => {
        const requestHtml = `
            <div class="manage-member-item" data-request-id="${request.id}">
                <div class="manage-member-info">
                    <div class="profile-avatar">👤</div>
                    <div class="manage-member-details">
                        <div class="member-name-row">
                            <span class="member-name">${request.name}</span>
                        </div>
                        <div class="member-meta">
                            <span>${request.gender} • 신청일: ${request.requestDate}</span>
                        </div>
                        <div class="request-message">
                            <small>"${request.message}"</small>
                        </div>
                    </div>
                </div>
                <div class="manage-member-actions">
                    <button class="btn btn-small btn-primary approve-btn" data-request-id="${request.id}">승인</button>
                    <button class="btn btn-small btn-danger reject-btn" data-request-id="${request.id}">거절</button>
                </div>
            </div>
        `;
        
        $container.append(requestHtml);
    });
}

// 차단된 멤버 목록 렌더링
function renderBannedMembers(bannedMembers) {
    const $container = $('.banned-list');
    $container.empty();
    
    if (bannedMembers.length === 0) {
        $container.html('<div class="empty-state">차단된 멤버가 없습니다.</div>');
        return;
    }
    
    bannedMembers.forEach(member => {
        const memberHtml = `
            <div class="manage-member-item" data-banned-id="${member.id}">
                <div class="manage-member-info">
                    <div class="profile-avatar">🚫</div>
                    <div class="manage-member-details">
                        <div class="member-name-row">
                            <span class="member-name">${member.name}</span>
                        </div>
                        <div class="member-meta">
                            <span>차단일: ${member.banDate} • 사유: ${member.reason}</span>
                        </div>
                    </div>
                </div>
                <div class="manage-member-actions">
                    ${USER_PERMISSIONS.isHost ? '<button class="btn btn-small btn-outline unban-btn" data-banned-id="' + member.id + '">차단 해제</button>' : ''}
                </div>
            </div>
        `;
        
        $container.append(memberHtml);
    });
}

// 탭 전환
function switchTab(tabId) {
    $('.tab-btn').removeClass('active');
    $(`.tab-btn[data-tab="${tabId}"]`).addClass('active');
    
    $('.tab-content').hide();
    $(`#${tabId}-tab`).show();
}

// 멤버 컨텍스트 메뉴 표시
function showMemberContextMenu(e, memberId, memberRole) {
    const $menu = $('#memberMenu');
    
    // 메뉴 항목 표시/숨김 설정
    $('.promote-btn').toggle(USER_PERMISSIONS.isHost && memberRole === 'member');
    $('.demote-btn').toggle(USER_PERMISSIONS.isHost && memberRole === 'sub-leader');
    $('.kick-btn').toggle(
        (USER_PERMISSIONS.isHost && memberRole !== 'leader') ||
        (USER_PERMISSIONS.isSubLeader && memberRole === 'member')
    );
    $('.ban-btn').toggle(
        (USER_PERMISSIONS.isHost && memberRole !== 'leader') ||
        (USER_PERMISSIONS.isSubLeader && memberRole === 'member')
    );
    
    // 메뉴 위치 설정
    const rect = e.target.getBoundingClientRect();
    $menu.css({
        top: rect.bottom + 5 + 'px',
        left: rect.left + 'px'
    }).show();
    
    // 메뉴 항목 이벤트 (기존 이벤트 제거 후 재바인딩)
    $menu.find('.menu-item').off('click').on('click', function() {
        const action = $(this).attr('class').split(' ')[1].replace('-btn', '');
        handleMemberAction(action, memberId);
        $menu.hide();
    });
    
    // 외부 클릭 시 메뉴 닫기
    setTimeout(() => {
        $(document).one('click', () => $menu.hide());
    }, 0);
}

// 멤버 액션 처리
function handleMemberAction(action, memberId) {
    const memberName = $(`.member-item[data-member-id="${memberId}"] .member-name`).text();
    
    switch (action) {
        case 'promote':
            showConfirmDialog(
                '부리더 승격',
                `${memberName}님을 부리더로 승격하시겠습니까?`,
                () => promoteMember(memberId)
            );
            break;
        case 'demote':
            showConfirmDialog(
                '일반 멤버로 강등',
                `${memberName}님을 일반 멤버로 강등하시겠습니까?`,
                () => demoteMember(memberId)
            );
            break;
        case 'kick':
            showConfirmDialog(
                '멤버 추방',
                `${memberName}님을 커뮤니티에서 추방하시겠습니까?`,
                () => kickMember(memberId)
            );
            break;
        case 'ban':
            showConfirmDialog(
                '멤버 차단',
                `${memberName}님을 차단하시겠습니까? 차단된 멤버는 다시 가입할 수 없습니다.`,
                () => banMember(memberId)
            );
            break;
    }
}

// 멤버 승격
function promoteMember(memberId) {
    // 실제로는 서버 API 호출
    const $memberItem = $(`.member-item[data-member-id="${memberId}"]`);
    $memberItem.attr('data-role', 'sub-leader');
    $memberItem.find('.member-status').text('부리더, 여');
    showToast('멤버가 부리더로 승격되었습니다.', 'success');
}

// 멤버 강등
function demoteMember(memberId) {
    // 실제로는 서버 API 호출
    const $memberItem = $(`.member-item[data-member-id="${memberId}"]`);
    $memberItem.attr('data-role', 'member');
    $memberItem.find('.member-status').text('멤버, 여');
    showToast('멤버가 일반 멤버로 강등되었습니다.', 'success');
}

// 멤버 추방
function kickMember(memberId) {
    // 실제로는 서버 API 호출
    $(`.member-item[data-member-id="${memberId}"]`).fadeOut(300, function() {
        $(this).remove();
        updateMemberCount();
    });
    showToast('멤버가 추방되었습니다.', 'success');
}

// 멤버 차단
function banMember(memberId) {
    // 실제로는 서버 API 호출
    kickMember(memberId); // 일단 목록에서 제거
    showToast('멤버가 차단되었습니다.', 'success');
}

// 멤버 수 업데이트
function updateMemberCount() {
    const count = $('.member-item').length;
    $('.members-header h3').text(`모임 멤버 (총 ${count}명)`);
}

// 일반 사용자용 전체 멤버 보기 (읽기 전용)
function showAllMembersReadOnly() {
    showToast('전체 멤버 목록을 표시합니다.', 'info');
    // 실제 구현에서는 읽기 전용 모달을 표시
}

// 이미지 모달 초기화
function initImageModal() {
    // 이미지 클릭 시 모달 열기
    $(document).on('click', '.image-placeholder', function() {
        // 실제 구현에서는 실제 이미지 URL을 사용
        const imageSrc = 'https://via.placeholder.com/600x400/007bff/ffffff?text=Sample+Image';
        showImageModal(imageSrc);
    });
    
    // 모달 닫기
    $('.image-modal, .image-modal-close').on('click', function() {
        $('.image-modal').fadeOut(300);
    });
    
    // 모달 이미지 클릭 시 이벤트 전파 중단
    $('.image-modal img').on('click', function(e) {
        e.stopPropagation();
    });
}

// 이미지 모달 표시
function showImageModal(imageSrc) {
    $('#modalImage').attr('src', imageSrc);
    $('.image-modal').fadeIn(300);
}

// 페이지네이션 초기화
function initPagination() {
    $('.page-btn').on('click', function() {
        if ($(this).hasClass('active') || $(this).prop('disabled')) {
            return;
        }
        
        $('.page-btn').removeClass('active');
        $(this).addClass('active');
        
        // 실제 구현에서는 서버에서 해당 페이지 데이터를 가져옴
        showToast(`${$(this).text()}페이지로 이동합니다.`, 'info');
    });
}

// 토스트 메시지 표시
function showToast(message, type = 'success') {
    const $toast = $('#toast');
    const $icon = $('#toastIcon');
    const $message = $('#toastMessage');
    
    // 타입별 아이콘과 색상 설정
    const types = {
        'success': { icon: '✓', color: '#28a745' },
        'error': { icon: '✗', color: '#dc3545' },
        'info': { icon: 'ℹ', color: '#17a2b8' },
        'warning': { icon: '⚠', color: '#ffc107' }
    };
    
    const typeConfig = types[type] || types['success'];
    
    $icon.text(typeConfig.icon);
    $message.text(message);
    $toast.css('background', typeConfig.color);
    
    $toast.addClass('show');
    
    setTimeout(function() {
        $toast.removeClass('show');
    }, 3000);
}

// 확인 다이얼로그 표시
function showConfirmDialog(title, message, onConfirm) {
    $('#confirmTitle').text(title);
    $('#confirmMessage').text(message);
    $('#confirmDialog').fadeIn(300);
    
    // 이전 이벤트 제거 후 새 이벤트 바인딩
    $('#confirmOk').off('click').on('click', function() {
        $('#confirmDialog').fadeOut(300);
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });
    
    $('#confirmCancel').off('click').on('click', function() {
        $('#confirmDialog').fadeOut(300);
    });
}

// ESC 키로 모달 닫기
$(document).on('keydown', function(e) {
    if (e.key === 'Escape') {
        $('.modal, .image-modal').fadeOut(300);
        $('.post-menu').remove();
    }
});

// 페이지 로딩 완료 후 초기 설정
$(window).on('load', function() {
    updatePostCount();
    showToast('커뮤니티 페이지가 로드되었습니다.', 'info');
});