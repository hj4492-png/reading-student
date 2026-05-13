import fs from 'fs';
import path from 'path';

export interface SessionMeta {
  date: string;
  passage: string;
  model: string;
}

export interface SessionEntry {
  speaker: 'ai' | 'student';
  blocks: Array<{ type: 'text' | 'quote'; content: string }>;
}

export interface ParsedSession {
  meta: SessionMeta;
  entries: SessionEntry[];
}

export function parseSessionFile(filename: string): ParsedSession {
  const filePath = path.join(process.cwd(), 'data', filename);
  const raw = fs.readFileSync(filePath, 'utf-8');

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  const meta: SessionMeta = { date: '', passage: '', model: '' };
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
      if (m) {
        const key = m[1] as keyof SessionMeta;
        if (key in meta) meta[key] = m[2];
      }
    }
  }

  const body = fmMatch ? raw.slice(fmMatch[0].length).trim() : raw.trim();
  const entries: SessionEntry[] = [];
  let currentEntry: SessionEntry | null = null;

  for (const line of body.split('\n')) {
    const speakerMatch = line.match(/^\*\*(.+?):\*\*\s*(.*)/);
    if (speakerMatch) {
      if (currentEntry) entries.push(currentEntry);
      const speaker = speakerMatch[1].includes('AI') ? 'ai' : 'student';
      currentEntry = { speaker, blocks: [] };
      const text = speakerMatch[2].trim();
      if (text) currentEntry.blocks.push({ type: 'text', content: text });
      continue;
    }

    if (!currentEntry) continue;

    if (line.startsWith('> ')) {
      currentEntry.blocks.push({ type: 'quote', content: line.slice(2) });
    } else if (line.trim()) {
      const last = currentEntry.blocks[currentEntry.blocks.length - 1];
      if (last && last.type === 'text') {
        last.content += '\n' + line.trim();
      } else {
        currentEntry.blocks.push({ type: 'text', content: line.trim() });
      }
    }
  }
  if (currentEntry) entries.push(currentEntry);

  return { meta, entries };
}
