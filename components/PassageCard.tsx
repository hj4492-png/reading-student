'use client';

import { Passage } from '@/lib/types';

interface PassageCardProps {
  passage: Passage;
  onClick: () => void;
}

export default function PassageCard({ passage, onClick }: PassageCardProps) {
  const paragraphEntries = Object.entries(passage.paragraph_count);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
            {passage.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {passage.question_range}번
            </span>
            {paragraphEntries.map(([key, count]) => (
              <span
                key={key}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600"
              >
                ({key}) {count}문단
              </span>
            ))}
          </div>
        </div>
        <span className="text-gray-300 group-hover:text-blue-400 transition-colors text-xl flex-shrink-0">
          →
        </span>
      </div>
    </button>
  );
}
