# 수능 비문학 독해 과외 AI — 기술 스펙 (Claude Code 전달용)

## 프로젝트 개요

수능 비문학(독서) 지문을 학생과 1:1로 같이 읽어주는 AI 과외 웹사이트.
학생이 PDF를 올리면 지문을 선택하고, AI 과외 교사와 채팅하며 독해 연습.
사용자가 본인의 Anthropic API 키를 입력하여 비용을 직접 부담하는 구조.

---

## 기술 스택

- **프레임워크**: Next.js (App Router)
- **배포**: Vercel
- **스타일링**: Tailwind CSS
- **PDF 파싱**: pdf.js (pdfjs-dist)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514 기본, claude-opus-4-6 선택 가능)
- **상태 관리**: React useState/useContext (별도 라이브러리 불필요)

---

## 화면 흐름

```
[설정] → [PDF 업로드] → [지문 선택] → [과외 세션] → [세션 종료]
```

---

## 화면별 상세 스펙

### 화면 0: 설정

**목적**: API 키 입력 + 모델 선택

**UI 요소**:
- Anthropic API 키 입력 필드 (password type, 로컬스토리지 저장 가능 체크박스)
- 모델 선택 라디오 버튼:
  - Claude Sonnet (기본, 빠르고 저렴) — `claude-sonnet-4-20250514`
  - Claude Opus (정교, 느리고 비쌈) — `claude-opus-4-6`
- "시작하기" 버튼

**동작**:
- API 키 유효성 검증: 간단한 테스트 호출 (예: "안녕" 한 마디)로 키 작동 확인
- 키가 유효하면 다음 화면으로
- 키 없이 진행 불가

**주의**:
- API 키는 서버 사이드(API Route)에서만 사용. 클라이언트에 노출 금지.
- Next.js API Route (`/api/chat`)에서 Claude API 호출.

---

### 화면 1: PDF 업로드

**목적**: 수능/모의고사 PDF 업로드

**UI 요소**:
- 드래그앤드롭 + 파일 선택 버튼
- 업로드 진행 표시
- 지원 형식: PDF만

**동작**:
- 클라이언트에서 pdf.js로 PDF 텍스트 추출
- 추출된 전체 텍스트를 다음 화면으로 전달

---

### 화면 2: 지문 선택

**목적**: PDF에서 지문 구역 분리 → 학생이 풀 지문 선택

**동작**:
1. 추출된 PDF 텍스트를 Claude API에 보내서 지문 구역 분리 요청
2. 시스템 프롬프트:

```
너는 수능 국어 시험지 텍스트를 분석하는 도우미다.
아래 텍스트에서 비문학(독서) 지문들을 찾아서 JSON으로 반환해라.

출력 형식 (JSON만, 다른 텍스트 없이):
[
  {
    "id": 1,
    "title": "법 해석과 보증",
    "question_range": "4-9",
    "passage": "(가) 법조문으로 구성된...(지문 전문)",
    "questions": "4. (가)와 (나)의 내용 전개...(문제 전문)",
    "paragraph_count": {"가": 4, "나": 4},
    "metadata": "(가)는 4문단 구조:\n- (가)1문단: 법 해석의 정의..."
  }
]
```

3. 이 호출에는 **Opus 모델 사용 권장** (정확한 지문 분리 필요)
4. 결과를 카드 형태로 표시

**UI 요소**:
- 지문 카드 리스트 (제목 + 문제 번호 범위 + 문단 수)
- 카드 클릭 → 해당 지문으로 과외 세션 시작

---

### 화면 3: 과외 세션 (핵심 화면)

**레이아웃**: 좌우 분할

**왼쪽 패널**:
- 탭: [지문] / [문제]
- [지문] 탭: 선택된 지문 전문 표시. 스크롤 가능.
- [문제] 탭: 해당 지문의 문제 + 선지 전문 표시.

**오른쪽 패널**:
- 채팅 영역 (메시지 목록, 스크롤)
- 입력창 (textarea + 전송 버튼, Enter 전송 / Shift+Enter 줄바꿈)
- "문제 풀기" 전환 버튼 (채팅 입력창 위에 작게)
  - 클릭 시: 왼쪽 패널이 [문제] 탭으로 자동 전환 + 채팅에 시스템 메시지 "[모드 전환: 문제 풀이]" 삽입
- "대화 리셋" 버튼 (우측 상단)

**진행 상태 표시** (왼쪽 패널 상단, 선택 기능):
- "(가) ■■□□ / (나) □□□□" 같은 프로그레스 바
- AI 응답에서 문단 번호 추적하여 자동 업데이트 (구현 복잡하면 v2에서)

**채팅 API 호출 구조**:

```
POST /api/chat

Request Body:
{
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."},
    ...
  ],
  "passage": "(가) 법조문으로...",
  "metadata": "(가)는 4문단 구조:...",
  "questions": "4. (가)와 (나)의...",
  "model": "claude-sonnet-4-20250514",
  "apiKey": "sk-ant-..."
}

Response: 스트리밍 (SSE 또는 ReadableStream)
```

**서버 사이드 (`/api/chat/route.ts`)**:

