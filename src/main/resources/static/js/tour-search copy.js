/**
 * 투어 검색 시스템 v2.0 - 깔끔하게 정리된 완전판
 * 메인 3개 카테고리 + 실시간 필터 추적 + 관심사 기반 자동 설정 + C01 추천코스
 */

let tourSearchManager = {
    // 전역 상태
    userInterests: null,
    filterOptions: null,
    currentFilters: {},
    currentPage: 1,
    totalCount: 0,
    sideMenuRegionSelector: null,
    sideMenuThemeSelector: null,
    isSearching: false,
    
    // ========================================
    // 1. 초기화 및 기본 설정
    // ========================================
    
    async init() {
        console.log('🚀 투어 검색 매니저 v2.0 초기화 시작');
        
        try {
            await this.loadFilterOptions();
            await this.loadUserInterests();
            
            this.initSideMenuSelectors();
            this.setupEventListeners();
            
            this.applyUserInterests();
            this.showEmptyRecommendedSection();
            
            // 초기 관심사 태그 표시
            setTimeout(() => {
                this.updateInterestTags();
            }, 500);
            
            console.log('✅ 투어 검색 매니저 v2.0 초기화 완료');
        } catch (error) {
            console.error('❌ 초기화 실패:', error);
            window.tourUtils?.showToast('시스템 초기화에 실패했습니다', 'error');
        }
    },

    async loadFilterOptions() {
        try {
            const response = await fetch('/api/tours/filter-options');
            const result = await response.json();
            
            if (result.success) {
                this.filterOptions = result.data;
                this.populateStaticFilters();
            }
        } catch (error) {
            console.error('필터 옵션 로드 실패:', error);
        }
    },

    async loadUserInterests() {
        try {
            const response = await fetch('/api/tours/user-interests');
            const result = await response.json();
            
            if (result.success) {
                this.userInterests = result.data;
                console.log('사용자 관심사 로드됨:', this.userInterests);
                this.showLoginStatus(true);
            } else {
                this.userInterests = null;
                this.showLoginStatus(false);
            }
        } catch (error) {
            console.error('사용자 관심사 로드 실패:', error);
            this.userInterests = null;
            this.showLoginStatus(false);
        }
    },

    populateStaticFilters() {
        const filters = [
            { id: 'activityFilter', data: this.filterOptions.activities },
            { id: 'placeFilter', data: this.filterOptions.places },
            { id: 'needsFilter', data: this.filterOptions.needs }
        ];

        filters.forEach(({ id, data }) => {
            const element = document.getElementById(id);
            if (element && data) {
                data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item;
                    option.textContent = item;
                    element.appendChild(option);
                });
            }
        });
    },

    // ========================================
    // 2. 사이드 메뉴 선택기 초기화
    // ========================================
    
    initSideMenuSelectors() {
        this.sideMenuRegionSelector = new SideMenuRegionSelector();
        this.sideMenuThemeSelector = new SideMenuThemeSelector();
        
        if (this.sideMenuRegionSelector) {
            this.sideMenuRegionSelector.onSelectionChange = () => {
                this.updateCurrentFilters();
                this.updateInterestTags();
            };
        }
        
        if (this.sideMenuThemeSelector) {
            this.sideMenuThemeSelector.onSelectionChange = () => {
                this.updateCurrentFilters();
                this.updateInterestTags();
            };
        }
    },

    // ========================================
    // 3. 이벤트 리스너 설정
    // ========================================
    
    setupEventListeners() {
        // 검색 및 초기화 버튼
        const searchBtn = document.getElementById('doSearchBtn');
        const clearBtn = document.getElementById('clearFiltersBtn');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }

        // 필터 변경 감지
        this.setupFilterChangeDetection();

        // 엔터키 검색
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.isSearching) {
                this.performSearch();
            }
        });
    },

    setupFilterChangeDetection() {
        const filters = ['activityFilter', 'placeFilter', 'needsFilter', 'curationCount'];
        
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateFilterVisualState(filterId, element.value);
                    this.updateCurrentFilters();
                    this.updateInterestTags();
                });
            }
        });
    },

    // ========================================
    // 4. 관심사 및 필터 관리
    // ========================================
    
    applyUserInterests() {
        if (!this.userInterests) {
            this.showLoginPrompt();
            return;
        }

        console.log('🎯 관심사 자동 적용 시작:', this.userInterests);

        // 지역 적용
        if (this.userInterests.regions?.length > 0 && this.sideMenuRegionSelector) {
            const firstRegion = this.userInterests.regions[0];
            this.sideMenuRegionSelector.applyUserInterestRegion(firstRegion);
        }

        // 테마 적용
        if (this.userInterests.themes && this.sideMenuThemeSelector) {
            const firstThemeCode = Object.keys(this.userInterests.themes)[0];
            if (firstThemeCode && ['A01', 'A02', 'A03'].includes(firstThemeCode)) {
                this.sideMenuThemeSelector.applyUserInterestTheme(firstThemeCode);
            }
        }

        // 활동, 장소, 편의시설 적용
        this.applySelectFilter('activityFilter', this.userInterests.activities);
        this.applySelectFilter('placeFilter', this.userInterests.places);
        this.applySelectFilter('needsFilter', this.userInterests.needs);

        // 관심사 태그 표시
        this.displayInterestTags();
        
        setTimeout(() => {
            this.updateCurrentFilters();
        }, 200);
    },

    applySelectFilter(filterId, items) {
        if (!items || items.length === 0) return;
        
        const element = document.getElementById(filterId);
        if (element) {
            const firstItem = items[0];
            const value = firstItem.textContent || firstItem;
            
            if (filterId === 'needsFilter' && value === "해당없음") return;
            
            element.value = value;
            this.updateFilterVisualState(filterId, value);
        }
    },

    updateCurrentFilters() {
        const activityFilter = document.getElementById('activityFilter');
        const placeFilter = document.getElementById('placeFilter');
        const needsFilter = document.getElementById('needsFilter');
        const curationCount = document.getElementById('curationCount');

        // 지역 정보
        const regionData = this.sideMenuRegionSelector?.selectedArea ? {
            areaCode: this.sideMenuRegionSelector.selectedArea.code,
            sigunguCode: this.sideMenuRegionSelector.selectedSigungu?.code || ''
        } : { areaCode: '', sigunguCode: '' };

        // 테마 정보
        const themeData = this.sideMenuThemeSelector?.getSelectedThemeForFilter() || {
            cat1: '', cat2: '', cat3: ''
        };

        this.currentFilters = {
            ...regionData,
            ...themeData,
            activity: activityFilter?.value || '',
            place: placeFilter?.value || '',
            needs: needsFilter?.value || '',
            numOfRows: curationCount?.value || '6'
        };
    },

    // ========================================
    // 5. 관심사 태그 실시간 업데이트
    // ========================================
    
    updateInterestTags() {
        const tagsContainer = document.getElementById('interestTags');
        if (!tagsContainer) return;

        const currentFilters = this.getCurrentFilterValues();
        
        if (Object.keys(currentFilters).length === 0) {
            tagsContainer.innerHTML = `
                <div style="text-align: center; color: #666; font-size: 14px; padding: 20px;">
                    <div class="placeholder-icon">🎯</div>
                    <strong>필터를 선택하면 여기에 표시됩니다</strong>
                    <br>
                    <small>지역, 테마, 활동, 장소, 편의시설을 선택해보세요</small>
                </div>
            `;
            return;
        }

        let tagHtml = '';
        const filterTypes = [
            { key: 'region', icon: '📍' },
            { key: 'theme', icon: '🎨' },
            { key: 'activity', icon: '🎯' },
            { key: 'place', icon: '🏛️' },
            { key: 'needs', icon: '🔧' },
            { key: 'count', icon: '📊' }
        ];

        filterTypes.forEach(({ key, icon }) => {
            if (currentFilters[key]) {
                const displayValue = key === 'count' ? `${currentFilters[key]}개 방문지` : currentFilters[key];
                tagHtml += `
                    <span class="interest-tag current-filter" data-type="${key}">
                        ${icon} ${displayValue}
                    </span>
                `;
            }
        });

        if (tagHtml) {
            tagsContainer.innerHTML = `
                <div style="margin-bottom: 15px; text-align: center;">
                    <h3 style="color: #333; margin: 0 0 5px 0;">💡 현재 선택된 여행 조건</h3>
                    <p style="color: #666; font-size: 14px; margin: 0;">
                        아래 조건으로 맞춤 투어를 검색합니다
                        <br>
                        <small>💡 조건을 변경하고 싶으면 위의 필터를 수정해주세요</small>
                    </p>
                </div>
                <div style="text-align: center;">
                    ${tagHtml}
                </div>
            `;
        }
    },

    getCurrentFilterValues() {
        const filters = {};

        // 지역 정보
        if (this.sideMenuRegionSelector?.selectedArea) {
            const region = this.sideMenuRegionSelector.selectedArea.name;
            const sigungu = this.sideMenuRegionSelector.selectedSigungu?.name;
            filters.region = sigungu ? `${region} > ${sigungu}` : region;
        }

        // 테마 정보
        if (this.sideMenuThemeSelector?.selectedMain) {
            let themeText = this.sideMenuThemeSelector.selectedMain.name;
            if (this.sideMenuThemeSelector.selectedMiddle) {
                themeText += ` > ${this.sideMenuThemeSelector.selectedMiddle.name}`;
            }
            if (this.sideMenuThemeSelector.selectedSmall) {
                themeText += ` > ${this.sideMenuThemeSelector.selectedSmall.name}`;
            }
            filters.theme = themeText;
        }

        // 나머지 필터들
        const filterIds = [
            { id: 'activityFilter', key: 'activity' },
            { id: 'placeFilter', key: 'place' },
            { id: 'needsFilter', key: 'needs' },
            { id: 'curationCount', key: 'count' }
        ];

        filterIds.forEach(({ id, key }) => {
            const element = document.getElementById(id);
            if (element && element.value && (key !== 'needs' || element.value !== "해당없음")) {
                filters[key] = element.value;
            }
        });

        return filters;
    },

    displayInterestTags() {
        const tagsContainer = document.getElementById('interestTags');
        if (!tagsContainer) return;

        if (!this.userInterests) {
            tagsContainer.innerHTML = `
                <div class="login-prompt">
                    <div class="login-prompt-icon">👤</div>
                    <div class="login-prompt-text">
                        <strong>로그인하면 나의 관심사를 확인할 수 있습니다!</strong>
                        <small>관심사 기반으로 필터가 자동 설정됩니다</small>
                        <a href="/login" class="login-prompt-link">지금 로그인하기 →</a>
                    </div>
                </div>
            `;
            return;
        }

        let tagHtml = '';
        const icons = {
            'regions': '📍', 'themes': '🎨', 'activities': '🎯', 
            'places': '🏛️', 'needs': '🔧'
        };

        Object.entries(this.userInterests).forEach(([category, items]) => {
            if (Array.isArray(items) && items.length > 0) {
                items.forEach(item => {
                    const value = item.textContent || item;
                    const icon = icons[category] || '🏷️';
                    tagHtml += `
                        <span class="interest-tag reference" title="내 관심사: ${category}">
                            ${icon} ${value}
                        </span>
                    `;
                });
            } else if (typeof items === 'object' && items !== null) {
                Object.entries(items).forEach(([code, name]) => {
                    if (['A01', 'A02', 'A03'].includes(code)) {
                        tagHtml += `
                            <span class="interest-tag reference" title="내 관심사: 테마">
                                🎨 ${name}
                            </span>
                        `;
                    }
                });
            }
        });

        if (tagHtml) {
            tagsContainer.innerHTML = `
                <div style="margin-bottom: 15px; text-align: center;">
                    <h3 style="color: #333; margin: 0 0 5px 0;">💡 나의 관심사 (참조용)</h3>
                    <p style="color: #666; font-size: 14px; margin: 0;">
                        위의 필터가 이 관심사를 기반으로 미리 설정되어 있습니다
                        <br>
                        <small>💬 관심사 변경은 <a href="/mypage" style="color: #4CAF50; text-decoration: underline;">마이페이지</a>에서 가능합니다</small>
                    </p>
                </div>
                <div style="text-align: center;">
                    ${tagHtml}
                </div>
            `;
        }
    },

    // ========================================
    // 6. 실시간 필터 표시 패널
    // ========================================
    
    createFilterDisplayPanel() {
        const filtersContainer = document.querySelector('.search-filters');
        if (!filtersContainer) return;

        const displayPanel = document.createElement('div');
        displayPanel.id = 'currentFilterDisplay';
        displayPanel.className = 'current-filter-display';
        
        displayPanel.innerHTML = `
            <div class="display-header">
                <h3><span class="filter-icon">🎯</span> 현재 검색 조건</h3>
                <div class="filter-source" id="filterSource">관심사 기반 설정</div>
            </div>
            <div class="filter-tags-container" id="filterTagsContainer">
                <div class="no-filters">필터를 설정해주세요</div>
            </div>
        `;

        filtersContainer.insertAdjacentElement('afterend', displayPanel);
    },

    updateFilterDisplay() {
        const container = document.getElementById('filterTagsContainer');
        const sourceElement = document.getElementById('filterSource');
        if (!container) return;

        const activeFilters = this.collectActiveFilters();
        
        if (activeFilters.length === 0) {
            container.innerHTML = '<div class="no-filters">필터를 설정해주세요</div>';
            sourceElement.textContent = '기본 설정';
            sourceElement.className = 'filter-source';
            return;
        }

        const userInterestCount = activeFilters.filter(filter => filter.isUserInterest).length;
        const totalCount = activeFilters.length;
        const hasModified = userInterestCount < totalCount;

        // 소스 표시 업데이트
        if (hasModified) {
            sourceElement.textContent = `관심사 ${userInterestCount}개 + 변경 ${totalCount - userInterestCount}개`;
            sourceElement.className = 'filter-source modified';
        } else {
            sourceElement.textContent = `관심사 기반 설정 (${userInterestCount}개)`;
            sourceElement.className = 'filter-source interest-based';
        }

        // 필터 태그 HTML 생성
        let html = '';
        activeFilters.forEach((filter, index) => {
            const tagClass = filter.isUserInterest ? 'filter-tag interest-based' : 'filter-tag user-modified';
            const indicator = filter.isUserInterest ? '👤' : '✏️';
            
            html += `
                <div class="${tagClass}" 
                     data-type="${filter.type}" 
                     style="animation-delay: ${index * 100}ms"
                     title="${filter.isUserInterest ? '관심사 기반 설정' : '사용자가 변경한 설정'}">
                    <span class="filter-label">${filter.label}</span>
                    <span class="filter-value">${filter.value}</span>
                    <span class="filter-indicator" title="${filter.isUserInterest ? '관심사' : '변경됨'}">${indicator}</span>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    collectActiveFilters() {
        const activeFilters = [];
        
        // 지역 필터
        if (this.sideMenuRegionSelector?.selectedArea) {
            const region = this.sideMenuRegionSelector.selectedArea.name;
            const sigungu = this.sideMenuRegionSelector.selectedSigungu?.name;
            const regionText = sigungu ? `${region} > ${sigungu}` : region;
            
            activeFilters.push({
                type: 'region',
                label: '📍 지역',
                value: regionText,
                isUserInterest: this.isUserInterest('region', region),
                priority: 1
            });
        }

        // 테마 필터
        if (this.sideMenuThemeSelector?.selectedMain) {
            let themeText = this.sideMenuThemeSelector.selectedMain.name;
            const themeCode = this.sideMenuThemeSelector.selectedMain.code;
            
            if (this.sideMenuThemeSelector.selectedMiddle) {
                themeText += ` > ${this.sideMenuThemeSelector.selectedMiddle.name}`;
            }
            if (this.sideMenuThemeSelector.selectedSmall) {
                themeText += ` > ${this.sideMenuThemeSelector.selectedSmall.name}`;
            }
            
            activeFilters.push({
                type: 'theme',
                label: '🎨 테마',
                value: themeText,
                isUserInterest: this.isUserInterest('theme', themeCode),
                priority: 2
            });
        }

        // 나머지 필터들
        const otherFilters = [
            { id: 'activityFilter', type: 'activity', label: '🎯 활동', priority: 3 },
            { id: 'placeFilter', type: 'place', label: '🏛️ 장소', priority: 4 },
            { id: 'needsFilter', type: 'needs', label: '🔧 편의시설', priority: 5 },
            { id: 'curationCount', type: 'count', label: '📊 방문지 수', priority: 6 }
        ];

        otherFilters.forEach(({ id, type, label, priority }) => {
            const element = document.getElementById(id);
            if (element && element.value && (type !== 'needs' || element.value !== "해당없음")) {
                const value = type === 'count' ? `${element.value}개` : element.value;
                activeFilters.push({
                    type,
                    label,
                    value,
                    isUserInterest: type === 'count' ? false : this.isUserInterest(type, element.value),
                    priority
                });
            }
        });

        return activeFilters.sort((a, b) => a.priority - b.priority);
    },

    isUserInterest(type, value) {
        if (!this.userInterests) return false;

        switch (type) {
            case 'region':
                return this.userInterests.regions?.some(r => {
                    const regionName = r.textContent || r;
                    return value.includes(regionName) || regionName.includes(value);
                }) || false;
            
            case 'theme':
                return this.userInterests.themes && 
                       Object.keys(this.userInterests.themes).includes(value);
                       
            case 'activity':
                return this.userInterests.activities?.some(a => {
                    const activityName = a.textContent || a;
                    return activityName === value;
                }) || false;
                
            case 'place':
                return this.userInterests.places?.some(p => {
                    const placeName = p.textContent || p;
                    return placeName === value;
                }) || false;
                
            case 'needs':
                return this.userInterests.needs?.some(n => {
                    const needName = n.textContent || n;
                    return (needName === value || 
                           (needName === '접근성' && value.includes('휠체어')) ||
                           (needName === '접근성' && value.includes('접근'))) && 
                           value !== "해당없음";
                }) || false;
                
            default:
                return false;
        }
    },

    updateFilterVisualState(filterId, value) {
        const element = document.getElementById(filterId);
        if (!element) return;

        element.classList.remove('user-interest-filter', 'user-modified-filter');

        if (value) {
            const isUserInterest = this.isUserInterest(this.getFilterType(filterId), value);
            
            if (isUserInterest) {
                element.classList.add('user-interest-filter');
            } else {
                element.classList.add('user-modified-filter');
            }
        }
    },

    getFilterType(filterId) {
        const mapping = {
            'activityFilter': 'activity',
            'placeFilter': 'place',
            'needsFilter': 'needs',
            'curationCount': 'count'
        };
        return mapping[filterId] || filterId;
    },

    // ========================================
    // 7. 검색 및 결과 표시
    // ========================================
    
    async performSearch() {
        if (this.isSearching) return;

        this.isSearching = true;
        this.updateCurrentFilters();
        this.showLoading();

        try {
            const searchParams = new URLSearchParams();
            
            Object.entries(this.currentFilters).forEach(([key, value]) => {
                if (value && value.toString().trim() !== '') {
                    searchParams.append(key, value);
                }
            });

            searchParams.append('pageNo', this.currentPage.toString());

            const response = await fetch(`/api/tours/search?${searchParams.toString()}`);
            const result = await response.json();

            if (result.success) {
                this.updateRecommendedSection(result.data, '맞춤 검색 결과');
                await this.loadRecommendedCourses(); // C01 추천코스 로드
                
                this.totalCount = result.totalCount || 0;
                this.updatePagination();
                this.updateResultCount();
                
                const filterSummary = this.getFilterSummary();
                window.tourUtils?.showToast(`${filterSummary} 맞춤 투어 검색 완료!`, 'success');
            } else {
                this.showNoResults(result.message);
                this.showCoursePlaceholder('검색 조건을 확인해주세요');
                window.tourUtils?.showToast('검색 결과가 없습니다', 'warning');
            }
        } catch (error) {
            console.error('💥 검색 실패:', error);
            this.showNoResults('검색 중 오류가 발생했습니다.');
            this.showCoursePlaceholder('검색에 실패했습니다');
            window.tourUtils?.showToast('검색에 실패했습니다', 'error');
        } finally {
            this.hideLoading();
            this.isSearching = false;
        }
    },

    updateRecommendedSection(tours, source = '맞춤 검색 결과') {
        const recommendedContainer = document.getElementById('recommendedTours');
        if (!recommendedContainer) return;

        if (!tours || tours.length === 0) {
            recommendedContainer.innerHTML = `
                <div class="recommendation-placeholder">
                    <div class="placeholder-icon">😅</div>
                    <h3>검색 조건에 맞는 투어가 없습니다</h3>
                    <p>필터를 조정해서 다시 검색해보세요</p>
                    <div class="current-filters-summary">
                        현재 검색 조건: ${this.getFilterSummary()}
                    </div>
                </div>
            `;
            return;
        }

        const displayTours = tours.slice(0, 6);
        recommendedContainer.innerHTML = '';

        // 섹션 헤더 업데이트
        const sectionHeader = document.querySelector('#recommendedTours').parentElement.querySelector('.section-header');
        if (sectionHeader) {
            const titleElement = sectionHeader.querySelector('.section-title');
            const subtitleElement = sectionHeader.querySelector('.section-subtitle');
            
            if (titleElement) {
                titleElement.innerHTML = `🎯 회원님을 위한 맞춤 투어 <span class="tour-count">(${displayTours.length}개)</span>`;
            }
            
            if (subtitleElement) {
                subtitleElement.textContent = `${source} • ${this.getFilterSummary()}`;
            }
        }

        displayTours.forEach((tour, index) => {
            const tourCard = this.createTourCard(tour);
            tourCard.classList.add('recommended-tour-card');
            tourCard.style.animationDelay = `${index * 100}ms`;
            tourCard.classList.add('fade-in-up');
            
            recommendedContainer.appendChild(tourCard);
        });

        // 맞춤 투어 배지 추가
        recommendedContainer.querySelectorAll('.recommended-tour-card').forEach(card => {
            const tourInfo = card.querySelector('.tour-info');
            if (tourInfo) {
                const recommendedBadge = document.createElement('div');
                recommendedBadge.className = 'recommended-badge';
                recommendedBadge.innerHTML = '🎯 맞춤 추천';
                tourInfo.insertBefore(recommendedBadge, tourInfo.firstChild);
            }
        });
    },

    getFilterSummary() {
        const summaryParts = [];
        
        if (this.sideMenuRegionSelector?.selectedArea) {
            const region = this.sideMenuRegionSelector.selectedArea.name;
            const sigungu = this.sideMenuRegionSelector.selectedSigungu?.name;
            summaryParts.push(sigungu ? `${region} ${sigungu}` : region);
        }

        if (this.sideMenuThemeSelector?.selectedMain) {
            summaryParts.push(this.sideMenuThemeSelector.selectedMain.name);
        }

        const activityFilter = document.getElementById('activityFilter');
        if (activityFilter && activityFilter.value) {
            summaryParts.push(activityFilter.value);
        }

        const placeFilter = document.getElementById('placeFilter');
        if (placeFilter && placeFilter.value) {
            summaryParts.push(placeFilter.value);
        }

        return summaryParts.length > 0 ? summaryParts.join(' • ') : '기본 검색';
    },

    // ========================================
    // 8. C01 추천코스 관리
    // ========================================
    
    async loadRecommendedCourses() {
        console.log('🔍 C01 추천코스 로드 시작');
        
        const currentFilters = this.getCurrentFilterValues();
        
        if (!currentFilters.region) {
            this.showCoursePlaceholder();
            return;
        }

        const areaCode = this.getAreaCodeFromRegion(currentFilters.region);
        const sigunguCode = this.getSigunguCodeFromRegion(currentFilters.region);
        
        try {
            // 지역+테마 조합 코스 로드
            if (currentFilters.theme) {
                const themeCode = this.getThemeCodeFromTheme(currentFilters.theme);
                await this.loadCoursesByTheme(areaCode, themeCode, sigunguCode);
            }

            // 지역+활동 조합 코스 로드  
            if (currentFilters.activity) {
                await this.loadCoursesByActivity(areaCode, currentFilters.activity, sigunguCode);
            }

            // 둘 다 없으면 일반 추천코스 로드
            if (!currentFilters.theme && !currentFilters.activity) {
                await this.loadGeneralCourses(areaCode, sigunguCode);
            }

        } catch (error) {
            console.error('💥 추천코스 로드 실패:', error);
            this.showCoursePlaceholder('추천코스를 불러오는데 실패했습니다');
        }
    },

    async loadCoursesByTheme(areaCode, themeCode, sigunguCode) {
        try {
            const params = new URLSearchParams();
            params.append('areaCode', areaCode);
            params.append('themeCode', themeCode);
            if (sigunguCode) params.append('sigunguCode', sigunguCode);

            const response = await fetch(`/api/tours/courses-by-theme?${params.toString()}`);
            const result = await response.json();

            if (result.success && result.data) {
                this.displayCoursesByTheme(result.data, result.message);
            } else {
                this.showThemeCoursePlaceholder('선택하신 지역과 테마에 맞는 코스가 없습니다');
            }
        } catch (error) {
            console.error('💥 지역+테마 코스 로드 실패:', error);
            this.showThemeCoursePlaceholder('지역+테마 코스를 불러오는데 실패했습니다');
        }
    },

    async loadCoursesByActivity(areaCode, activity, sigunguCode) {
        try {
            const params = new URLSearchParams();
            params.append('areaCode', areaCode);
            params.append('activity', activity);
            if (sigunguCode) params.append('sigunguCode', sigunguCode);

            const response = await fetch(`/api/tours/courses-by-activity?${params.toString()}`);
            const result = await response.json();

            if (result.success && result.data) {
                this.displayCoursesByActivity(result.data, result.message);
            } else {
                this.showActivityCoursePlaceholder('선택하신 지역과 활동에 맞는 코스가 없습니다');
            }
        } catch (error) {
            console.error('💥 지역+활동 코스 로드 실패:', error);
            this.showActivityCoursePlaceholder('지역+활동 코스를 불러오는데 실패했습니다');
        }
    },

    async loadGeneralCourses(areaCode, sigunguCode) {
        try {
            const params = new URLSearchParams();
            params.append('areaCode', areaCode);
            if (sigunguCode) params.append('sigunguCode', sigunguCode);

            const response = await fetch(`/api/tours/recommended-courses?${params.toString()}`);
            const result = await response.json();

            if (result.success && result.data) {
                this.displayCoursesByTheme(result.data.slice(0, 5), '일반 추천코스');
                this.displayCoursesByActivity(result.data.slice(5, 10), '일반 추천코스');
            } else {
                this.showCoursePlaceholder('선택하신 지역의 추천코스가 없습니다');
            }
        } catch (error) {
            console.error('💥 일반 추천코스 로드 실패:', error);
            this.showCoursePlaceholder('추천코스를 불러오는데 실패했습니다');
        }
    },

    displayCoursesByTheme(courses, message) {
        const container = document.getElementById('themeBasedCourses');
        if (!container) return;

        if (!courses || courses.length === 0) {
            this.showThemeCoursePlaceholder();
            return;
        }

        container.innerHTML = '';
        courses.forEach((course, index) => {
            const courseCard = this.createCourseCard(course, 'theme');
            courseCard.style.animationDelay = `${index * 100}ms`;
            courseCard.classList.add('fade-in-up');
            container.appendChild(courseCard);
        });
    },

    displayCoursesByActivity(courses, message) {
        const container = document.getElementById('activityBasedCourses');
        if (!container) return;

        if (!courses || courses.length === 0) {
            this.showActivityCoursePlaceholder();
            return;
        }

        container.innerHTML = '';
        courses.forEach((course, index) => {
            const courseCard = this.createCourseCard(course, 'activity');
            courseCard.style.animationDelay = `${index * 100}ms`;
            courseCard.classList.add('fade-in-up');
            container.appendChild(courseCard);
        });
    },

    createCourseCard(course, type) {
        const card = document.createElement('div');
        card.className = `tour-card course-card ${type}-course`;
        
        const imageInfo = this.processImageForTour(course);
        const courseTypeIcon = type === 'theme' ? '🎨' : '🎯';
        const courseTypeName = type === 'theme' ? '테마코스' : '활동코스';
        
        card.innerHTML = `
            <div class="tour-image ${imageInfo.fallbackClass}" data-category="C01">
                ${imageInfo.htmlContent}
                ${imageInfo.indicator}
                <div class="course-type-badge">${courseTypeIcon} ${courseTypeName}</div>
            </div>
            <div class="tour-info">
                <span class="tour-category">추천 코스</span>
                <h3 class="tour-title">${course.cleanTitle || course.title || '코스명 없음'}</h3>
                <p class="tour-description">${course.fullAddress || course.addr1 || '주소 정보 없음'}</p>
                <div class="tour-meta">
                    <span class="tour-location">${course.areaname || ''} ${course.sigunguname || ''}</span>
                    <span class="tour-type">여행코스</span>
                </div>
                <div class="tour-actions">
                    <button class="btn-favorite" data-contentid="${course.contentid}">
                        <i class="heart-icon">♡</i>
                    </button>
                    <button class="btn-detail" data-contentid="${course.contentid}">
                        코스 상세보기
                    </button>
                </div>
            </div>
        `;

        // 이벤트 리스너 추가
        const favoriteBtn = card.querySelector('.btn-favorite');
        favoriteBtn.addEventListener('click', () => this.toggleFavorite(course.contentid));

        const detailBtn = card.querySelector('.btn-detail');
        detailBtn.addEventListener('click', () => this.openModal(course.contentid));

        return card;
    },

    showThemeCoursePlaceholder(message = '지역과 테마를 선택하면 맞춤 코스가 표시됩니다') {
        const container = document.getElementById('themeBasedCourses');
        if (!container) return;

        container.innerHTML = `
            <div class="search-placeholder">
                <div class="placeholder-icon">🎨</div>
                <h4>${message}</h4>
                <p>위의 필터에서 지역과 선호테마를 설정해주세요!</p>
            </div>
        `;
    },

    showActivityCoursePlaceholder(message = '지역과 활동을 선택하면 맞춤 코스가 표시됩니다') {
        const container = document.getElementById('activityBasedCourses');
        if (!container) return;

        container.innerHTML = `
            <div class="search-placeholder">
                <div class="placeholder-icon">🎯</div>
                <h4>${message}</h4>
                <p>위의 필터에서 지역과 선호활동을 설정해주세요!</p>
            </div>
        `;
    },

    showCoursePlaceholder(message = '추천코스를 불러오는데 실패했습니다') {
        this.showThemeCoursePlaceholder(message);
        this.showActivityCoursePlaceholder(message);
    },

    getAreaCodeFromRegion(regionText) {
        if (!regionText) return '';
        const mainRegion = regionText.split(' > ')[0];
        return this.getAreaCodeByName(mainRegion);
    },

    getSigunguCodeFromRegion(regionText) {
        if (!regionText || !regionText.includes(' > ')) return '';
        return this.sideMenuRegionSelector?.selectedSigungu?.code || '';
    },

    getThemeCodeFromTheme(themeText) {
        if (!themeText) return '';
        const mainTheme = themeText.split(' > ')[0];
        const themeMapping = {
            '자연': 'A01',
            '인문(문화/예술/역사)': 'A02',
            '레포츠': 'A03'
        };
        return themeMapping[mainTheme] || '';
    },

    getAreaCodeByName(areaName) {
        if (!areaName || !areaName.trim()) return '';
        
        const areaMap = {
            '서울': '1', '서울특별시': '1',
            '인천': '2', '인천광역시': '2',
            '대전': '3', '대전광역시': '3',
            '대구': '4', '대구광역시': '4',
            '광주': '5', '광주광역시': '5',
            '부산': '6', '부산광역시': '6',
            '울산': '7', '울산광역시': '7',
            '세종': '8', '세종특별자치시': '8',
            '경기': '31', '경기도': '31',
            '강원': '32', '강원특별자치도': '32',
            '충북': '33', '충청북도': '33',
            '충남': '34', '충청남도': '34',
            '경북': '35', '경상북도': '35',
            '경남': '36', '경상남도': '36',
            '전북': '37', '전북특별자치도': '37',
            '전남': '38', '전라남도': '38',
            '제주': '39', '제주특별자치도': '39'
        };
        
        return areaMap[areaName.trim()] || '';
    },

    // ========================================
    // 9. 투어 카드 및 이미지 처리
    // ========================================
    
    createTourCard(tour) {
        const card = document.createElement('div');
        card.className = 'tour-card';
        
        const imageInfo = this.processImageForTour(tour);
        
        card.innerHTML = `
            <div class="tour-image ${imageInfo.fallbackClass}" data-category="${tour.cat1 || ''}">
                ${imageInfo.htmlContent}
                ${imageInfo.indicator}
            </div>
            <div class="tour-info">
                <span class="tour-category">${tour.categoryName || tour.cat1 || '기타'}</span>
                <h3 class="tour-title">${tour.cleanTitle || tour.title || '제목 없음'}</h3>
                <p class="tour-description">${tour.fullAddress || tour.addr1 || '주소 정보 없음'}</p>
                <div class="tour-meta">
                    <span class="tour-location">${tour.areaname || ''} ${tour.sigunguname || ''}</span>
                    <span class="tour-type">${this.getCategoryName(tour.contenttypeid)}</span>
                </div>
                <div class="tour-actions">
                    <button class="btn-favorite" data-contentid="${tour.contentid}">
                        <i class="heart-icon">♡</i>
                    </button>
                    <button class="btn-detail" data-contentid="${tour.contentid}">
                        상세보기
                    </button>
                </div>
            </div>
        `;

        card.setAttribute('data-image-quality', imageInfo.quality);

        // 이벤트 리스너
        const favoriteBtn = card.querySelector('.btn-favorite');
        favoriteBtn.addEventListener('click', () => this.toggleFavorite(tour.contentid));

        const detailBtn = card.querySelector('.btn-detail');
        detailBtn.addEventListener('click', () => this.openModal(tour.contentid));

        return card;
    },

    processImageForTour(tour) {
        const imageUrl = tour.optimizedImage || tour.firstimage || tour.firstimage2;
        const category = tour.cat1 || '';
        const hasRealImage = tour.hasRealImage;

        // SVG 데이터 URL인 경우
        if (imageUrl && imageUrl.startsWith('data:image/svg+xml')) {
            return {
                htmlContent: `<img src="${imageUrl}" alt="${tour.cleanTitle || tour.title}" />`,
                fallbackClass: '',
                indicator: '<div class="no-image-indicator">기본 이미지</div>',
                quality: 'placeholder'
            };
        }

        // 실제 이미지가 있는 경우
        if (imageUrl && hasRealImage !== false && this.isValidImageUrl(imageUrl)) {
            return {
                htmlContent: `
                    <img src="${imageUrl}" 
                         alt="${tour.cleanTitle || tour.title}" 
                         onload="this.classList.add('loaded')"
                         onerror="tourSearchManager.handleImageError(this, '${category}', '${tour.cleanTitle || tour.title}')">
                `,
                fallbackClass: '',
                indicator: '<div class="real-image-indicator">📷</div>',
                quality: 'real'
            };
        }

        // fallback 이미지 생성
        return this.createFallbackImage(category, tour.cleanTitle || tour.title);
    },

    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            new URL(url);
            return url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) || 
                   url.includes('visitkorea.or.kr') ||
                   url.includes('data:image');
        } catch (e) {
            return false;
        }
    },

    handleImageError(imgElement, category, title) {
        const container = imgElement.parentElement;
        if (!container) return;

        const fallbackInfo = this.createFallbackImage(category, title);
        container.className = `tour-image ${fallbackInfo.fallbackClass}`;
        container.innerHTML = fallbackInfo.htmlContent + fallbackInfo.indicator;
    },

    createFallbackImage(category, title) {
        const categoryMap = {
            'A01': { class: 'nature', icon: '🌿', text: '자연 관광지' },
            'A02': { class: 'culture', icon: '🏛️', text: '문화 시설' },
            'A03': { class: 'sports', icon: '🏃‍♂️', text: '레포츠' },
            'A05': { class: 'food', icon: '🍽️', text: '음식점' },
            'C01': { class: 'course', icon: '🎯', text: '추천 코스' }
        };

        const info = categoryMap[category] || { 
            class: 'default', 
            icon: '📷', 
            text: '이미지 없음' 
        };

        return {
            htmlContent: `
                <div class="fallback-icon">${info.icon}</div>
                <div class="fallback-text">${info.text}</div>
                <div class="fallback-text" style="font-size: 12px; opacity: 0.8;">
                    ${this.truncateText(title, 20)}
                </div>
            `,
            fallbackClass: `no-image ${info.class}`,
            indicator: '<div class="no-image-indicator">이미지 없음</div>',
            quality: 'fallback'
        };
    },

    truncateText(text, maxLength = 20) {
        if (!text || typeof text !== 'string') return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },

    getCategoryName(contentTypeId) {
        const categories = {
            '12': '관광지', '14': '문화시설', '15': '축제공연행사',
            '25': '여행코스', '28': '레포츠', '32': '숙박',
            '38': '쇼핑', '39': '음식점'
        };
        return categories[contentTypeId] || '기타';
    },

    // ========================================
    // 10. UI 상태 관리
    // ========================================
    
    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.classList.add('active');
    },

    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.classList.remove('active');
    },

    showNoResults(message = '검색 결과가 없습니다.') {
        const noResults = document.getElementById('noResults');
        
        if (noResults) {
            const messageElement = noResults.querySelector('h3');
            const descElement = noResults.querySelector('p');
            
            if (messageElement) messageElement.textContent = message;
            if (descElement) {
                const filterSummary = this.getFilterSummary();
                descElement.innerHTML = `
                    현재 검색 조건: <strong>${filterSummary}</strong><br>
                    다른 조건으로 검색하거나 필터를 조정해보세요
                `;
            }
            
            noResults.style.display = 'block';
        }

        this.updateRecommendedSection([], '검색 결과 없음');
    },

    showLoginStatus(isLoggedIn) {
        const pageSubtitle = document.querySelector('.page-subtitle');
        
        if (isLoggedIn) {
            if (pageSubtitle) {
                pageSubtitle.innerHTML = '✨ <strong>v2.0 개선됨!</strong> 관심사 정보로 미리 설정되어 있습니다. <span style="color: #4CAF50; font-weight: 600;">회색 박스</span>는 회원님의 관심사, <span style="color: #2196F3; font-weight: 600;">파란 박스</span>는 직접 변경하신 값입니다!<br><small>🎨 메인 3개 카테고리: 자연, 문화/역사, 레포츠</small>';
            }
        } else {
            if (pageSubtitle) {
                pageSubtitle.innerHTML = `
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 10px 0;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">👤</span>
                            <div>
                                <strong style="color: #856404;">로그인하면 더 많은 기능을 이용할 수 있습니다!</strong>
                                <br>
                                <small style="color: #856404;">✨ 개인 맞춤 관심사 설정 ✨ 즐겨찾기 ✨ 추천 투어</small>
                                <br>
                                <a href="/login" style="color: #4CAF50; font-weight: 600; text-decoration: underline;">지금 로그인하기 →</a>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    },

    showEmptyRecommendedSection() {
        const recommendedContainer = document.getElementById('recommendedTours');
        if (!recommendedContainer) return;

        recommendedContainer.innerHTML = `
            <div class="recommendation-placeholder">
                <div class="placeholder-icon">🔍</div>
                <h3>관심사 기반으로 설정된 필터를 확인해보세요!</h3>
                <p>위의 필터들이 회원님의 관심사로 미리 설정되어 있습니다.<br>
                   원하는 대로 조정한 후 <strong>🔍 검색하기</strong> 버튼을 눌러주세요!</p>
                <div class="search-hint">
                    <div class="hint-item">
                        <span class="hint-number">1</span>
                        <span class="hint-text">관심사로 미리 설정된 필터 확인</span>
                    </div>
                    <div class="hint-item">
                        <span class="hint-number">2</span>
                        <span class="hint-text">원하는 대로 필터 조정 (예: 활동적 → 힐링)</span>
                    </div>
                    <div class="hint-item">
                        <span class="hint-number">3</span>
                        <span class="hint-text">🔍 검색하기 버튼으로 맞춤 투어 확인</span>
                    </div>
                </div>
            </div>
        `;
    },

    showLoginPrompt() {
        const recommendedContainer = document.getElementById('recommendedTours');
        if (!recommendedContainer) return;

        recommendedContainer.innerHTML = `
            <div class="recommendation-placeholder">
                <div class="placeholder-icon">👤</div>
                <h3>로그인하면 관심사 기반 필터가 자동 설정됩니다</h3>
                <p>현재는 수동으로 필터를 설정해서 검색해주세요</p>
                <div style="margin-top: 20px;">
                    <a href="/login" class="btn-primary" style="text-decoration: none; padding: 12px 24px; border-radius: 8px;">
                        로그인하고 맞춤 필터 이용하기
                    </a>
                </div>
            </div>
        `;
    },

    updateResultCount() {
        const resultCount = document.getElementById('resultCount');
        const countNumber = document.querySelector('.count-number');
        
        if (resultCount && countNumber) {
            countNumber.textContent = window.tourUtils?.formatNumber(this.totalCount) || this.totalCount;
            resultCount.style.display = this.totalCount > 0 ? 'block' : 'none';
        }
    },

    updatePagination() {
        const pagination = document.getElementById('pagination');
        const paginationNumbers = document.getElementById('paginationNumbers');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (!pagination || !paginationNumbers) return;

        const itemsPerPage = parseInt(this.currentFilters.numOfRows) || 6;
        const totalPages = Math.ceil(this.totalCount / itemsPerPage);

        paginationNumbers.innerHTML = '';
        
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.performSearch();
            });
            paginationNumbers.appendChild(pageBtn);
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
            prevBtn.onclick = () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.performSearch();
                }
            };
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
            nextBtn.onclick = () => {
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.performSearch();
                }
            };
        }

        pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    },

    // ========================================
    // 11. 모달 및 상호작용
    // ========================================
    
    openModal(contentId) {
        const modal = document.getElementById('tourDetailModal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadTourDetail(contentId);
        }
    },

    closeModal() {
        const modal = document.getElementById('tourDetailModal');
        if (modal) modal.style.display = 'none';
    },

    async loadTourDetail(contentId) {
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        try {
            if (modalTitle) modalTitle.textContent = '투어 상세 정보 로딩 중...';
            if (modalBody) modalBody.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner"></div></div>';
            
            const response = await fetch(`/api/tours/detail/${contentId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const tour = result.data;
                
                if (modalTitle) modalTitle.textContent = tour.title || '투어 상세 정보';
                if (modalBody) {
                    modalBody.innerHTML = `
                        <div class="tour-detail-content">
                            <div class="tour-detail-image">
                                <img src="${tour.optimizedImage || tour.firstimage || 'https://via.placeholder.com/600x300?text=No+Image'}" 
                                     alt="${tour.title}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px;">
                            </div>
                            <div class="tour-detail-info">
                                <h3>${tour.title}</h3>
                                <p><strong>주소:</strong> ${tour.addr1 || '주소 정보 없음'}</p>
                                <p><strong>카테고리:</strong> ${tour.categoryName || '기타'}</p>
                                ${tour.overview ? `<div class="tour-overview"><strong>소개:</strong><br>${tour.overview}</div>` : ''}
                            </div>
                        </div>
                    `;
                }
            } else {
                if (modalTitle) modalTitle.textContent = '오류';
                if (modalBody) modalBody.innerHTML = '<div style="text-align: center; padding: 20px;">상세 정보를 불러올 수 없습니다.</div>';
            }
        } catch (error) {
            console.error('상세 정보 로드 실패:', error);
            if (modalTitle) modalTitle.textContent = '오류';
            if (modalBody) modalBody.innerHTML = '<div style="text-align: center; padding: 20px;">상세 정보를 불러올 수 없습니다.</div>';
        }
    },

    toggleFavorite(contentId) {
        const favoriteBtn = document.querySelector(`[data-contentid="${contentId}"] .btn-favorite`);
        if (favoriteBtn) {
            favoriteBtn.classList.toggle('active');
            const isActive = favoriteBtn.classList.contains('active');
            const icon = favoriteBtn.querySelector('.heart-icon');
            if (icon) {
                icon.textContent = isActive ? '♥' : '♡';
            }
            
            window.tourUtils?.showToast(
                isActive ? '즐겨찾기에 추가되었습니다' : '즐겨찾기에서 제거되었습니다',
                'success'
            );
        }
    },

    // ========================================
    // 12. 필터 관리
    // ========================================
    
    clearFilters(showToast = true) {
        const filterElements = ['activityFilter', 'placeFilter', 'needsFilter'];
        
        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
                element.style.backgroundColor = '';
                element.style.borderColor = '';
                element.style.boxShadow = '';
                element.style.fontWeight = '';
                element.classList.remove('user-interest-filter', 'user-modified-filter');
            }
        });

        // 사이드 메뉴 선택기 초기화
        if (this.sideMenuRegionSelector) {
            this.sideMenuRegionSelector.resetSelection();
        }

        if (this.sideMenuThemeSelector) {
            this.sideMenuThemeSelector.resetSelection();
        }

        this.currentFilters = {};
        this.currentPage = 1;
        
        // 사용자 관심사 다시 적용
        setTimeout(() => {
            this.applyUserInterests();
            this.updateInterestTags();
        }, 100);
        
        if (showToast) {
            window.tourUtils?.showToast('필터가 초기화되었습니다', 'info');
        }
    },

    applyQuickFilter(filterType) {
        this.clearFilters(false);
        
        switch (filterType) {
            case 'nature':
                if (this.sideMenuThemeSelector) {
                    this.sideMenuThemeSelector.selectQuickTheme('A01');
                }
                break;
            case 'culture':
                if (this.sideMenuThemeSelector) {
                    this.sideMenuThemeSelector.selectQuickTheme('A02');
                }
                break;
            case 'activity':
                if (this.sideMenuThemeSelector) {
                    this.sideMenuThemeSelector.selectQuickTheme('A03');
                }
                break;
        }
        
        setTimeout(() => {
            this.performSearch();
        }, 500);
        
        window.tourUtils?.showToast(`${filterType} 빠른 검색이 적용되었습니다`, 'info');
    }
};

// ========================================
// 사이드 메뉴 지역 선택기 클래스
// ========================================

class SideMenuRegionSelector {
    constructor() {
        this.areas = [];
        this.sigungus = {};
        this.selectedArea = null;
        this.selectedSigungu = null;
        this.currentAreaCode = null;
        this.isOpen = false;
        this.onSelectionChange = null;
        this.init();
    }

    async init() {
        this.createSideMenuSelector();
        this.setupEventListeners();
        await this.loadAreas();
    }

    createSideMenuSelector() {
        const regionFilterGroup = document.querySelector('#regionFilter')?.parentElement;
        if (!regionFilterGroup) return;

        regionFilterGroup.innerHTML = `
            <label for="regionSelector">여행 지역</label>
            <div class="side-menu-region-selector">
                <button type="button" class="region-trigger-button" id="regionTriggerButton">
                    <span id="selectedRegionText">지역을 선택해주세요</span>
                    <span class="arrow">▼</span>
                </button>
                <div class="side-menu-container" id="sideMenuContainer">
                    <div class="menu-content">
                        <div class="region-list" id="regionList"></div>
                        <div class="sigungu-list empty" id="sigunguList">
                            지역을 선택하면 시군구가 표시됩니다
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.triggerButton = document.getElementById('regionTriggerButton');
        this.sideMenuContainer = document.getElementById('sideMenuContainer');
        this.selectedRegionText = document.getElementById('selectedRegionText');
        this.regionList = document.getElementById('regionList');
        this.sigunguList = document.getElementById('sigunguList');
    }

    setupEventListeners() {
        if (!this.triggerButton) return;

        this.triggerButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.side-menu-region-selector')) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.sideMenuContainer.classList.add('show');
        this.triggerButton.classList.add('active');
        this.isOpen = true;
    }

    closeMenu() {
        this.sideMenuContainer.classList.remove('show');
        this.triggerButton.classList.remove('active');
        this.isOpen = false;
    }

    async loadAreas() {
        try {
            const response = await fetch('/api/tours/areas');
            const result = await response.json();
            
            if (result.success) {
                this.areas = result.data;
                this.renderAreas();
            } else {
                this.loadAreasFallback();
            }
        } catch (error) {
            console.error('지역 데이터 로드 실패:', error);
            this.loadAreasFallback();
        }
    }

    loadAreasFallback() {
        this.areas = [
            {rnum: 1, code: '1', name: '서울'},
            {rnum: 2, code: '2', name: '인천'},
            {rnum: 3, code: '3', name: '대전'},
            {rnum: 4, code: '4', name: '대구'},
            {rnum: 5, code: '5', name: '광주'},
            {rnum: 6, code: '6', name: '부산'},
            {rnum: 7, code: '7', name: '울산'},
            {rnum: 8, code: '8', name: '세종특별자치시'},
            {rnum: 9, code: '31', name: '경기도'},
            {rnum: 10, code: '32', name: '강원특별자치도'},
            {rnum: 11, code: '33', name: '충청북도'},
            {rnum: 12, code: '34', name: '충청남도'},
            {rnum: 13, code: '35', name: '경상북도'},
            {rnum: 14, code: '36', name: '경상남도'},
            {rnum: 15, code: '37', name: '전북특별자치도'},
            {rnum: 16, code: '38', name: '전라남도'},
            {rnum: 17, code: '39', name: '제주특별자치도'}
        ];
        this.renderAreas();
    }

    renderAreas() {
        if (!this.regionList) return;

        this.regionList.innerHTML = '';
        this.areas.forEach(area => {
            const regionItem = document.createElement('div');
            regionItem.className = 'region-item';
            regionItem.innerHTML = `<span>${area.name}</span>`;
            regionItem.dataset.areaCode = area.code;
            
            regionItem.addEventListener('click', () => {
                this.selectRegion(area, regionItem);
            });
            
            this.regionList.appendChild(regionItem);
        });
    }

    async selectRegion(area, regionElement) {
        const prevSelected = this.regionList.querySelector('.region-item.active');
        if (prevSelected) {
            prevSelected.classList.remove('active');
        }
        
        regionElement.classList.add('active');
        this.currentAreaCode = area.code;
        
        if (this.isMetropolitanCity(area.code)) {
            this.selectArea(area, null);
            this.showEmptySigunguList(`${area.name}는 시군구가 없습니다`);
            return;
        }
        
        await this.loadSigunguForArea(area.code);
    }

    async loadSigunguForArea(areaCode) {
        if (this.sigungus[areaCode]) {
            this.renderSigunguList(this.sigungus[areaCode]);
            return;
        }

        try {
            this.showLoadingSigungu();
            
            const response = await fetch(`/api/tours/sigungu?areaCode=${areaCode}`);
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                this.sigungus[areaCode] = result.data;
                this.renderSigunguList(result.data);
            } else {
                this.showEmptySigunguList('시군구 데이터가 없습니다');
            }
        } catch (error) {
            console.error('시군구 데이터 로드 실패:', error);
            this.showEmptySigunguList('시군구 로드 실패');
        }
    }

    renderSigunguList(sigungus) {
        this.sigunguList.className = 'sigungu-list';
        this.sigunguList.innerHTML = '';

        const allOption = document.createElement('div');
        allOption.className = 'sigungu-item';
        allOption.textContent = '전체';
        allOption.addEventListener('click', () => {
            const area = this.areas.find(a => a.code === this.currentAreaCode);
            this.selectArea(area, null);
        });
        this.sigunguList.appendChild(allOption);

        sigungus.forEach(sigungu => {
            const item = document.createElement('div');
            item.className = 'sigungu-item';
            item.textContent = sigungu.name;
            
            item.addEventListener('click', () => {
                const prevSelected = this.sigunguList.querySelector('.sigungu-item.selected');
                if (prevSelected) {
                    prevSelected.classList.remove('selected');
                }
                
                item.classList.add('selected');
                
                const area = this.areas.find(a => a.code === this.currentAreaCode);
                this.selectArea(area, sigungu);
            });
            
            this.sigunguList.appendChild(item);
        });
    }

    showEmptySigunguList(message) {
        this.sigunguList.className = 'sigungu-list empty';
        this.sigunguList.textContent = message;
    }

    showLoadingSigungu() {
        this.sigunguList.className = 'sigungu-list empty';
        this.sigunguList.textContent = '시군구를 불러오는 중...';
    }

    selectArea(area, sigungu = null) {
        this.selectedArea = area;
        this.selectedSigungu = sigungu;

        if (sigungu) {
            this.selectedRegionText.textContent = `${area.name} > ${sigungu.name}`;
        } else {
            this.selectedRegionText.textContent = area.name;
        }

        this.triggerButton.style.backgroundColor = '#f5f5f5';
        this.triggerButton.style.borderColor = '#4CAF50';

        this.closeMenu();

        if (this.onSelectionChange) {
            this.onSelectionChange(area, sigungu);
        }
    }

    applyUserInterestRegion(regionName) {
        const regionValue = regionName.textContent || regionName;
        const area = this.areas.find(a => a.name === regionValue || a.name.includes(regionValue));
        if (area) {
            const regionElement = this.regionList.querySelector(`[data-area-code="${area.code}"]`);
            if (regionElement) {
                this.selectRegion(area, regionElement);
            }
        }
    }

    isMetropolitanCity(areaCode) {
        const metropolitanCities = ['1', '2', '3', '4', '5', '6', '7', '8'];
        return metropolitanCities.includes(areaCode);
    }

    resetSelection() {
        this.selectedArea = null;
        this.selectedSigungu = null;
        this.currentAreaCode = null;
        this.selectedRegionText.textContent = '지역을 선택해주세요';
        
        this.triggerButton.style.backgroundColor = '';
        this.triggerButton.style.borderColor = '';
        
        const activeRegion = this.regionList?.querySelector('.region-item.active');
        if (activeRegion) {
            activeRegion.classList.remove('active');
        }
        
        const activeSigungu = this.sigunguList?.querySelector('.sigungu-item.selected');
        if (activeSigungu) {
            activeSigungu.classList.remove('selected');
        }
        
        this.showEmptySigunguList('지역을 선택하면 시군구가 표시됩니다');
    }
}

