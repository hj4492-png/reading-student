import { getSessionDurationSeconds } from './session';

export type MicroFeedbackPayload = {
  session_id: string;
  message_id: string;
  rating: 'up' | 'down';
  reason_category?: 'too_long' | 'too_hard' | 'off_topic' | 'wrong' | 'other';
  reason_text?: string;
  ai_message_excerpt: string;
  user_prior_message_excerpt: string;
  passage_id?: string;
  model?: string;
};

export type SessionFeedbackPayload = {
  session_id: string;
  self_grade?: 'grade_1_to_3' | 'grade_4' | 'grade_5' | 'grade_6_to_9' | 'unknown';
  helpful_moment?: string;
  frustrating_moment?: string;
  free_comment?: string;
  total_turns?: number;
  session_duration_seconds?: number;
  passage_id?: string;
  trigger: 'end_button' | 'header_button' | 'auto_modal';
};

const EXCERPT_LIMIT = 500;
const PASSAGE_ID_LIMIT = 70;

function truncate(text: string): string {
  return text.length > EXCERPT_LIMIT ? text.slice(0, EXCERPT_LIMIT) : text;
}

export function makePassageExcerptId(passageText: string | undefined): string {
  if (!passageText) return '';
  let text = passageText.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  text = text.replace(/["'\/\\:|]/g, '');
  if (text.length <= PASSAGE_ID_LIMIT) return text;
  const spaceIdx = text.lastIndexOf(' ', PASSAGE_ID_LIMIT);
  const cutAt = spaceIdx > PASSAGE_ID_LIMIT * 0.5 ? spaceIdx : PASSAGE_ID_LIMIT;
  return text.slice(0, cutAt) + '…';
}

async function sendFeedback(type: 'micro' | 'session', data: Record<string, unknown>): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_FEEDBACK_URL;
  if (!url) {
    console.error('[feedback] NEXT_PUBLIC_FEEDBACK_URL is not set');
    return false;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify({ type, data }),
    });

    if (!res.ok) {
      console.error('[feedback] response not ok:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[feedback] send failed:', err);
    return false;
  }
}

export async function sendMicroFeedback(payload: MicroFeedbackPayload): Promise<void> {
  await sendFeedback('micro', {
    ...payload,
    ai_message_excerpt: truncate(payload.ai_message_excerpt),
    user_prior_message_excerpt: truncate(payload.user_prior_message_excerpt ?? ''),
  });
}

export async function sendSessionFeedback(payload: SessionFeedbackPayload): Promise<void> {
  const data = {
    ...payload,
    session_duration_seconds: payload.session_duration_seconds ?? getSessionDurationSeconds(),
  };
  await sendFeedback('session', data);
}
