'use client';

import { useRouter } from 'next/navigation';
import PDFUploader from '@/components/PDFUploader';

export default function UploadPage() {
  const router = useRouter();

  const handleExtracted = (text: string, pdfBase64: string) => {
    sessionStorage.setItem('pdfText', text);
    sessionStorage.setItem('pdfBase64', pdfBase64);
    sessionStorage.removeItem('analyzedPassages');
    sessionStorage.removeItem('lastAnalyzedPdfText');
    router.push('/select');
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-lg p-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
          >
            ← 뒤로
          </button>
          <h1 className="text-xl font-bold text-gray-900 mb-1">PDF 업로드</h1>
          <p className="text-sm text-gray-500">
            시험지 전체가 아닌, 비문학 지문과 문제가 포함된 페이지만 골라서 업로드해주세요.
            <span className="block text-xs text-gray-400 mt-1">파일이 작을수록 분석이 빠르고 정확합니다.</span>
          </p>
        </div>

        <PDFUploader onExtracted={handleExtracted} />
      </div>
    </main>
  );
}