// ========================================
// 사이드 메뉴 테마 선택기 클래스
// ========================================

class SideMenuThemeSelector {
    constructor() {
        this.mainCategories = [];
        this.middleCategories = {};
        this.smallCategories = {};
        this.selectedMain = null;
        this.selectedMiddle = null;
        this.selectedSmall = null;
        this.currentMainCode = null;
        this.isOpen = false;
        this.allowedMainCategories = ['A01', 'A02', 'A03'];
        this.onSelectionChange = null;
        this.init();
    }

    async init() {
        this.createSideMenuSelector();
        this.setupEventListeners();
        await this.loadMainCategories();
    }

    createSideMenuSelector() {
        const themeFilterGroup = document.querySelector('#themeFilter')?.parentElement;
        if (!themeFilterGroup) return;

        themeFilterGroup.innerHTML = `
            <label for="themeSelector">선호 테마</label>
            <div class="side-menu-theme-selector">
                <button type="button" class="theme-trigger-button" id="themeTriggerButton">
                    <span id="selectedThemeText">테마를 선택해주세요</span>
                    <span class="arrow">▼</span>
                </button>
                <div class="theme-menu-container" id="themeMenuContainer">
                    <div class="menu-content">
                        <div class="main-category-list" id="mainCategoryList"></div>
                        <div class="middle-category-list empty" id="middleCategoryList">
                            대분류를 선택하면 중분류가 표시됩니다
                        </div>
                        <div class="small-category-list empty" id="smallCategoryList">
                            중분류를 선택하면 소분류가 표시됩니다
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.triggerButton = document.getElementById('themeTriggerButton');
        this.themeMenuContainer = document.getElementById('themeMenuContainer');
        this.selectedThemeText = document.getElementById('selectedThemeText');
        this.mainCategoryList = document.getElementById('mainCategoryList');
        this.middleCategoryList = document.getElementById('middleCategoryList');
        this.smallCategoryList = document.getElementById('smallCategoryList');
    }

    setupEventListeners() {
        if (!this.triggerButton) return;

        this.triggerButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.side-menu-theme-selector')) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.themeMenuContainer.classList.add('show');
        this.triggerButton.classList.add('active');
        this.isOpen = true;
    }

    closeMenu() {
        this.themeMenuContainer.classList.remove('show');
        this.triggerButton.classList.remove('active');
        this.isOpen = false;
    }

    async loadMainCategories() {
        try {
            const curationCategories = {
                'A01': '자연',
                'A02': '인문(문화/예술/역사)', 
                'A03': '레포츠'
            };
            
            this.mainCategories = Object.entries(curationCategories).map(([code, name]) => ({
                code,
                name
            }));
            
            this.renderMainCategories();
        } catch (error) {
            console.error('대분류 데이터 로드 실패:', error);
        }
    }

    renderMainCategories() {
        if (!this.mainCategoryList) return;

        this.mainCategoryList.innerHTML = '';
        this.mainCategories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'main-category-item has-subcategory';
            categoryItem.innerHTML = `<span>${category.name}</span>`;
            categoryItem.dataset.mainCode = category.code;
            
            categoryItem.addEventListener('click', () => {
                this.selectMainCategory(category, categoryItem);
            });
            
            this.mainCategoryList.appendChild(categoryItem);
        });
    }

    async selectMainCategory(category, categoryElement) {
        const prevSelected = this.mainCategoryList.querySelector('.main-category-item.active');
        if (prevSelected) {
            prevSelected.classList.remove('active');
        }
        
        categoryElement.classList.add('active');
        this.currentMainCode = category.code;
        this.selectedMain = category;
        
        await this.loadMiddleCategoriesForMain(category.code);
        this.showEmptySmallCategoryList('중분류를 선택하면 소분류가 표시됩니다');
    }

    async loadMiddleCategoriesForMain(mainCode) {
        if (this.middleCategories[mainCode]) {
            this.renderMiddleCategoryList(this.middleCategories[mainCode]);
            return;
        }

        try {
            this.showLoadingMiddleCategory();
            
            const response = await fetch(`/api/tours/categories/middle?cat1=${mainCode}`);
            const result = await response.json();
            
            if (result.success && result.data && Object.keys(result.data).length > 0) {
                const middleArray = Object.entries(result.data).map(([code, name]) => ({
                    code,
                    name
                }));
                
                this.middleCategories[mainCode] = middleArray;
                this.renderMiddleCategoryList(middleArray);
            } else {
                this.showEmptyMiddleCategoryList('중분류 데이터가 없습니다');
            }
        } catch (error) {
            console.error('중분류 데이터 로드 실패:', error);
            this.showEmptyMiddleCategoryList('중분류 로드 실패');
        }
    }

    renderMiddleCategoryList(middleCategories) {
        this.middleCategoryList.className = 'middle-category-list';
        this.middleCategoryList.innerHTML = '';

        const allOption = document.createElement('div');
        allOption.className = 'middle-category-item';
        allOption.textContent = '전체';
        allOption.addEventListener('click', () => {
            this.selectTheme(this.selectedMain, null, null);
        });
        this.middleCategoryList.appendChild(allOption);

        middleCategories.forEach(middle => {
            const item = document.createElement('div');
            item.className = 'middle-category-item has-subcategory';
            item.textContent = middle.name;
            item.dataset.middleCode = middle.code;
            
            item.addEventListener('click', () => {
                const prevSelected = this.middleCategoryList.querySelector('.middle-category-item.active');
                if (prevSelected) {
                    prevSelected.classList.remove('active');
                }
                
                item.classList.add('active');
                this.selectedMiddle = middle;
                
                this.loadSmallCategoriesForMiddle(this.selectedMain.code, middle.code);
            });
            
            this.middleCategoryList.appendChild(item);
        });
    }

    async loadSmallCategoriesForMiddle(mainCode, middleCode) {
        const cacheKey = `${mainCode}_${middleCode}`;
        
        if (this.smallCategories[cacheKey]) {
            this.renderSmallCategoryList(this.smallCategories[cacheKey]);
            return;
        }

        try {
            this.showLoadingSmallCategory();
            
            const response = await fetch(`/api/tours/categories/small?cat1=${mainCode}&cat2=${middleCode}`);
            const result = await response.json();
            
            if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
                this.smallCategories[cacheKey] = result.data;
                this.renderSmallCategoryList(result.data);
            } else {
                this.showEmptySmallCategoryList('소분류 데이터가 없습니다');
            }
        } catch (error) {
            console.error('소분류 데이터 로드 실패:', error);
            this.showEmptySmallCategoryList('소분류 로드 실패');
        }
    }

    renderSmallCategoryList(smallCategories) {
        this.smallCategoryList.className = 'small-category-list';
        this.smallCategoryList.innerHTML = '';

        const allOption = document.createElement('div');
        allOption.className = 'small-category-item';
        allOption.textContent = '전체';
        allOption.addEventListener('click', () => {
            this.selectTheme(this.selectedMain, this.selectedMiddle, null);
        });
        this.smallCategoryList.appendChild(allOption);

        smallCategories.forEach(small => {
            const item = document.createElement('div');
            item.className = 'small-category-item';
            item.textContent = small.name;
            
            item.addEventListener('click', () => {
                const prevSelected = this.smallCategoryList.querySelector('.small-category-item.selected');
                if (prevSelected) {
                    prevSelected.classList.remove('selected');
                }
                
                item.classList.add('selected');
                this.selectedSmall = small;
                
                this.selectTheme(this.selectedMain, this.selectedMiddle, small);
            });
            
            this.smallCategoryList.appendChild(item);
        });
    }

    showEmptyMiddleCategoryList(message) {
        this.middleCategoryList.className = 'middle-category-list empty';
        this.middleCategoryList.textContent = message;
    }

    showLoadingMiddleCategory() {
        this.middleCategoryList.className = 'middle-category-list empty';
        this.middleCategoryList.textContent = '중분류를 불러오는 중...';
    }

    showEmptySmallCategoryList(message) {
        this.smallCategoryList.className = 'small-category-list empty';
        this.smallCategoryList.textContent = message;
    }

    showLoadingSmallCategory() {
        this.smallCategoryList.className = 'small-category-list empty';
        this.smallCategoryList.textContent = '소분류를 불러오는 중...';
    }

    selectTheme(main, middle = null, small = null) {
        this.selectedMain = main;
        this.selectedMiddle = middle;
        this.selectedSmall = small;

        let themeText = main.name;
        if (middle) {
            themeText += ` > ${middle.name}`;
        }
        if (small) {
            themeText += ` > ${small.name}`;
        }
        
        this.selectedThemeText.textContent = themeText;

        this.triggerButton.style.backgroundColor = '#f5f5f5';
        this.triggerButton.style.borderColor = '#9C27B0';

        this.closeMenu();

        if (this.onSelectionChange) {
            this.onSelectionChange(main, middle, small);
        }
    }

    selectQuickTheme(themeCode) {
        const theme = this.mainCategories.find(t => t.code === themeCode);
        if (theme) {
            const themeElement = this.mainCategoryList.querySelector(`[data-main-code="${theme.code}"]`);
            if (themeElement) {
                this.selectMainCategory(theme, themeElement);
                setTimeout(() => {
                    this.selectTheme(theme, null, null);
                }, 100);
            }
        }
    }

    applyUserInterestTheme(themeCode) {
        if (this.allowedMainCategories.includes(themeCode)) {
            this.selectQuickTheme(themeCode);
        }
    }

    getSelectedThemeForFilter() {
        if (this.selectedSmall) {
            return {
                cat1: this.selectedMain.code,
                cat2: this.selectedMiddle.code,
                cat3: this.selectedSmall.code
            };
        } else if (this.selectedMiddle) {
            return {
                cat1: this.selectedMain.code,
                cat2: this.selectedMiddle.code,
                cat3: ''
            };
        } else if (this.selectedMain) {
            return {
                cat1: this.selectedMain.code,
                cat2: '',
                cat3: ''
            };
        }
        return {
            cat1: '',
            cat2: '',
            cat3: ''
        };
    }

    resetSelection() {
        this.selectedMain = null;
        this.selectedMiddle = null;
        this.selectedSmall = null;
        this.currentMainCode = null;
        this.selectedThemeText.textContent = '테마를 선택해주세요';
        
        this.triggerButton.style.backgroundColor = '';
        this.triggerButton.style.borderColor = '';
        
        const activeMain = this.mainCategoryList?.querySelector('.main-category-item.active');
        if (activeMain) activeMain.classList.remove('active');
        
        const activeMiddle = this.middleCategoryList?.querySelector('.middle-category-item.active');
        if (activeMiddle) activeMiddle.classList.remove('active');
        
        const activeSmall = this.smallCategoryList?.querySelector('.small-category-item.selected');
        if (activeSmall) activeSmall.classList.remove('selected');
        
        this.showEmptyMiddleCategoryList('대분류를 선택하면 중분류가 표시됩니다');
        this.showEmptySmallCategoryList('중분류를 선택하면 소분류가 표시됩니다');
    }
}

// ========================================
// 페이지 로드 시 초기화
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 투어 검색 페이지 v2.0 로드됨 (깔끔하게 정리된 완전판)');
    tourSearchManager.init();
});

// 모달 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
    const modal = document.getElementById('tourDetailModal');
    if (e.target === modal && tourSearchManager) {
        tourSearchManager.closeModal();
    }
});

// 전역으로 이미지 에러 핸들러 노출
window.handleTourImageError = function(imgElement, category, title) {
    if (window.tourSearchManager) {
        window.tourSearchManager.handleImageError(imgElement, category, title);
    }
};