'use client';

interface ProgressBarProps {
  paragraphCount: Record<string, number>;
  visitedParagraphs: Record<string, number>;
}

export default function ProgressBar({ paragraphCount, visitedParagraphs }: ProgressBarProps) {
  const sections = Object.entries(paragraphCount);
  if (sections.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {sections.map(([section, total]) => {
        const visited = visitedParagraphs[section] ?? 0;
        return (
          <div key={section} className="flex items-center gap-1">
            <span className="text-xs text-gray-400">({section})</span>
            <div className="flex gap-0.5">
              {Array.from({ length: total }, (_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-sm transition-colors ${
                    i < visited ? 'bg-blue-400' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 tabular-nums">
              {visited}/{total}
            </span>
          </div>
        );
      })}
    </div>
  );
}
