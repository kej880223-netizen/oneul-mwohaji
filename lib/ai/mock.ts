// ─────────────────────────────────────────────────────────
//  Mock AI 어댑터
//  API key 없이 전체 플로우를 테스트하기 위한 규칙 기반 생성기.
//  입력(장소/체력/아이 상태/성향/과거 기록)에 따라 결과가 달라져
//  실제 개인화된 것처럼 보이도록 구성.
// ─────────────────────────────────────────────────────────

import { Activity, Child, ActivityLog, SituationAdvice, TodayConditions } from "../types";
import { uid } from "../utils";
import { needsSafetyNotice, SAFETY_MESSAGE } from "./safety";

type Template = Omit<Activity, "id" | "parentPhrases"> & {
  places: string[];
  parentPhrases: string[];
};

const ACTIVITY_POOL: Template[] = [
  {
    title: "🎨 색깔 탐정 놀이",
    description: "집 안에서 특정 색깔 물건을 함께 찾는 놀이예요.",
    ageRange: "24-48",
    duration: 10,
    materials: [],
    energyLevel: "low",
    difficulty: 1,
    purpose: "관찰력과 색깔·사물 이름을 말하는 언어 표현을 자연스럽게 자극해요.",
    steps: [
      "먼저 빨간색 물건을 하나 찾아 보여줘요.",
      "아이에게 같은 색 물건을 찾아보게 해요.",
      "찾은 물건을 한곳에 모아요.",
      "마지막에 아이가 가장 좋아하는 색을 골라보게 해요.",
    ],
    parentPhrases: ["빨간색을 찾아볼까?", "우와, {name}가 찾았네!"],
    places: ["집", "이동 중", "어린이집·기관"],
  },
  {
    title: "🧺 빨래 정리 도우미",
    description: "빨래를 색·짝 맞춰 정리하며 노는 생활 놀이예요.",
    ageRange: "24-48",
    duration: 15,
    materials: ["빨래(양말 등)"],
    energyLevel: "low",
    difficulty: 1,
    purpose: "분류·짝짓기 개념과 '나도 도왔다'는 성취감을 길러줘요.",
    steps: [
      "양말을 바닥에 펼쳐 놓아요.",
      "같은 짝을 찾아 맞춰보게 해요.",
      "색깔별로 바구니에 나눠 담아요.",
      "다 하면 크게 칭찬해줘요.",
    ],
    parentPhrases: ["이 양말의 짝은 어디 있을까?", "{name} 덕분에 정리 끝났다!"],
    places: ["집"],
  },
  {
    title: "🐻 이불 동굴 탐험",
    description: "이불로 동굴을 만들고 손전등으로 탐험하는 놀이예요.",
    ageRange: "24-48",
    duration: 20,
    materials: ["이불", "손전등(휴대폰 가능)"],
    energyLevel: "medium",
    difficulty: 1,
    purpose: "상상 놀이로 정서적 안정감과 이야기 표현력을 키워줘요.",
    steps: [
      "식탁이나 의자에 이불을 덮어 동굴을 만들어요.",
      "손전등을 들고 함께 안으로 들어가요.",
      "'무엇이 보이는지' 서로 이야기해요.",
      "동굴 안에서 좋아하는 인형을 초대해요.",
    ],
    parentPhrases: ["동굴 안에 뭐가 있을까?", "{name}가 대장 탐험가네!"],
    places: ["집"],
  },
  {
    title: "🏃 신호등 멈춰 놀이",
    description: "'초록불엔 달리고 빨간불엔 멈추는' 몸놀이예요.",
    ageRange: "24-48",
    duration: 15,
    materials: [],
    energyLevel: "high",
    difficulty: 2,
    purpose: "넘치는 에너지를 발산하고 자기조절(멈추기)을 연습해요.",
    steps: [
      "'초록불'이라고 외치면 함께 달려요.",
      "'빨간불'이라고 외치면 그대로 멈춰요.",
      "역할을 바꿔 아이가 신호를 외치게 해요.",
      "멈추기에 성공하면 하이파이브!",
    ],
    parentPhrases: ["초록불! 출발!", "빨간불! 멈춰! 우와 잘 멈췄다!"],
    places: ["야외", "집", "어린이집·기관"],
  },
  {
    title: "🍳 엄마아빠와 요리 놀이",
    description: "안전한 재료로 함께 섞고 담는 부엌 놀이예요.",
    ageRange: "24-48",
    duration: 25,
    materials: ["그릇", "간단한 재료(과일·시리얼 등)"],
    energyLevel: "medium",
    difficulty: 2,
    purpose: "소근육과 순서 개념을 기르고 편식 완화에도 도움이 돼요.",
    steps: [
      "재료를 그릇에 담아 준비해요.",
      "아이가 직접 섞거나 담게 해요.",
      "완성한 음식을 함께 이름 붙여요.",
      "직접 만든 것을 같이 맛봐요.",
    ],
    parentPhrases: ["이번엔 {name}가 섞어볼까?", "{name} 요리사님, 완성!"],
    places: ["집"],
  },
  {
    title: "🌳 자연물 보물찾기",
    description: "밖에서 나뭇잎·돌 같은 보물을 모으는 놀이예요.",
    ageRange: "24-48",
    duration: 30,
    materials: ["작은 봉투나 바구니"],
    energyLevel: "high",
    difficulty: 1,
    purpose: "오감 자극과 신체 활동, 자연 관찰력을 함께 길러줘요.",
    steps: [
      "'노란 나뭇잎 찾기' 같은 미션을 정해요.",
      "함께 걸으며 보물을 모아요.",
      "모은 것을 바닥에 늘어놓고 세어봐요.",
      "가장 마음에 드는 보물을 골라 집에 가져와요.",
    ],
    parentPhrases: ["동그란 돌을 찾아볼까?", "{name}가 보물을 이만큼 찾았네!"],
    places: ["야외"],
  },
  {
    title: "🎵 손유희 노래 부르기",
    description: "손동작을 곁들여 익숙한 동요를 부르는 놀이예요.",
    ageRange: "24-48",
    duration: 10,
    materials: [],
    energyLevel: "low",
    difficulty: 1,
    purpose: "리듬감과 언어 발달, 부모와의 애착을 동시에 키워줘요.",
    steps: [
      "아이가 좋아하는 동요를 골라요.",
      "간단한 손동작을 함께 만들어요.",
      "속도를 빠르게·느리게 바꿔 불러봐요.",
      "마지막엔 꼭 안아주며 마무리해요.",
    ],
    parentPhrases: ["이 노래 손동작 같이 해볼까?", "{name} 목소리 정말 예쁘다!"],
    places: ["집", "이동 중", "어린이집·기관"],
  },
  {
    title: "🚗 창밖 관찰 이야기",
    description: "이동 중 창밖 사물을 함께 찾고 이야기하는 놀이예요.",
    ageRange: "24-48",
    duration: 10,
    materials: [],
    energyLevel: "low",
    difficulty: 1,
    purpose: "지루한 이동 시간을 언어·관찰 놀이로 바꿔줘요.",
    steps: [
      "'빨간 차 찾기' 미션을 정해요.",
      "먼저 찾는 사람이 손을 들어요.",
      "찾은 것에 대해 한 문장씩 이야기해요.",
      "다음 미션(버스, 강아지 등)으로 바꿔요.",
    ],
    parentPhrases: ["저기 노란 버스 보인다!", "{name}가 먼저 찾았네!"],
    places: ["이동 중"],
  },
  {
    title: "📦 상자 우체통 놀이",
    description: "상자에 구멍을 내 물건을 넣고 꺼내는 조용한 놀이예요.",
    ageRange: "24-48",
    duration: 15,
    materials: ["상자", "작은 물건들"],
    energyLevel: "low",
    difficulty: 1,
    purpose: "소근육과 '넣다·꺼내다' 개념, 집중력을 길러줘요.",
    steps: [
      "상자 윗면에 손이 들어갈 구멍을 만들어요.",
      "블록이나 인형을 '편지'라고 부르며 넣어요.",
      "다시 꺼내며 무엇이 나왔는지 말해요.",
      "아이가 직접 우체부가 되어보게 해요.",
    ],
    parentPhrases: ["편지를 넣어볼까?", "{name} 우체부님, 편지 왔어요!"],
    places: ["집", "어린이집·기관"],
  },
];

