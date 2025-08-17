// 투어 탐색 페이지 JavaScript

$(document).ready(function() {
    // 초기화 함수들
    initSearch();
    initFilters();
    initSorting();
    initCommunityCards();
    initLoadMore();
    initModals();
    
    // 페이지 로드 완료 시 환영 메시지
    showToast('새로운 여행을 찾아보세요! 🌟', 'info');
});

// 검색 기능 초기화
function initSearch() {
    const $searchInput = $('.search-input');
    const $searchBtn = $('.search-btn');
    
    // 검색 버튼 클릭
    $searchBtn.on('click', function() {
        performSearch();
    });
    
    // 엔터키 검색
    $searchInput.on('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // 실시간 검색 (타이핑 후 300ms 대기)
    let searchTimeout;
    $searchInput.on('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if ($(this).val().length >= 2) {
                performSearch();
            } else if ($(this).val().length === 0) {
                showAllCommunities();
            }
        }, 300);
    });
}

// 검색 실행
function performSearch() {
    const searchTerm = $('.search-input').val().toLowerCase().trim();
    
    if (searchTerm === '') {
        showAllCommunities();
        return;
    }
    
    const $cards = $('.community-card');
    let visibleCount = 0;
    
    $cards.each(function() {
        const $card = $(this);
        const title = $card.find('.card-title').text().toLowerCase();
        const description = $card.find('.card-description').text().toLowerCase();
        const location = $card.find('.location').text().toLowerCase();
        const category = $card.find('.card-category').text().toLowerCase();
        
        if (title.includes(searchTerm) || 
            description.includes(searchTerm) || 
            location.includes(searchTerm) || 
            category.includes(searchTerm)) {
            $card.show();
            visibleCount++;
        } else {
            $card.hide();
        }
    });
    
    if (visibleCount === 0) {
        showNoResults();
    } else {
        hideNoResults();
        showToast(`${visibleCount}개의 여행을 찾았습니다.`, 'success');
    }
}

// 모든 커뮤니티 표시
function showAllCommunities() {
    $('.community-card').show();
    hideNoResults();
}

// 검색 결과 없음 표시
function showNoResults() {
    if ($('.no-results').length === 0) {
        const noResultsHtml = `
            <div class="no-results" style="
                text-align: center; 
                padding: 3rem 1rem; 
                color: #6c757d;
                grid-column: 1 / -1;
            ">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                <h3 style="margin-bottom: 0.5rem;">검색 결과가 없습니다</h3>
                <p>다른 키워드로 검색해보세요</p>
            </div>
        `;
        $('#recommendedGrid').append(noResultsHtml);
    }
}

// 검색 결과 없음 숨기기
function hideNoResults() {
    $('.no-results').remove();
}

// 필터 기능 초기화
function initFilters() {
    $('.filter-tab').on('click', function() {
        const $this = $(this);
        const filter = $this.data('filter');
        
        // 활성 상태 변경
        $('.filter-tab').removeClass('active');
        $this.addClass('active');
        
        // 필터 적용
        applyFilter(filter);
    });
}

// 필터 적용
function applyFilter(filter) {
    const $cards = $('.community-card');
    let visibleCount = 0;
    
    if (filter === 'all') {
        $cards.show();
        visibleCount = $cards.length;
    } else {
        $cards.each(function() {
            const $card = $(this);
            const category = $card.data('category');
            
            if (category === filter) {
                $card.show();
                visibleCount++;
            } else {
                $card.hide();
            }
        });
    }
    
    if (visibleCount === 0) {
        showNoResults();
    } else {
        hideNoResults();
    }
    
    const filterName = getFilterName(filter);
    showToast(`${filterName} 필터가 적용되었습니다.`, 'info');
}

// 필터 이름 반환
function getFilterName(filter) {
    const filterNames = {
        'all': '전체',
        'domestic': '국내여행',
        'international': '해외여행',
        'food': '맛집탐방',
        'culture': '문화체험',
        'nature': '자연여행'
    };
    return filterNames[filter] || '전체';
}

// 정렬 기능 초기화
function initSorting() {
    $('.sort-btn').on('click', function() {
        const $this = $(this);
        const sortType = $this.data('sort');
        
        // 활성 상태 변경
        $('.sort-btn').removeClass('active');
        $this.addClass('active');
        
        // 정렬 적용
        applySorting(sortType);
    });
}

