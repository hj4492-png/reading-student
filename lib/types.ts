export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Figure {
  id: string;
  location: string;
  description: string;
}

export interface Passage {
  id: number;
  title: string;
  question_range: string;
  passage: string;
  questions: string;
  paragraph_count: Record<string, number>;
  metadata: string;
  figures?: Figure[];
}

export interface AppSettings {
  apiKey: string;
  model: 'claude-sonnet-4-6' | 'claude-opus-4-7';
}

export const MODE_SWITCH_MARKER = '[모드 전환: 문제 풀이]';
