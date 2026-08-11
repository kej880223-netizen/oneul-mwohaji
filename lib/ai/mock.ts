// ─────────────────────────────────────────────────────────
//  Mock AI 어댑터
//  API key 없이 전체 플로우를 테스트하기 위한 규칙 기반 생성기.
//
//  핵심 개념 분리:
//   - energyLevel : "부모 체력 소모"(부모가 얼마나 힘든가) — UI에도 표시
//   - childEnergy : "아이 활동량"(아이가 얼마나 몸을 쓰는가) — 채점용 내부값
//  → 부모는 지쳤지만 아이는 에너지 넘칠 때, "부모는 앉아서 / 아이는 실컷"인
//    놀이(신문지 찢기·풍선·쿠션 징검다리)를 고를 수 있다.
//
//  놀이 풀(100+개)은 lib/ai/activities.json 에 분리 저장.
// ─────────────────────────────────────────────────────────

import {
  Activity,
  Child,
  ActivityLog,
  SituationAdvice,
  TodayConditions,
  EnergyLevel,
} from "../types";
import { uid } from "../utils";
import { needsSafetyNotice, SAFETY_MESSAGE } from "./safety";
import poolData from "./activities.json";

type Template = Omit<Activity, "id" | "parentPhrases"> & {
  childEnergy: EnergyLevel; // 아이 활동량 (채점용)
  places: string[];
  parentPhrases: string[];
};

const ACTIVITY_POOL = poolData as unknown as Template[];

// 오늘의 놀이 추천 개수 (10개 미만)
const RECOMMEND_COUNT = 8;

// ─── 조건별 점수 함수 ──────────────────────────────────

function parentFit(pe: string, el: EnergyLevel): number {
  // 부모 체력(=부모 노력) 매칭. 힘들 땐 고체력 놀이 강한 감점.
  if (pe === "힘들어요") return el === "low" ? 5 : el === "medium" ? 0 : -8;
  if (pe === "보통") return el === "low" ? 2 : el === "medium" ? 3 : 0;
  if (pe === "같이 놀고싶어요") return el === "low" ? 0 : el === "medium" ? 2 : 4;
  return 0;
}

function childFit(cs: string, ce: EnergyLevel): number {
  // 아이 상태 ↔ 아이 활동량 매칭
  switch (cs) {
    case "에너지넘침":
      return ce === "high" ? 4 : ce === "medium" ? 1 : -3;
    case "짜증":
      return ce === "low" ? 3 : ce === "medium" ? 1 : -2;
    case "차분":
      return ce === "low" ? 2 : ce === "medium" ? 1 : -1;
    case "심심":
      return ce === "high" ? 2 : ce === "medium" ? 2 : 0;
    default:
      return 0; // 모름
  }
}

function durationFit(time: string, dur: number): number {
  if (time === "10분 이하") return dur <= 10 ? 2 : dur <= 15 ? 0 : -3;
  if (time === "10~30분") return dur >= 10 && dur <= 30 ? 2 : -1;
  if (time === "30분~1시간") return dur >= 20 ? 2 : dur <= 10 ? -1 : 1;
  if (time === "1시간 이상") return dur >= 25 ? 2 : 0;
  return 0;
}

function pickActivities(
  child: Child,
  c: TodayConditions,
  recent: ActivityLog[]
): Activity[] {
  const dislikedTitles = new Set(
    recent.filter((l) => l.reaction === "bad").map((l) => l.activity.title)
  );
  const likedTitles = new Set(
    recent.filter((l) => l.reaction === "good").map((l) => l.activity.title)
  );

  // 좋아하는 것 토큰
  const likeTokens = (child.likes || "")
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const scored = ACTIVITY_POOL.map((t) => {
    let s = 0;

    // 장소 (안 맞으면 사실상 제외)
    s += t.places.includes(c.place) ? 4 : -6;

    // 부모 체력 / 아이 상태 / 시간
    s += parentFit(c.parentEnergy, t.energyLevel);
    s += childFit(c.childState, t.childEnergy);
    s += durationFit(c.time, t.duration);

    // 성향
    if (child.personality.includes("활동적인 편") && t.childEnergy === "high")
      s += 1;
    if (
      child.personality.includes("조심스러운 편") ||
      child.personality.includes("낯선 환경을 어려워하는 편")
    ) {
      if (t.childEnergy === "low") s += 1;
      if (t.childEnergy === "high") s -= 1;
    }

    // 좋아하는 것 매칭 (제목·설명·목적·준비물에 포함되면 가점)
    const haystack = `${t.title} ${t.description} ${t.purpose} ${(
      t.materials || []
    ).join(" ")}`;
    if (likeTokens.some((tok) => haystack.includes(tok))) s += 2;

    // 과거 반응
    if (likedTitles.has(t.title)) s += 3;
    if (dislikedTitles.has(t.title)) s -= 6;

    // 매번 조금씩 다른 조합을 위한 소량 무작위성
    s += Math.random() * 1.5;

    return { t, s };
  }).sort((a, b) => b.s - a.s);

  return scored.slice(0, RECOMMEND_COUNT).map(({ t }) => ({
    id: uid(),
    title: t.title,
    description: t.description,
    ageRange: t.ageRange,
    duration: t.duration,
    materials: t.materials || [],
    energyLevel: t.energyLevel,
    difficulty: t.difficulty,
    purpose: t.purpose,
    steps: t.steps,
    parentPhrases: (t.parentPhrases || []).map((p) =>
      p.replaceAll("{name}", child.name)
    ),
  }));
}