// 정렬 적용
function applySorting(sortType) {
    const $container = $('#recommendedGrid');
    const $cards = $container.find('.community-card').detach();
    
    let sortedCards;
    
    switch (sortType) {
        case 'latest':
            // 최신순 (날짜 기준)
            sortedCards = $cards.sort(function(a, b) {
                const dateA = new Date($(a).data('date'));
                const dateB = new Date($(b).data('date'));
                return dateB - dateA;
            });
            break;
            
        case 'popular':
            // 인기순 (참여자 수 기준)
            sortedCards = $cards.sort(function(a, b) {
                const membersA = parseInt($(a).find('.members').text().match(/\d+/)[0]) || 0;
                const membersB = parseInt($(b).find('.members').text().match(/\d+/)[0]) || 0;
                return membersB - membersA;
            });
            break;
            
        case 'deadline':
            // 마감임박순 (여행 시작일 기준)
            sortedCards = $cards.sort(function(a, b) {
                const dateA = new Date($(a).find('.date').text().split('~')[0]);
                const dateB = new Date($(b).find('.date').text().split('~')[0]);
                return dateA - dateB;
            });
            break;
            
        default:
            sortedCards = $cards;
    }
    
    // 정렬된 순서로 다시 배치
    $container.append(sortedCards);
    
    const sortName = getSortName(sortType);
    showToast(`${sortName}로 정렬되었습니다.`, 'info');
}

// 정렬 이름 반환
function getSortName(sortType) {
    const sortNames = {
        'latest': '최신순',
        'popular': '인기순',
        'deadline': '마감임박순'
    };
    return sortNames[sortType] || '최신순';
}

// 커뮤니티 카드 이벤트 초기화
function initCommunityCards() {
    // 카드 클릭 시 상세 정보 모달
    $(document).on('click', '.community-card', function(e) {
        // 참여하기 버튼 클릭 시에는 모달 열지 않음
        if ($(e.target).hasClass('join-btn')) {
            return;
        }
        
        const title = $(this).find('.card-title').text();
        const category = $(this).find('.card-category').text();
        const description = $(this).find('.card-description').text();
        const location = $(this).find('.location').text();
        const date = $(this).find('.date').text();
        const members = $(this).find('.members').text();
        const age = $(this).find('.age').text();
        const gender = $(this).find('.gender').text();
        const price = $(this).find('.price').text();
        
        showCommunityDetailModal({
            title,
            category,
            description,
            location,
            date,
            members,
            age,
            gender,
            price
        });
    });
    
    // 참여하기 버튼 클릭
    $(document).on('click', '.join-btn', function(e) {
        e.stopPropagation();
        
        const $card = $(this).closest('.community-card');
        const title = $card.find('.card-title').text();
        
        handleJoinCommunity(title);
    });
}

// 커뮤니티 상세 모달 표시
function showCommunityDetailModal(data) {
    $('#modalTitle').text(data.title);
    
    const modalContent = `
        <div class="community-detail-content">
            <div class="detail-category">
                <span class="category-badge">${data.category}</span>
            </div>
            
            <div class="detail-info">
                <div class="info-row">
                    <strong>여행 일정:</strong> ${data.date}
                </div>
                <div class="info-row">
                    <strong>여행 장소:</strong> ${data.location}
                </div>
                <div class="info-row">
                    <strong>참여 인원:</strong> ${data.members}
                </div>
                <div class="info-row">
                    <strong>연령대:</strong> ${data.age}
                </div>
                <div class="info-row">
                    <strong>성별:</strong> ${data.gender}
                </div>
                <div class="info-row">
                    <strong>참가비:</strong> ${data.price}
                </div>
            </div>
            
            <div class="detail-description">
                <h4>여행 소개</h4>
                <p>${data.description}</p>
            </div>
            
            <div class="detail-features">
                <h4>포함 사항</h4>
                <ul>
                    <li>✅ 전문 가이드 동행</li>
                    <li>✅ 숙박 및 식사 제공</li>
                    <li>✅ 교통편 제공</li>
                    <li>✅ 여행자 보험 가입</li>
                    <li>✅ 24시간 응급 지원</li>
                </ul>
            </div>
        </div>
        
        <style>
            .community-detail-content .category-badge {
                background: #e3f2fd;
                color: #1976d2;
                padding: 0.5rem 1rem;
                border-radius: 1rem;
                font-size: 0.875rem;
                font-weight: 500;
            }
            
            .detail-info {
                margin: 1.5rem 0;
            }
            
            .info-row {
                margin-bottom: 0.75rem;
                font-size: 0.875rem;
            }
            
            .info-row strong {
                display: inline-block;
                width: 6rem;
                color: #495057;
            }
            
            .detail-description,
            .detail-features {
                margin: 1.5rem 0;
            }
            
            .detail-description h4,
            .detail-features h4 {
                margin-bottom: 0.75rem;
                color: #212529;
                font-size: 1rem;
            }
            
            .detail-features ul {
                list-style: none;
                padding: 0;
            }
            
            .detail-features li {
                margin-bottom: 0.5rem;
                font-size: 0.875rem;
                color: #495057;
            }
        </style>
    `;
    
    $('#modalBody').html(modalContent);
    $('#communityDetailModal').fadeIn(300);
}

