import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api, type Diary } from '../utils/api';

export function DiaryEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 수정 모드인 경우 기존 일기 데이터 로드
    useEffect(() => {
        if (isEditMode && id) {
            const loadDiary = async () => {
                setIsLoading(true);
                const { data, error } = await api.diary.getById(id);

                if (error) {
                    setError(error);
                } else if (data) {
                    setTitle(data.title || '');
                    setContent(data.content || '');
                }

                setIsLoading(false);
            };

            loadDiary();
        }
    }, [id, isEditMode]);

    const handleSave = async () => {
        if (!content.trim()) {
            alert('일기 내용을 입력해주세요.');
            return;
        }

        setIsSaving(true);
        setError(null);

        let result: { data?: Diary; error?: string };

        if (isEditMode && id) {
            // 일기 수정
            result = await api.diary.update(id, title.trim() || undefined, content.trim());
        } else {
            // 일기 새로 작성
            result = await api.diary.createDirect(title.trim() || undefined, content.trim());
        }

        if (result.error) {
            setError(result.error);
            alert(`일기 ${isEditMode ? '수정' : '작성'}에 실패했습니다: ${result.error}`);
        } else if (result.data) {
            // 성공 시 일기 상세 페이지로 이동
            navigate(`/diary/${result.data.id}`);
        }

        setIsSaving(false);
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

    return (
        <div className="min-h-screen bg-accent-cream dark:bg-dark-bg">
            <ThemeToggle />

            {/* 헤더 */}
            <header className="border-b-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card">
                <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="text-2xl md:text-3xl font-serif font-bold text-natural-900 dark:text-dark-text tracking-tight hover:underline"
                    >
                        Daily Log
                    </button>
                    <h1 className="text-xl font-bold uppercase tracking-wider text-natural-900 dark:text-dark-text">
                        {isEditMode ? '일기 수정' : '일기 작성'}
                    </h1>
                </div>
            </header>

            {/* 메인 콘텐츠 */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-8">
                    {error && (
                        <div className="mb-6 p-4 border-2 border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/20">
                            <p className="text-red-600 dark:text-red-500 font-bold">
                                {error}
                            </p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* 제목 입력 */}
                        <Input
                            label="제목 (선택사항)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="일기 제목을 입력하세요"
                        />

                        {/* 내용 입력 */}
                        <div>
                            <label className="block text-sm font-bold uppercase tracking-wider text-natural-900 dark:text-dark-text mb-2">
                                내용 *
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="오늘 하루를 기록해보세요..."
                                className="w-full min-h-[400px] px-4 py-3 border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-bg text-natural-900 dark:text-dark-text placeholder-natural-400 dark:placeholder-natural-600 focus:outline-none focus:ring-0 resize-y"
                                required
                            />
                        </div>

                        {/* 버튼 그룹 */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || !content.trim()}
                                className="flex-1"
                            >
                                {isSaving ? '저장 중...' : isEditMode ? '수정하기' : '작성하기'}
                            </Button>
                            <Button
                                onClick={() => navigate(-1)}
                                variant="outline"
                                disabled={isSaving}
                            >
                                취소
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
