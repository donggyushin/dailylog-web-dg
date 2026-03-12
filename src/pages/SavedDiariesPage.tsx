import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { api, type Diary } from '../utils/api';

// 감정 이모지 매핑
const emotionEmojis: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    anxious: '😰',
    peaceful: '😌',
    normal: '😐',
};

// 감정 한글 매핑
const emotionKorean: Record<string, string> = {
    happy: '행복',
    sad: '슬픔',
    angry: '분노',
    anxious: '불안',
    peaceful: '평온',
    normal: '평범',
};

export function SavedDiariesPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);

    // 북마크된 일기 리스트 로드
    useEffect(() => {
        const loadDiaries = async () => {
            setIsLoading(true);
            const { data, error } = await api.diary.getSavedDiaries();

            if (data && !error) {
                setDiaries(data);
                setHasMore(data.length === 30);
            }

            setIsLoading(false);
        };

        loadDiaries();
    }, []);

    // 무한 스크롤 구현
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMoreDiaries();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, diaries]);

    // 추가 일기 로드
    const loadMoreDiaries = async () => {
        if (isLoadingMore || !hasMore || diaries.length === 0) return;

        setIsLoadingMore(true);
        const lastDiaryId = diaries[diaries.length - 1].id;
        const { data, error } = await api.diary.getSavedDiaries(lastDiaryId);

        if (data && !error) {
            setDiaries((prev) => [...prev, ...data]);
            setHasMore(data.length === 30);
        }

        setIsLoadingMore(false);
    };

    // 북마크 토글
    const handleToggleBookmark = async (diaryId: string, currentSavedState: boolean, e: React.MouseEvent) => {
        e.stopPropagation();

        const apiCall = currentSavedState
            ? api.diary.removeSaved(diaryId)
            : api.diary.addSaved(diaryId);

        const { data, error } = await apiCall;

        if (data && !error) {
            // 북마크 해제 시 리스트에서 제거
            if (!data.saved) {
                setDiaries((prev) => prev.filter((d) => d.id !== diaryId));
            }
        }
    };

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
                <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
                    <Link to="/">
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-natural-900 dark:text-dark-text tracking-tight hover:opacity-70 transition-opacity">
                            Daily Log
                        </h1>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/statistics"
                            className="text-sm text-natural-900 dark:text-dark-text underline hover:no-underline font-bold uppercase tracking-wider"
                        >
                            통계
                        </Link>
                        <Link
                            to="/profile"
                            className="flex items-center gap-3 hover:opacity-70 transition-opacity group"
                        >
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

            {/* 페이지 제목 */}
            <div className="max-w-5xl mx-auto px-6 py-12">
                <div className="border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card p-8 mb-8">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-natural-900 dark:text-dark-text mb-3 uppercase tracking-tight">
                        북마크한 일기
                    </h2>
                    <p className="text-natural-600 dark:text-dark-text/80 text-sm uppercase tracking-wider">
                        특별히 간직하고 싶은 순간들
                    </p>
                </div>

                {/* 메인 콘텐츠 */}
                {isLoading ? (
                    <div className="text-center py-20">
                        <p className="text-natural-600 dark:text-dark-text font-bold uppercase tracking-wider">
                            로딩 중...
                        </p>
                    </div>
                ) : diaries.length === 0 ? (
                    <div className="border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card p-12 text-center">
                        <div className="text-6xl mb-6">📖</div>
                        <p className="text-natural-600 dark:text-dark-text/80 mb-6 text-lg">
                            아직 북마크한 일기가 없습니다.
                        </p>
                        <Button onClick={() => navigate('/')}>
                            일기 둘러보기
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {diaries.map((diary, index) => {
                            const isEven = index % 2 === 0;
                            const hasThumbnail = !!diary.thumbnail_url;

                            return (
                                <div
                                    key={diary.id}
                                    onClick={() => navigate(`/diary/${diary.id}`)}
                                    className="border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(245,245,240,0.3)] transition-all cursor-pointer group"
                                >
                                    {hasThumbnail ? (
                                        // 썸네일이 있는 경우: 지그재그 레이아웃
                                        <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                            {/* 썸네일 이미지 */}
                                            <div className="w-full md:w-1/2 h-80 overflow-hidden">
                                                <img
                                                    src={diary.thumbnail_url}
                                                    alt={diary.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                            </div>

                                            {/* 텍스트 콘텐츠 */}
                                            <div className="w-full md:w-1/2 p-8 flex flex-col justify-between">
                                                <div>
                                                    {/* 날짜와 감정 */}
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="text-xs font-bold uppercase tracking-wider text-natural-600 dark:text-natural-400">
                                                            {formatDate(diary.writed_at)}
                                                        </span>
                                                        {diary.emotion && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl">{emotionEmojis[diary.emotion]}</span>
                                                                <span className="text-xs font-bold uppercase tracking-wider text-natural-600 dark:text-natural-400">
                                                                    {emotionKorean[diary.emotion]}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 제목 */}
                                                    <h3 className="font-serif font-bold text-2xl md:text-3xl text-natural-900 dark:text-dark-text mb-4 leading-tight">
                                                        {diary.title}
                                                    </h3>

                                                    {/* 본문 미리보기 */}
                                                    <p className="text-natural-600 dark:text-dark-text/80 line-clamp-4 leading-relaxed">
                                                        {diary.content}
                                                    </p>
                                                </div>

                                                {/* 북마크 버튼 */}
                                                <div className="mt-6 flex items-center justify-between pt-6 border-t-2 border-natural-900 dark:border-dark-border">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-natural-600 dark:text-natural-400">
                                                        자세히 보기 →
                                                    </span>
                                                    <button
                                                        onClick={(e) => handleToggleBookmark(diary.id, diary.saved, e)}
                                                        className="text-2xl hover:scale-110 transition-transform"
                                                        aria-label="북마크 해제"
                                                    >
                                                        <svg
                                                            className="w-6 h-6 fill-[#DC2626]"
                                                            viewBox="0 0 24 24"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // 썸네일이 없는 경우: 전체 너비 카드
                                        <div className="p-8">
                                            <div>
                                                {/* 날짜와 감정 */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-natural-600 dark:text-natural-400">
                                                        {formatDate(diary.writed_at)}
                                                    </span>
                                                    {diary.emotion && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-2xl">{emotionEmojis[diary.emotion]}</span>
                                                            <span className="text-xs font-bold uppercase tracking-wider text-natural-600 dark:text-natural-400">
                                                                {emotionKorean[diary.emotion]}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 제목 */}
                                                <h3 className="font-serif font-bold text-2xl md:text-3xl text-natural-900 dark:text-dark-text mb-4 leading-tight">
                                                    {diary.title}
                                                </h3>

                                                {/* 본문 미리보기 */}
                                                <p className="text-natural-600 dark:text-dark-text/80 line-clamp-6 leading-relaxed mb-6">
                                                    {diary.content}
                                                </p>
                                            </div>

                                            {/* 북마크 버튼 */}
                                            <div className="flex items-center justify-between pt-6 border-t-2 border-natural-900 dark:border-dark-border">
                                                <span className="text-xs font-bold uppercase tracking-widest text-natural-600 dark:text-natural-400">
                                                    자세히 보기 →
                                                </span>
                                                <button
                                                    onClick={(e) => handleToggleBookmark(diary.id, diary.saved, e)}
                                                    className="text-2xl hover:scale-110 transition-transform"
                                                    aria-label="북마크 해제"
                                                >
                                                    <svg
                                                        className="w-6 h-6 fill-[#DC2626]"
                                                        viewBox="0 0 24 24"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* 무한 스크롤 트리거 */}
                        <div ref={observerTarget} className="h-10">
                            {isLoadingMore && (
                                <p className="text-center text-natural-600 dark:text-dark-text font-bold uppercase tracking-wider">
                                    로딩 중...
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
