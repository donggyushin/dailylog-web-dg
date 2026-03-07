import { Button } from './ui/Button';

interface DiaryEntryProps {
  title: string;
  content: string;
  createdAt: string;
  messageId?: string;
  onSaveDiary?: (messageId: string) => void;
  isSaving?: boolean;
  showSaveButton?: boolean;
  thumbnailUrl?: string;
  emotion?: string;
}

export function DiaryEntry({
  title,
  content,
  createdAt,
  messageId,
  onSaveDiary,
  isSaving = false,
  showSaveButton = true,
  thumbnailUrl,
  emotion
}: DiaryEntryProps) {
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

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="border-2 border-natural-900 dark:border-dark-border bg-natural-50 dark:bg-dark-card p-8 md:p-12">
        {/* 날짜 + Emotion */}
        <div className="flex items-center justify-end gap-2 mb-6">
          {getEmotionEmoji(emotion) && (
            <span className="text-lg" role="img" aria-label={emotion}>
              {getEmotionEmoji(emotion)}
            </span>
          )}
          <span className="text-sm font-bold uppercase tracking-wider text-natural-600 dark:text-natural-400">
            {formatDate(createdAt)}
          </span>
        </div>

        {/* 구분선 */}
        <div className="border-t-2 border-natural-900 dark:border-dark-border mb-8"></div>

        {/* 썸네일 (있는 경우) */}
        {thumbnailUrl && (
          <div className="mb-8">
            <div className="border-2 border-natural-900 dark:border-dark-border overflow-hidden">
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-auto"
              />
            </div>
          </div>
        )}

        {/* 제목 */}
        <h2 className="font-serif font-bold text-3xl md:text-4xl text-center text-natural-900 dark:text-dark-text mb-8 leading-tight">
          {title}
        </h2>

        {/* 구분선 */}
        <div className="border-t-2 border-natural-900 dark:border-dark-border mb-8"></div>

        {/* 본문 */}
        <div className="prose prose-lg max-w-none">
          <div className="text-natural-900 dark:text-dark-text leading-relaxed whitespace-pre-wrap">
            {content.split('\n\n').map((paragraph, index) => (
              <p
                key={index}
                className="mb-6 last:mb-0 text-justify indent-8"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* 하단 장식 */}
        <div className="mt-12 pt-6 border-t-2 border-natural-900 dark:border-dark-border">
          <div className="text-center text-sm font-bold uppercase tracking-widest text-natural-600 dark:text-natural-400">
            Daily Log
          </div>
        </div>
      </div>

      {/* 일기 저장 버튼 (선택적 표시) */}
      {showSaveButton && messageId && onSaveDiary && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => onSaveDiary(messageId)}
            disabled={isSaving}
            className="px-8 py-4 text-lg"
          >
            {isSaving ? '저장 중...' : '이대로 일기 작성하기'}
          </Button>
        </div>
      )}
    </div>
  );
}
