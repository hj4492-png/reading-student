'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Anthropic from '@anthropic-ai/sdk';
import { Passage } from '@/lib/types';
import PassageCard from '@/components/PassageCard';

const ANALYZE_SYSTEM_PROMPT = `너는 수능 국어 시험지 텍스트를 분석하는 도우미다.
아래 텍스트(및 PDF 원본)에서 비문학(독서) 지문들을 찾아서 JSON으로 반환해라.

그림, 도표, 그래프가 있으면 각각을 텍스트로 요약하여 지문 본문(passage)의 해당 위치에 삽입해라.
요약 형식: [<그림>: 설명] 또는 [<표>: 설명] 또는 [<그래프>: 설명]

예시:
- [<그림>: P층(위)과 Q층(아래)으로 이루어진 띠가 P층 쪽으로 원의 호 형태로 휘어진 모습]
- [<표>: 관형사형 어미의 형태 - 동사와 형용사의 현재/과거/미래 시제별 어미 정리]
- [<그래프>: 충전 시간에 따른 단자 전압(V)과 충전 전류(A) 변화. 전압은 점진적 상승 후 급등, 전류는 점진적 하강]

출력 형식 (JSON만, 다른 텍스트 없이):
[
  {
    "id": 1,
    "title": "법 해석과 보증",
    "question_range": "4-9",
    "passage": "(가) 법조문으로 구성된...(지문 전문, 그림이 있으면 [<그림>: 설명] 포함)",
    "questions": "4. (가)와 (나)의 내용 전개...(문제 전문)",
    "paragraph_count": {"가": 4, "나": 4},
    "metadata": "(가)는 4문단 구조:\\n- (가)1문단: 법 해석의 정의...",
    "figures": [
      {
        "id": "fig1",
        "location": "2문단",
        "description": "설명"
      }
    ]
  }
]

figures 배열: 그림/도표/그래프가 없으면 빈 배열 [].`;

