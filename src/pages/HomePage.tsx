import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { api, type Diary } from '../utils/api';

// 이미지 밝기를 계산하는 함수
const calculateImageBrightness = (imageUrl: string): Promise<'light' | 'dark'> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve('dark'); // 기본값
                return;
            }

            canvas.width = 50;
            canvas.height = 50;
            ctx.drawImage(img, 0, 0, 50, 50);

            try {
                const imageData = ctx.getImageData(0, 0, 50, 50);
                const data = imageData.data;
                let totalBrightness = 0;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                    totalBrightness += brightness;
                }

                const avgBrightness = totalBrightness / (data.length / 4);
                resolve(avgBrightness > 128 ? 'light' : 'dark');
            } catch {
                resolve('dark'); // CORS 에러 시 기본값
            }
        };

        img.onerror = () => {
            resolve('dark'); // 에러 시 기본값
        };

        img.src = imageUrl;
    });
};

// 썸네일이 있는 일기 카드 컴포넌트
function DiaryCardWithThumbnail({
    diary,
    onClick,
    formatDate
}: {
    diary: Diary;
    onClick: () => void;
    formatDate: (date: string) => string;
}) {
    const [textColor, setTextColor] = useState<'light' | 'dark'>('dark');
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (diary.thumbnail_url) {
            calculateImageBrightness(diary.thumbnail_url).then(setTextColor);
        }
    }, [diary.thumbnail_url]);

    const textColorClass = textColor === 'light'
        ? 'text-natural-900'
        : 'text-white';

    return (
        <div
            onClick={onClick}
            className="relative border-2 border-natural-900 dark:border-dark-border min-h-[300px] cursor-pointer overflow-hidden group"
        >
            {/* 썸네일 이미지 - 카드 전체를 채움 */}
            <img
                ref={imgRef}
                src={diary.thumbnail_url}
                alt={diary.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
            />

            {/* 그라데이션 오버레이 - 텍스트 가독성 향상 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

            {/* 텍스트 오버레이 */}
            <div className="relative h-full flex flex-col p-6">
                {/* 날짜 - 상단 우측 */}
                <div className="text-right">
                    <span className={`text-xs font-bold uppercase tracking-wider ${textColorClass} drop-shadow-lg`}>
                        {formatDate(diary.writed_at)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export function HomePage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 오늘 날짜에 작성한 일기가 있는지 확인
    const hasTodayDiary = () => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return diaries.some(diary => diary.writed_at === today);
    };

    // 일기 리스트 로드
    useEffect(() => {
        const loadDiaries = async () => {
            setIsLoading(true);
            const { data, error } = await api.diary.list();

            if (data && !error) {
                setDiaries(data);
            }

            setIsLoading(false);
        };

        loadDiaries();
    }, []);

    // 날짜 포맷팅
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    };

    return (
        <div className="min-h-screen bg-accent-cream dark:bg-dark-bg">
            <ThemeToggle />

            {/* 헤더 */}
            <header className="border-b-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card">
                <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-natural-900 dark:text-dark-text tracking-tight">
                        Daily Log
                    </h1>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/profile"
                            className="flex items-center gap-3 hover:opacity-70 transition-opacity group"
                        >
                            {/* 프로필 이미지 */}
                            <div className="w-10 h-10 border-2 border-natural-900 dark:border-dark-border bg-natural-100 dark:bg-dark-bg flex items-center justify-center overflow-hidden">
                                {user?.profile_image_url ? (
                                    <img
                                        src={user.profile_image_url}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        style={{
                                            imageRendering: '-webkit-optimize-contrast',
                                            backfaceVisibility: 'hidden',
                                            transform: 'translateZ(0)',
                                        }}
                                    />
                                ) : (
                                    <div className="text-natural-400 dark:text-dark-text/30 text-xl">
                                        👤
                                    </div>
                                )}
                            </div>
                            <span className="text-sm text-natural-900 dark:text-dark-text underline group-hover:no-underline">
                                {user?.username || user?.email}님
                            </span>
                        </Link>
                        <Button
                            onClick={logout}
                            variant="outline"
                            size="sm"
                        >
                            로그아웃
                        </Button>
                    </div>
                </div>
            </header>

            {/* 메인 콘텐츠 */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {isLoading ? (
                    <div className="text-center py-20">
                        <p className="text-natural-600 dark:text-dark-text font-bold uppercase tracking-wider">
                            로딩 중...
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 오늘 일기가 없으면 작성하기 카드 표시 */}
                        {!hasTodayDiary() && (
                            <button
                                onClick={() => navigate('/chat')}
                                className="bg-natural-900 dark:bg-dark-text hover:bg-natural-800 dark:hover:bg-natural-100 border-2 border-natural-900 dark:border-dark-border p-8 flex flex-col items-center justify-center min-h-[300px] transition-colors group"
                            >
                                <div className="text-6xl mb-4 text-white dark:text-dark-bg">+</div>
                                <h3 className="text-2xl font-serif font-bold text-white dark:text-dark-bg mb-2">
                                    일기 작성하기
                                </h3>
                                <p className="text-sm text-white/80 dark:text-dark-bg/80 uppercase tracking-wider">
                                    오늘의 이야기를 들려주세요
                                </p>
                            </button>
                        )}

                        {/* 일기 리스트 */}
                        {diaries.map((diary) => (
                            diary.thumbnail_url ? (
                                <DiaryCardWithThumbnail
                                    key={diary.id}
                                    diary={diary}
                                    onClick={() => navigate(`/diary/${diary.id}`)}
                                    formatDate={formatDate}
                                />
                            ) : (
                                <div
                                    key={diary.id}
                                    onClick={() => navigate(`/diary/${diary.id}`)}
                                    className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-6 flex flex-col min-h-[300px] cursor-pointer hover:bg-natural-50 dark:hover:bg-natural-900/20 transition-colors"
                                >
                                    {/* 날짜 */}
                                    <div className="text-right mb-4">
                                        <span className="text-xs font-bold uppercase tracking-wider text-natural-600 dark:text-natural-400">
                                            {formatDate(diary.writed_at)}
                                        </span>
                                    </div>

                                    {/* 제목 */}
                                    <h3 className="font-serif font-bold text-xl text-natural-900 dark:text-dark-text mb-3 line-clamp-2">
                                        {diary.title}
                                    </h3>

                                    {/* 본문 미리보기 */}
                                    <p className="text-natural-600 dark:text-dark-text/80 text-sm line-clamp-3 flex-1">
                                        {diary.content}
                                    </p>

                                    {/* 하단 구분선 */}
                                    <div className="mt-4 pt-4 border-t-2 border-natural-900 dark:border-dark-border">
                                        <span className="text-xs font-bold uppercase tracking-widest text-natural-600 dark:text-natural-400">
                                            더 읽기 →
                                        </span>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}

                {/* 일기가 하나도 없을 경우 */}
                {!isLoading && diaries.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-natural-600 dark:text-dark-text/80 mb-6">
                            아직 작성된 일기가 없습니다.
                        </p>
                        <Button onClick={() => navigate('/chat')}>
                            첫 일기 작성하기
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
