// 액티브 시니어 커뮤니티 JavaScript

// 사용자 권한 설정
const USER_PERMISSIONS = {
  isHost: true,
  isMember: false,
  currentUserId: "user123",
};

$(document).ready(function () {
  // 초기화 함수들
  initSeniorFriendlyFeatures();
  initPostInteractions();
  initWritePost();
  initSortTabs();
  initMemberManagement();
  initAccessibilityFeatures();

  // 시니어 친화적 UI 설정
  setupSeniorUI();
});

// 시니어 친화적 기능 초기화
function initSeniorFriendlyFeatures() {
  // 폰트 크기 조절 기능
  addFontSizeControls();

  // 클릭 영역 확대
  enhanceClickableAreas();

  // 키보드 네비게이션 개선
  improveKeyboardNavigation();

  // 로딩 상태 표시
  addLoadingStates();
}

// 시니어 UI 설정
function setupSeniorUI() {
  // 더 큰 터치 영역 설정
  $(".action-btn, .toolbar-btn, .sort-tab").css({
    "min-height": "48px",
    "min-width": "48px",
  });

  // 텍스트 가독성 향상
  $("body").css({
    "line-height": "1.7",
    "letter-spacing": "0.02em",
  });

  // 애니메이션 속도 조절 (시니어를 위해 느리게)
  $(":root").css("--animation-speed", "0.4s");
}

// 폰트 크기 조절 컨트롤 추가
function addFontSizeControls() {
  const fontControls = `
        <div class="font-size-controls" style="
            position: fixed;
            top: 100px;
            right: 20px;
            background: white;
            padding: 10px;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            z-index: 100;
            display: flex;
            flex-direction: column;
            gap: 8px;
            border: 1px solid #e3e8ee;
        ">
            <div style="font-size: 12px; color: #7f8c8d; text-align: center; font-weight: 600;">글자크기</div>
            <button class="font-btn" data-size="small" style="padding: 8px 12px; border: 1px solid #e3e8ee; background: white; border-radius: 6px; cursor: pointer; font-size: 12px;">작게</button>
            <button class="font-btn active" data-size="normal" style="padding: 8px 12px; border: 1px solid #2c5aa0; background: #2c5aa0; color: white; border-radius: 6px; cursor: pointer; font-size: 14px;">보통</button>
            <button class="font-btn" data-size="large" style="padding: 8px 12px; border: 1px solid #e3e8ee; background: white; border-radius: 6px; cursor: pointer; font-size: 16px;">크게</button>
        </div>
    `;

  $("body").append(fontControls);

  // 폰트 크기 변경 이벤트
  $(".font-btn").on("click", function () {
    const size = $(this).data("size");

    $(".font-btn").removeClass("active").css({
      background: "white",
      color: "#333",
      "border-color": "#e3e8ee",
    });

    $(this).addClass("active").css({
      background: "#2c5aa0",
      color: "white",
      "border-color": "#2c5aa0",
    });

    changeFontSize(size);
  });
}

// 폰트 크기 변경 함수
function changeFontSize(size) {
  const sizes = {
    small: "14px",
    normal: "16px",
    large: "18px",
  };

  $("body").css("font-size", sizes[size]);

  // 제목 폰트도 비례적으로 조정
  const titleSizes = {
    small: { h1: "1.8rem", h2: "1.5rem", h3: "1.3rem" },
    normal: { h1: "2rem", h2: "1.6rem", h3: "1.4rem" },
    large: { h1: "2.2rem", h2: "1.8rem", h3: "1.5rem" },
  };

  $("h1").css("font-size", titleSizes[size].h1);
  $("h2").css("font-size", titleSizes[size].h2);
  $("h3").css("font-size", titleSizes[size].h3);

  // 로컬 스토리지에 설정 저장
  localStorage.setItem("fontSize", size);

  showToast(
    `글자 크기가 ${
      size === "small" ? "작게" : size === "large" ? "크게" : "보통으로"
    } 변경되었습니다.`,
    "info"
  );
}

// 저장된 폰트 크기 설정 로드
function loadSavedFontSize() {
  const savedSize = localStorage.getItem("fontSize") || "normal";
  changeFontSize(savedSize);

  $(".font-btn").removeClass("active");
  $(`.font-btn[data-size="${savedSize}"]`).addClass("active");
}