export default function SelectPage() {
  const router = useRouter();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Claude에 요청 중...');
  const [charCount, setCharCount] = useState(0);
  const maxProgressRef = useRef(0);
  const [editingPassage, setEditingPassage] = useState<Passage | null>(null);
  const [editedPassageText, setEditedPassageText] = useState('');
  const [editedQuestionsText, setEditedQuestionsText] = useState('');

  useEffect(() => {
    const pdfText = sessionStorage.getItem('pdfText');
    const pdfBase64 = sessionStorage.getItem('pdfBase64');
    const apiKey = sessionStorage.getItem('apiKey');
    const model = sessionStorage.getItem('model');

    if (!pdfText) {
      router.push('/upload');
      return;
    }

    if (!apiKey) {
      router.push('/');
      return;
    }

    const cachedPdfText = sessionStorage.getItem('lastAnalyzedPdfText');
    const cachedPassages = sessionStorage.getItem('analyzedPassages');
    if (cachedPdfText === pdfText && cachedPassages) {
      try {
        setPassages(JSON.parse(cachedPassages));
        setLoading(false);
        return;
      } catch {
        /* cache corrupted, re-analyze */
      }
    }

    const analyze = async () => {
      try {
        const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

        const userContent: Anthropic.MessageCreateParams['messages'][0]['content'] = [];
        if (pdfBase64) {
          (userContent as Anthropic.ContentBlockParam[]).push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
          } as Anthropic.DocumentBlockParam);
        }
        (userContent as Anthropic.ContentBlockParam[]).push({ type: 'text', text: pdfText });

        setStatusMessage('지문 분석 중...');

        const stream = client.messages.stream({
          model: model || 'claude-sonnet-4-6',
          max_tokens: 16000,
          system: ANALYZE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
        });

        let accumulated = '';

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            accumulated += event.delta.text;
            setCharCount(accumulated.length);
          }
        }

        const finalMessage = await stream.finalMessage();
        if (finalMessage.stop_reason === 'max_tokens') {
          setError('지문이 너무 길어 분석이 잘렸습니다. 더 짧은 시험지를 시도해주세요.');
          setLoading(false);
          return;
        }

        setStatusMessage('JSON 파싱 중...');

        let text = accumulated.trim();
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
          const parsed = JSON.parse(text);
          setPassages(parsed);
          sessionStorage.setItem('lastAnalyzedPdfText', pdfText);
          sessionStorage.setItem('analyzedPassages', JSON.stringify(parsed));
        } catch {
          setError(`지문 파싱에 실패했습니다. 다시 시도해주세요.\n\nClaude 응답 원문:\n${accumulated.slice(0, 500)}`);
        }
        setLoading(false);
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        if (e.status === 429) {
          setError('API 요청 한도 초과 — 1분 후 다시 시도해주세요.');
        } else {
          setError(e.message || '분석 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
        setLoading(false);
      }
    };

    analyze();
  }, [router]);

  const handleSelectPassage = (passage: Passage) => {
    setEditingPassage(passage);
    setEditedPassageText(passage.passage);
    setEditedQuestionsText(passage.questions);
  };

  const handleStartSession = () => {
    if (!editingPassage) return;
    const finalPassage: Passage = {
      ...editingPassage,
      passage: editedPassageText,
      questions: editedQuestionsText,
    };
    sessionStorage.setItem('selectedPassage', JSON.stringify(finalPassage));
    router.push('/session');
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-8">
          <div className="mb-6">
            <button
              onClick={() => router.push('/upload')}
              className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
            >
              ← 뒤로
            </button>
            <h1 className="text-xl font-bold text-gray-900 mb-1">지문 선택</h1>
            <p className="text-sm text-gray-500">함께 읽을 비문학 지문을 선택하세요.</p>
          </div>

          {loading && (() => {
            const EXPECTED_CHARS = 6000;
            let raw = 5;
            if (statusMessage === '지문 분석 중...') {
              raw = charCount > 0
                ? Math.min(10 + Math.round((charCount / EXPECTED_CHARS) * 75), 85)
                : 10;
            } else if (statusMessage === 'JSON 파싱 중...') {
              raw = 90;
            }
            if (raw > maxProgressRef.current) maxProgressRef.current = raw;
            const progress = maxProgressRef.current;
            return (
              <div className="py-16 space-y-5">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-sm text-gray-600">{statusMessage}</span>
                  {charCount > 0 && statusMessage === '지문 분석 중...' && (
                    <span className="text-xs text-gray-400 ml-auto">{charCount.toLocaleString()}자 생성됨</span>
                  )}
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  수능 시험지 분석은 보통 5~6분 소요됩니다
                </p>
              </div>
            );
          })()}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-4">
              {error}
              <button
                onClick={() => router.push('/upload')}
                className="block mt-2 text-blue-600 underline text-xs"
              >
                PDF 다시 업로드하기
              </button>
            </div>
          )}

          {!loading && !error && passages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>비문학 지문을 찾을 수 없습니다.</p>
              <button
                onClick={() => router.push('/upload')}
                className="mt-2 text-blue-600 underline text-sm"
              >
                다른 PDF 업로드하기
              </button>
            </div>
          )}

          {!loading && passages.length > 0 && (
            <div className="space-y-3">
              {passages.map((passage) => (
                <PassageCard
                  key={passage.id}
                  passage={passage}
                  onClick={() => handleSelectPassage(passage)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editingPassage && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-gray-900">{editingPassage.title}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{editingPassage.question_range}번</p>
                </div>
                <button
                  onClick={() => setEditingPassage(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                PDF 추출 결과를 확인하고 오류가 있으면 수정하세요.
              </p>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  지문 원문
                </label>
                <textarea
                  value={editedPassageText}
                  onChange={(e) => setEditedPassageText(e.target.value)}
                  rows={10}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  문제 원문
                </label>
                <textarea
                  value={editedQuestionsText}
                  onChange={(e) => setEditedQuestionsText(e.target.value)}
                  rows={8}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setEditingPassage(null)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleStartSession}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                세션 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
