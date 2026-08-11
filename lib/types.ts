// ─────────────────────────────────────────────────────────
//  데이터 모델 (지시서 17번 항목 기반)
//  MVP 단계에서는 localStorage에 저장하지만, 필드 구조는
//  이후 SQLite/Supabase 스키마로 그대로 옮길 수 있도록 설계.
// ─────────────────────────────────────────────────────────

export type Gender = "boy" | "girl" | "other";

export const PERSONALITY_OPTIONS = [
  "활동적인 편",
  "조심스러운 편",
  "자기주장이 강한 편",
  "새로운 것을 좋아하는 편",
  "낯선 환경을 어려워하는 편",
  "아직 잘 모르겠음",
] as const;

export type Personality = (typeof PERSONALITY_OPTIONS)[number];

export interface Child {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  gender: Gender;
  likes: string;
  dislikes: string;
  personality: Personality[];
  concerns: string; // 부모가 가장 고민하는 부분
  createdAt: string; // ISO
}

export type EnergyLevel = "low" | "medium" | "high";

export interface Activity {
  id: string;
  title: string;
  description: string; // 한 줄 설명
  ageRange: string; // 예: "24-48"
  duration: number; // 분
  materials: string[];
  energyLevel: EnergyLevel; // 부모 체력
  difficulty: number; // 1~3 (별 개수)
  purpose: string; // 이 놀이가 좋은 이유
  steps: string[]; // 놀이 방법
  parentPhrases: string[]; // 부모가 이렇게 말해보세요
}

export type Reaction = "good" | "soso" | "bad";

export interface ActivityLog {
  id: string;
  childId: string;
  activityId: string;
  activity: Activity; // 스냅샷(추천은 매번 생성되므로 함께 저장)
  reaction: Reaction | null;
  wantAgain: boolean | null;
  note: string;
  createdAt: string; // ISO
}

export interface ParentingQuestion {
  id: string;
  childId: string;
  category: string; // 상황 종류
  question: string;
  childState?: string;
  aiResponse: SituationAdvice;
  note: string;
  createdAt: string; // ISO
}

// ─── AI 구조화 응답 (지시서 15번) ───────────────────────────

// "지금 어떡하지?" 응답
export interface SituationAdvice {
  title: string; // "지금은 이렇게 해보세요"
  firstStep: string; // 1. 먼저
  sayThis: string; // 2. 이렇게 말해보세요
  avoidThis: string; // 3. 지금은 피해주세요
  why: string; // 4. 왜 그럴까요?
  afterwards: string; // 5. 상황이 끝난 뒤
  safetyNotice?: string | null; // 전문가 도움 권고(안전장치)
}

// "오늘 뭐하지?" 요청 조건
export interface TodayConditions {
  place: string; // 집 / 야외 / 어린이집·기관 / 이동 중
  time: string; // 10분 이하 / 10~30분 / 30분~1시간 / 1시간 이상
  parentEnergy: string; // 힘들어요 / 보통 / 같이 놀아주고 싶어요
  childState: string; // 심심 / 에너지 넘침 / 짜증 / 차분 / 모름
}

// ─── 주변 장소 (야외 GPS 추천) ─────────────────────────────

export type PlaceCategory =
  | "playground"
  | "park"
  | "zoo"
  | "aquarium"
  | "museum"
  | "themepark"
  | "waterpark"
  | "library"
  | "other";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  distanceM: number; // 현재 위치로부터 거리(m)
  address?: string;
  mapUrl: string; // 지도에서 열기 링크
}