// 클릭 영역 확대
function enhanceClickableAreas() {
  // 작은 버튼들의 클릭 영역 확대
  $(".post-menu-btn, .modal-close").css({
    padding: "12px",
    "min-width": "48px",
    "min-height": "48px",
  });

  // 링크와 버튼의 최소 크기 보장
  $("a, button").each(function () {
    const $this = $(this);
    if ($this.width() < 44 || $this.height() < 44) {
      $this.css({
        padding: "12px 16px",
        "min-width": "44px",
        "min-height": "44px",
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
      });
    }
  });
}

// 키보드 네비게이션 개선
function improveKeyboardNavigation() {
  // 모든 인터랙티브 요소에 탭 인덱스 설정
  $("button, a, input, textarea, select").attr("tabindex", "0");

  // 포커스 표시 강화
  $("button, a, input, textarea, select")
    .on("focus", function () {
      $(this).css({
        outline: "3px solid #2c5aa0",
        "outline-offset": "2px",
      });
    })
    .on("blur", function () {
      $(this).css("outline", "none");
    });

  // Enter 키로 버튼 클릭 가능하게
  $("button").on("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $(this).click();
    }
  });

  // ESC 키로 모달 닫기
  $(document).on("keydown", function (e) {
    if (e.key === "Escape") {
      $(".modal").hide();
    }
  });
}

// 로딩 상태 표시
function addLoadingStates() {
  // 버튼 클릭 시 로딩 상태 표시
  $(document).on("click", "button", function () {
    const $btn = $(this);
    const originalText = $btn.text();

    if (!$btn.hasClass("loading")) {
      $btn.addClass("loading").prop("disabled", true).text("처리중...");

      // 2초 후 원래 상태로 복구 (실제로는 서버 응답에 따라)
      setTimeout(() => {
        $btn.removeClass("loading").prop("disabled", false).text(originalText);
      }, 2000);
    }
  });
}

// 게시글 작성 기능
function initWritePost() {
  const $textarea = $(".write-textarea");
  const $submitBtn = $(".btn-post-submit");

  // 텍스트 영역 자동 높이 조절
  $textarea.on("input", function () {
    this.style.height = "auto";
    this.style.height = Math.max(120, this.scrollHeight) + "px";
  });

  // 게시 버튼 클릭
  $submitBtn.on("click", function () {
    const content = $textarea.val().trim();

    if (content === "") {
      showToast("내용을 입력해주세요.", "warning");
      $textarea.focus();
      return;
    }

    if (content.length < 10) {
      showToast("최소 10자 이상 입력해주세요.", "warning");
      $textarea.focus();
      return;
    }

    createNewPost(content);
    $textarea.val("").css("height", "120px");
    showToast("게시글이 성공적으로 작성되었습니다!", "success");
  });

  // Ctrl + Enter로 게시
  $textarea.on("keydown", function (e) {
    if (e.ctrlKey && e.key === "Enter") {
      $submitBtn.click();
    }
  });

  // 파일 첨부 기능
  $(".toolbar-btn").on("click", function () {
    const type = $(this).find(".btn-text").text();
    showToast(`${type} 첨부 기능은 준비 중입니다.`, "info");
  });
}

