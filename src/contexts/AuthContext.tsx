import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import Cookies from 'js-cookie';
import { api } from '../utils/api';

interface User {
    id: string;
    email: string;
    username: string | null;
    birth: string | null;
    gender: 'male' | 'female' | 'other' | null;
    email_verified: boolean;
    free_trial_count: number;
    is_admin: boolean;
    profile_image_url: string | null;
}

interface AuthResponse {
    accessToken: string;
    refreshToken: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 앱 시작 시 쿠키에서 토큰 확인
    useEffect(() => {
        const checkAuth = async () => {
            const token = Cookies.get('accessToken');

            if (token) {
                // 토큰이 있으면 유저 정보 가져오기
                const { data, error } = await api.me();

                if (data && !error) {
                    setUser(data as User);
                } else {
                    // 토큰이 유효하지 않으면 삭제
                    Cookies.remove('accessToken');
                }
            }

            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const { data, error } = await api.login(email, password);

        if (data && !error) {
            const authData = data as AuthResponse;
            // 백엔드에서 쿠키로 토큰을 설정한다고 가정
            // 만약 응답에 토큰이 포함되어 있다면:
            if (authData.accessToken) {
                Cookies.set('accessToken', authData.accessToken, { expires: 7 }); // 7일
                Cookies.set('refreshToken', authData.refreshToken);
            }

            // 로그인 성공 후 유저 정보 가져오기
            const userResponse = await api.me();
            if (userResponse.data) {
                setUser(userResponse.data as User);
            }

            return { success: true };
        }

        return { success: false, error: error || 'Login failed' };
    };

    const signup = async (email: string, password: string) => {
        const { data, error } = await api.signup(email, password);

        if (data && !error) {
            const authData = data as AuthResponse;
            // 회원가입 후 자동 로그인
            if (authData.accessToken) {
                Cookies.set('accessToken', authData.accessToken, { expires: 7 });
                Cookies.set('refreshToken', authData.refreshToken);
            }

            // 회원가입 성공 후 유저 정보 가져오기
            const userResponse = await api.me();
            if (userResponse.data) {
                setUser(userResponse.data as User);
            }

            return { success: true };
        }

        return { success: false, error: error || 'Signup failed' };
    };

    const logout = () => {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        setUser(null);
    };

    const refreshUser = async () => {
        const { data } = await api.me();
        if (data) {
            setUser(data as User);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
