'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Message, Passage, MODE_SWITCH_MARKER } from '@/lib/types';
import PassagePanel, { PanelTab } from '@/components/PassagePanel';
import ChatPanel from '@/components/ChatPanel';
import ProgressBar from '@/components/ProgressBar';

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: '안녕! 지문 가져왔네. 문제 먼저 풀어봤어, 아니면 지금 처음 읽는 거야?',
};

type MobileTab = PanelTab | 'chat';

export default function SessionPage() {
  const router = useRouter();
  const [passage, setPassage] = useState<Passage | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>('passage');
  const [mobileTab, setMobileTab] = useState<MobileTab>('passage');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('selectedPassage');
    const key = sessionStorage.getItem('apiKey');
    const mdl = sessionStorage.getItem('model');

    if (!raw) {
      router.push('/select');
      return;
    }
    if (!key) {
      router.push('/');
      return;
    }

    try {
      setPassage(JSON.parse(raw));
    } catch {
      router.push('/select');
      return;
    }

    setApiKey(key);
    if (mdl) setModel(mdl);
    setPdfBase64(sessionStorage.getItem('pdfBase64'));
  }, [router]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const visitedParagraphs = useMemo(() => {
    const visited: Record<string, number> = {};
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      const matches = [...msg.content.matchAll(/\(([가나다라마바사])\)\s*(\d+)\s*문단/g)];
      for (const match of matches) {
        const section = match[1];
        const num = parseInt(match[2], 10);
        if (!visited[section] || visited[section] < num) {
          visited[section] = num;
        }
      }
    }
    return visited;
  }, [messages]);

  const streamChat = useCallback(
    async (messagesToSend: Message[]) => {
      if (!passage) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsStreaming(true);
      setMessages((prev) => [...prev, { role: 'assistant' as const, content: '' }]);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesToSend,
            passage: passage.passage,
            metadata: passage.metadata,
            questions: passage.questions,
            model,
            apiKey,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error('응답을 받을 수 없습니다.');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: accumulated };
                    return updated;
                  });
                }
              } catch {
                // partial JSON across chunks — completed in next iteration
              }
            }
          }
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const e = err as { message?: string };
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `오류: ${e.message || '메시지 전송에 실패했습니다.'}`,
          };
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [passage, model, apiKey]
  );

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!passage) return;
      const userMsg: Message = { role: 'user', content: userText };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      await streamChat(newMessages);
    },
    [messages, passage, streamChat]
  );

  const handleModeSwitch = useCallback(() => {
    if (isStreaming) return;
    setActiveTab('questions');
    setMobileTab('questions');
    const modeSwitchMsg: Message = { role: 'user', content: MODE_SWITCH_MARKER };
    const newMessages = [...messages, modeSwitchMsg];
    setMessages(newMessages);
    streamChat(newMessages);
  }, [isStreaming, messages, streamChat]);

  const handleTabChange = (tab: PanelTab) => {
    setActiveTab(tab);
    setMobileTab(tab);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages([INITIAL_MESSAGE]);
    setActiveTab('passage');
    setMobileTab('passage');
  };

  const handleSaveChat = () => {
    if (!passage) return;
    const today = new Date().toISOString().slice(0, 10);
    const lines: string[] = [
      '[수능 비문학 독해 과외 — 세션 기록]',
      `날짜: ${today}`,
      `지문: ${passage.title} (${passage.question_range}번)`,
      `모델: ${model}`,
      '',
      '---',
      '',
    ];

    for (const msg of messages) {
      if (msg.content === MODE_SWITCH_MARKER) {
        lines.push('--- [문제 풀이 모드 전환] ---');
        lines.push('');
        continue;
      }
      const label = msg.role === 'assistant' ? '과외 AI' : '학생';
      lines.push(`${label}: ${msg.content}`);
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `과외_세션_${passage.title}_${today}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!passage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-gray-800 text-sm truncate">{passage.title}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
            {passage.question_range}번
          </span>
          <div className="hidden sm:flex">
            <ProgressBar
              paragraphCount={passage.paragraph_count}
              visitedParagraphs={visitedParagraphs}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            onClick={() => setModel(model === 'claude-sonnet-4-6' ? 'claude-opus-4-7' : 'claude-sonnet-4-6')}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${model === 'claude-opus-4-7' ? 'bg-purple-500' : 'bg-blue-500'}`} />
            <span className="text-gray-600">{model === 'claude-opus-4-7' ? 'Opus' : 'Sonnet'}</span>
          </button>
          <button
            onClick={() => setShowEndModal(true)}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            세션 종료
          </button>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-gray-200 bg-white flex-shrink-0">
        {(['passage', 'questions', ...(pdfBase64 ? ['pdf' as const] : []), 'chat'] as MobileTab[]).map((tab) => {
          const label = tab === 'passage' ? '지문' : tab === 'questions' ? '문제' : tab === 'pdf' ? 'PDF' : '채팅';
          return (
            <button
              key={tab}
              onClick={() => {
                setMobileTab(tab);
                if (tab !== 'chat') setActiveTab(tab as PanelTab);
              }}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                mobileTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Passage panel */}
        <div
          className={`bg-white border-r border-gray-200 flex flex-col overflow-hidden
            w-full md:w-1/2
            ${mobileTab === 'chat' ? 'hidden md:flex' : 'flex'}
          `}
        >
          <PassagePanel
            passage={passage}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            pdfBase64={pdfBase64}
          />
        </div>

        {/* Right: Chat panel */}
        <div
          className={`flex flex-col overflow-hidden
            w-full md:w-1/2
            ${mobileTab === 'chat' ? 'flex' : 'hidden md:flex'}
          `}
        >
          <ChatPanel
            messages={messages}
            onSend={sendMessage}
            onModeSwitch={handleModeSwitch}
            onReset={handleReset}
            isStreaming={isStreaming}
          />
        </div>
      </div>

      {/* Session end modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">세션 종료</h2>
            <p className="text-sm text-gray-500">다음 작업을 선택하세요.</p>
            <div className="space-y-2">
              <button
                onClick={handleSaveChat}
                className="w-full text-left border border-gray-200 rounded-xl px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                대화 내역 저장 (.txt)
              </button>
              <button
                onClick={() => router.push('/select')}
                className="w-full text-left border border-gray-200 rounded-xl px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                새 지문 시작
              </button>
              <button
                onClick={() => router.push('/upload')}
                className="w-full text-left border border-gray-200 rounded-xl px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                새 PDF 업로드
              </button>
            </div>
            <button
              onClick={() => setShowEndModal(false)}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
