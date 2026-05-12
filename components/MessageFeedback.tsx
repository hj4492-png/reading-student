'use client';

import { useState } from 'react';
import { sendMicroFeedback, MicroFeedbackPayload } from '@/lib/feedback';

type ReasonCategory = 'too_long' | 'too_hard' | 'off_topic' | 'wrong' | 'other';

const REASON_CHIPS: { label: string; value: ReasonCategory }[] = [
  { label: '길어요', value: 'too_long' },
  { label: '어려워요', value: 'too_hard' },
  { label: '딴 이야기로 빠짐', value: 'off_topic' },
  { label: '답이 틀린 것 같음', value: 'wrong' },
  { label: '기타…', value: 'other' },
];

interface MessageFeedbackProps {
  messageId: string;
  aiMessageContent: string;
  userPriorMessage: string;
  sessionId: string;
  passageId?: string;
  model?: string;
}

export default function MessageFeedback({
  messageId,
  aiMessageContent,
  userPriorMessage,
  sessionId,
  passageId,
  model,
}: MessageFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [toast, setToast] = useState(false);

  const submit = (rating: 'up' | 'down', reasonCategory?: ReasonCategory, reasonText?: string) => {
    setSubmitted(true);
    setShowReasons(false);
    setShowOtherInput(false);
    setToast(true);
    setTimeout(() => setToast(false), 1000);

    const payload: MicroFeedbackPayload = {
      session_id: sessionId,
      message_id: messageId,
      rating,
      ai_message_excerpt: aiMessageContent,
      user_prior_message_excerpt: userPriorMessage,
      passage_id: passageId,
      model,
    };
    if (reasonCategory) payload.reason_category = reasonCategory;
    if (reasonText) payload.reason_text = reasonText;

    sendMicroFeedback(payload);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-1 mt-1 h-6">
        {toast && (
          <span className="text-xs text-gray-400 animate-pulse">전송됨</span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-col items-start gap-1">
      <div className="flex items-center gap-1 relative group/feedback">
        <button
          onClick={() => submit('up')}
          className="opacity-40 hover:opacity-100 transition-opacity p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label="이 응답이 도움이 됐어요"
        >
          <span className="text-sm">👍</span>
        </button>
        <button
          onClick={() => {
            if (!showReasons) setShowReasons(true);
            else submit('down');
          }}
          className="opacity-40 hover:opacity-100 transition-opacity p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label="이 응답이 도움이 안 됐어요"
        >
          <span className="text-sm">👎</span>
        </button>
        <div className="relative">
          <span
            className="text-gray-300 hover:text-gray-500 cursor-help text-xs ml-0.5 peer"
            aria-label="익명으로 수집되며 학습 도구 개선 목적으로만 사용됩니다"
          >
            &#9432;
          </span>
          <span className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-50">
            익명으로 수집되며 학습 도구 개선 목적으로만 사용됩니다
          </span>
        </div>
      </div>

      {showReasons && (
        <div className="flex flex-wrap gap-1.5 max-w-full overflow-x-auto">
          {REASON_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => {
                if (chip.value === 'other') {
                  setShowOtherInput(true);
                } else {
                  submit('down', chip.value);
                }
              }}
              className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors whitespace-nowrap"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {showOtherInput && (
        <div className="flex gap-1.5 w-full max-w-xs">
          <input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && otherText.trim()) {
                submit('down', 'other', otherText.trim());
              }
            }}
            placeholder="이유를 적어주세요"
            maxLength={200}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            autoFocus
          />
          <button
            onClick={() => {
              if (otherText.trim()) submit('down', 'other', otherText.trim());
              else submit('down', 'other');
            }}
            className="text-xs px-2 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            전송
          </button>
        </div>
      )}
    </div>
  );
}
