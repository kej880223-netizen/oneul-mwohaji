// ─────────────────────────────────────────────────────────
//  데이터 모델 (지시서 17번 항목 기반)
//  MVP 단계에서는 localStorage에 저장하지만, 필드 구조는
//  이후 SQLite/Supabase 스키마로 그대로 옮길 수 있도록 설계.
// ─────────────────────────────────────────────────────────

export type Gender = "boy" | "girl" | "other";

// ─── 양육자(부부 공유: 누가 기록했나) ──────────────────────
// 조부모까지 구체화. "other"는 그 외 catch-all(커스텀 이름과 함께 쓰면 좋음).
export type CaregiverRole =
  | "mom"
  | "dad"
  | "grandma"
  | "grandpa"
  | "aunt"
  | "uncle"
  | "other";

export interface Author {
  id: string; // 작성한 기기의 deviceId
  role: CaregiverRole;
  label: string; // 표시 이름 스냅샷 (예: "엄마")
}

// 부부 공유 구성원(가족 코드에 참여한 각 기기). 블롭에 함께 동기화된다.
export interface FamilyMember {
  id: string; // deviceId
  role: CaregiverRole;
  label: string;
  joinedAt: string; // 처음 참여한 시각(ISO)
  lastSeenAt: string; // 마지막 동기화 시각(ISO)
  left?: boolean; // 공유를 나갔는지
  updatedAt: string; // LWW 병합용
}

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
  photo?: string; // 프로필 사진 (리사이즈된 data URL, 선택)
  createdAt: string; // ISO
  updatedAt?: string; // 마지막 수정 시각(ISO). 동기화 병합 시 최신본 우선(LWW).
}

export type EnergyLevel = "low" | "medium" | "high";

// 발달 영역 (리포트 균형 분석용)
export const DEV_DOMAINS = [
  "신체",
  "언어",
  "사회정서",
  "인지",
  "창의감각",
] as const;
export type DevDomain = (typeof DEV_DOMAINS)[number];

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
  domains?: DevDomain[]; // 발달 영역 (선택)
  favedAt?: string; // 즐겨찾기에 담은 시각(ISO). 삭제 후 재추가 구분용.
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
  photo?: string; // 놀이 순간 사진 (성장앨범용, 리사이즈된 data URL)
  createdBy?: Author; // 누가 기록했나 (부부 공유). 구버전 기록엔 없음.
  createdAt: string; // ISO
  updatedAt?: string; // 마지막 수정 시각(ISO). 동기화 병합 시 최신본 우선(LWW).
}

export interface ParentingQuestion {
  id: string;
  childId: string;
  category: string; // 상황 종류
  question: string;
  childState?: string;
  aiResponse: SituationAdvice;
  note: string;
  createdBy?: Author; // 누가 물었나 (부부 공유). 구버전 기록엔 없음.
  createdAt: string; // ISO
  updatedAt?: string; // 마지막 수정 시각(ISO). 동기화 병합 시 최신본 우선(LWW).
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
  weather?: string; // 예: "맑음 22°C" (선택, 날씨 반영 시)
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