// 새 게시글 생성
function createNewPost(content) {
  const currentTime = new Date().toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const newPostHtml = `
        <article class="post-card" style="display: none;">
            <div class="post-header">
                <div class="author-info">
                    <div class="author-avatar">
                        <img src="/images/default-avatar.png" alt="프로필" class="avatar-img">
                    </div>
                    <div class="author-details">
                        <span class="author-name">현재로그인사람</span>
                        <span class="post-time">방금 전</span>
                    </div>
                </div>
                <button class="post-menu-btn">⋯</button>
            </div>
            
            <div class="post-content">
                <p class="post-text">${escapeHtml(content)}</p>
            </div>
            
            <div class="post-actions">
                <button class="action-btn like-btn" data-liked="false">
                    <span class="action-icon">❤️</span>
                    <span class="action-text">좋아요 0</span>
                </button>
                <button class="action-btn comment-btn">
                    <span class="action-icon">💬</span>
                    <span class="action-text">댓글 0</span>
                </button>
                <button class="action-btn share-btn">
                    <span class="action-icon">📤</span>
                    <span class="action-text">공유</span>
                </button>
            </div>
        </article>
    `;

  $(".posts-list").prepend(newPostHtml);
  $(".posts-list .post-card")
    .first()
    .slideDown(400, function () {
      // 애니메이션 완료 후 이벤트 바인딩
      initPostItemEvents($(this));
    });

  updatePostCount();
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 게시글 수 업데이트
function updatePostCount() {
  const count = $(".posts-list .post-card").length;
  $(".post-count").text(`총 ${count}개의 글`);
}

// 게시글 상호작용 초기화
function initPostInteractions() {
  // 기존 게시글들에 이벤트 바인딩
  $(".post-card").each(function () {
    initPostItemEvents($(this));
  });
}

// 개별 게시글 이벤트 설정
function initPostItemEvents($post) {
  const $likeBtn = $post.find(".like-btn");
  const $commentBtn = $post.find(".comment-btn");
  const $shareBtn = $post.find(".share-btn");
  const $menuBtn = $post.find(".post-menu-btn");

  // 좋아요 버튼
  $likeBtn.off("click").on("click", function (e) {
    e.preventDefault();
    toggleLike($(this));
  });

  // 댓글 버튼
  $commentBtn.off("click").on("click", function (e) {
    e.preventDefault();
    showToast("댓글 기능은 준비 중입니다.", "info");
  });

  // 공유 버튼
  $shareBtn.off("click").on("click", function (e) {
    e.preventDefault();
    sharePost($post);
  });

  // 메뉴 버튼
  $menuBtn.off("click").on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    showPostMenu(e, $post);
  });

  // 이미지 클릭 이벤트
  $post
    .find(".post-img")
    .off("click")
    .on("click", function () {
      const src = $(this).attr("src");
      showImageModal(src);
    });
}

// 좋아요 토글
function toggleLike($btn) {
  const isLiked = $btn.attr("data-liked") === "true";
  const $text = $btn.find(".action-text");
  const currentCount = parseInt($text.text().match(/\d+/)[0]) || 0;

  if (isLiked) {
    $btn.attr("data-liked", "false").removeClass("liked").css({
      background: "var(--background-primary)",
      color: "var(--text-primary)",
      "border-color": "var(--border-color)",
    });
    $text.text(`좋아요 ${Math.max(0, currentCount - 1)}`);
    showToast("좋아요를 취소했습니다.", "info");
  } else {
    $btn.attr("data-liked", "true").addClass("liked").css({
      background: "var(--accent-color)",
      color: "white",
      "border-color": "var(--accent-color)",
    });
    $text.text(`좋아요 ${currentCount + 1}`);
    showToast("좋아요를 눌렀습니다! ❤️", "success");

    // 하트 애니메이션 효과
    addHeartAnimation($btn);
  }
}

// 하트 애니메이션 추가
function addHeartAnimation($btn) {
  const $heart = $(
    '<span style="position: absolute; font-size: 24px; color: #ff6b6b; pointer-events: none;">❤️</span>'
  );
  $btn.css("position", "relative").append($heart);

  $heart.animate(
    {
      top: "-30px",
      opacity: 0,
    },
    800,
    function () {
      $(this).remove();
    }
  );
}

// 게시글 공유
function sharePost($post) {
  const title = $post.find(".post-text").text().substring(0, 50) + "...";
  const url = window.location.href;

  if (navigator.share) {
    navigator
      .share({
        title: title,
        url: url,
      })
      .catch((err) => {
        console.log("공유 실패:", err);
        copyToClipboard(url);
      });
  } else {
    copyToClipboard(url);
  }
}

// 클립보드에 복사
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("링크가 클립보드에 복사되었습니다.", "success");
    });
  } else {
    // 구형 브라우저 지원
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    showToast("링크가 클립보드에 복사되었습니다.", "success");
  }
}