function energyRank(e: string): number {
  return e === "low" ? 0 : e === "medium" ? 1 : 2;
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

  const scored = ACTIVITY_POOL.map((t) => {
    let score = 0;
    if (t.places.includes(c.place)) score += 3;

    // 부모 체력에 맞춘 강도
    if (c.parentEnergy === "힘들어요" && t.energyLevel === "low") score += 3;
    if (c.parentEnergy === "같이 놀고싶어요" && t.energyLevel !== "low") score += 2;

    // 아이 상태
    if (c.childState === "에너지넘침" && t.energyLevel === "high") score += 3;
    if (c.childState === "짜증" && t.energyLevel === "low") score += 2;
    if (c.childState === "차분" && t.energyLevel !== "high") score += 1;
    if (c.childState === "심심" && t.energyLevel === "medium") score += 1;

    // 성향
    if (child.personality.includes("활동적인 편") && t.energyLevel === "high") score += 1;
    if (child.personality.includes("조심스러운 편") && t.energyLevel === "low") score += 1;

    // 과거 기록: 좋아한 결은 살리고 싫어한 것은 피함
    if (likedTitles.has(t.title)) score += 2;
    if (dislikedTitles.has(t.title)) score -= 5;

    // 시간 제약: 10분 이하인데 오래 걸리는 놀이는 감점
    if (c.time === "10분 이하" && t.duration > 12) score -= 2;

    return { t, score };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ t }) => t);

  return scored.map((t) => ({
    id: uid(),
    title: t.title,
    description: t.description,
    ageRange: t.ageRange,
    duration: t.duration,
    materials: t.materials,
    energyLevel: t.energyLevel,
    difficulty: t.difficulty,
    purpose: t.purpose,
    steps: t.steps,
    parentPhrases: t.parentPhrases.map((p) => p.replaceAll("{name}", child.name)),
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
