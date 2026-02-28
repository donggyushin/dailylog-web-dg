import { useState, useEffect, useRef } from 'react';
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
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 초기값 설정
    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setBirth(user.birth || '');
            setGender(user.gender || '');
        }
    }, [user]);

    // 이미지 파일 선택 핸들러
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // 파일 크기 확인 (5MB 제한)
            if (file.size > 5 * 1024 * 1024) {
                setError('이미지 크기는 5MB 이하여야 합니다');
                return;
            }

            // 이미지 타입 확인
            if (!file.type.startsWith('image/')) {
                setError('이미지 파일만 업로드 가능합니다');
                return;
            }

            setImageFile(file);

            // 미리보기 생성
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // 이미지 업로드
    const handleImageUpload = async () => {
        if (!imageFile) return;

        setIsUploadingImage(true);
        setError('');
        setSuccess('');

        const { data, error: uploadError } = await api.uploadProfileImage(imageFile);

        if (data && !uploadError) {
            setSuccess('프로필 이미지가 업데이트되었습니다');
            await refreshUser();
            setImageFile(null);
            setImagePreview(null);
        } else {
            setError(uploadError || '이미지 업로드에 실패했습니다');
        }

        setIsUploadingImage(false);
    };

    // 이미지 삭제
    const handleImageDelete = async () => {
        if (!window.confirm('프로필 이미지를 삭제하시겠습니까?')) {
            return;
        }

        setIsUploadingImage(true);
        setError('');
        setSuccess('');

        const { data, error: deleteError } = await api.deleteProfileImage();

        if (data && !deleteError) {
            setSuccess('프로필 이미지가 삭제되었습니다');
            await refreshUser();
        } else {
            setError(deleteError || '이미지 삭제에 실패했습니다');
        }

        setIsUploadingImage(false);
    };

    // 이미지 선택 취소
    const handleImageCancel = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

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

                    {/* 프로필 이미지 섹션 */}
                    <div className="mb-10 pb-10 border-b-2 border-natural-200 dark:border-dark-border/30">
                        <label className="block text-xs font-bold uppercase tracking-wider text-natural-700 dark:text-dark-text/80 mb-4">
                            프로필 이미지
                        </label>

                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            {/* 현재 이미지 또는 미리보기 */}
                            <div className="flex-shrink-0">
                                <div className="w-32 h-32 border-2 border-natural-900 dark:border-dark-border bg-natural-100 dark:bg-dark-bg flex items-center justify-center overflow-hidden">
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : user?.profile_image_url ? (
                                        <img
                                            src={user.profile_image_url}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-natural-400 dark:text-dark-text/30 text-4xl">
                                            👤
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 버튼 영역 */}
                            <div className="flex-1 space-y-3">
                                {/* 파일 입력 (숨김) */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />

                                {/* 이미지 선택/업로드 버튼 */}
                                {!imageFile ? (
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingImage}
                                        >
                                            이미지 선택
                                        </Button>
                                        {user?.profile_image_url && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleImageDelete}
                                                disabled={isUploadingImage}
                                            >
                                                삭제
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleImageUpload}
                                            isLoading={isUploadingImage}
                                        >
                                            업로드
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleImageCancel}
                                            disabled={isUploadingImage}
                                        >
                                            취소
                                        </Button>
                                    </div>
                                )}

                                <p className="text-xs text-natural-600 dark:text-dark-text/60">
                                    JPG, PNG, GIF (최대 5MB)
                                </p>
                            </div>
                        </div>
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
