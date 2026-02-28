import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
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

export function ChatHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // 세션 로드
  useEffect(() => {
    const loadChatSession = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      setIsLoading(true);

      const { data, error } = await api.diary.getChatSession(id);

      if (data && !error) {
        const sessionData = data as Session;
        // SYSTEM 메시지 제외
        const filteredMessages = sessionData.messages.filter(
          (msg) => msg.role !== 'SYSTEM'
        );
        setMessages(filteredMessages);
      } else {
        console.error('Failed to load chat session:', error);
        // 에러 발생 시 홈으로 이동
        navigate('/');
      }

      setIsLoading(false);
    };

    loadChatSession();
  }, [id, navigate]);

  // 메시지 변경 시 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-accent-cream dark:bg-dark-bg flex items-center justify-center">
        <div className="text-natural-900 dark:text-dark-text font-bold uppercase tracking-wider">
          로딩 중...
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
              지난 대화 보기
            </p>
          </div>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((message) => {
          const diaryData = parseDiaryEntry(message.content);

          // 일기 형식인 경우 (저장 버튼 없이 표시)
          if (message.role === 'ASSISTANT' && diaryData.isDiary) {
            return (
              <div key={message.id} className="w-full">
                <DiaryEntry
                  title={diaryData.title!}
                  content={diaryData.content!}
                  createdAt={message.created_at}
                  showSaveButton={false}
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

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
