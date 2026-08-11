// ─────────────────────────────────────────────────────────
//  시스템/유저 프롬프트 빌더 (실제 LLM 어댑터에서 사용)
//  아이 프로필 + 과거 기록을 항상 참고하도록 구성 (개인화, 지시서 10번)
// ─────────────────────────────────────────────────────────

import {
  Child,
  ActivityLog,
  TodayConditions,
  DevDomain,
  DEV_DOMAINS,
} from "../types";
import { ageLabel } from "../utils";
import type { AdviceTurn } from "./index";

// 최근 놀이의 발달 영역 중 적게 다룬 영역(개인화 균형 힌트)
function weakDomainHint(recent: ActivityLog[]): string {
  if (recent.length < 3) return "";
  const count: Record<DevDomain, number> = {
    신체: 0,
    언어: 0,
    사회정서: 0,
    인지: 0,
    창의감각: 0,
  };
  recent.forEach((l) =>
    (l.activity.domains || []).forEach((d) => {
      if (d in count) count[d]++;
    })
  );
  const sorted = DEV_DOMAINS.map((d) => ({ d, c: count[d] })).sort(
    (a, b) => a.c - b.c
  );
  const max = Math.max(...DEV_DOMAINS.map((d) => count[d]));
  const weak = sorted.filter((s) => s.c < max).slice(0, 2).map((s) => s.d);
  if (!weak.length) return "";
  return `\n- 발달 균형: 최근 '${weak.join(", ")}' 영역 놀이가 적었어. 이 영역을 돕는 놀이를 최소 1개 포함해줘.`;
}

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
- 아이 상태: ${conditions.childState}${
    conditions.weather ? `\n- 현재 날씨: ${conditions.weather}` : ""
  }${weakDomainHint(recent)}

위 정보를 바탕으로 오늘 아이와 할 놀이 8개를 추천해줘.
과거에 반응이 좋았던 놀이의 결은 살리고, 반응이 안 좋았던 놀이는 피해줘.

중요 — "부모 체력"과 "아이 상태"는 별개로 반영해줘:
- energyLevel(=부모 체력 소모)은 부모가 얼마나 힘든지를 뜻해. 부모 체력이 '힘들어요'면 energyLevel이 낮은(부모가 앉아서도 가능한) 놀이만 추천해. 고체력 놀이는 절대 넣지 마.
- 단, 부모가 지쳤어도 아이가 '에너지가 넘쳐요'라면, 부모 개입은 적지만 아이는 몸을 많이 쓰는 놀이(예: 신문지 찢기, 풍선 띄우기, 쿠션 징검다리)를 골라 아이 에너지를 발산시켜줘.
- 매번 조금씩 다른 놀이를 제안해 다양성을 줘.

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
  recent: ActivityLog[],
  history: AdviceTurn[] = []
): string {
  const historyBlock = history.length
    ? `\n[이전 대화 — 이어지는 상황]\n${history
        .map(
          (t, i) =>
            `${i + 1}. 부모: ${t.question}\n   도우미 요약: ${t.advice.firstStep}`
        )
        .join("\n")}\n`
    : "";

  const askLine = history.length
    ? `부모가 위 조언을 해봤지만 상황이 이어지고 있어. 앞의 조언과 겹치지 않게, 한 단계 더 나아간 대응을 알려줘. 300~500자 이내.`
    : `이 상황에서 부모가 지금 바로 실행할 수 있는 대응을 알려줘. 300~500자 이내.`;

  return `${childContext(child, recent)}
${historyBlock}
[지금 겪는 상황]
- 분류: ${category}
- 부모 설명: ${question}

${askLine}

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
