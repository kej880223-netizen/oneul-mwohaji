// ─────────────────────────────────────────────────────────
//  시스템/유저 프롬프트 빌더 (실제 LLM 어댑터에서 사용)
//  아이 프로필 + 과거 기록을 항상 참고하도록 구성 (개인화, 지시서 10번)
// ─────────────────────────────────────────────────────────

import { Child, ActivityLog, TodayConditions } from "../types";
import { ageLabel } from "../utils";

export const SYSTEM_PROMPT = `너는 24~48개월(만 2~4세) 아이를 키우는 부모를 돕는 한국어 육아 도우미다.

원칙:
- 부모가 30초 안에 읽고 바로 실행할 수 있게, 짧고 구체적으로 답한다.
- 긴 육아 칼럼처럼 쓰지 않는다. 각 항목은 1~2문장.
- 항상 따뜻하고 지지적인 어조. 부모를 탓하지 않는다.
- 반드시 요청된 JSON 스키마로만 응답한다. JSON 외 텍스트 금지.

안전 규칙 (매우 중요):
- 너는 의료/응급/전문 진단 서비스가 아니다.
- 부상, 호흡곤란, 의식이상, 심한 알레르기, 고열, 발달장애/질환 진단 요청, 학대·안전 문제 등에서는
  절대 진단하거나 확정적 의료 판단을 하지 말고, safetyNotice 필드에 전문가(119/소아과 등)의 도움을 권하는 문장을 넣는다.
- 모든 답변은 일반적인 육아 정보이며 모든 아이가 동일하지 않음을 전제한다.`;

function childContext(child: Child, recent: ActivityLog[]): string {
  const liked = recent
    .filter((l) => l.reaction === "good")
    .map((l) => l.activity.title);
  const disliked = recent
    .filter((l) => l.reaction === "bad")
    .map((l) => l.activity.title);

  return `[아이 정보]
- 이름: ${child.name}
- 나이: ${ageLabel(child.birthDate)}
- 성별: ${child.gender === "boy" ? "남아" : child.gender === "girl" ? "여아" : "기타"}
- 성향: ${child.personality.join(", ") || "미입력"}
- 좋아하는 것: ${child.likes || "미입력"}
- 싫어하는 것: ${child.dislikes || "미입력"}
- 부모가 가장 고민하는 부분: ${child.concerns || "미입력"}
- 과거 반응이 좋았던 놀이: ${liked.length ? liked.join(", ") : "기록 없음"}
- 과거 반응이 안 좋았던 놀이: ${disliked.length ? disliked.join(", ") : "기록 없음"}`;
}

export function buildTodayPrompt(
  child: Child,
  conditions: TodayConditions,
  recent: ActivityLog[]
): string {
  return `${childContext(child, recent)}

[오늘 상황]
- 장소: ${conditions.place}
- 사용 가능 시간: ${conditions.time}
- 부모 체력: ${conditions.parentEnergy}
- 아이 상태: ${conditions.childState}

위 정보를 바탕으로 오늘 아이와 할 놀이 3개를 추천해줘.
과거에 반응이 좋았던 놀이의 결은 살리고, 반응이 안 좋았던 놀이는 피해줘.
부모 체력이 낮으면 준비물이 적고 energyLevel이 낮은 놀이를 우선해줘.

반드시 아래 JSON 형식으로만 응답:
{
  "activities": [
    {
      "title": "이모지 포함 놀이 제목",
      "description": "한 줄 설명",
      "duration": 10,
      "materials": ["준비물"],
      "energyLevel": "low" | "medium" | "high",
      "difficulty": 1,
      "purpose": "이 놀이가 좋은 이유(발달 관점, 1~2문장)",
      "steps": ["놀이 방법 단계", "..."],
      "parentPhrases": ["부모가 아이에게 해볼 말", "..."],
      "ageRange": "24-48"
    }
  ]
}`;
}

export function buildNowPrompt(
  child: Child,
  category: string,
  question: string,
  recent: ActivityLog[]
): string {
  return `${childContext(child, recent)}

[지금 겪는 상황]
- 분류: ${category}
- 부모 설명: ${question}

이 상황에서 부모가 지금 바로 실행할 수 있는 대응을 알려줘. 300~500자 이내.

반드시 아래 JSON 형식으로만 응답:
{
  "title": "지금은 이렇게 해보세요",
  "firstStep": "부모가 지금 당장 할 행동",
  "sayThis": "실제로 아이에게 할 수 있는 문장",
  "avoidThis": "지금은 피하는 게 좋은 행동",
  "why": "아이의 발달 단계로 본 이유(간단히)",
  "afterwards": "상황이 끝난 뒤 해볼 수 있는 방법",
  "safetyNotice": null 또는 "전문가 도움 권고 문장(안전/의료 상황일 때만)"
}`;
}
