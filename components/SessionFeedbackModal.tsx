'use client';

import { useState, useEffect, useRef } from 'react';
import { sendSessionFeedback, SessionFeedbackPayload } from '@/lib/feedback';

type SelfGrade = SessionFeedbackPayload['self_grade'];

const GRADE_OPTIONS: { label: string; value: NonNullable<SelfGrade> }[] = [
  { label: '1~3등급', value: 'grade_1_to_3' },
  { label: '4등급', value: 'grade_4' },
  { label: '5등급', value: 'grade_5' },
  { label: '6~9등급', value: 'grade_6_to_9' },
  { label: '모르겠음 / 안 봤음', value: 'unknown' },
];

interface SessionFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  totalTurns: number;
  passageId?: string;
  trigger: SessionFeedbackPayload['trigger'];
}

export default function SessionFeedbackModal({
  isOpen,
  onClose,
  sessionId,
  totalTurns,
  passageId,
  trigger,
}: SessionFeedbackModalProps) {
  const [selfGrade, setSelfGrade] = useState<SelfGrade>(undefined);
  const [helpfulMoment, setHelpfulMoment] = useState('');
  const [frustratingMoment, setFrustratingMoment] = useState('');
  const [freeComment, setFreeComment] = useState('');
  const [status, setStatus] = useState<'form' | 'sending' | 'done' | 'error'>('form');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setStatus('sending');
    const payload: SessionFeedbackPayload = {
      session_id: sessionId,
      trigger,
      total_turns: totalTurns,
      passage_id: passageId,
    };
    if (selfGrade) payload.self_grade = selfGrade;
    if (helpfulMoment.trim()) payload.helpful_moment = helpfulMoment.trim();
    if (frustratingMoment.trim()) payload.frustrating_moment = frustratingMoment.trim();
    if (freeComment.trim()) payload.free_comment = freeComment.trim();

    try {
      await sendSessionFeedback(payload);
      sessionStorage.setItem('session_feedback_submitted', 'true');
      setStatus('done');
      setTimeout(onClose, 2000);
    } catch {
      setStatus('error');
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {status === 'done' ? (
          <div className="text-center py-8">
            <p className="text-gray-700 font-medium">감사합니다</p>
            <p className="text-sm text-gray-500 mt-1">피드백이 다음 패치에 반영됩니다.</p>
          </div>
        ) : status === 'error' ? (
          <div className="space-y-4">
            <p className="text-sm text-red-600">전송에 실패했어요. 잠시 후 다시 시도해주세요.</p>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">닫기</button>
              <button onClick={handleSubmit} className="text-sm bg-blue-600 text-white rounded-lg px-4 py-1.5 hover:bg-blue-700 transition-colors">다시 시도</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <h2 className="font-bold text-gray-900 text-lg">피드백</h2>
              <span className="relative group/info flex-shrink-0 ml-2 mt-1">
                <span className="text-gray-300 hover:text-gray-500 cursor-help text-sm" aria-label="익명으로 수집되며, 본 학습 도구 개선 목적으로만 사용됩니다.">&#9432;</span>
                <span className="absolute right-0 top-full mt-1 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/info:opacity-100 transition-opacity z-10">익명으로 수집되며, 본 학습 도구 개선 목적으로만 사용됩니다.</span>
              </span>
            </div>

            {/* 1. 자가 등급 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">현재 비문학 자가 등급</label>
              <div className="flex flex-wrap gap-1.5">
                {GRADE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelfGrade(selfGrade === opt.value ? undefined : opt.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selfGrade === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 도움 된 순간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">가장 도움 된 순간</label>
              <input
                type="text"
                value={helpfulMoment}
                onChange={(e) => setHelpfulMoment(e.target.value)}
                maxLength={150}
                placeholder="예: 지문 구조를 잡아줬을 때"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* 3. 답답했던 순간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">가장 답답했던 순간</label>
              <input
                type="text"
                value={frustratingMoment}
                onChange={(e) => setFrustratingMoment(e.target.value)}
                maxLength={150}
                placeholder="예: 설명이 너무 길었을 때"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* 4. 자유 의견 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">자유 의견</label>
              <textarea
                value={freeComment}
                onChange={(e) => setFreeComment(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="더 나아졌으면 하는 점, 좋았던 점 등"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-between pt-1">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors"
              >
                건너뛰기
              </button>
              <button
                onClick={handleSubmit}
                disabled={status === 'sending'}
                className="text-sm bg-blue-600 text-white rounded-lg px-5 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {status === 'sending' ? '전송 중...' : '보내기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
