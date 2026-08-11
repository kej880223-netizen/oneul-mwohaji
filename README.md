# 오늘 뭐하지? 🧸

24~48개월 아이를 키우는 부모를 위한 **AI 육아 도우미 MVP**.
부모가 앱을 열고 30초 안에 답을 얻고 휴대폰을 내려놓는 것을 목표로 합니다.

## 핵심 기능

| 기능 | 설명 |
|------|------|
| 🧸 **오늘 뭐하지?** | 장소·시간·부모 체력·아이 상태를 고르면 AI가 놀이 3개를 추천 |
| 😵 **지금 어떡하지?** | 육아 상황을 고르거나 직접 입력하면 지금 바로 할 대응을 5단계로 안내 |
| 📔 **기록** | 놀이 반응·상황 대응을 저장 (놀이/상황 탭) |
| 👶 **아이 프로필 & 리포트** | 아이 정보 관리 + 데이터 기반 개인화 요약 |

모든 AI 답변은 아이 프로필 + 과거 기록을 참고해 **개인화**됩니다.

## 실행 방법

```bash
cd oneul-mwohaji
npm install        # 이미 설치되어 있다면 생략
npm run dev
```

브라우저에서 http://localhost:3000 접속.
처음 실행하면 온보딩(아이 프로필 생성)으로 이동합니다.

> **API 키 없이 바로 동작합니다.** 기본값은 규칙 기반 mock AI라 전체 플로우를 그대로 데모할 수 있어요.

## 실제 LLM 연결

`.env.local.example` 을 `.env.local` 로 복사한 뒤 값을 채우세요.

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1   # OpenAI 호환 타 LLM으로 교체 가능
```

- LLM 호출이 실패하면 데모가 끊기지 않도록 **자동으로 mock으로 폴백**합니다.
- 어댑터 구조: `UI → /api/ai → lib/ai/index.ts → (mock | openai) → 구조화 JSON → UI`

## 기술 스택

- **Next.js 14 (App Router)** + **TypeScript** + **Tailwind CSS**
- 데이터: **localStorage** (로그인·서버 DB 불필요, 익명 사용). 모델 구조는 SQLite/Supabase로 그대로 이전 가능
- AI: 교체 가능한 어댑터(mock/OpenAI 호환)

## 폴더 구조

```
app/
  page.tsx            홈
  onboarding/         아이 프로필 생성·수정
  today/              오늘 뭐하지 (질문 → 추천 3개)
  activity/           놀이 상세 → "오늘 해보기" → 반응 기록
  now/                지금 어떡하지 (상황 선택 → 5단계 조언 → 기록)
  records/            기록 타임라인
  profile/            프로필 + 개인화 리포트
  api/ai/route.ts     AI 엔드포인트
components/           공통 UI (버튼/카드/상태/네비 등)
lib/
  types.ts            데이터 모델 (Child/Activity/ActivityLog/ParentingQuestion)
  storage.ts          localStorage 데이터 레이어
  ai/                 프롬프트·mock·openai·안전장치
```

## 안전장치

- 부상·호흡곤란·의식이상·고열·알레르기·발달 진단 요청·안전 문제 등의 키워드가 감지되면
  진단 대신 **전문가(119/소아과) 상담을 권고**합니다.
- 모든 AI 답변 하단에 "일반적인 육아 정보" 안내를 표시합니다.

## 데모 플로우

앱 실행 → 프로필 생성 → 홈 → 오늘 뭐하지 → 조건 선택 → 놀이 3개 →
놀이 선택 → 방법 확인 → 오늘 해보기 → 반응 기록 → 홈 →
지금 어떡하지 → 상황 선택 → 5단계 조언 → 기록 → 프로필에서 리포트 확인