// 게시글 메뉴 표시
function showPostMenu(e, $post) {
  $(".post-menu").remove();

  const menuHtml = `
        <div class="post-menu" style="
            position: fixed;
            background: white;
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-medium);
            z-index: 1000;
            min-width: 120px;
            overflow: hidden;
        ">
            <button class="menu-item edit-btn" style="
                display: block;
                width: 100%;
                padding: 12px 16px;
                border: none;
                background: white;
                text-align: left;
                cursor: pointer;
                font-size: 14px;
                color: var(--text-primary);
                transition: background-color 0.3s ease;
            ">✏️ 수정하기</button>
            <button class="menu-item delete-btn" style="
                display: block;
                width: 100%;
                padding: 12px 16px;
                border: none;
                background: white;
                text-align: left;
                cursor: pointer;
                font-size: 14px;
                color: var(--accent-color);
                transition: background-color 0.3s ease;
            ">🗑️ 삭제하기</button>
            <button class="menu-item report-btn" style="
                display: block;
                width: 100%;
                padding: 12px 16px;
                border: none;
                background: white;
                text-align: left;
                cursor: pointer;
                font-size: 14px;
                color: var(--text-secondary);
                transition: background-color 0.3s ease;
            ">🚨 신고하기</button>
        </div>
    `;

  $("body").append(menuHtml);

  const $menu = $(".post-menu");
  const rect = e.target.getBoundingClientRect();

  $menu.css({
    top: rect.bottom + 5 + "px",
    left: Math.min(rect.left, window.innerWidth - 140) + "px",
  });

  // 메뉴 항목 hover 효과
  $menu.find(".menu-item").hover(
    function () {
      $(this).css("background", "var(--background-primary)");
    },
    function () {
      $(this).css("background", "white");
    }
  );

  // 메뉴 이벤트
  $menu.find(".edit-btn").on("click", function () {
    editPost($post);
    $menu.remove();
  });

  $menu.find(".delete-btn").on("click", function () {
    showConfirmDialog(
      "게시글 삭제",
      "정말로 이 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.",
      () => deletePost($post)
    );
    $menu.remove();
  });

  $menu.find(".report-btn").on("click", function () {
    showToast("신고가 접수되었습니다. 검토 후 조치하겠습니다.", "success");
    $menu.remove();
  });

  // 외부 클릭 시 메뉴 닫기
  setTimeout(() => {
    $(document).one("click", () => $menu.remove());
  }, 0);
}

