import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../utils/api';
import type { EmotionTimelineResponse, EmotionTimelineItem } from '../utils/api';

const EMOTION_LABELS: Record<string, string> = {
  happy: '행복',
  sad: '슬픔',
  angry: '분노',
  anxious: '불안',
  peaceful: '평온',
  normal: '평범',
};

const EMOTION_COLORS: Record<string, string> = {
  happy: '#FFD700',
  sad: '#4682B4',
  angry: '#DC143C',
  anxious: '#9370DB',
  peaceful: '#98FB98',
  normal: '#D3D3D3',
};

const DAYS_PER_LOAD = 60; // 한 번에 60일씩 로드

export function StatisticsPage() {
  const navigate = useNavigate();
  const [allData, setAllData] = useState<EmotionTimelineItem[]>([]);
  const [summary, setSummary] = useState<EmotionTimelineResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [oldestDate, setOldestDate] = useState<string | null>(null);

  // 날짜를 YYYY-MM-DD 형식으로 변환
  const formatDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // 초기 데이터 로드
  const loadInitialData = async () => {
    setLoading(true);
    setError('');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - DAYS_PER_LOAD);

    const response = await api.statistics.getEmotionTimeline(
      formatDateString(startDate),
      formatDateString(endDate)
    );

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      const sortedData = response.data.timeline.sort(
        (a, b) => new Date(a.diary_date).getTime() - new Date(b.diary_date).getTime()
      );
      setAllData(sortedData);
      setSummary(response.data.summary);

      if (sortedData.length > 0) {
        setOldestDate(sortedData[0].diary_date);
      }

      setHasMore(sortedData.length > 0);
    }

    setLoading(false);
  };

  // 이전 데이터 로드 (무한 스크롤)
  const loadMoreData = async () => {
    if (!hasMore || loadingMore || !oldestDate) return;

    setLoadingMore(true);

    const endDate = new Date(oldestDate);
    endDate.setDate(endDate.getDate() - 1); // 기존 데이터 하루 전부터
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - DAYS_PER_LOAD);

    const response = await api.statistics.getEmotionTimeline(
      formatDateString(startDate),
      formatDateString(endDate)
    );

    if (response.data) {
      const newData = response.data.timeline;

      if (newData.length === 0) {
        setHasMore(false);
      } else {
        const sortedNewData = newData.sort(
          (a, b) => new Date(a.diary_date).getTime() - new Date(b.diary_date).getTime()
        );

        // 스크롤 위치 유지를 위해 이전 스크롤 너비 저장
        const container = scrollContainerRef.current;
        const oldScrollWidth = container?.scrollWidth || 0;
        const oldScrollLeft = container?.scrollLeft || 0;

        setAllData(prev => [...sortedNewData, ...prev]);
        setOldestDate(sortedNewData[0].diary_date);

        // 새 데이터 추가 후 스크롤 위치 복원
        setTimeout(() => {
          if (container) {
            const newScrollWidth = container.scrollWidth;
            const widthDiff = newScrollWidth - oldScrollWidth;
            container.scrollLeft = oldScrollLeft + widthDiff;
          }
        }, 0);
      }
    }

    setLoadingMore(false);
  };

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 왼쪽 끝에 가까워지면 (50px 이내) 더 로드
    if (container.scrollLeft < 50 && hasMore && !loadingMore) {
      loadMoreData();
    }
  }, [hasMore, loadingMore, oldestDate]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // 초기 로드 후 스크롤을 우측 끝으로 이동
  useEffect(() => {
    if (!loading && allData.length > 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollLeft = container.scrollWidth;
    }
  }, [loading, allData.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 차트 데이터로 변환
  const chartData = allData.map(item => ({
    date: item.diary_date,
    score: item.emotion_score,
    emotion: item.emotion,
    diary_id: item.diary_id,
    title: item.title,
  }));

  // 커스텀 점 컴포넌트
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const emotion = payload.emotion;
    const color = EMOTION_COLORS[emotion] || '#D3D3D3';

    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={color}
        stroke="#0A0A08"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={() => navigate(`/diary/${payload.diary_id}`)}
      />
    );
  };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-4">
        <div className="font-bold text-natural-900 dark:text-dark-text mb-2">
          {data.date}
        </div>
        {data.title && (
          <div className="text-sm text-natural-600 dark:text-natural-400 mb-2">
            {data.title}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 border-2 border-natural-900"
            style={{ backgroundColor: EMOTION_COLORS[data.emotion] }}
          />
          <span className="text-sm font-bold uppercase">
            {EMOTION_LABELS[data.emotion] || data.emotion}
          </span>
          <span className="text-sm text-natural-600 dark:text-natural-400">
            강도 {data.score}/10
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-accent-cream dark:bg-dark-bg flex items-center justify-center">
        <div className="text-natural-900 dark:text-dark-text font-bold uppercase tracking-wider">
          로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-accent-cream dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-natural-900 dark:text-dark-text mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-natural-900 dark:bg-dark-text text-white dark:text-dark-bg px-6 py-3 border-2 border-natural-900 dark:border-dark-border hover:bg-white dark:hover:bg-dark-bg hover:text-natural-900 dark:hover:text-dark-text transition-colors font-bold uppercase tracking-wider"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent-cream dark:bg-dark-bg">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Header */}
      <header className="border-b-2 border-natural-900 dark:border-dark-border bg-white dark:bg-dark-card">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link
            to="/"
            className="font-serif font-bold text-2xl text-natural-900 dark:text-dark-text underline hover:no-underline"
          >
            Daily Log
          </Link>
          <Link
            to="/"
            className="text-natural-900 dark:text-dark-text font-bold uppercase tracking-wider underline hover:no-underline"
          >
            ← 홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="mb-8">
          <h1 className="font-serif font-bold text-4xl text-natural-900 dark:text-dark-text mb-2">
            감정 타임라인
          </h1>
          <p className="text-natural-600 dark:text-natural-400">
            {hasMore && '← 좌측으로 스크롤하여 과거 데이터 보기'}
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-6">
              <div className="font-bold uppercase tracking-wider text-xs text-natural-600 dark:text-natural-400 mb-2">
                총 일기 수
              </div>
              <div className="font-serif font-bold text-3xl text-natural-900 dark:text-dark-text">
                {summary.total_count}
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-6">
              <div className="font-bold uppercase tracking-wider text-xs text-natural-600 dark:text-natural-400 mb-2">
                가장 흔한 감정
              </div>
              <div className="font-serif font-bold text-3xl text-natural-900 dark:text-dark-text">
                {summary.most_common_emotion
                  ? EMOTION_LABELS[summary.most_common_emotion] || summary.most_common_emotion
                  : '없음'}
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-6">
              <div className="font-bold uppercase tracking-wider text-xs text-natural-600 dark:text-natural-400 mb-2">
                표시 중인 기간
              </div>
              <div className="font-bold text-lg text-natural-900 dark:text-dark-text">
                {allData.length > 0 ? (
                  <>
                    {allData[0].diary_date}
                    <br />~ {allData[allData.length - 1].diary_date}
                  </>
                ) : (
                  '데이터 없음'
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        {allData.length === 0 ? (
          <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-12 text-center">
            <p className="text-natural-600 dark:text-natural-400 text-lg">
              아직 작성된 일기가 없습니다.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-card border-2 border-natural-900 dark:border-dark-border p-6">
            {/* Loading indicator */}
            {loadingMore && (
              <div className="mb-4 text-center">
                <span className="text-sm text-natural-600 dark:text-natural-400 font-bold uppercase">
                  이전 데이터 로딩 중...
                </span>
              </div>
            )}

            {/* Chart Container with Fixed Y-Axis */}
            <div className="flex" style={{ height: '500px' }}>
              {/* Fixed Y-Axis Label */}
              <div className="flex items-center justify-center bg-white dark:bg-dark-card border-r-2 border-natural-900 dark:border-dark-border" style={{ width: '60px' }}>
                <div
                  className="font-bold uppercase text-sm text-natural-900 dark:text-dark-text"
                  style={{
                    writingMode: 'vertical-lr',
                    letterSpacing: '0.1em'
                  }}
                >
                  감정 강도
                </div>
              </div>

              {/* Scrollable Chart Area */}
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar"
                style={{
                  scrollbarWidth: 'none', // Firefox
                  msOverflowStyle: 'none', // IE and Edge
                }}
              >
                <div style={{ minWidth: `${Math.max(chartData.length * 40, 1200)}px`, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#D4D4C8" />
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12, fill: '#4A4A38' }}
                        stroke="#0A0A08"
                        strokeWidth={2}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fontSize: 12, fill: '#4A4A38' }}
                        stroke="#0A0A08"
                        strokeWidth={2}
                        width={50}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#0A0A08"
                        strokeWidth={2}
                        dot={<CustomDot />}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t-2 border-natural-900 dark:border-dark-border">
              <div className="font-bold uppercase tracking-wider text-xs text-natural-900 dark:text-dark-text mb-4">
                감정 범례
              </div>
              <div className="flex flex-wrap gap-4">
                {Object.entries(EMOTION_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span
                      className="inline-block w-4 h-4 border-2 border-natural-900 dark:border-dark-border"
                      style={{ backgroundColor: EMOTION_COLORS[key] }}
                    />
                    <span className="text-sm font-bold uppercase text-natural-900 dark:text-dark-text">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
