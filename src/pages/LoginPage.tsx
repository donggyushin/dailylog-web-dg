import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const { success, error: loginError } = await login(email, password);

        if (success) {
            navigate('/');
        } else {
            setError(loginError || '로그인에 실패했습니다');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-accent-cream dark:bg-dark-bg">
            <ThemeToggle />

            {/* 로그인 카드 */}
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-10 md:p-12">
                    {/* 헤더 */}
                    <div className="mb-10">
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-natural-900 dark:text-dark-text mb-3 tracking-tight">
                            Daily Log
                        </h1>
                        <div className="w-16 h-1 bg-natural-900 dark:bg-dark-border mb-4"></div>
                        <p className="text-natural-600 dark:text-dark-text text-base">
                            당신의 하루를 기록하세요
                        </p>
                    </div>

                    {/* 폼 */}
                    <form onSubmit={handleSubmit} className="space-y-7">
                        <Input
                            label="이메일"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            disabled={isLoading}
                        />

                        <Input
                            label="비밀번호"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                        />

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 dark:border-red-400 text-red-700 dark:text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            size="lg"
                            isLoading={isLoading}
                            className="w-full"
                        >
                            로그인
                        </Button>
                    </form>

                    {/* 푸터 */}
                    <div className="mt-10 pt-8 border-t-2 border-natural-200 dark:border-dark-border/30 text-center space-y-3">
                        <p className="text-natural-600 dark:text-dark-text/80 text-sm">
                            계정이 없으신가요?{' '}
                            <Link
                                to="/signup"
                                className="text-natural-900 dark:text-dark-text font-bold underline hover:no-underline"
                            >
                                회원가입
                            </Link>
                        </p>
                        <p className="text-natural-600 dark:text-dark-text/80 text-sm">
                            비밀번호를 잊으셨나요?{' '}
                            <Link
                                to="/forgot-password"
                                className="text-natural-900 dark:text-dark-text font-bold underline hover:no-underline"
                            >
                                비밀번호 찾기
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