// 모달 닫기
function closeModal() {
    $('.modal').fadeOut(300);
}

// 커뮤니티 참여 처리
function handleJoinCommunity(title) {
    // 실제로는 서버 API 호출
    showToast(`"${title}" 여행 참여가 신청되었습니다!`, 'success');
    
    // 참여 신청 후 처리 (예: 버튼 상태 변경)
    setTimeout(() => {
        showToast('참여 승인을 기다리고 있습니다.', 'info');
    }, 2000);
}

// 더보기 기능 초기화
function initLoadMore() {
    $('.load-more-btn').on('click', function() {
        const $btn = $(this);
        const originalText = $btn.text();
        
        // 로딩 상태
        $btn.text('로딩 중...').prop('disabled', true);
        
        // 실제로는 서버에서 추가 데이터 로드
        setTimeout(() => {
            loadMoreCommunities();
            $btn.text(originalText).prop('disabled', false);
        }, 1000);
    });
}

// 추가 커뮤니티 로드
function loadMoreCommunities() {
    // 예시 데이터 - 실제로는 서버 API 호출
    const newCommunities = [
        {
            category: 'domestic',
            title: '강릉 바다 힐링 여행',
            location: '강원도 강릉',
            date: '2024.12.20~2024.12.22',
            members: '5/10명',
            age: '30~50대',
            gender: '성별무관',
            price: '320,000원',
            description: '동해바다의 아름다운 풍경과 함께하는 힐링 여행입니다.',
            image: 'https://via.placeholder.com/300x200/20c997/ffffff?text=강릉'
        },
        {
            category: 'international',
            title: '베트남 다낭 휴양',
            location: '베트남 다낭',
            date: '2025.03.01~2025.03.05',
            members: '3/12명',
            age: '20~40대',
            gender: '성별무관',
            price: '750,000원',
            description: '베트남 다낭의 아름다운 해변에서 휴양을 즐기는 여행입니다.',
            image: 'https://via.placeholder.com/300x200/fd7e14/ffffff?text=다낭'
        }
    ];
    
    newCommunities.forEach(community => {
        const cardHtml = createCommunityCardHtml(community);
        $('#recommendedGrid').append(cardHtml);
    });
    
    showToast(`${newCommunities.length}개의 새로운 여행이 추가되었습니다.`, 'success');
}

// 커뮤니티 카드 HTML 생성
function createCommunityCardHtml(community) {
    return `
        <div class="community-card" data-category="${community.category}" data-date="2024-11-25">
            <div class="card-image">
                <img src="${community.image}" alt="${community.title}">
            </div>
            <div class="card-content">
                <div class="card-category">${getCategoryName(community.category)}</div>
                <h3 class="card-title">${community.title}</h3>
                <div class="card-meta">
                    <span class="location">📍 ${community.location}</span>
                    <span class="date">${community.date}</span>
                </div>
                <div class="card-stats">
                    <span class="members">👥 ${community.members}</span>
                    <span class="age">👤 ${community.age}</span>
                    <span class="gender">👫 ${community.gender}</span>
                </div>
                <div class="card-description">
                    ${community.description}
                </div>
                <div class="card-footer">
                    <span class="price">💰 ${community.price}</span>
                    <button class="join-btn">참여하기</button>
                </div>
            </div>
        </div>
    `;
}

// 카테고리 이름 반환
function getCategoryName(category) {
    const categoryNames = {
        'domestic': '국내여행',
        'international': '해외여행',
        'food': '맛집탐방',
        'culture': '문화체험',
        'nature': '자연여행'
    };
    return categoryNames[category] || '기타';
}

