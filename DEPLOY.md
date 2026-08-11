# 무료 배포 가이드 (PWA)

이 앱은 **PWA**로 설정되어 있어, 무료 호스팅에 올리면 **돈 한 푼 없이** iOS·안드로이드에서
"홈 화면에 추가"로 앱처럼 설치할 수 있습니다.

## 이미 되어 있는 것 ✅
- `public/manifest.webmanifest` — 앱 이름·아이콘·전체화면 설정
- `public/icons/*` — 앱 아이콘 / 애플 터치 아이콘 (해님 마크)
- `public/sw.js` — 서비스 워커(오프라인 캐싱). 프로덕션에서 자동 등록
- 오프라인 시 AI 추천은 번들 mock으로 자동 폴백 → 인터넷 없어도 동작
- `npm run build` 통과, 서비스 워커 등록·manifest 연결 확인 완료

> 아이콘을 바꾸고 싶으면 `scripts/gen-icons.mjs`의 SVG를 수정하고 `node scripts/gen-icons.mjs` 재실행.

---

## 1단계: Vercel에 무료 배포

### 방법 A — GitHub 연동 (추천, 자동 재배포)
1. 이 폴더를 GitHub 저장소로 push
   ```bash
   git init
   git add .
   git commit -m "오늘 뭐하지 MVP"
   # GitHub에서 빈 저장소 만든 뒤:
   git remote add origin https://github.com/<계정>/oneul-mwohaji.git
   git push -u origin main
   ```
2. https://vercel.com 로그인 → **New Project** → 저장소 import → **Deploy**
   (Next.js 자동 감지, 추가 설정 불필요)
3. 몇 분 뒤 `https://oneul-mwohaji.vercel.app` 같은 **HTTPS 주소**가 나옵니다.

### 방법 B — Vercel CLI (GitHub 없이)
```bash
npm i -g vercel
```
로그인은 브라우저 인증이 필요하니, 이 세션에서 아래처럼 실행하세요(터미널에 `!` 붙여서):
```
! vercel login
```
그다음:
```bash
vercel          # 미리보기 배포
vercel --prod   # 정식 배포 → HTTPS 주소 발급
```

> ⚠️ SW/설치는 **HTTPS에서만** 동작합니다. Vercel은 HTTPS를 자동 제공하니 그대로 OK.
> (로컬 테스트는 `http://localhost`도 허용됩니다)

---

## 2단계: 실제 AI 연결 (선택)

키 없이도 mock으로 잘 돌아갑니다. 진짜 LLM을 붙이려면 **Vercel 대시보드 → Settings →
Environment Variables** 에 서버 전용으로 추가하세요 (앱 코드에 키를 넣지 말 것):

| 변수 | 값 |
|---|---|
| `AI_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | `sk-...` |
| `OPENAI_MODEL` | `gpt-4o-mini` (선택) |

추가 후 재배포하면 `/api/ai`가 서버에서 실제 LLM을 호출합니다(키는 브라우저에 노출 안 됨).

---

## 3단계: 휴대폰에서 앱으로 설치

- **iOS (사파리):** 주소 접속 → 공유 버튼 → **"홈 화면에 추가"**
- **안드로이드 (크롬):** 주소 접속 → 설치 배너 또는 메뉴(⋮) → **"앱 설치"**

설치하면 홈 화면에 해님 아이콘이 생기고, 주소창 없는 전체화면으로 실행됩니다.
링크나 QR코드로 공유하면 누구나 무료로 설치할 수 있어요.

---

## 참고: PWA의 한계
- 앱스토어/플레이스토어 **검색 노출은 없음** (링크·QR로 공유)
- iOS 웹푸시는 "홈 화면 추가" + iOS 16.4 이상에서만 제한적으로 가능
- 정식 스토어 등록이 필요해지면: 안드로이드 Play($25 1회) → 애플 App Store($99/년) 순으로 확장.
  코드는 그대로 두고 Capacitor로 감싸면 됩니다.
