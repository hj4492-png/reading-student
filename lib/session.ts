const SESSION_ID_KEY = 'feedback_session_id';
const SESSION_START_KEY = 'feedback_session_start';

function generateUUID(): string {
  return crypto.randomUUID();
}

export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = generateUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

export function getSessionStartTime(): number {
  const stored = sessionStorage.getItem(SESSION_START_KEY);
  if (stored) {
    const parsed = Number(stored);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const now = Date.now();
  sessionStorage.setItem(SESSION_START_KEY, String(now));
  return now;
}

export function resetSession(): { sessionId: string; startTime: number } {
  sessionStorage.removeItem(SESSION_ID_KEY);
  sessionStorage.removeItem(SESSION_START_KEY);
  sessionStorage.removeItem('session_feedback_submitted');
  return {
    sessionId: getSessionId(),
    startTime: getSessionStartTime(),
  };
}

export function getSessionDurationSeconds(): number {
  const start = getSessionStartTime();
  const diff = Date.now() - start;
  if (isNaN(diff) || diff < 0) return 0;
  return Math.floor(diff / 1000);
}

export function getSessionMeta(passageId?: string) {
  return {
    session_id: getSessionId(),
    session_start: getSessionStartTime(),
    session_duration_seconds: getSessionDurationSeconds(),
    passage_id: passageId,
  };
}