// 게시글 수정
function editPost($post) {
  const $content = $post.find(".post-text");
  const originalText = $content.text();

  const editHtml = `
        <div class="edit-container">
            <textarea class="edit-textarea" style="
                width: 100%;
                min-height: 100px;
                padding: 12px;
                border: 2px solid var(--primary-color);
                border-radius: var(--border-radius);
                font-family: inherit;
                font-size: 1rem;
                line-height: 1.6;
                resize: vertical;
                outline: none;
            ">${originalText}</textarea>
            <div class="edit-actions" style="
                display: flex;
                gap: 8px;
                margin-top: 12px;
                justify-content: flex-end;
            ">
                <button class="btn-cancel" style="
                    padding: 8px 16px;
                    border: 1px solid var(--border-color);
                    background: white;
                    color: var(--text-secondary);
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    font-size: 14px;
                ">취소</button>
                <button class="btn-save" style="
                    padding: 8px 16px;
                    border: none;
                    background: var(--primary-color);
                    color: white;
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                ">저장</button>
            </div>
        </div>
    `;

  $content.html(editHtml);

  const $textarea = $content.find(".edit-textarea");
  const $saveBtn = $content.find(".btn-save");
  const $cancelBtn = $content.find(".btn-cancel");

  // 텍스트 영역 자동 높이 조절
  $textarea
    .on("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    })
    .trigger("input");

  $textarea.focus();

  $saveBtn.on("click", function () {
    const newText = $textarea.val().trim();
    if (newText && newText !== originalText) {
      $content.html(`<p class="post-text">${escapeHtml(newText)}</p>`);
      showToast("게시글이 수정되었습니다.", "success");
    } else if (!newText) {
      showToast("내용을 입력해주세요.", "warning");
      return;
    } else {
      $content.html(`<p class="post-text">${escapeHtml(originalText)}</p>`);
    }
  });

  $cancelBtn.on("click", function () {
    $content.html(`<p class="post-text">${escapeHtml(originalText)}</p>`);
  });
}

// 게시글 삭제
function deletePost($post) {
  $post.slideUp(400, function () {
    $(this).remove();
    updatePostCount();
    showToast("게시글이 삭제되었습니다.", "success");
  });
}

// 정렬 탭 초기화
function initSortTabs() {
  $(".sort-tab").on("click", function () {
    const sortType = $(this).data("sort");

    $(".sort-tab").removeClass("active");
    $(this).addClass("active");

    sortPosts(sortType);
  });
}

// 게시글 정렬
function sortPosts(sortType) {
  const $postsList = $(".posts-list");
  const $posts = $postsList.find(".post-card").detach();

  let sortedPosts;

  switch (sortType) {
    case "latest":
      // 최신순 (기본 순서 유지)
      sortedPosts = $posts;
      break;
    case "popular":
      // 인기순 (좋아요 수 기준)
      sortedPosts = $posts.sort((a, b) => {
        const likesA =
          parseInt(
            $(a).find(".like-btn .action-text").text().match(/\d+/)[0]
          ) || 0;
        const likesB =
          parseInt(
            $(b).find(".like-btn .action-text").text().match(/\d+/)[0]
          ) || 0;
        return likesB - likesA;
      });
      break;
    case "oldest":
      // 오래된순
      sortedPosts = $posts.get().reverse();
      break;
    default:
      sortedPosts = $posts;
  }

  // 정렬된 게시글들을 다시 추가
  $postsList.append(sortedPosts);

  const sortNames = {
    latest: "최신순",
    popular: "인기순",
    oldest: "오래된순",
  };

  showToast(`${sortNames[sortType]}로 정렬되었습니다.`, "info");
}

// 멤버 관리 초기화
function initMemberManagement() {
  // 전체 멤버 보기 버튼
  $("#viewAllMembers").on("click", function () {
    openMemberModal();
  });

  // 커뮤니티 액션 버튼들
  $(".btn-primary").on("click", function () {
    const text = $(this).text().trim();
    if (text.includes("멤버")) {
      openMemberModal();
    }
  });
}

// 멤버 모달 열기
function openMemberModal() {
  const modalHtml = `
        <div class="modal" id="memberModal" style="display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" style="width: 90%; max-width: 600px;">
                <div class="modal-header">
                    <h3>전체 멤버 (16명)</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="member-search" style="margin-bottom: 20px;">
                        <input type="text" placeholder="멤버 이름으로 검색..." style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid var(--border-color);
                            border-radius: var(--border-radius);
                            font-size: 16px;
                        ">
                    </div>
                    
                    <div class="member-stats" style="
                        display: flex;
                        gap: 20px;
                        margin-bottom: 20px;
                        padding: 16px;
                        background: var(--background-primary);
                        border-radius: var(--border-radius);
                        border: 1px solid var(--border-color);
                    ">
                        <div class="stat-item">
                            <span class="stat-label">전체 멤버</span>
                            <span class="stat-value">16명</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">온라인</span>
                            <span class="stat-value" style="color: var(--success-color);">8명</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">오프라인</span>
                            <span class="stat-value">8명</span>
                        </div>
                    </div>
                    
                    <div class="modal-member-list">
                        ${generateMemberList()}
                    </div>
                </div>
            </div>
        </div>
    `;

  $("body").append(modalHtml);

  // 모달 이벤트
  $("#memberModal .modal-close, #memberModal").on("click", function (e) {
    if (e.target === this) {
      $("#memberModal").remove();
    }
  });

  // 검색 기능
  $("#memberModal .member-search input").on("input", function () {
    const searchTerm = $(this).val().toLowerCase();
    filterMemberList(searchTerm);
  });
}

// 멤버 리스트 생성
function generateMemberList() {
  const groupId = {
        groupId: "1f2d3c4b-5a6e-4f80-9123-456789abcdef" //이 정보 화면에서 갖고와야함(임시)
    };
  const members = []
  // 멤버정보 갖고오기
  $.ajax({
    url: "/community/members",
    type: 'POST',
    contentType: "application/json",
    data: JSON.stringify(groupId), //그룹id
    success: function(response, textStatus, jqXHR) {
        console.log("멤버 정보 가져오기 성공 : " + Array.isArray(response)); //데이터 갖고오는 방법,,,,
        members.push(response);
      
    },
    error: function(request, status, error) {
      
      console.error("멤버 정보 가져오기 오류:", error);
    }
  });

  // const members = [
  //   { name: "멤버닉네임1", role: "리더", isOnline: true },
  //   { name: "멤버닉네임2", role: "멤버", isOnline: true },
  //   { name: "멤버닉네임3", role: "멤버", isOnline: false },
  //   { name: "멤버닉네임4", role: "멤버", isOnline: true },
  //   { name: "멤버닉네임5", role: "멤버", isOnline: false },
  //   { name: "멤버닉네임6", role: "멤버", isOnline: true },
  //   { name: "멤버닉네임7", role: "멤버", isOnline: true },
  //   { name: "멤버닉네임8", role: "멤버", isOnline: false },
  //   { name: "멤버닉네임9", role: "멤버", isOnline: true },
  //   { name: "멤버닉네임10", role: "멤버", isOnline: false },
  // ];

  return members
    .map(
      (member) => `
        <div class="modal-member-item" style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.3s ease;
        " onmouseover="this.style.background='var(--background-primary)'" 
           onmouseout="this.style.background='white'">
            <div class="member-avatar" style="position: relative;">
                <img src="/images/default-avatar.png" alt="${
                  member.name
                }" class="avatar-img" style="width: 50px; height: 50px;">
                <span class="member-status ${
                  member.isOnline ? "online" : ""
                }" style="
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 3px solid white;
                    background: ${
                      member.isOnline
                        ? "var(--success-color)"
                        : "var(--text-secondary)"
                    };
                "></span>
            </div>
            <div class="member-info" style="flex: 1;">
                <div class="member-name" style="font-weight: 600; color: var(--text-primary); font-size: 16px;">${
                  member.name
                }</div>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                    <span class="member-role" style="
                        color: var(--text-secondary); 
                        font-size: 14px;
                        padding: 2px 8px;
                        background: ${
                          member.role === "리더"
                            ? "var(--warning-color)"
                            : "var(--background-primary)"
                        };
                        color: ${
                          member.role === "리더"
                            ? "white"
                            : "var(--text-secondary)"
                        };
                        border-radius: 12px;
                        font-size: 12px;
                    ">${member.role}</span>
                    <span style="color: ${
                      member.isOnline
                        ? "var(--success-color)"
                        : "var(--text-secondary)"
                    }; font-size: 14px;">
                        ${member.isOnline ? "온라인" : "오프라인"}
                    </span>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

// 멤버 리스트 필터링
function filterMemberList(searchTerm) {
  $(".modal-member-item").each(function () {
    const memberName = $(this).find(".member-name").text().toLowerCase();
    if (memberName.includes(searchTerm)) {
      $(this).show();
    } else {
      $(this).hide();
    }
  });
}

// 이미지 모달 표시
function showImageModal(src) {
  const modalHtml = `
        <div class="image-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        ">
            <img src="${src}" alt="확대 이미지" style="
                max-width: 90%;
                max-height: 90%;
                border-radius: var(--border-radius);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            ">
            <button class="image-modal-close" style="
                position: absolute;
                top: 20px;
                right: 30px;
                background: rgba(255, 255, 255, 0.9);
                border: none;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                color: #333;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            ">&times;</button>
        </div>
    `;

  $("body").append(modalHtml);

  $(".image-modal, .image-modal-close").on("click", function () {
    $(".image-modal").remove();
  });

  $(".image-modal img").on("click", function (e) {
    e.stopPropagation();
  });
}

// 접근성 기능 초기화
function initAccessibilityFeatures() {
  // 스크린 리더를 위한 레이블 추가
  $("button").each(function () {
    if (!$(this).attr("aria-label") && !$(this).text().trim()) {
      const title = $(this).attr("title");
      if (title) {
        $(this).attr("aria-label", title);
      }
    }
  });

  // 이미지에 alt 속성 확인
  $("img").each(function () {
    if (!$(this).attr("alt")) {
      $(this).attr("alt", "이미지");
    }
  });

  // 링크에 설명 추가
  $("a").each(function () {
    if (!$(this).attr("aria-label") && !$(this).text().trim()) {
      $(this).attr("aria-label", "링크");
    }
  });
}

// 토스트 메시지 표시
function showToast(message, type = "success") {
  const types = {
    success: { icon: "✅", color: "var(--success-color)" },
    error: { icon: "❌", color: "var(--accent-color)" },
    warning: { icon: "⚠️", color: "var(--warning-color)" },
    info: { icon: "ℹ️", color: "var(--secondary-color)" },
  };

  const config = types[type] || types["success"];

  const toastHtml = `
        <div class="toast" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${config.color};
            color: white;
            padding: 16px 20px;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-medium);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 400px;
            font-size: 16px;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.4s ease;
        ">
            <span>${config.icon}</span>
            <span>${message}</span>
        </div>
    `;

  $("body").append(toastHtml);

  const $toast = $(".toast").last();

  // 애니메이션으로 토스트 표시
  setTimeout(() => $toast.css("transform", "translateX(0)"), 100);

  // 4초 후 자동 제거
  setTimeout(() => {
    $toast.css("transform", "translateX(100%)");
    setTimeout(() => $toast.remove(), 400);
  }, 4000);

  // 클릭으로 수동 제거
  $toast.on("click", function () {
    $(this).css("transform", "translateX(100%)");
    setTimeout(() => $(this).remove(), 400);
  });
}

// 확인 다이얼로그 표시
function showConfirmDialog(title, message, onConfirm) {
  const dialogHtml = `
        <div class="confirm-dialog" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        ">
            <div class="dialog-content" style="
                background: white;
                padding: 24px;
                border-radius: var(--border-radius-large);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
                text-align: center;
            ">
                <h3 style="color: var(--text-primary); margin-bottom: 12px; font-size: 18px;">${title}</h3>
                <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6; white-space: pre-line;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn-cancel" style="
                        padding: 12px 24px;
                        border: 1px solid var(--border-color);
                        background: white;
                        color: var(--text-secondary);
                        border-radius: var(--border-radius);
                        cursor: pointer;
                        font-size: 16px;
                        min-width: 80px;
                    ">취소</button>
                    <button class="btn-confirm" style="
                        padding: 12px 24px;
                        border: none;
                        background: var(--accent-color);
                        color: white;
                        border-radius: var(--border-radius);
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: 600;
                        min-width: 80px;
                    ">확인</button>
                </div>
            </div>
        </div>
    `;

  $("body").append(dialogHtml);

  const $dialog = $(".confirm-dialog");

  $dialog.find(".btn-cancel, .confirm-dialog").on("click", function (e) {
    if (e.target === this) {
      $dialog.remove();
    }
  });

  $dialog.find(".btn-confirm").on("click", function () {
    $dialog.remove();
    if (typeof onConfirm === "function") {
      onConfirm();
    }
  });

  // 포커스를 확인 버튼에 설정
  $dialog.find(".btn-confirm").focus();
}

// 페이지 로드 완료 시 실행
$(window).on("load", function () {
  // 저장된 폰트 크기 설정 로드
  loadSavedFontSize();

  // 초기 게시글 수 업데이트
  updatePostCount();

  // 웰컴 메시지
  setTimeout(() => {
    showToast("커뮤니티에 오신 것을 환영합니다! 🎉", "success");
  }, 1000);

  // 성능 최적화: 이미지 지연 로딩
  if ("IntersectionObserver" in window) {
    lazyLoadImages();
  }
});

// 이미지 지연 로딩
function lazyLoadImages() {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
          observer.unobserve(img);
        }
      }
    });
  });

  document.querySelectorAll("img[data-src]").forEach((img) => {
    imageObserver.observe(img);
  });
}

// 에러 처리
window.addEventListener("error", function (e) {
  console.error("JavaScript 오류:", e.error);
  showToast("일시적인 오류가 발생했습니다. 새로고침 해주세요.", "error");
});

// 온라인/오프라인 상태 감지
window.addEventListener("online", function () {
  showToast("인터넷 연결이 복구되었습니다.", "success");
});

window.addEventListener("offline", function () {
  showToast("인터넷 연결이 끊어졌습니다.", "warning");
});