// ─── 상황별 조언 템플릿 ────────────────────────────────────

type AdviceTemplate = Omit<SituationAdvice, "title" | "safetyNotice">;

const ADVICE: Record<string, AdviceTemplate> = {
  떼쓰기: {
    firstStep:
      "아이 눈높이로 앉아 잠시 기다려 주세요. 지금은 설득보다 감정을 먼저 받아주는 게 우선이에요.",
    sayThis: "\"{name}가 많이 속상했구나. 엄마아빠가 옆에 있어.\"",
    avoidThis:
      "\"뚝 그쳐\", \"안 돼!\"라고 크게 다그치거나, 그 자리에서 요구를 다 들어주는 것.",
    why: "이 시기 아이는 감정 조절 뇌가 아직 자라는 중이라, 떼는 '나쁜 행동'이 아니라 감정 표현 방식이에요.",
    afterwards:
      "진정된 뒤 \"아까 어떤 기분이었어?\"라고 감정에 이름을 붙여주면 다음엔 말로 표현하기 쉬워져요.",
  },
  공유거부: {
    firstStep:
      "억지로 뺏지 말고, 순서를 정해주세요. 타이머나 '이거 끝나면 바꾸자'가 효과적이에요.",
    sayThis: "\"{name}가 다 갖고 놀면, 그다음엔 친구 차례야. 같이 시간을 정해볼까?\"",
    avoidThis: "\"착한 아이는 나눠주는 거야\"라며 죄책감을 주거나 강제로 빼앗는 것.",
    why: "24~48개월은 소유 개념이 막 생기는 시기라, 안 빌려주는 건 이기적인 게 아니라 정상 발달이에요.",
    afterwards:
      "평소 인형끼리 '빌려주기' 놀이를 해두면 실제 상황에서 훨씬 수월해져요.",
  },
  식사거부: {
    firstStep:
      "식사 시간을 20~30분으로 정하고, 안 먹으면 조용히 정리하세요. 쫓아다니며 먹이지 않아요.",
    sayThis: "\"먹기 싫으면 그만 먹어도 돼. 대신 다음 밥까지 기다려야 해.\"",
    avoidThis: "TV·영상으로 유도해 먹이거나, 억지로 한 입 더 강요하는 것.",
    why: "이 시기 식욕은 들쭉날쭉한 게 정상이에요. 강요는 오히려 음식을 '싫은 것'으로 만들어요.",
    afterwards:
      "함께 장 보기, 재료 만지기 같은 경험을 늘리면 새로운 음식에 대한 거부감이 줄어요.",
  },
  낮잠거부: {
    firstStep:
      "불을 낮추고 활동을 조용하게 전환하세요. 억지로 재우기보다 '쉬는 시간'으로 접근해요.",
    sayThis: "\"안 자도 괜찮아. 우리 몸만 잠깐 쉬어보자.\"",
    avoidThis: "안 잔다고 혼내거나, 잠들 때까지 계속 자극을 주는 것.",
    why: "낮잠 욕구가 줄어드는 시기일 수 있어요. 억지로 재우면 잠 자체에 대한 저항이 커져요.",
    afterwards:
      "매일 비슷한 시간에 어둡고 조용한 환경을 반복하면 몸이 리듬을 기억해요.",
  },
  배변훈련: {
    firstStep:
      "실수해도 절대 혼내지 마세요. 변기에 앉는 것 자체를 편하고 즐거운 일로 만들어요.",
    sayThis: "\"괜찮아, 다음에 또 해보면 돼. 변기에 앉아본 것만도 멋져!\"",
    avoidThis: "실수에 실망한 표정을 보이거나, 다른 아이와 비교하는 것.",
    why: "배변은 몸의 준비가 되어야 가능해요. 압박은 오히려 참는 습관과 스트레스를 만들어요.",
    afterwards:
      "성공했을 때 스티커 등으로 크게 축하해주면 스스로 하려는 동기가 생겨요.",
  },
  과활동: {
    firstStep:
      "먼저 안전을 확보한 뒤, 몸을 크게 쓰는 놀이로 에너지를 '방향 전환'해 주세요.",
    sayThis: "\"{name} 지금 몸이 근질근질하구나. 우리 저기까지 같이 달려볼까?\"",
    avoidThis: "무조건 \"가만히 있어!\"라고 억제만 하는 것.",
    why: "이 시기 아이에게 움직임은 발달의 일부예요. 못 움직이게 하는 것보다 발산 통로를 주는 게 효과적이에요.",
    afterwards:
      "실내라면 신호등 멈춰 놀이처럼 '달리다 멈추기' 놀이로 자기조절을 함께 연습해요.",
  },
  등원거부: {
    firstStep:
      "감정을 먼저 인정해 주고, 헤어짐 인사를 짧고 일관되게 하세요. 몰래 사라지지 않아요.",
    sayThis: "\"엄마아빠도 {name} 보고 싶을 거야. 이따 꼭 데리러 올게.\"",
    avoidThis: "\"뚝 그쳐\"라며 다그치거나, 길게 머무르며 헤어짐을 끄는 것.",
    why: "분리불안은 애착이 잘 형성됐다는 신호예요. 예측 가능한 이별 루틴이 아이를 안심시켜요.",
    afterwards:
      "하원 후 \"오늘 뭐가 제일 재밌었어?\"라고 물어 기관을 긍정적으로 연결해 주세요.",
  },
  울음: {
    firstStep:
      "먼저 안아주거나 곁에 있어 주세요. 이유를 캐묻기 전에 안정감을 주는 게 우선이에요.",
    sayThis: "\"괜찮아, 엄마아빠 여기 있어. 천천히 말해도 돼.\"",
    avoidThis: "\"왜 울어! 뭐가 문제야!\"라고 다그치거나 무시하는 것.",
    why: "아직 말로 감정을 다 표현하기 어려워 울음으로 신호를 보내는 거예요.",
    afterwards:
      "진정된 뒤 \"슬펐어? 화났어?\"처럼 감정에 이름을 붙여주면 표현력이 자라요.",
  },
  외출난동: {
    firstStep:
      "우선 안전한 곳으로 자리를 옮기세요. 사람들 시선보다 아이의 진정이 먼저예요.",
    sayThis: "\"여기서 잠깐 나가서 진정하고 다시 오자. 엄마아빠가 안아줄게.\"",
    avoidThis: "그 자리에서 창피를 주거나, 조용히 시키려 원하는 것을 바로 사주는 것.",
    why: "낯선 자극이 많은 밖에서는 아이도 쉽게 압도돼요. 창피주기는 상황을 더 키워요.",
    afterwards:
      "외출 전 \"오늘은 장난감 안 사는 날이야\"처럼 미리 약속을 정해두면 예방에 도움이 돼요.",
  },
  기타: {
    firstStep:
      "먼저 아이의 감정을 말로 받아주며 안정시켜 주세요. 지시보다 공감이 먼저예요.",
    sayThis: "\"{name} 마음이 지금 좀 힘들구나. 엄마아빠가 도와줄게.\"",
    avoidThis: "감정을 무시하고 곧바로 행동을 교정하려 다그치는 것.",
    why: "이 시기 아이의 행동 뒤에는 대부분 '아직 말로 못 하는 감정'이 있어요.",
    afterwards:
      "상황이 지나면 아이와 함께 그때 기분을 짧게 되짚어 보며 표현을 도와주세요.",
  },
};

function makeAdvice(
  child: Child,
  category: string,
  question: string
): SituationAdvice {
  const key = ADVICE[category] ? category : "기타";
  const t = ADVICE[key];
  const fill = (s: string) => s.replaceAll("{name}", child.name);
  const safety =
    needsSafetyNotice(question) || needsSafetyNotice(category)
      ? SAFETY_MESSAGE
      : null;
  return {
    title: "지금은 이렇게 해보세요",
    firstStep: fill(t.firstStep),
    sayThis: fill(t.sayThis),
    avoidThis: fill(t.avoidThis),
    why: fill(t.why),
    afterwards: fill(t.afterwards),
    safetyNotice: safety,
  };
}

export const mockAdapter = {
  today(child: Child, conditions: TodayConditions, recent: ActivityLog[]) {
    return { activities: pickActivities(child, conditions, recent) };
  },
  now(
    child: Child,
    category: string,
    question: string,
    _recent: ActivityLog[]
  ) {
    return makeAdvice(child, category, question);
  },
};
