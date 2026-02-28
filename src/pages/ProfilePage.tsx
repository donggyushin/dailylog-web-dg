import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [birth, setBirth] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 초기값 설정
    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setBirth(user.birth || '');
            setGender(user.gender || '');
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!username.trim()) {
            setError('사용자 이름을 입력해주세요');
            return;
        }

        setIsLoading(true);

        const profileData: { username: string; birth?: string; gender?: 'male' | 'female' | 'other' } = {
            username: username.trim(),
        };

        if (birth) {
            profileData.birth = birth;
        }

        if (gender) {
            profileData.gender = gender as 'male' | 'female' | 'other';
        }

        const { data, error: updateError } = await api.updateMe(profileData);

        if (data && !updateError) {
            setSuccess('프로필이 업데이트되었습니다');
            await refreshUser(); // 유저 정보 새로고침
        } else {
            setError(updateError || '프로필 업데이트에 실패했습니다');
        }

        setIsLoading(false);
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-accent-cream dark:bg-dark-bg">
            {/* 헤더 */}
            <header className="border-b-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card">
                <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
                    <Link
                        to="/"
                        className="text-2xl md:text-3xl font-serif font-bold text-natural-900 dark:text-dark-text tracking-tight hover:opacity-70 transition-opacity"
                    >
                        Daily Log
                    </Link>
                </div>
            </header>

            {/* 메인 컨텐츠 */}
            <main className="max-w-2xl mx-auto px-6 py-12">
                <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-10">
                    {/* 타이틀 */}
                    <div className="mb-10">
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-natural-900 dark:text-dark-text mb-3 tracking-tight">
                            프로필 설정
                        </h1>
                        <div className="w-16 h-1 bg-natural-900 dark:bg-dark-border mb-4"></div>
                        <p className="text-natural-600 dark:text-dark-text/80 text-base">
                            내 정보를 관리하세요
                        </p>
                    </div>

                    {/* 프로필 폼 */}
                    <form onSubmit={handleSubmit} className="space-y-7">
                        {/* 이메일 (읽기 전용) */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-natural-700 dark:text-dark-text/80 mb-2">
                                이메일
                            </label>
                            <div className="bg-natural-100 dark:bg-dark-bg border-2 border-natural-300 dark:border-dark-border/50 px-4 py-3 text-natural-600 dark:text-dark-text/60">
                                {user.email}
                            </div>
                            {!user.email_verified && (
                                <p className="mt-2 text-xs text-natural-600 dark:text-dark-text/60">
                                    이메일 인증이 완료되지 않았습니다
                                </p>
                            )}
                        </div>

                        {/* 사용자 이름 (필수) */}
                        <Input
                            label="사용자 이름"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="이름을 입력하세요"
                            required
                            disabled={isLoading}
                        />

                        {/* 생년월일 (선택) */}
                        <Input
                            label="생년월일"
                            type="date"
                            value={birth}
                            onChange={(e) => setBirth(e.target.value)}
                            disabled={isLoading}
                        />

                        {/* 성별 (선택) */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-natural-700 dark:text-dark-text/80 mb-3">
                                성별
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="male"
                                        checked={gender === 'male'}
                                        onChange={(e) => setGender(e.target.value as 'male')}
                                        disabled={isLoading}
                                        className="w-5 h-5 border-2 border-natural-900 dark:border-dark-border checked:bg-natural-900 dark:checked:bg-dark-text cursor-pointer"
                                    />
                                    <span className="ml-2 text-natural-900 dark:text-dark-text group-hover:opacity-70">
                                        남성
                                    </span>
                                </label>
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="female"
                                        checked={gender === 'female'}
                                        onChange={(e) => setGender(e.target.value as 'female')}
                                        disabled={isLoading}
                                        className="w-5 h-5 border-2 border-natural-900 dark:border-dark-border checked:bg-natural-900 dark:checked:bg-dark-text cursor-pointer"
                                    />
                                    <span className="ml-2 text-natural-900 dark:text-dark-text group-hover:opacity-70">
                                        여성
                                    </span>
                                </label>
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="other"
                                        checked={gender === 'other'}
                                        onChange={(e) => setGender(e.target.value as 'other')}
                                        disabled={isLoading}
                                        className="w-5 h-5 border-2 border-natural-900 dark:border-dark-border checked:bg-natural-900 dark:checked:bg-dark-text cursor-pointer"
                                    />
                                    <span className="ml-2 text-natural-900 dark:text-dark-text group-hover:opacity-70">
                                        기타
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* 에러/성공 메시지 */}
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

                        {/* 버튼 */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="submit"
                                size="lg"
                                isLoading={isLoading}
                                className="flex-1"
                            >
                                저장
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => navigate('/')}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                취소
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
