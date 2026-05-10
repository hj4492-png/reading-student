import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDF 파일이 필요합니다.' }, { status: 400 });
    }

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), isEvalSupported: false, useWorkerFetch: false, useSystemFonts: true }).promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if ('str' in item) return item.str;
          return '';
        })
        .join(' ');
      pageTexts.push(pageText);
    }

    return NextResponse.json({ text: pageTexts.join('\n') });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'PDF 텍스트 추출에 실패했습니다.' },
      { status: 500 }
    );
  }
}
