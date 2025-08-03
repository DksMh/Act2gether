/**
 * QnA API 통신 모듈 - FormData 지원 (이미지 업로드)
 */
class QnaApi {
    constructor() {
        this.baseUrl = '/qna/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * HTTP 요청 공통 처리
     * @param {string} url 요청 URL
     * @param {object} options 요청 옵션
     * @returns {Promise} 응답 Promise
     */
    async request(url, options = {}) {
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            credentials: 'include', // 쿠키 포함 (Session 방식 대응)
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // 401 Unauthorized
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('로그인이 필요합니다.');
            }
            
            // 403 Forbidden
            if (response.status === 403) {
                throw new Error('권한이 없습니다.');
            }
            
            // 404 Not Found
            if (response.status === 404) {
                throw new Error('요청한 리소스를 찾을 수 없습니다.');
            }
            
            // 서버 오류
            if (response.status >= 500) {
                throw new Error('서버 오류가 발생했습니다.');
            }
            
            // 클라이언트 오류
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '요청 처리 중 오류가 발생했습니다.');
            }
            
            // 응답이 JSON인지 확인
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('API 요청 오류:', error);
            throw error;
        }
    }

    /**
     * 인증 오류 처리
     */
    handleUnauthorized() {
        console.warn('인증이 필요합니다.');
        window.location.href = '/login';
    }

    /**
     * 현재 사용자 정보 조회
     * @returns {Promise<object>} 사용자 정보
     */
    async getCurrentUser() {
        return await this.request(`${this.baseUrl}/current-user`);
    }

    /**
     * QnA 목록 조회
     * @param {object} searchParams 검색 조건
     * @returns {Promise<object>} 페이징된 QnA 목록
     */
    async getQnaPosts(searchParams = {}) {
        const params = new URLSearchParams();
        
        Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        });
        
        const url = `${this.baseUrl}/list?${params.toString()}`;
        return await this.request(url);
    }

    /**
     * QnA 상세 조회
     * @param {string} id QnA ID
     * @returns {Promise<object>} QnA 상세 정보
     */
    async getQnaPost(id) {
        return await this.request(`${this.baseUrl}/${id}`);
    }

    /**
     * QnA 등록 (FormData 지원 - 이미지 업로드)
     * @param {FormData} formData 등록 데이터 (이미지 파일 포함)
     * @returns {Promise<object>} 등록된 QnA 정보
     */
    async createQnaPost(formData) {
        // 🎯 FormData 전송을 위해 Content-Type 헤더 제거 (브라우저가 자동 설정)
        const config = {
            method: 'POST',
            body: formData,
            credentials: 'include'
            // Content-Type 헤더 제거 - FormData는 자동으로 multipart/form-data 설정
        };

        try {
            const response = await fetch(this.baseUrl, config);
            
            // 에러 처리
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('로그인이 필요합니다.');
            }
            
            if (response.status === 403) {
                throw new Error('권한이 없습니다.');
            }
            
            if (response.status === 404) {
                throw new Error('요청한 리소스를 찾을 수 없습니다.');
            }
            
            if (response.status >= 500) {
                throw new Error('서버 오류가 발생했습니다.');
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '요청 처리 중 오류가 발생했습니다.');
            }
            
            // 응답 처리
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('QnA 등록 API 오류:', error);
            throw error;
        }
    }

    /**
     * QnA 수정
     * @param {string} id QnA ID
     * @param {object} data 수정 데이터
     * @returns {Promise<object>} 수정된 QnA 정보
     */
    // async updateQnaPost(id, data) {
    //     return await this.request(`${this.baseUrl}/${id}`, {
    //         method: 'PUT',
    //         body: JSON.stringify(data)
    //     });
    // }
    /**
     * QnA 수정 (FormData 지원 - 이미지 업로드)
     * @param {string} id QnA ID
     * @param {FormData} formData 수정 데이터 (이미지 파일 포함)
     * @returns {Promise<object>} 수정된 QnA 정보
     */
    async updateQnaPost(id, formData) {
        // 🎯 FormData 전송을 위해 Content-Type 헤더 제거 (브라우저가 자동 설정)
        const config = {
            method: 'PUT',
            body: formData,
            credentials: 'include'
            // Content-Type 헤더 제거 - FormData는 자동으로 multipart/form-data 설정
        };

        try {
            const response = await fetch(`${this.baseUrl}/${id}`, config);
            
            // 에러 처리
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('로그인이 필요합니다.');
            }
            
            if (response.status === 403) {
                throw new Error('권한이 없습니다.');
            }
            
            if (response.status === 404) {
                throw new Error('요청한 리소스를 찾을 수 없습니다.');
            }
            
            if (response.status >= 500) {
                throw new Error('서버 오류가 발생했습니다.');
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '요청 처리 중 오류가 발생했습니다.');
            }
            
            // 응답 처리
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('QnA 수정 API 오류:', error);
            throw error;
        }
    }

    /**
     * QnA 삭제
     * @param {string} id QnA ID
     * @returns {Promise<void>}
     */
    async deleteQnaPost(id) {
        return await this.request(`${this.baseUrl}/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * QnA 답변 등록
     * @param {string} id QnA ID
     * @param {object} data 답변 데이터
     * @returns {Promise<object>} 답변이 등록된 QnA 정보
     */
    async createReply(id, data) {
        return await this.request(`${this.baseUrl}/${id}/reply`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * QnA 답변 수정
     * @param {string} id QnA ID
     * @param {object} data 답변 수정 데이터
     * @returns {Promise<object>} 수정된 QnA 정보
     */
    async updateReply(id, data) {
        return await this.request(`${this.baseUrl}/${id}/reply`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * 문의 유형 목록 조회
     * @returns {Promise<Array>} 문의 유형 목록
     */
    async getInquiryTypes() {
        return await this.request(`${this.baseUrl}/inquiry-types`);
    }

    /**
     * 상태 목록 조회
     * @returns {Promise<Array>} 상태 목록
     */
    async getStatuses() {
        return await this.request(`${this.baseUrl}/statuses`);
    }
}

// 전역 인스턴스 생성
const qnaApi = new QnaApi();