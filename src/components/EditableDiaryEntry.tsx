import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const MIN_CONTENT_LENGTH = 30;

interface EditableDiaryEntryProps {
  title: string;
  content: string;
  createdAt: string;
  emotion?: string;
  onSave: (title: string, content: string) => void;
  isSaving: boolean;
}

export function EditableDiaryEntry({
  title,
  content,
  createdAt,
  emotion,
  onSave,
  isSaving
}: EditableDiaryEntryProps) {
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedContent, setEditedContent] = useState(content);
  const [contentError, setContentError] = useState<string | null>(null);

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  // 감정에 따른 이모지 매핑
  const getEmotionEmoji = (emotionValue?: string) => {
    if (!emotionValue) return null;

    const emotionMap: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      anxious: '😰',
      peaceful: '😌',
      normal: '😐'
    };

    return emotionMap[emotionValue] || null;
  };

  // 유효성 검사
  const validateContent = (value: string): string | null => {
    if (!value.trim()) {
      return '일기 내용을 입력해주세요.';
    }

    if (value.trim().length < MIN_CONTENT_LENGTH) {
      return `최소 ${MIN_CONTENT_LENGTH}자 이상 입력해주세요. (현재 ${value.trim().length}자)`;
    }

    return null;
  };

  // 내용 변경 핸들러
  const handleContentChange = (value: string) => {
    setEditedContent(value);
    setContentError(validateContent(value));
  };

  // 편집 취소 (AI 초안으로 되돌리기)
  const handleReset = () => {
    setEditedTitle(title);
    setEditedContent(content);
    setContentError(null);
  };

  // 저장 핸들러
  const handleSave = () => {
    const error = validateContent(editedContent);
    if (error) {
      setContentError(error);
      return;
    }

    onSave(editedTitle, editedContent);
  };

  const isValid = !contentError && editedContent.trim().length >= MIN_CONTENT_LENGTH;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="border-2 border-natural-900 dark:border-dark-border bg-natural-50 dark:bg-dark-card p-8 md:p-12">
        {/* 날짜 + Emotion (읽기 전용) */}
        <div className="flex items-center justify-end gap-2 mb-6">
          {(() => {
            const emotionEmoji = getEmotionEmoji(emotion);
            return emotionEmoji && (
              <span className="text-lg" role="img" aria-label={emotion}>
                {emotionEmoji}
              </span>
            );
          })()}
          <span className="text-sm font-bold uppercase tracking-wider text-natural-600 dark:text-natural-400">
            {formatDate(createdAt)}
          </span>
        </div>

        {/* 구분선 */}
        <div className="border-t-2 border-natural-900 dark:border-dark-border mb-8"></div>

        {/* 제목 입력 */}
        <div className="mb-8">
          <Input
            label="제목 (선택사항)"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            placeholder="일기 제목을 입력하세요"
          />
        </div>

        {/* 구분선 */}
        <div className="border-t-2 border-natural-900 dark:border-dark-border mb-8"></div>

        {/* 내용 입력 */}
        <div className="mb-6">
          <label className="block text-sm font-bold uppercase tracking-wider text-natural-900 dark:text-dark-text mb-2">
            내용 * (최소 30자)
          </label>
          <textarea
            value={editedContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="오늘 하루를 기록해보세요..."
            className="w-full min-h-[400px] px-4 py-3 border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-bg text-natural-900 dark:text-dark-text placeholder-natural-400 dark:placeholder-natural-600 focus:outline-none focus:ring-2 focus:ring-natural-900 dark:focus:ring-dark-border resize-y"
          />
          <p className={`mt-2 text-sm ${
            editedContent.trim().length < MIN_CONTENT_LENGTH
              ? 'text-red-600 dark:text-red-500 font-bold'
              : 'text-natural-600 dark:text-natural-400'
          }`}>
            {editedContent.trim().length} / {MIN_CONTENT_LENGTH}자
          </p>
          {contentError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-500 font-bold">
              {contentError}
            </p>
          )}
        </div>

        {/* 하단 장식 */}
        <div className="mt-12 pt-6 border-t-2 border-natural-900 dark:border-dark-border">
          <div className="text-center text-sm font-bold uppercase tracking-widest text-natural-600 dark:text-natural-400">
            Daily Log
          </div>
        </div>
      </div>

      {/* 버튼 그룹 */}
      <div className="mt-6 flex gap-4 justify-center">
        <Button
          onClick={handleSave}
          disabled={isSaving || !isValid}
          className="px-8 py-4 text-lg"
        >
          {isSaving ? '저장 중...' : '일기 작성하기'}
        </Button>
        <Button
          onClick={handleReset}
          disabled={isSaving}
          variant="outline"
          className="px-8 py-4 text-lg"
        >
          편집 취소
        </Button>
      </div>
    </div>
  );
}
