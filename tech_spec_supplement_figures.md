# 보충 스펙: PDF 그림/도표 처리

> tech_spec_claude_code.md에 추가할 내용.
> Claude Code에 두 파일 함께 전달.

---

## 그림/도표 처리 흐름

수능 비문학 PDF에는 그림, 도표, 그래프가 포함된 지문이 자주 나옴.
텍스트만 추출하면 그림 정보가 빠져서 AI가 맥락을 놓침.
이를 해결하기 위해 지문 분석 단계에서 이미지 분석을 같이 수행.

### 화면 1 (PDF 업로드) 변경

PDF 업로드 시 두 가지를 동시에 추출:
1. **텍스트**: pdf.js로 텍스트 추출 (기존)
2. **페이지 이미지**: pdf.js로 각 페이지를 canvas에 렌더링 → base64 이미지로 변환

```javascript
// pdf.js로 페이지를 이미지로 렌더링하는 예시
const page = await pdfDoc.getPage(pageNum);
const viewport = page.getViewport({ scale: 2.0 }); // 고해상도
const canvas = document.createElement('canvas');
canvas.width = viewport.width;
canvas.height = viewport.height;
const ctx = canvas.getContext('2d');
await page.render({ canvasContext: ctx, viewport }).promise;
const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
```

### 화면 2 (지문 선택 / 지문 분석) 변경

지문 분석 API 호출 시 텍스트 + 이미지를 함께 Claude에 전달:

```typescript
// /api/analyze/route.ts
const response = await anthropic.messages.create({
  model: "claude-opus-4-6", // 분석은 Opus 권장
  max_tokens: 4000,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: pageImageBase64
          }
        },
        {
          type: "text",
          text: `아래는 수능 국어 시험지의 텍스트와 이미지이다.
          
텍스트:
${extractedText}

위 텍스트와 이미지를 분석하여 비문학(독서) 지문들을 찾고 JSON으로 반환해라.

그림, 도표, 그래프가 있으면 각각을 텍스트로 요약하여 지문 본문의 해당 위치에 삽입해라.
요약 형식: [<그림>: 설명] 또는 [<표>: 설명] 또는 [<그래프>: 설명]

예시:
- [<그림>: P층(위)과 Q층(아래)으로 이루어진 띠가 P층 쪽으로 원의 호 형태로 휘어진 모습]
- [<표>: 관형사형 어미의 형태 - 동사와 형용사의 현재/과거/미래 시제별 어미 정리]
- [<그래프>: 충전 시간에 따른 단자 전압(V)과 충전 전류(A) 변화. 전압은 점진적 상승 후 급등, 전류는 점진적 하강]

출력 형식 (JSON만):
[
  {
    "id": 1,
    "title": "바이메탈 띠와 열팽창",
    "question_range": "10-13",
    "passage": "열팽창이란... [<그림>: P층과 Q층으로...] ...",
    "questions": "10. 윗글의 내용과...",
    "paragraph_count": 5,
    "metadata": "1문단: 열팽창, 선형 열팽창 계수 정의...",
    "figures": [
      {
        "id": "fig1",
        "location": "2문단",
        "description": "P층(위)과 Q층(아래)으로 이루어진 띠가 P층 쪽으로 원의 호 형태로 휘어진 모습. P층이 안쪽(곡률 반지름 쪽), Q층이 바깥쪽."
      }
    ]
  }
]`
        }
      ]
    }
  ]
});
```

### 화면 3 (과외 세션) 변경

**왼쪽 패널 탭 추가:**
- [지문] — 텍스트 + [<그림>: 설명] 포함된 지문
- [문제] — 문제 + 선지
- [PDF 원본] — 해당 페이지 이미지 표시. 학생이 그림/도표 직접 확인 가능.

**시스템 프롬프트 내 그림 처리 규칙 추가:**

시스템 프롬프트의 지문 섹션에 [<그림>: 설명]이 포함되어 있으므로,
AI는 그림 내용을 알고 대화할 수 있다. 추가 규칙:

```
[그림/도표 대응]
- 지문에 [<그림>: ...], [<표>: ...] 태그가 있으면 그 내용을 알고 대화한다.
- 학생에게 그림을 설명해줄 때: "왼쪽 패널에서 [PDF 원본] 탭 눌러서 그림 직접 확인해봐."로 안내.
- 그림 내용을 텍스트로 완벽히 재현하려 하지 마라. 핵심만 짧게 짚고 학생이 직접 보게 유도.
- 그림/도표가 문제에 연결되는 경우: "이 그림이 문제에 나올 수 있어. 뭘 보여주고 있는지 네 말로 설명해볼래?"
```

### 비용 최적화

- 이미지 분석은 **지문 분석 단계에서 1회만** 수행 (Opus).
- 과외 대화 중에는 이미지를 매 턴 보내지 않음 (비용 절감).
- 대신 텍스트 요약 [<그림>: ...]이 시스템 프롬프트에 포함되어 AI가 그림 맥락을 이해.