// 모달 초기화
function initModals() {
    // 모달 닫기 (X 버튼)
    $('.modal-close').on('click', function() {
        closeModal();
    });
    
    // 모달 외부 클릭 시 닫기
    $('.modal').on('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    // ESC 키로 모달 닫기
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    // 모달 내 참여하기 버튼
    $('#joinModalBtn').on('click', function() {
        const title = $('#modalTitle').text();
        handleJoinCommunity(title);
        closeModal();
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

// 페이지 로딩 완료 후 애니메이션
$(window).on('load', function() {
    // 카드들을 순차적으로 나타나게 하는 애니메이션
    $('.community-card').each(function(index) {
        $(this).css({
            opacity: 0,
            transform: 'translateY(2rem)'
        });
        
        setTimeout(() => {
            $(this).animate({
                opacity: 1,
                transform: 'translateY(0)'
            }, 300);
        }, index * 100);
    });
});

// 스크롤 이벤트로 추가 애니메이션
function initScrollAnimations() {
    $(window).on('scroll', function() {
        const scrollTop = $(window).scrollTop();
        const windowHeight = $(window).height();
        
        $('.community-card').each(function() {
            const $this = $(this);
            const elementTop = $this.offset().top;
            
            if (scrollTop + windowHeight > elementTop + 100) {
                $this.addClass('animate-in');
            }
        });
    });
}

// 검색 자동완성 기능
function initSearchAutocomplete() {
    const suggestions = [
        '제주도', '부산', '서울', '강릉', '경주', '전주',
        '일본', '태국', '베트남', '유럽', '중국', '대만',
        '맛집', '카페', '온천', '해변', '산', '문화재',
        '트레킹', '힐링', '쇼핑', '야경', '축제', '체험'
    ];
    
    const $searchInput = $('.search-input');
    let $autocompleteList = null;
    
    $searchInput.on('input', function() {
        const value = $(this).val().toLowerCase();
        
        if (value.length < 1) {
            hideAutocomplete();
            return;
        }
        
        const matches = suggestions.filter(item => 
            item.toLowerCase().includes(value)
        ).slice(0, 5);
        
        if (matches.length > 0) {
            showAutocomplete(matches);
        } else {
            hideAutocomplete();
        }
    });
    
    function showAutocomplete(matches) {
        hideAutocomplete();
        
        $autocompleteList = $('<div class="autocomplete-list"></div>');
        $autocompleteList.css({
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #dee2e6',
            borderTop: 'none',
            borderRadius: '0 0 0.5rem 0.5rem',
            boxShadow: '0 0.25rem 0.5rem rgba(0,0,0,0.1)',
            zIndex: 1000,
            maxHeight: '12rem',
            overflowY: 'auto'
        });
        
        matches.forEach(match => {
            const $item = $('<div class="autocomplete-item"></div>')
                .text(match)
                .css({
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f1f3f4',
                    fontSize: '0.875rem'
                })
                .hover(
                    function() { $(this).css('background', '#f8f9fa'); },
                    function() { $(this).css('background', 'white'); }
                )
                .on('click', function() {
                    $searchInput.val(match);
                    hideAutocomplete();
                    performSearch();
                });
            
            $autocompleteList.append($item);
        });
        
        $('.search-bar').css('position', 'relative').append($autocompleteList);
    }
    
    function hideAutocomplete() {
        if ($autocompleteList) {
            $autocompleteList.remove();
            $autocompleteList = null;
        }
    }
    
    // 외부 클릭 시 자동완성 숨기기
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.search-bar').length) {
            hideAutocomplete();
        }
    });
}

// 즐겨찾기 기능
function initWishlist() {
    // 로컬 스토리지에서 즐겨찾기 목록 로드
    let wishlist = JSON.parse(localStorage.getItem('tourWishlist') || '[]');
    
    // 각 카드에 즐겨찾기 버튼 추가
    $('.community-card').each(function() {
        const $card = $(this);
        const title = $card.find('.card-title').text();
        const isWished = wishlist.includes(title);
        
        const $wishBtn = $('<button class="wish-btn"></button>')
            .html(isWished ? '❤️' : '🤍')
            .css({
                position: 'absolute',
                top: '0.75rem',
                left: '0.75rem',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '2.5rem',
                height: '2.5rem',
                fontSize: '1.25rem',
                cursor: 'pointer',
                boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
            })
            .hover(
                function() { $(this).css('transform', 'scale(1.1)'); },
                function() { $(this).css('transform', 'scale(1)'); }
            )
            .on('click', function(e) {
                e.stopPropagation();
                toggleWishlist(title, $wishBtn);
            });
        
        $card.find('.card-image').css('position', 'relative').append($wishBtn);
    });
    
    function toggleWishlist(title, $btn) {
        let wishlist = JSON.parse(localStorage.getItem('tourWishlist') || '[]');
        
        if (wishlist.includes(title)) {
            // 즐겨찾기에서 제거
            wishlist = wishlist.filter(item => item !== title);
            $btn.html('🤍');
            showToast('즐겨찾기에서 제거되었습니다.', 'info');
        } else {
            // 즐겨찾기에 추가
            wishlist.push(title);
            $btn.html('❤️');
            showToast('즐겨찾기에 추가되었습니다.', 'success');
        }
        
        localStorage.setItem('tourWishlist', JSON.stringify(wishlist));
    }
}

// 최근 본 여행 기능
function initRecentViews() {
    $(document).on('click', '.community-card', function() {
        const title = $(this).find('.card-title').text();
        const image = $(this).find('.card-image img').attr('src');
        const category = $(this).find('.card-category').text();
        
        let recentViews = JSON.parse(localStorage.getItem('recentTourViews') || '[]');
        
        // 중복 제거
        recentViews = recentViews.filter(item => item.title !== title);
        
        // 새 항목을 맨 앞에 추가
        recentViews.unshift({
            title,
            image,
            category,
            viewedAt: new Date().toISOString()
        });
        
        // 최대 10개까지만 보관
        recentViews = recentViews.slice(0, 10);
        
        localStorage.setItem('recentTourViews', JSON.stringify(recentViews));
    });
}

// 필터 개수 표시
function updateFilterCounts() {
    $('.filter-tab').each(function() {
        const $tab = $(this);
        const filter = $tab.data('filter');
        let count = 0;
        
        if (filter === 'all') {
            count = $('.community-card').length;
        } else {
            count = $(`.community-card[data-category="${filter}"]`).length;
        }
        
        const text = $tab.text().split('(')[0]; // 기존 개수 제거
        $tab.text(`${text} (${count})`);
    });
}

// 가격 필터 기능
function initPriceFilter() {
    const priceRanges = [
        { min: 0, max: 300000, label: '30만원 이하' },
        { min: 300000, max: 500000, label: '30-50만원' },
        { min: 500000, max: 1000000, label: '50-100만원' },
        { min: 1000000, max: Infinity, label: '100만원 이상' }
    ];
    
    // 가격 필터 UI 추가
    const priceFilterHtml = `
        <div class="price-filter" style="margin-top: 1rem;">
            <h4 style="margin-bottom: 0.5rem; font-size: 0.875rem; color: #6c757d;">가격대</h4>
            <div class="price-filter-tabs" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="price-tab active" data-min="0" data-max="Infinity">전체</button>
                ${priceRanges.map(range => 
                    `<button class="price-tab" data-min="${range.min}" data-max="${range.max}">${range.label}</button>`
                ).join('')}
            </div>
        </div>
    `;
    
    $('.filter-tabs').after(priceFilterHtml);
    
    // 가격 탭 스타일
    $('.price-tab').css({
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        color: '#6c757d',
        cursor: 'pointer',
        fontSize: '0.75rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '1rem',
        transition: 'all 0.2s ease'
    });
    
    // 가격 필터 이벤트
    $('.price-tab').on('click', function() {
        const $this = $(this);
        const minPrice = parseInt($this.data('min'));
        const maxPrice = $this.data('max') === 'Infinity' ? Infinity : parseInt($this.data('max'));
        
        $('.price-tab').removeClass('active').css({
            background: '#f8f9fa',
            color: '#6c757d'
        });
        
        $this.addClass('active').css({
            background: '#007bff',
            color: 'white'
        });
        
        applyPriceFilter(minPrice, maxPrice);
    });
}

// 가격 필터 적용
function applyPriceFilter(minPrice, maxPrice) {
    let visibleCount = 0;
    
    $('.community-card').each(function() {
        const $card = $(this);
        const priceText = $card.find('.price').text();
        const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
        
        if (price >= minPrice && price <= maxPrice) {
            $card.show();
            visibleCount++;
        } else {
            $card.hide();
        }
    });
    
    if (visibleCount === 0) {
        showNoResults();
    } else {
        hideNoResults();
    }
    
    showToast(`${visibleCount}개의 여행이 조건에 맞습니다.`, 'info');
}

// 초기화 함수에 새로운 기능들 추가
$(document).ready(function() {
    // 기존 초기화 함수들
    initSearch();
    initFilters();
    initSorting();
    initCommunityCards();
    initLoadMore();
    initModals();
    
    // 새로운 기능들
    initScrollAnimations();
    initSearchAutocomplete();
    initWishlist();
    initRecentViews();
    initPriceFilter();
    updateFilterCounts();
    
    // 페이지 로드 완료 시 환영 메시지
    showToast('새로운 여행을 찾아보세요! 🌟', 'info');
});