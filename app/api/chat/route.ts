import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { SYSTEM_PROMPT_TEMPLATE } from '@/lib/prompt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, passage, metadata, questions, model, apiKey } = body;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API 키가 없습니다.' }), { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    let systemPrompt = SYSTEM_PROMPT_TEMPLATE
      .replace('{{PASSAGE}}', passage || '')
      .replace('{{PASSAGE_METADATA}}', metadata || '');

    const hasModeSwitch = messages.some(
      (m: { role: string; content: string }) => m.content === '[모드 전환: 문제 풀이]'
    );
    if (hasModeSwitch) {
      systemPrompt +=
        '\n\n학생이 문제 풀기를 요청했다. 모드 2(근거 대기)로 전환. 문제:\n' + questions;
    }

    const filteredMessages = messages.map(
      (m: { role: string; content: string }) =>
        m.content === '[모드 전환: 문제 풀이]'
          ? { ...m, content: '문제 풀기로 넘어가자.' }
          : m
    );

    const stream = await client.messages.stream({
      model,
      max_tokens: 800,
      system: [
        {
          type: 'text' as const,
          text: systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      messages: filteredMessages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
                )
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 429) {
      return new Response(
        JSON.stringify({ error: 'API 요청 한도 초과 — 1분 후 다시 시도해주세요.' }),
        { status: 429 }
      );
    }
    return new Response(JSON.stringify({ error: err.message || '오류가 발생했습니다.' }), {
      status: 500,
    });
  }
}
