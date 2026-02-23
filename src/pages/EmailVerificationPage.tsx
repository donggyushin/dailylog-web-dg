import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export function EmailVerificationPage() {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRequestingCode, setIsRequestingCode] = useState(true);
    const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초

    const navigate = useNavigate();
    const { logout, refreshUser } = useAuth();

    // 페이지 로드 시 인증번호 요청
    useEffect(() => {
        const requestCode = async () => {
            setIsRequestingCode(true);
            const response = await api.requestEmailVerification();
            setIsRequestingCode(false);

            if (response.error) {
                setError(response.error);
            } else {
                setSuccess('인증번호가 이메일로 전송되었습니다.');
            }
        };

        requestCode();
    }, []);

    // 5분 카운트다운 타이머
    useEffect(() => {
        if (timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    // 시간을 분:초 형식으로 변환
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // 인증번호 재전송
    const handleResendCode = async () => {
        setError('');
        setSuccess('');
        setIsRequestingCode(true);

        const response = await api.requestEmailVerification();
        setIsRequestingCode(false);

        if (response.error) {
            setError(response.error);
        } else {
            setSuccess('인증번호가 재전송되었습니다.');
            setTimeLeft(300); // 타이머 리셋
        }
    };

    // 인증 처리
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!code.trim()) {
            setError('인증번호를 입력해주세요.');
            return;
        }

        if (timeLeft <= 0) {
            setError('인증 시간이 만료되었습니다. 인증번호를 재전송해주세요.');
            return;
        }

        setIsLoading(true);

        const response = await api.verifyEmail(code);

        if (response.error) {
            setIsLoading(false);
            setError(response.error);
        } else {
            setSuccess('이메일 인증이 완료되었습니다!');
            // 유저 정보 업데이트
            await refreshUser();
            setIsLoading(false);
            // 홈으로 리다이렉트
            navigate('/');
        }
    };

    // 로그아웃 처리
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-accent-cream dark:bg-dark-bg">
            <ThemeToggle />

            {/* 이메일 인증 카드 */}
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-10 md:p-12">
                    {/* 헤더 */}
                    <div className="mb-10">
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-natural-900 dark:text-dark-text mb-3 tracking-tight">
                            이메일 인증
                        </h1>
                        <div className="w-16 h-1 bg-natural-900 dark:bg-dark-border mb-4"></div>
                        <p className="text-natural-600 dark:text-dark-text text-base">
                            {isRequestingCode
                                ? '인증번호를 전송하고 있습니다...'
                                : '이메일로 전송된 인증번호를 입력해주세요'}
                        </p>
                    </div>

                    {/* 타이머 */}
                    {!isRequestingCode && timeLeft > 0 && (
                        <div className="mb-6 p-4 bg-natural-100 dark:bg-natural-800 border-2 border-natural-900 dark:border-dark-border">
                            <div className="flex items-center justify-between">
                                <span className="text-natural-600 dark:text-dark-text text-sm font-bold uppercase tracking-wider">
                                    남은 시간
                                </span>
                                <span
                                    className={`text-2xl font-bold font-mono ${
                                        timeLeft <= 60
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-natural-900 dark:text-dark-text'
                                    }`}
                                >
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 시간 만료 */}
                    {!isRequestingCode && timeLeft === 0 && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 dark:border-red-400">
                            <p className="text-red-700 dark:text-red-300 text-sm font-bold">
                                인증 시간이 만료되었습니다.
                            </p>
                        </div>
                    )}

                    {/* 폼 */}
                    <form onSubmit={handleSubmit} className="space-y-7">
                        <Input
                            label="인증번호"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="6자리 인증번호"
                            required
                            disabled={isLoading || isRequestingCode || timeLeft === 0}
                            maxLength={6}
                        />

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 dark:border-red-400 text-red-700 dark:text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-600 dark:border-green-400 text-green-700 dark:text-green-300 text-sm">
                                {success}
                            </div>
                        )}

                        <div className="space-y-3">
                            <Button
                                type="submit"
                                size="lg"
                                isLoading={isLoading}
                                className="w-full"
                                disabled={isRequestingCode || timeLeft === 0}
                            >
                                인증하기
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={handleResendCode}
                                className="w-full"
                                disabled={isRequestingCode || isLoading}
                            >
                                {isRequestingCode ? '전송 중...' : '인증번호 재전송'}
                            </Button>
                        </div>
                    </form>

                    {/* 푸터 */}
                    <div className="mt-10 pt-8 border-t-2 border-natural-200 dark:border-dark-border/30">
                        <p className="text-natural-600 dark:text-dark-text/80 text-sm text-center mb-4">
                            인증이 완료되면 홈으로 이동합니다
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="w-full"
                        >
                            로그아웃
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
