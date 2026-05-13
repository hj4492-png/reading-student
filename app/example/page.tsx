import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { parseSessionFile, type SessionEntry } from '@/lib/parse-session';

export const metadata: Metadata = {
  title: '수능 비문학 독해 과외 AI · 실제 사용 예시',
  description:
    '수능 비문학 지문 한 편에 대한 과외 AI의 실제 대화 기록입니다. API 키 입력 없이 도구의 작동을 확인할 수 있습니다.',
};

function ChatBubble({ entry }: { entry: SessionEntry }) {
  const isAi = entry.speaker === 'ai';

  return (
    <div className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
      <span className="text-xs text-gray-400 mb-1 px-1">
        {isAi ? '과외 AI' : '학생'}
      </span>
      <div
        className={`rounded-2xl px-4 py-3 leading-[1.7] text-[15px] ${
          isAi
            ? 'bg-blue-50 text-gray-800 max-w-[90%] sm:max-w-[75%]'
            : 'bg-gray-100 text-gray-800 max-w-[85%] sm:max-w-[70%]'
        }`}
      >
        {entry.blocks.map((block, i) =>
          block.type === 'quote' ? (
            <blockquote
              key={i}
              className="border-l-[3px] border-gray-300 bg-gray-50 rounded-r-lg pl-3 pr-2 py-2 my-2 text-[14px] text-gray-600 leading-[1.7]"
            >
              {block.content}
            </blockquote>
          ) : (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {block.content}
            </p>
          ),
        )}
      </div>
    </div>
  );
}

function VideoPlayer() {
  return (
    <div className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
      <video
        className="w-full h-full object-contain"
        controls
        playsInline
        preload="metadata"
        poster="/demo-poster.jpg"
      >
        <source src="/demo.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

function VideoPlaceholder() {
  return (
    <div className="w-full aspect-video bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center">
      <p className="text-gray-400 text-sm">영상 준비 중입니다</p>
    </div>
  );
}

export default function ExamplePage() {
  const { meta, entries } = parseSessionFile('sample-session.md');

  const hasVideo = fs.existsSync(path.join(process.cwd(), 'public', 'demo.mp4'));

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Meta header */}
        <div className="mb-8">
          <p className="text-sm text-gray-400 mb-1">
            수능 비문학 독해 과외 AI · 실제 사용 예시
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
            <span>{meta.date}</span>
            <span>{meta.passage}</span>
            <span>{meta.model}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
          본 페이지는 실제 사용자의 한 세션을 그대로 옮긴 것입니다. API 키 입력
          없이 도구의 작동 방식을 확인하실 수 있습니다.
        </p>

        {/* Video */}
        <div className="mb-10">
          {hasVideo ? <VideoPlayer /> : <VideoPlaceholder />}
        </div>

        {/* Chat log header */}
        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          전체 대화 기록
        </h2>

        {/* Chat entries */}
        <div className="space-y-5 mb-12">
          {entries.map((entry, i) => (
            <ChatBubble key={i} entry={entry} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center pt-4 pb-8">
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white rounded-lg px-8 py-3 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            직접 사용해보기 →
          </Link>
        </div>
      </div>
    </main>
  );
}