```typescript
// 시스템 프롬프트 조립
const systemPrompt = SYSTEM_PROMPT_TEMPLATE
  .replace('{{PASSAGE}}', body.passage)
  .replace('{{PASSAGE_METADATA}}', body.metadata);

// 문제 풀기 모드 전환 메시지가 있으면 시스템 프롬프트에 추가
// "[모드 전환: 문제 풀이]" 메시지 감지 시
// → "학생이 문제 풀기를 요청했다. 모드 2(근거 대기)로 전환. 문제:\n" + body.questions 추가

// Anthropic API 호출
const response = await anthropic.messages.create({
  model: body.model,
  max_tokens: 800,
  system: systemPrompt,
  messages: body.messages,
  stream: true,
});
```

**첫 메시지**:
- 채팅 시작 시 assistant 메시지로 미리 삽입:
  "안녕! 지문 가져왔네. 문제 먼저 풀어봤어, 아니면 지금 처음 읽는 거야?"

---

### 화면 4: 세션 종료

**목적**: 대화 내역 저장

**UI 요소**:
- "대화 내역 저장" 버튼 → .txt 파일 다운로드
- "새 지문 시작" 버튼 → 화면 2로 이동
- "새 PDF 업로드" 버튼 → 화면 1로 이동

**대화 내역 포맷**:
```
[수능 비문학 독해 과외 — 세션 기록]
날짜: 2026-05-08
지문: 법 해석과 보증 (4-9번)
모델: claude-sonnet-4-20250514

---

과외 AI: 안녕! 지문 가져왔네...
학생: 먼저 풀어봤어
과외 AI: ...
...
```

---

## 파일 구조

```
/app
  /page.tsx                    — 메인 (설정 화면)
  /upload/page.tsx             — PDF 업로드
  /select/page.tsx             — 지문 선택
  /session/page.tsx            — 과외 세션
  /api
    /chat/route.ts             — Claude API 호출 (스트리밍)
    /analyze/route.ts          — PDF 지문 분석 (지문 구역 분리)
    /validate-key/route.ts     — API 키 유효성 검증
/components
  /ChatPanel.tsx               — 채팅 UI
  /PassagePanel.tsx            — 지문/문제 탭 패널
  /PDFUploader.tsx             — PDF 업로드 컴포넌트
  /PassageCard.tsx             — 지문 선택 카드
  /ProgressBar.tsx             — 문단 진행 상태 (선택)
/lib
  /prompt.ts                   — 시스템 프롬프트 템플릿 (system_prompt_v4.2_final.md 내용)
  /pdf.ts                      — PDF 텍스트 추출 유틸
  /types.ts                    — TypeScript 타입 정의
/public
  — 정적 파일
```

---

## 시스템 프롬프트

`system_prompt_v4.2_final.md` 파일 참조.
`/lib/prompt.ts`에 저장하고 `{{PASSAGE}}`, `{{PASSAGE_METADATA}}` 를 동적 치환.

---

## 주의 사항

### API 키 보안
- 클라이언트에서 직접 Anthropic API 호출 금지.
- 모든 API 호출은 Next.js API Route를 통해 서버 사이드에서.
- API 키는 요청 body로 받아서 사용. 서버에 저장하지 않음.

### 스트리밍
- Claude API 스트리밍 응답을 SSE로 클라이언트에 전달.
- 학생이 AI 응답이 생성되는 걸 실시간으로 볼 수 있게.

### PDF 파싱
- pdf.js (pdfjs-dist)로 클라이언트에서 텍스트 추출.
- 수능 PDF는 2단 레이아웃인 경우 많음. 텍스트 순서가 꼬일 수 있음.
- 텍스트 추출 결과가 완벽하지 않을 수 있으므로, 지문 선택 화면에서 학생이 확인/수정할 수 있게 textarea 제공 (선택 기능).

### 비용 안내
- 설정 화면에 간단한 비용 안내:
  "Sonnet: 대화 1턴 약 $0.01~0.03 / Opus: 대화 1턴 약 $0.05~0.15"
  (대략적 수치, 정확한 건 Anthropic pricing 참고)

### 모바일 대응
- 좌우 분할 레이아웃은 데스크탑 기준.
- 모바일에서는 탭 전환 (지문/문제/채팅) 으로 변환. (v2에서 구현해도 됨)

---

## MVP 우선순위

### 반드시 포함 (v1)
- [ ] API 키 입력 + 모델 선택
- [ ] PDF 업로드 + 텍스트 추출
- [ ] 지문 구역 분리 (Claude 호출)
- [ ] 지문 선택
- [ ] 과외 채팅 (시스템 프롬프트 v4.2 적용, 스트리밍)
- [ ] 지문/문제 탭 전환
- [ ] "문제 풀기" 전환 버튼
- [ ] 대화 내역 .txt 다운로드

### 나중에 추가 (v2+)
- [ ] 문단 진행 상태 표시
- [ ] 모바일 대응
- [ ] 지문 텍스트 수동 수정 기능
- [ ] 대화 내역 분석 (어떤 문단에서 막혔는지 통계)
- [ ] 학생 프로필 설정 (등급, 약점 영역 등)
