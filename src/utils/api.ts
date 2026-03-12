import Cookies from 'js-cookie';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface ApiResponse<T = any> {
    data?: T;
    error?: string;
}

interface ValidationError {
    type: string;
    loc: (string | number)[];
    msg: string;
    input?: any;
    ctx?: Record<string, any>;
}

// Validation 에러를 한국어 메시지로 변환
function formatValidationError(error: ValidationError): string {
    const field = error.loc[error.loc.length - 1]; // 마지막 필드명

    switch (error.type) {
        case 'string_too_short':
            const minLength = error.ctx?.min_length;
            if (field === 'password') {
                return `비밀번호는 최소 ${minLength}자 이상이어야 합니다`;
            }
            if (field === 'email') {
                return `이메일은 최소 ${minLength}자 이상이어야 합니다`;
            }
            return `${field}는 최소 ${minLength}자 이상이어야 합니다`;

        case 'string_too_long':
            const maxLength = error.ctx?.max_length;
            if (field === 'password') {
                return `비밀번호는 최대 ${maxLength}자까지 입력 가능합니다`;
            }
            if (field === 'email') {
                return `이메일은 최대 ${maxLength}자까지 입력 가능합니다`;
            }
            return `${field}는 최대 ${maxLength}자까지 입력 가능합니다`;

        case 'value_error':
            if (error.msg.toLowerCase().includes('email')) {
                return '올바른 이메일 형식이 아닙니다';
            }
            return error.msg;

        case 'missing':
            if (field === 'password') {
                return '비밀번호를 입력해주세요';
            }
            if (field === 'email') {
                return '이메일을 입력해주세요';
            }
            return `${field}를 입력해주세요`;

        case 'string_pattern_mismatch':
            if (field === 'email') {
                return '올바른 이메일 형식이 아닙니다';
            }
            return error.msg;

        default:
            return error.msg;
    }
}

// API response types
interface ThumbnailResponse {
    img_url: string;
}

export interface Diary {
    id: string;
    user_id: string;
    chat_session_id: string;
    title: string;
    content: string;
    writed_at: string;
    thumbnail_url?: string;
    emotion?: string;
    user_wrote_this_diary_directly: boolean;
    created_at: string;
    updated_at: string;
    saved: boolean;
    tags: string[];
}

export interface EmotionTimelineItem {
    diary_date: string;
    emotion: 'happy' | 'sad' | 'angry' | 'anxious' | 'peaceful' | 'normal';
    emotion_score: number;
    diary_id: string;
    title: string | null;
}

export interface EmotionSummary {
    total_count: number;
    date_range: {
        start?: string;
        end?: string;
    };
    emotion_counts: Record<string, number>;
    most_common_emotion: string | null;
}

export interface EmotionTimelineResponse {
    timeline: EmotionTimelineItem[];
    summary: EmotionSummary;
}

// 토큰 갱신 중인지 추적 (중복 요청 방지)
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// 토큰 갱신 함수
async function refreshAccessToken(): Promise<boolean> {
    // 이미 갱신 중이면 해당 Promise 반환
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const refreshToken = Cookies.get('refreshToken');
            if (!refreshToken) {
                return false;
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/refresh_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
                // credentials: 'include',
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();

            // 새 토큰 저장
            if (data.accessToken) {
                Cookies.set('accessToken', data.accessToken, { expires: 7 });
            }
            if (data.refreshToken) {
                Cookies.set('refreshToken', data.refreshToken);
            }

            return true;
        } catch {
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// 로그아웃 처리
function handleLogout() {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    // 로그인 페이지로 리다이렉트
    window.location.href = '/login';
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
): Promise<ApiResponse<T>> {
    const token = Cookies.get('accessToken');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    // 토큰이 있으면 헤더에 추가
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            // credentials: 'include', // 쿠키 자동 전송
        });

        // 401 에러 처리 (인증 실패)
        if (response.status === 401 && !isRetry) {
            // 토큰 갱신 시도
            const refreshed = await refreshAccessToken();

            if (refreshed) {
                // 토큰 갱신 성공 - 원래 요청 재시도
                return request<T>(endpoint, options, true);
            } else {
                // 토큰 갱신 실패 - 로그아웃
                handleLogout();
                return { error: 'Session expired. Please login again.' };
            }
        }

        const data = await response.json();

        if (!response.ok) {
            // 422 Validation Error 처리
            if (response.status === 422 && data.detail && Array.isArray(data.detail)) {
                const validationErrors = data.detail.map((err: ValidationError) =>
                    formatValidationError(err)
                );
                return { error: validationErrors.join('\n') };
            }

            return { error: data.message || 'An error occurred' };
        }

        return { data };
    } catch {
        return { error: 'Network error. Please try again.' };
    }
}

