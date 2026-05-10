'use client';

import { useMemo, useEffect, useRef } from 'react';
import { Passage } from '@/lib/types';

export type PanelTab = 'passage' | 'questions' | 'pdf';

interface PassagePanelProps {
  passage: Passage;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  pdfBase64?: string | null;
}

export default function PassagePanel({ passage, activeTab, onTabChange, pdfBase64 }: PassagePanelProps) {
  const pdfUrlRef = useRef<string | null>(null);

  const pdfUrl = useMemo(() => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    if (!pdfBase64) { pdfUrlRef.current = null; return null; }
    const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    pdfUrlRef.current = url;
    return url;
  }, [pdfBase64]);

  useEffect(() => {
    return () => { if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current); };
  }, []);

  const tabs: { key: PanelTab; label: string; show: boolean }[] = [
    { key: 'passage', label: '지문', show: true },
    { key: 'questions', label: '문제', show: true },
    { key: 'pdf', label: 'PDF 원본', show: !!pdfBase64 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs — hidden on mobile (mobile uses session-level tab bar) */}
      <div className="hidden md:flex border-b border-gray-200 flex-shrink-0">
        {tabs.filter((t) => t.show).map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="font-semibold text-gray-800 text-sm">{passage.title}</h2>
        <span className="text-xs text-gray-400">{passage.question_range}번</span>
      </div>

      {/* Content */}
      {activeTab === 'pdf' && pdfUrl ? (
        <iframe src={pdfUrl} className="flex-1 w-full border-0" title="PDF 원본" />
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <pre
            className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap font-sans"
            style={{ fontFamily: "'Nanum Myeongjo', 'Batang', 'serif'" }}
          >
            {activeTab === 'passage' ? passage.passage : passage.questions}
          </pre>
        </div>
      )}
    </div>
  );
}
