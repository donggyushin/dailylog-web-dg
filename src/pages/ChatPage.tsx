import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Button } from '../components/ui/Button';
import { DiaryEntry } from '../components/DiaryEntry';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

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

  // 일기 저장 핸들러
  const handleSaveDiary = async (messageId: string) => {
    if (!session) return;

    setIsSavingDiary(true);
    try {
      const { data, error } = await api.diary.create(session.id, messageId);

      if (data && !error) {
        // 홈화면으로 이동
        navigate('/');
      } else {
        console.error('Failed to save diary:', error);
      }
    } catch (error) {
      console.error('Error saving diary:', error);
    } finally {
      setIsSavingDiary(false);
    }
  };

  // 세션 종료 핸들러
  const handleEndSession = async () => {
    setIsEndingSession(true);
    try {
      const { error } = await api.chat.endCurrentSession();

      if (!error) {
        // 홈화면으로 이동
        navigate('/');
      } else {
        console.error('Failed to end session:', error);
      }
    } catch (error) {
      console.error('Error ending session:', error);
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
    if (isSending || !inputMessage.trim() || !user || !session) return;

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
        // 에러 처리
        console.error('Failed to send message:', error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
            <h1 className="font-serif font-bold text-2xl text-natural-900 dark:text-dark-text">
              Daily Log 대화
            </h1>
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
        {messages.map((message) => {
          const diaryData = parseDiaryEntry(message.content);

          // 일기 형식인 경우
          if (message.role === 'ASSISTANT' && diaryData.isDiary) {
            return (
              <div key={message.id} className="w-full">
                <DiaryEntry
                  title={diaryData.title!}
                  content={diaryData.content!}
                  createdAt={message.created_at}
                  messageId={message.id}
                  onSaveDiary={handleSaveDiary}
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
            placeholder="메시지를 입력하세요... (Shift + Enter로 줄바꿈)"
            rows={1}
            className="flex-1 px-4 py-3 border-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-bg text-natural-900 dark:text-dark-text placeholder-natural-400 focus:outline-none focus:ring-2 focus:ring-natural-900 dark:focus:ring-dark-border resize-none overflow-hidden"
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
            disabled={isSending || !inputMessage.trim() || isDiaryWritten}
          >
            전송
          </Button>
        </form>
      </div>
    </div>
  );
}