export const api = {
    // 로그인
    login: async (email: string, password: string) => {
        return request('/api/v1/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    // 회원가입
    signup: async (email: string, password: string) => {
        return request('/api/v1/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    // 이메일 인증번호 요청
    requestEmailVerification: async () => {
        return request('/api/v1/email_verification_code', {
            method: 'POST',
        });
    },

    // 이메일 인증
    verifyEmail: async (code: string) => {
        return request('/api/v1/verify_email', {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    },

    // 현재 유저 정보 가져오기
    me: async () => {
        return request('/api/v1/me');
    },

    // 프로필 업데이트
    updateMe: async (profile: { username: string; birth?: string; gender?: 'male' | 'female' | 'other' }) => {
        return request('/api/v1/me', {
            method: 'PUT',
            body: JSON.stringify(profile),
        });
    },

    // 프로필 이미지 업로드
    uploadProfileImage: async (file: File) => {
        const token = Cookies.get('accessToken');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/me/profile-image`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                return { error: data.message || 'Failed to upload image' };
            }

            return { data };
        } catch {
            return { error: 'Network error. Please try again.' };
        }
    },

    // 프로필 이미지 삭제
    deleteProfileImage: async () => {
        return request('/api/v1/me/profile-image', {
            method: 'DELETE',
        });
    },

    // 채팅 세션 관련 API
    chat: {
        // 현재 채팅 세션 가져오기
        getCurrentSession: async () => {
            return request('/api/v1/chat-current-session');
        },

        // 메시지 전송
        sendMessage: async (sessionId: string, userId: string, content: string) => {
            return request('/api/v1/chat/message', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: sessionId,
                    message: {
                        id: '',
                        user_id: userId,
                        role: 'USER',
                        content,
                    },
                }),
            });
        },

        // 현재 채팅 세션 종료
        endCurrentSession: async () => {
            return request('/api/v1/chat-current-session', {
                method: 'DELETE',
            });
        },
    },

    // 비밀번호 찾기 API
    forgotPassword: {
        // 이메일 인증번호 요청
        requestCode: async (email: string) => {
            return request('/api/v1/change_password/email_verification_code', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
        },

        // 이메일 인증코드 검증 (토큰 반환)
        verifyCode: async (email: string, code: string) => {
            return request<{ token: string }>('/api/v1/change_password/verify', {
                method: 'POST',
                body: JSON.stringify({ email, code }),
            });
        },

        // 비밀번호 변경
        changePassword: async (token: string, newPassword: string) => {
            return request('/api/v1/change_password', {
                method: 'PATCH',
                body: JSON.stringify({ token, new_password: newPassword }),
            });
        },
    },

    // 일기 작성 API
    diary: {
        // 일기 작성 (AI 대화 기반)
        create: async (sessionId: string, messageId: string) => {
            return request('/api/v1/diary', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: sessionId,
                    message_id: messageId,
                }),
            });
        },

        // 일기 직접 작성
        createDirect: async (title: string | undefined, content: string, chatSessionId?: string) => {
            return request<Diary>('/api/v1/diary/direct', {
                method: 'POST',
                body: JSON.stringify({
                    ...(title && { title }),
                    content,
                    ...(chatSessionId && { chat_session_id: chatSessionId }),
                }),
            });
        },

        // 일기 수정
        update: async (diaryId: string, title: string | undefined, content: string) => {
            return request<Diary>(`/api/v1/diary/${diaryId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...(title && { title }),
                    content,
                }),
            });
        },

        // 일기 리스트 조회
        list: async (cursorId?: string, size: number = 30) => {
            const params = new URLSearchParams();
            if (cursorId) {
                params.append('cursor_id', cursorId);
            }
            params.append('size', size.toString());

            const queryString = params.toString();
            return request<Diary[]>(`/api/v1/diaries${queryString ? `?${queryString}` : ''}`);
        },

        // 일기 상세 조회
        getById: async (diaryId: string) => {
            return request<Diary>(`/api/v1/diary/${diaryId}`);
        },

        // 특정 날짜의 일기 조회
        getByDate: async (date: string) => {
            return request(`/api/v1/diary?writed_at=${date}`);
        },

        // 썸네일 생성 요청
        getThumbnail: async (diaryId: string) => {
            return request<ThumbnailResponse>(`/api/v1/diary/thumbnail/${diaryId}`);
        },

        // 일기에 썸네일 적용
        updateThumbnail: async (diaryId: string, imgUrl: string) => {
            return request<Diary>(`/api/v1/diary/${diaryId}/thumbnail`, {
                method: 'PATCH',
                body: JSON.stringify({ img_url: imgUrl }),
            });
        },

        // 일기 삭제
        delete: async (diaryId: string) => {
            return request(`/api/v1/diary/${diaryId}`, {
                method: 'DELETE',
            });
        },

        // 일기의 채팅 세션 조회
        getChatSession: async (diaryId: string) => {
            return request(`/api/v1/diary/${diaryId}/chat_session`);
        },

        // 이전/다음 일기 조회
        getNextPrev: async (diaryId: string) => {
            return request<{ next: Diary | null; prev: Diary | null }>(`/api/v1/diary/${diaryId}/next_prev`);
        },

        // 일기 감정 업데이트
        updateEmotion: async (diaryId: string) => {
            return request<Diary>(`/api/v1/diary/${diaryId}/emotion`, {
                method: 'PATCH',
            });
        },

        // 일기 저장 추가
        addSaved: async (diaryId: string) => {
            return request<Diary>(`/api/v1/diary/${diaryId}/saved`, {
                method: 'POST',
            });
        },

        // 일기 저장 해제
        removeSaved: async (diaryId: string) => {
            return request<Diary>(`/api/v1/diary/${diaryId}/saved`, {
                method: 'DELETE',
            });
        },

        // 저장된 일기 리스트 조회
        getSavedDiaries: async (cursorId?: string, size: number = 30) => {
            const params = new URLSearchParams();
            if (cursorId) {
                params.append('cursor_id', cursorId);
            }
            params.append('size', size.toString());

            const queryString = params.toString();
            return request<Diary[]>(`/api/v1/diaries/saved${queryString ? `?${queryString}` : ''}`);
        },

        // 일기 검색
        searchDiaries: async (query: string, cursorId?: string, size: number = 30) => {
            const params = new URLSearchParams();
            params.append('query', query);
            if (cursorId) {
                params.append('cursor_id', cursorId);
            }
            params.append('size', size.toString());

            const queryString = params.toString();
            return request<Diary[]>(`/api/v1/diaries/search?${queryString}`);
        },
    },

    // 통계 관련 API
    statistics: {
        // 감정 타임라인 조회
        getEmotionTimeline: async (startDate?: string, endDate?: string) => {
            const params = new URLSearchParams();
            if (startDate) {
                params.append('start_date', startDate);
            }
            if (endDate) {
                params.append('end_date', endDate);
            }

            const queryString = params.toString();
            return request<EmotionTimelineResponse>(`/api/v1/diaries/emotions/timeline${queryString ? `?${queryString}` : ''}`);
        },
    },
};
