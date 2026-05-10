'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSettings } from '@/lib/types';

export default function SettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<AppSettings['model']>('claude-sonnet-4-6');
  const [saveKey, setSaveKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('apiKey');
    if (savedKey) {
      setApiKey(savedKey);
      setSaveKey(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model }),
      });
      const data = await res.json();

      if (data.valid) {
        if (saveKey) {
          localStorage.setItem('apiKey', apiKey);
        } else {
          localStorage.removeItem('apiKey');
        }
        sessionStorage.setItem('apiKey', apiKey);
        sessionStorage.setItem('model', model);
        router.push('/upload');
      } else {
        setError(data.error || 'API 키 검증에 실패했습니다.');
      }
    } catch {
      setError('서버 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">수능 비문학 독해 과외 AI</h1>
          <p className="text-gray-500 text-sm">
            수능 비문학을 함께 읽으며 읽기 습관을 길러주는 AI 과외 교사
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anthropic API 키
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveKey}
                onChange={(e) => setSaveKey(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-gray-500">API 키를 로컬에 저장</span>
            </label>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span className={`inline-block transition-transform ${showGuide ? 'rotate-90' : ''}`}>&#9654;</span>
              API 키 발급 방법 안내
            </button>

            {showGuide && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-gray-700 space-y-3">
                <p className="font-medium text-gray-800">API 키 발급 방법 (처음이셔도 괜찮아요!)</p>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>
                    <a
                      href="https://console.anthropic.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      console.anthropic.com
                    </a>
                    {' '}에 접속해서 회원가입 (구글 계정으로 가능)
                  </li>
                  <li>로그인 후 왼쪽 메뉴에서 <strong>API Keys</strong> 클릭</li>
                  <li><strong>Create Key</strong> 버튼을 눌러 새 키 생성</li>
                  <li>생성된 키(<code className="bg-blue-100 px-1 rounded">sk-ant-...</code>)를 복사해서 위 입력란에 붙여넣기</li>
                </ol>
                <p className="text-gray-500">* 결제 수단 등록이 필요할 수 있습니다.</p>

                <div className="border-t border-blue-200 pt-3">
                  <p className="font-medium text-gray-800 mb-1">예상 비용 안내</p>
                  <p>과외 1세션(약 30분) 기준:</p>
                  <ul className="pl-4 mt-1 space-y-0.5">
                    <li>Sonnet: 약 $0.3~1 (약 400~1,400원)</li>
                    <li>Opus: 약 $1~5 (약 1,400~7,000원)</li>
                  </ul>
                  <p className="text-gray-500 mt-1">* 실제 비용은 대화 길이에 따라 달라질 수 있습니다.</p>
                </div>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">모델 선택</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="model"
                  value="claude-sonnet-4-6"
                  checked={model === 'claude-sonnet-4-6'}
                  onChange={() => setModel('claude-sonnet-4-6')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    Claude Sonnet <span className="text-blue-600 text-xs">(기본 권장)</span>
                  </div>
                  <div className="text-xs text-gray-500">빠르고 경제적 · 대화 1턴 약 $0.01~0.05</div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="model"
                  value="claude-opus-4-7"
                  checked={model === 'claude-opus-4-7'}
                  onChange={() => setModel('claude-opus-4-7')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-800">Claude Opus (정교)</div>
                  <div className="text-xs text-gray-500">정밀한 분석 · 대화 1턴 약 $0.05~0.20</div>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !apiKey}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '검증 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </main>
  );
}
