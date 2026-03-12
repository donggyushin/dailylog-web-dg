import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ThemeToggle } from '../components/ui/ThemeToggle';

type Step = 'email' | 'verify' | 'password';

export function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초

    const navigate = useNavigate();

    // 5분 카운트다운 타이머 (인증 단계에서만 작동)
    useEffect(() => {
        if (step !== 'verify' || timeLeft <= 0) return;

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
    }, [step, timeLeft]);

    // 시간을 분:초 형식으로 변환
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Step 1: 이메일 인증번호 요청
    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email.trim()) {
            setError('이메일을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        const response = await api.forgotPassword.requestCode(email);
        setIsLoading(false);

        if (response.error) {
            setError(response.error);
        } else {
            setSuccess('인증번호가 이메일로 전송되었습니다.');
            setStep('verify');
            setTimeLeft(300); // 타이머 시작
        }
    };

    // 인증번호 재전송
    const handleResendCode = async () => {
        setError('');
        setSuccess('');
        setIsLoading(true);

        const response = await api.forgotPassword.requestCode(email);
        setIsLoading(false);

        if (response.error) {
            setError(response.error);
        } else {
            setSuccess('인증번호가 재전송되었습니다.');
            setTimeLeft(300); // 타이머 리셋
        }
    };

    // Step 2: 인증코드 검증
    const handleVerifyCode = async (e: React.FormEvent) => {
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
        const response = await api.forgotPassword.verifyCode(email, code);
        setIsLoading(false);

        if (response.error) {
            setError(response.error);
        } else if (response.data?.token) {
            setToken(response.data.token);
            setSuccess('인증이 완료되었습니다!');
            setStep('password');
        }
    };

    // Step 3: 비밀번호 변경
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // 비밀번호 유효성 검사
        if (!newPassword.trim()) {
            setError('새 비밀번호를 입력해주세요.');
            return;
        }

        if (newPassword.length < 10) {
            setError('비밀번호는 최소 10자 이상이어야 합니다.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        // 비밀번호 강도 검사 (영문, 숫자 포함)
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        if (!hasLetter || !hasNumber) {
            setError('비밀번호는 영문과 숫자를 포함해야 합니다.');
            return;
        }

        setIsLoading(true);
        const response = await api.forgotPassword.changePassword(token, newPassword);
        setIsLoading(false);

        if (response.error) {
            setError(response.error);
        } else {
            setSuccess('비밀번호가 변경되었습니다!');
            // 1초 후 로그인 페이지로 이동
            setTimeout(() => {
                navigate('/login');
            }, 1000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-accent-cream dark:bg-dark-bg">
            <ThemeToggle />

            {/* 비밀번호 찾기 카드 */}
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-10 md:p-12">
                    {/* 헤더 */}
                    <div className="mb-10">
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-natural-900 dark:text-dark-text mb-3 tracking-tight">
                            비밀번호 찾기
                        </h1>
                        <div className="w-16 h-1 bg-natural-900 dark:bg-dark-border mb-4"></div>
                        <p className="text-natural-600 dark:text-dark-text text-base">
                            {step === 'email' && '가입한 이메일을 입력해주세요'}
                            {step === 'verify' && '이메일로 전송된 인증번호를 입력해주세요'}
                            {step === 'password' && '새로운 비밀번호를 입력해주세요'}
                        </p>
                    </div>

                    {/* 타이머 (인증 단계에서만 표시) */}
                    {step === 'verify' && timeLeft > 0 && (
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

                    {/* 시간 만료 (인증 단계에서만 표시) */}
                    {step === 'verify' && timeLeft === 0 && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 dark:border-red-400">
                            <p className="text-red-700 dark:text-red-300 text-sm font-bold">
                                인증 시간이 만료되었습니다.
                            </p>
                        </div>
                    )}

                    {/* Step 1: 이메일 입력 */}
                    {step === 'email' && (
                        <form onSubmit={handleRequestCode} className="space-y-7">
                            <Input
                                label="이메일"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                disabled={isLoading}
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

                            <Button
                                type="submit"
                                size="lg"
                                isLoading={isLoading}
                                className="w-full"
                            >
                                인증번호 받기
                            </Button>
                        </form>
                    )}

                    {/* Step 2: 인증번호 입력 */}
                    {step === 'verify' && (
                        <form onSubmit={handleVerifyCode} className="space-y-7">
                            <Input
                                label="인증번호"
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="6자리 인증번호"
                                required
                                disabled={isLoading || timeLeft === 0}
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
                                    disabled={timeLeft === 0}
                                >
                                    인증하기
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    onClick={handleResendCode}
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading ? '전송 중...' : '인증번호 재전송'}
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: 새 비밀번호 입력 */}
                    {step === 'password' && (
                        <form onSubmit={handleChangePassword} className="space-y-7">
                            <Input
                                label="새 비밀번호"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="최소 10자, 영문과 숫자 포함"
                                required
                                disabled={isLoading}
                            />

                            <Input
                                label="비밀번호 확인"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="비밀번호 재입력"
                                required
                                disabled={isLoading}
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

                            <Button
                                type="submit"
                                size="lg"
                                isLoading={isLoading}
                                className="w-full"
                            >
                                비밀번호 변경
                            </Button>
                        </form>
                    )}

                    {/* 푸터 */}
                    <div className="mt-10 pt-8 border-t-2 border-natural-200 dark:border-dark-border/30 text-center">
                        <p className="text-natural-600 dark:text-dark-text/80 text-sm">
                            로그인 페이지로 돌아가기{' '}
                            <Link
                                to="/login"
                                className="text-natural-900 dark:text-dark-text font-bold underline hover:no-underline"
                            >
                                로그인
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
