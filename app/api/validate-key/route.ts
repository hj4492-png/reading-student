import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, model } = await req.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ valid: false, error: 'API 키를 입력해주세요.' });
    }

    const client = new Anthropic({ apiKey });

    await client.messages.create({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 10,
      messages: [{ role: 'user', content: '안녕' }],
    });

    return NextResponse.json({ valid: true });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) {
      return NextResponse.json({ valid: false, error: '유효하지 않은 API 키입니다.' });
    }
    return NextResponse.json({
      valid: false,
      error: err.message || 'API 키 검증 중 오류가 발생했습니다.',
    });
  }
}
