import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { api, type Diary } from '../utils/api';

// 감정 색상 매핑
const emotionColors: Record<string, string> = {
    happy: '#FFD700',
    sad: '#4682B4',
    angry: '#DC143C',
    anxious: '#9370DB',
    peaceful: '#98FB98',
    normal: '#D3D3D3',
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

// 검색 키워드 하이라이트 함수
function highlightText(text: string, query: string) {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
            <mark
                key={index}
                className="bg-natural-900 dark:bg-dark-text text-white dark:text-dark-bg px-1"
            >
                {part}
            </mark>
        ) : (
            part
        )
    );
}

export function SearchPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // URL 쿼리 파라미터에서 검색어 읽기 및 자동 검색
    useEffect(() => {
        const query = searchParams.get('q');
        if (query) {
            setSearchQuery(query);
            performSearch(query);
        }
    }, []);

    // 검색 실행
    const performSearch = async (query: string, isLoadMore = false) => {
        if (!query.trim()) return;

        if (!isLoadMore) {
            setIsSearching(true);
            setDiaries([]);
        } else {
            setIsLoadingMore(true);
        }

        const cursorId = isLoadMore && diaries.length > 0 ? diaries[diaries.length - 1].id : undefined;
        const { data, error } = await api.diary.searchDiaries(query.trim(), cursorId);

        if (data && !error) {
            if (isLoadMore) {
                setDiaries((prev) => [...prev, ...data]);
            } else {
                setDiaries(data);
            }
            setHasMore(data.length === 30);
        }

        setIsSearching(false);
        setIsLoadingMore(false);
        setHasSearched(true);
    };

    // 검색 버튼 클릭
    const handleSearch = () => {
        if (!searchQuery.trim()) return;
        setSearchParams({ q: searchQuery });
        performSearch(searchQuery);
    };

    // 엔터키로 검색
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // 무한 스크롤 구현
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore && hasSearched && diaries.length > 0) {
                    performSearch(searchQuery, true);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, hasSearched, diaries, searchQuery]);

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
                            to="/saved"
                            className="text-sm text-natural-900 dark:text-dark-text underline hover:no-underline font-bold uppercase tracking-wider"
                        >
                            북마크
                        </Link>
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

            {/* 검색창 섹션 */}
            <div className="max-w-5xl mx-auto px-6 py-12">
                <div className="border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card p-8 mb-8">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-natural-900 dark:text-dark-text mb-6 uppercase tracking-tight">
                        일기 검색
                    </h2>

                    {/* 검색 입력 */}
                    <div className="flex gap-4">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="제목이나 내용을 검색하세요..."
                            className="flex-1 border-2 border-natural-900 dark:border-dark-border px-4 py-3 text-natural-900 dark:text-dark-text bg-white dark:bg-dark-bg placeholder-natural-400 dark:placeholder-dark-text/50 focus:outline-none focus:ring-0 font-medium"
                            autoFocus
                        />
                        <Button
                            onClick={handleSearch}
                            disabled={!searchQuery.trim() || isSearching}
                            className="px-8"
                        >
                            {isSearching ? '검색 중...' : '검색'}
                        </Button>
                    </div>

                    {/* 검색 결과 개수 */}
                    {hasSearched && !isSearching && (
                        <div className="mt-4 pt-4 border-t-2 border-natural-900 dark:border-dark-border">
                            <p className="text-sm font-bold uppercase tracking-wider text-natural-600 dark:text-natural-400">
                                {diaries.length > 0
                                    ? `${diaries.length}개의 일기를 찾았습니다`
                                    : '검색 결과가 없습니다'}
                            </p>
                        </div>
                    )}
                </div>

                {/* 검색 결과 */}
                {isSearching ? (
                    <div className="text-center py-20">
                        <p className="text-natural-600 dark:text-dark-text font-bold uppercase tracking-wider">
                            검색 중...
                        </p>
                    </div>
                ) : hasSearched && diaries.length === 0 ? (
                    <div className="border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card p-12 text-center">
                        <div className="text-6xl mb-6">🔍</div>
                        <p className="text-natural-600 dark:text-dark-text/80 mb-2 text-lg">
                            "{searchQuery}" 검색 결과가 없습니다
                        </p>
                        <p className="text-sm text-natural-500 dark:text-dark-text/60">
                            다른 키워드로 검색해보세요
                        </p>
                    </div>
                ) : diaries.length > 0 ? (
                    <div className="space-y-4">
                        {diaries.map((diary) => (
                            <div
                                key={diary.id}
                                onClick={() => navigate(`/diary/${diary.id}`)}
                                className="border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-natural-50 dark:hover:bg-natural-900/20 transition-colors cursor-pointer group"
                            >
                                <div className="flex flex-col md:flex-row">
                                    {/* 썸네일 (있는 경우) */}
                                    {diary.thumbnail_url && (
                                        <div className="w-full md:w-48 h-48 overflow-hidden flex-shrink-0">
                                            <img
                                                src={diary.thumbnail_url}
                                                alt={diary.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        </div>
                                    )}

                                    {/* 텍스트 콘텐츠 */}
                                    <div className="flex-1 p-6">
                                        {/* 날짜와 감정 */}
                                        <div className="flex items-center gap-4 mb-3">
                                            <span className="text-xs font-bold uppercase tracking-wider text-natural-600 dark:text-natural-400">
                                                {formatDate(diary.writed_at)}
                                            </span>
                                            {diary.emotion && (
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 border-2 border-natural-900 dark:border-dark-border"
                                                        style={{ backgroundColor: emotionColors[diary.emotion] }}
                                                    />
                                                    <span className="text-xs font-bold uppercase tracking-wider text-natural-600 dark:text-natural-400">
                                                        {emotionKorean[diary.emotion]}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* 제목 */}
                                        <h3 className="font-serif font-bold text-xl text-natural-900 dark:text-dark-text mb-2 line-clamp-1">
                                            {highlightText(diary.title, searchQuery)}
                                        </h3>

                                        {/* 본문 미리보기 */}
                                        <p className="text-natural-600 dark:text-dark-text/80 text-sm line-clamp-2 leading-relaxed">
                                            {highlightText(diary.content, searchQuery)}
                                        </p>

                                        {/* 북마크 상태 표시 */}
                                        {diary.saved && (
                                            <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#DC2626]">
                                                <svg
                                                    className="w-4 h-4 fill-current"
                                                    viewBox="0 0 24 24"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                                                </svg>
                                                <span>북마크됨</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* 무한 스크롤 트리거 */}
                        <div ref={observerTarget} className="h-10">
                            {isLoadingMore && (
                                <p className="text-center text-natural-600 dark:text-dark-text font-bold uppercase tracking-wider">
                                    로딩 중...
                                </p>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
