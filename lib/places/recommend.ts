// ─────────────────────────────────────────────────────────
//  주변 장소 추천 점수 + 브리핑 (규칙 기반, 클라이언트/서버 공용)
//  - score: 아이 성향·상태·좋아하는 것 + 거리로 "추천순" 정렬에 사용
//  - why:   이 유형의 장소가 24~48개월에게 좋은 점
//  - plays: 그곳에서 해볼 수 있는 놀이 (간략)
//  - matchReason: 이 아이에게 왜 잘 맞는지 (개인화된 한 줄)
// ─────────────────────────────────────────────────────────

import { Personality, Place, PlaceCategory } from "../types";

export interface RecommendCtx {
  name: string;
  personality: Personality[];
  childState?: string; // 심심 / 에너지넘침 / 짜증 / 차분 / 모름
  likes?: string;
}

export interface PlaceBrief {
  score: number;
  why: string;
  plays: string[];
  matchReason: string | null;
}

const CATEGORY_INFO: Record<
  PlaceCategory,
  { base: number; why: string; plays: string[] }
> = {
  playground: {
    base: 3,
    why: "몸을 마음껏 움직이며 대근육과 균형 감각을 키우기 좋아요.",
    plays: ["미끄럼틀 순서 기다리기", "모래놀이·소꿉놀이", "그네 밀어주기"],
  },
  park: {
    base: 3,
    why: "탁 트인 공간에서 자연을 오감으로 느끼며 걷기 좋아요.",
    plays: ["자연물 보물찾기(나뭇잎·돌)", "비눗방울 불기", "색깔 찾기 산책"],
  },
  zoo: {
    base: 3,
    why: "동물을 직접 보며 호기심과 언어 표현이 쑥 자라요.",
    plays: ["좋아하는 동물 찾기", "동물 소리 흉내내기", "동물 이름 말하기"],
  },
  aquarium: {
    base: 3,
    why: "어둑한 공간에서 물고기를 관찰하며 집중력을 길러요.",
    plays: ["물고기 색깔 세어보기", "가장 큰 물고기 찾기", "헤엄 흉내내기"],
  },
  museum: {
    base: 2,
    why: "새로운 것을 보고 만지며 상상력을 자극하기 좋아요.",
    plays: ["전시물 색깔·모양 찾기", "좋아하는 전시 고르기", "본 것 이야기하기"],
  },
  themepark: {
    base: 2,
    why: "다양한 놀이기구로 신나는 하루를 보낼 수 있어요.",
    plays: ["연령에 맞는 기구 타기", "캐릭터 찾기", "사진 찍기 놀이"],
  },
  waterpark: {
    base: 2,
    why: "물놀이로 더위를 식히며 감각을 자극해요.",
    plays: ["물 튀기기 놀이", "물뿌리개 놀이", "얕은 물에서 걷기"],
  },
  library: {
    base: 2,
    why: "차분한 분위기에서 책과 친해지기 좋은 곳이에요.",
    plays: ["그림책 함께 고르기", "그림 보고 이야기 짓기", "속삭이기 놀이"],
  },
  other: {
    base: 1,
    why: "아이와 가볍게 다녀오기 좋은 곳이에요.",
    plays: ["주변 산책하기", "무엇이 보이는지 이야기하기"],
  },
};

const ACTIVE_CATS = new Set<PlaceCategory>([
  "playground",
  "park",
  "themepark",
  "waterpark",
]);
const CALM_CATS = new Set<PlaceCategory>(["library", "museum"]);
const NOVELTY_CATS = new Set<PlaceCategory>([
  "zoo",
  "aquarium",
  "museum",
  "themepark",
]);

function isActive(ctx: RecommendCtx) {
  return (
    ctx.personality.includes("활동적인 편") || ctx.childState === "에너지넘침"
  );
}
function isCalm(ctx: RecommendCtx) {
  return (
    ctx.personality.includes("조심스러운 편") ||
    ctx.personality.includes("낯선 환경을 어려워하는 편") ||
    ctx.childState === "짜증" ||
    ctx.childState === "차분"
  );
}
function likesNovelty(ctx: RecommendCtx) {
  return ctx.personality.includes("새로운 것을 좋아하는 편");
}

// 좋아하는 것 키워드 → 잘 맞는 카테고리
const LIKE_RULES: { re: RegExp; cats: PlaceCategory[]; label: string }[] = [
  { re: /동물|강아지|고양이|호랑이|사자|공룡/, cats: ["zoo"], label: "동물" },
  {
    re: /물고기|물놀이|바다|상어|물/,
    cats: ["aquarium", "waterpark"],
    label: "물·물고기",
  },
  { re: /책|그림책|이야기/, cats: ["library"], label: "책" },
  {
    re: /기차|자동차|우주|과학|로봇/,
    cats: ["museum"],
    label: "좋아하는 주제",
  },
];

export function briefPlace(place: Place, ctx: RecommendCtx): PlaceBrief {
  const info = CATEGORY_INFO[place.category] ?? CATEGORY_INFO.other;
  let score = info.base * 10;

  const active = isActive(ctx);
  const calm = isCalm(ctx);
  const novelty = likesNovelty(ctx);

  if (active && ACTIVE_CATS.has(place.category)) score += 15;
  if (active && CALM_CATS.has(place.category)) score -= 8;
  if (calm && (CALM_CATS.has(place.category) || place.category === "park"))
    score += 12;
  if (calm && place.category === "themepark") score -= 8;
  if (novelty && NOVELTY_CATS.has(place.category)) score += 8;

  // 좋아하는 것 매칭
  let likeMatch: string | null = null;
  const likes = ctx.likes || "";
  for (const rule of LIKE_RULES) {
    if (rule.re.test(likes) && rule.cats.includes(place.category)) {
      score += 12;
      likeMatch = rule.label;
      break;
    }
  }

  // 가까울수록 가점 (거리 페널티)
  score -= (place.distanceM / 1000) * 3;

  // 개인화된 '왜 추천' 한 줄
  let matchReason: string | null = null;
  if (likeMatch) {
    matchReason = `${ctx.name}가 좋아하는 ${likeMatch}을 만날 수 있어요`;
  } else if (active && ACTIVE_CATS.has(place.category)) {
    matchReason = `에너지 넘치는 ${ctx.name}가 마음껏 뛰어놀기 좋아요`;
  } else if (calm && (CALM_CATS.has(place.category) || place.category === "park")) {
    matchReason = `차분한 시간을 좋아하는 ${ctx.name}에게 부담 없어요`;
  } else if (novelty && NOVELTY_CATS.has(place.category)) {
    matchReason = `새로운 걸 좋아하는 ${ctx.name}가 흥미로워할 거예요`;
  }

  return { score, why: info.why, plays: info.plays, matchReason };
}
