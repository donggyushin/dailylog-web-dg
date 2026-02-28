import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DiaryEntry } from '../components/DiaryEntry';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Button } from '../components/ui/Button';
import { api, type Diary } from '../utils/api';

export function DiaryDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [diary, setDiary] = useState<Diary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);
    const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState<number>(0);
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    const [isUpdatingThumbnail, setIsUpdatingThumbnail] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const loadDiary = async () => {
            if (!id) {
                setError('일기 ID가 없습니다.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            const { data, error } = await api.diary.getById(id);

            if (error) {
                setError(error);
            } else if (data) {
                setDiary(data);
            }

            setIsLoading(false);
        };

        loadDiary();
    }, [id]);

    const handleGenerateThumbnail = async () => {
        if (!id || generatedThumbnails.length >= 3) return;

        setIsGeneratingThumbnail(true);
        const { data, error } = await api.diary.getThumbnail(id);

        if (error) {
            alert('썸네일 생성에 실패했습니다: ' + error);
        } else if (data && data.img_url) {
            setGeneratedThumbnails(prev => [...prev, data.img_url]);
            // 새로 생성된 썸네일을 자동으로 선택
            setSelectedThumbnailIndex(generatedThumbnails.length);
        }

        setIsGeneratingThumbnail(false);
    };

    const handleApplyThumbnail = async () => {
        if (!id || generatedThumbnails.length === 0) return;

        const selectedImageUrl = generatedThumbnails[selectedThumbnailIndex];
        setIsUpdatingThumbnail(true);

        const { data, error } = await api.diary.updateThumbnail(id, selectedImageUrl);

        if (error) {
            alert('썸네일 적용에 실패했습니다: ' + error);
        } else if (data) {
            setDiary(data);
            alert('썸네일이 성공적으로 적용되었습니다.');
        }

        setIsUpdatingThumbnail(false);
    };

    const handleDelete = async () => {
        if (!id) return;

        const confirmed = window.confirm('정말로 이 일기를 삭제하시겠습니까?');
        if (!confirmed) return;

        setIsDeleting(true);
        const { error } = await api.diary.delete(id);

        if (error) {
            alert('일기 삭제에 실패했습니다: ' + error);
            setIsDeleting(false);
        } else {
            alert('일기가 삭제되었습니다.');
            navigate('/');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-accent-cream dark:bg-dark-bg flex items-center justify-center">
                <p className="text-natural-600 dark:text-dark-text font-bold uppercase tracking-wider">
                    로딩 중...
                </p>
            </div>
        );
    }

    if (error || !diary) {
        return (
            <div className="min-h-screen bg-accent-cream dark:bg-dark-bg flex items-center justify-center">
                <div className="text-center">
                    <p className="text-natural-600 dark:text-dark-text mb-6">
                        {error || '일기를 찾을 수 없습니다.'}
                    </p>
                    <Button onClick={() => navigate('/')}>
                        홈으로 돌아가기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-accent-cream dark:bg-dark-bg">
            <ThemeToggle />

            {/* 헤더 */}
            <header className="border-b-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card">
                <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="text-2xl md:text-3xl font-serif font-bold text-natural-900 dark:text-dark-text tracking-tight hover:underline"
                    >
                        Daily Log
                    </button>
                    <div className="flex gap-4">
                        <Button
                            onClick={() => navigate(`/chat/history/${id}`)}
                            variant="outline"
                            size="sm"
                        >
                            대화 보기
                        </Button>
                        <Button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            variant="outline"
                            size="sm"
                            className="border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white"
                        >
                            {isDeleting ? '삭제 중...' : '삭제'}
                        </Button>
                        <Button
                            onClick={() => navigate('/')}
                            variant="outline"
                            size="sm"
                        >
                            ← 목록으로
                        </Button>
                    </div>
                </div>
            </header>

            {/* 메인 콘텐츠 */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* 좌측: 일기 내용 */}
                    <div className="flex-1">
                        <DiaryEntry
                            title={diary.title}
                            content={diary.content}
                            createdAt={diary.writed_at}
                            thumbnailUrl={diary.thumbnail_url}
                            showSaveButton={false}
                        />
                    </div>

                    {/* 우측: 썸네일 생성 섹션 - 일기에 썸네일이 없을 때만 표시 */}
                    {!diary.thumbnail_url && (
                        <div className="w-full lg:w-96 border-l-0 lg:border-l-2 border-t-2 lg:border-t-0 border-natural-900 dark:border-dark-border pt-8 lg:pt-0 lg:pl-8">
                            <h2 className="text-2xl font-serif font-bold text-natural-900 dark:text-dark-text mb-6 uppercase tracking-tight">
                                썸네일 추가
                            </h2>

                            {/* 썸네일 추가하기 버튼 */}
                            <div className="mb-8">
                                <Button
                                    onClick={handleGenerateThumbnail}
                                    disabled={isGeneratingThumbnail || generatedThumbnails.length >= 3}
                                    className="w-full"
                                >
                                    {isGeneratingThumbnail ? '썸네일 생성 중...' : '썸네일 추가하기'}
                                </Button>
                                <p className="mt-2 text-sm text-natural-600 dark:text-dark-text font-bold uppercase tracking-wider">
                                    {generatedThumbnails.length} / 3개 생성됨
                                </p>
                            </div>

                            {/* 생성된 썸네일이 있을 때 */}
                            {generatedThumbnails.length > 0 && (
                                <div className="space-y-6">
                                    {/* 선택된 썸네일 크게 보기 */}
                                    <div className="border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card p-4">
                                        <p className="text-sm font-bold uppercase tracking-wider text-natural-600 dark:text-dark-text mb-4">
                                            선택된 이미지
                                        </p>
                                        <img
                                            src={generatedThumbnails[selectedThumbnailIndex]}
                                            alt="선택된 썸네일"
                                            className="w-full h-auto border-2 border-natural-900 dark:border-dark-border"
                                        />
                                        <Button
                                            onClick={handleApplyThumbnail}
                                            disabled={isUpdatingThumbnail}
                                            className="w-full mt-4"
                                        >
                                            {isUpdatingThumbnail ? '적용 중...' : '이 이미지로 일기 썸네일 지정하기'}
                                        </Button>
                                    </div>

                                    {/* 썸네일 그리드 */}
                                    <div className="border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card p-4">
                                        <p className="text-sm font-bold uppercase tracking-wider text-natural-600 dark:text-dark-text mb-4">
                                            생성된 썸네일들
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            {generatedThumbnails.map((thumbnail, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setSelectedThumbnailIndex(index)}
                                                    className={`border-2 ${
                                                        selectedThumbnailIndex === index
                                                            ? 'border-natural-900 dark:border-dark-text'
                                                            : 'border-natural-400 dark:border-natural-600'
                                                    } hover:border-natural-900 dark:hover:border-dark-text transition-colors`}
                                                >
                                                    <img
                                                        src={thumbnail}
                                                        alt={`썸네일 ${index + 1}`}
                                                        className="w-full h-auto"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
