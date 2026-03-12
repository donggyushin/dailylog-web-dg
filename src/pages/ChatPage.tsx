import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Button } from '../components/ui/Button';
import { EditableDiaryEntry } from '../components/EditableDiaryEntry';

interface Message {
  id: string;
  user_id: string;
  role: 'SYSTEM' | 'USER' | 'ASSISTANT';
  content: string;
  created_at: string;
}

interface Session {
  id: string;
  user_id: string;
  active: boolean;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

const MESSAGE_LIMIT = 50;

export function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDiaryWritten, setIsDiaryWritten] = useState(false);
  const [isSavingDiary, setIsSavingDiary] = useState(false);
  const [hasTodayDiary, setHasTodayDiary] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isMessageLimitReached, setIsMessageLimitReached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const hasAutoRequestedDiaryRef = useRef(false);

  // 일기 형식 파싱
  const parseDiaryEntry = (content: string) => {
    const titleMatch = content.match(/\[TITLE_START\](.*?)\[TITLE_END\]/s);
    const contentMatch = content.match(/\[CONTENT_START\](.*?)\[CONTENT_END\]/s);

    if (titleMatch && contentMatch) {
      return {
        isDiary: true,
        title: titleMatch[1].trim(),
        content: contentMatch[1].trim(),
      };
    }

    return { isDiary: false };
  };

  // 메시지 목록 끝으로 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 세션 로드 전 오늘 일기 확인
  useEffect(() => {
    const checkTodayDiaryAndLoadSession = async () => {
      setIsLoading(true);

      // 오늘 날짜 (YYYY-MM-DD 형식)
      const today = new Date().toISOString().split('T')[0];

      // 오늘 일기가 있는지 확인
      const { data: diaryData, error: diaryError } = await api.diary.getByDate(today);

      // 정상 응답이 왔다면 (이미 오늘 일기를 작성함)
      if (diaryData && !diaryError) {
        setHasTodayDiary(true);
        setIsLoading(false);
        return;
      }

      // 오늘 일기가 없으면 세션 로드
      const { data, error } = await api.chat.getCurrentSession();

      if (data && !error) {
        const sessionData = data as Session;
        setSession(sessionData);
        // SYSTEM 메시지 제외
        const filteredMessages = sessionData.messages.filter(
          (msg) => msg.role !== 'SYSTEM'
        );
        setMessages(filteredMessages);
      }

      setIsLoading(false);
    };

    checkTodayDiaryAndLoadSession();
  }, []);

  // 메시지 변경 시 스크롤 & 일기 작성 여부 확인
  useEffect(() => {
    scrollToBottom();

    // 마지막 메시지가 일기인지 확인
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'ASSISTANT') {
        const diaryData = parseDiaryEntry(lastMessage.content);
        if (diaryData.isDiary) {
          setIsDiaryWritten(true);
        }
      }
    }
  }, [messages, isSending]);

  // 메시지 개수가 50개를 넘으면 자동으로 일기 작성 요청
  useEffect(() => {
    const autoRequestDiary = async () => {
      // 이미 요청했거나, 전송 중이거나, 세션이 없거나, 유저가 없으면 무시
      if (
        hasAutoRequestedDiaryRef.current ||
        isSending ||
        !user ||
        !session ||
        isDiaryWritten
      ) {
        return;
      }

      // 메시지가 MESSAGE_LIMIT를 넘으면
      if (messages.length > MESSAGE_LIMIT) {
        setIsMessageLimitReached(true);
        hasAutoRequestedDiaryRef.current = true;
        setIsSending(true);

        try {
          const { data, error } = await api.chat.sendMessage(
            session.id,
            user.id,
            '이제 일기를 작성해줘.'
          );

          if (data && !error) {
            const assistantMessage = data as Message;
            setMessages((prev) => [...prev, assistantMessage]);
          } else {
            setError('자동 일기 요청에 실패했습니다. 직접 "일기를 작성해줘"라고 입력해주세요.');
          }
        } catch (err) {
          const errorMessage = err instanceof Error
            ? err.message
            : '자동 일기 요청 중 오류가 발생했습니다.';
          setError(errorMessage);
        } finally {
          setIsSending(false);
        }
      }
    };

    autoRequestDiary();
  }, [messages.length, user, session, isSending, isDiaryWritten]);

  // 일기 저장 핸들러
  const handleSaveDiary = async (title: string, content: string) => {
    setIsSavingDiary(true);
    setError(null);

    try {
      const { data, error } = await api.diary.createDirect(
        title,
        content,
        session?.id
      );

      if (error) {
        setError(error);
        alert(`일기 저장에 실패했습니다: ${error}`);
      } else if (data) {
        navigate(`/diary/${data.id}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      alert(`일기 저장 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setIsSavingDiary(false);
    }
  };

  // 세션 종료 핸들러
  const handleEndSession = async () => {
    setIsEndingSession(true);
    setError(null);

    try {
      const { error } = await api.chat.endCurrentSession();

      if (!error) {
        navigate('/');
      } else {
        setError('세션 종료에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : '세션 종료 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setIsEndingSession(false);
    }
  };

  // 한글 조합 시작
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  // 한글 조합 종료
  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  // 키 입력 처리 (Shift + Enter = 줄바꿈, Enter = 전송)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 한글 조합 중일 때는 Enter 키 무시
    if (isComposingRef.current) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // 메시지 전송
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    // 중복 전송 방지: 이미 전송 중이면 무시
    // 메시지 개수 제한에 도달했거나 일기가 작성되었으면 무시
    if (
      isSending ||
      !inputMessage.trim() ||
      !user ||
      !session ||
      isMessageLimitReached ||
      isDiaryWritten
    ) {
      return;
    }

    const userMessage: Message = {
      id: 'temp-' + Date.now(),
      user_id: user.id,
      role: 'USER',
      content: inputMessage,
      created_at: new Date().toISOString(),
    };

    // 유저 메시지 즉시 표시
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');

    // textarea 높이 원래대로 복원
    if (textareaRef.current) {
      textareaRef.current.style.height = '3rem';
    }

    setIsSending(true);

    try {
      const { data, error } = await api.chat.sendMessage(
        session.id,
        user.id,
        inputMessage
      );

      if (data && !error) {
        const assistantMessage = data as Message;
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setError('메시지 전송에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : '메시지 전송 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-accent-cream dark:bg-dark-bg flex items-center justify-center">
        <div className="text-natural-900 dark:text-dark-text font-bold uppercase tracking-wider">
          로딩 중...
        </div>
      </div>
    );
  }

  // 오늘 이미 일기를 작성한 경우
  if (hasTodayDiary) {
    return (
      <div className="min-h-screen bg-accent-cream dark:bg-dark-bg flex items-center justify-center">
        <div className="max-w-md mx-auto px-6 text-center">
          <div className="border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card p-8">
            <h2 className="font-serif font-bold text-2xl text-natural-900 dark:text-dark-text mb-4">
              오늘은 이미 일기를 작성했어요
            </h2>
            <p className="text-natural-600 dark:text-dark-text/80 mb-6">
              내일 또 만나요!
            </p>
            <Button onClick={() => navigate('/')}>
              홈으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent-cream dark:bg-dark-bg flex flex-col">
      {/* 헤더 */}
      <header className="border-b-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card p-4">
        <div className="flex justify-between items-start">
          <div>
            <Link to="/">
              <h1 className="font-serif font-bold text-2xl text-natural-900 dark:text-dark-text hover:opacity-70 transition-opacity cursor-pointer">
                Daily Log
              </h1>
            </Link>
            <p className="text-sm text-natural-600 dark:text-natural-400 mt-1">
              오늘 하루를 함께 돌아봐요
            </p>
          </div>
          <Button
            onClick={handleEndSession}
            disabled={isEndingSession}
            variant="outline"
          >
            {isEndingSession ? '종료 중...' : '대화 종료'}
          </Button>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 메시지 개수 제한 안내 */}
        {isMessageLimitReached && !isDiaryWritten && (
          <div className="border-2 border-natural-900 dark:border-dark-border bg-natural-100 dark:bg-dark-card p-4">
            <div className="font-bold uppercase tracking-wider text-xs mb-2 text-natural-900 dark:text-dark-text">
              안내
            </div>
            <div className="text-natural-900 dark:text-dark-text">
              대화가 너무 길어져서 더 이상 대화를 할 수 없습니다.
              <br />
              AI가 지금까지의 대화를 바탕으로 일기를 작성하고 있습니다.
            </div>
          </div>
        )}

        {/* 에러 표시 */}
        {error && (
          <div className="border-2 border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/20 p-4">
            <div className="font-bold uppercase tracking-wider text-xs mb-2 text-red-600 dark:text-red-500">
              오류
            </div>
            <div className="text-red-600 dark:text-red-500">
              {error}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const diaryData = parseDiaryEntry(message.content);

          // 일기 형식인 경우
          if (message.role === 'ASSISTANT' && diaryData.isDiary) {
            return (
              <div key={message.id} className="w-full">
                <EditableDiaryEntry
                  title={diaryData.title!}
                  content={diaryData.content!}
                  createdAt={message.created_at}
                  emotion={undefined}
                  onSave={handleSaveDiary}
                  isSaving={isSavingDiary}
                />
              </div>
            );
          }

          // 일반 메시지인 경우
          return (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'USER' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] border-2 border-natural-900 dark:border-dark-border p-4 ${
                  message.role === 'USER'
                    ? 'bg-natural-900 dark:bg-dark-text text-white dark:text-dark-bg'
                    : 'bg-white dark:bg-dark-card text-natural-900 dark:text-dark-text'
                }`}
              >
                <div className="font-bold uppercase tracking-wider text-xs mb-2 opacity-70">
                  {message.role === 'USER' ? '나' : 'AI'}
                </div>
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* 로딩 인디케이터 */}
        {isSending && (
          <div className="flex justify-start">
            <div className="max-w-[70%] border-2 border-natural-900 dark:border-dark-border p-4 bg-white dark:bg-dark-card">
              <div className="font-bold uppercase tracking-wider text-xs mb-2 opacity-70 text-natural-900 dark:text-dark-text">
                AI
              </div>
              <div className="flex space-x-1">
                <span className="animate-bounce text-natural-900 dark:text-dark-text">.</span>
                <span
                  className="animate-bounce text-natural-900 dark:text-dark-text"
                  style={{ animationDelay: '0.2s' }}
                >
                  .
                </span>
                <span
                  className="animate-bounce text-natural-900 dark:text-dark-text"
                  style={{ animationDelay: '0.4s' }}
                >
                  .
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={
              isMessageLimitReached || isDiaryWritten
                ? '대화가 종료되었습니다'
                : '메시지를 입력하세요... (Shift + Enter로 줄바꿈)'
            }
            rows={1}
            disabled={isMessageLimitReached || isDiaryWritten}
            className="flex-1 px-4 py-3 border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-bg text-natural-900 dark:text-dark-text placeholder-natural-400 focus:outline-none focus:ring-2 focus:ring-natural-900 dark:focus:ring-dark-border resize-none overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              minHeight: '3rem',
              maxHeight: '12rem',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = '3rem';
              target.style.height = Math.min(target.scrollHeight, 192) + 'px';
            }}
          />
          <Button
            type="submit"
            disabled={isSending || !inputMessage.trim() || isDiaryWritten || isMessageLimitReached}
          >
            전송
          </Button>
        </form>
      </div>
    </div>
  );
}
