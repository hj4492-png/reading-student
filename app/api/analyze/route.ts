import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const ANALYZE_SYSTEM_PROMPT = `너는 수능 국어 시험지 텍스트를 분석하는 도우미다.
아래 텍스트(및 PDF 원본)에서 비문학(독서) 지문들을 찾아서 JSON으로 반환해라.

그림, 도표, 그래프가 있으면 각각을 텍스트로 요약하여 지문 본문(passage)의 해당 위치에 삽입해라.
요약 형식: [<그림>: 설명] 또는 [<표>: 설명] 또는 [<그래프>: 설명]

예시:
- [<그림>: P층(위)과 Q층(아래)으로 이루어진 띠가 P층 쪽으로 원의 호 형태로 휘어진 모습]
- [<표>: 관형사형 어미의 형태 - 동사와 형용사의 현재/과거/미래 시제별 어미 정리]
- [<그래프>: 충전 시간에 따른 단자 전압(V)과 충전 전류(A) 변화. 전압은 점진적 상승 후 급등, 전류는 점진적 하강]

출력 형식 (JSON만, 다른 텍스트 없이):
[
  {
    "id": 1,
    "title": "법 해석과 보증",
    "question_range": "4-9",
    "passage": "(가) 법조문으로 구성된...(지문 전문, 그림이 있으면 [<그림>: 설명] 포함)",
    "questions": "4. (가)와 (나)의 내용 전개...(문제 전문)",
    "paragraph_count": {"가": 4, "나": 4},
    "metadata": "(가)는 4문단 구조:\\n- (가)1문단: 법 해석의 정의...",
    "figures": [
      {
        "id": "fig1",
        "location": "2문단",
        "description": "설명"
      }
    ]
  }
]

figures 배열: 그림/도표/그래프가 없으면 빈 배열 [].`;

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const { pdfText, pdfBase64, apiKey, model } = await req.json();

        if (!pdfText) { send({ type: 'error', message: 'PDF 텍스트가 없습니다.' }); controller.close(); return; }
        if (!apiKey) { send({ type: 'error', message: 'API 키가 없습니다.' }); controller.close(); return; }

        send({ type: 'status', message: 'Claude에 요청 중...' });

        const client = new Anthropic({ apiKey });

        const userContent: Anthropic.MessageCreateParams['messages'][0]['content'] = [];
        if (pdfBase64) {
          (userContent as Anthropic.ContentBlockParam[]).push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
          } as Anthropic.DocumentBlockParam);
        }
        (userContent as Anthropic.ContentBlockParam[]).push({ type: 'text', text: pdfText });

        const claudeStream = client.messages.stream({
          model: model || 'claude-sonnet-4-6',
          max_tokens: 16000,
          system: ANALYZE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
        });

        let accumulated = '';
        send({ type: 'status', message: '지문 분석 중...' });

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            accumulated += event.delta.text;
            send({ type: 'progress', chars: accumulated.length });
          }
        }

        const finalMessage = await claudeStream.finalMessage();
        if (finalMessage.stop_reason === 'max_tokens') {
          send({ type: 'error', message: '지문이 너무 길어 분석이 잘렸습니다. 더 짧은 시험지를 시도해주세요.' });
          controller.close();
          return;
        }

        send({ type: 'status', message: 'JSON 파싱 중...' });

        let text = accumulated.trim();
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
          const parsed = JSON.parse(text);
          send({ type: 'done', passages: parsed });
        } catch {
          send({ type: 'error', message: `지문 파싱에 실패했습니다. 다시 시도해주세요.\n\nClaude 응답 원문:\n${accumulated.slice(0, 500)}` });
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        send({ type: 'error', message: e.message || '분석 중 오류가 발생했습니다.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
