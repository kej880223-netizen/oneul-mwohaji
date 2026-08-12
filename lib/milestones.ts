"use client";

// ─────────────────────────────────────────────────────────
//  개월 수별 발달 이정표(체크리스트).
//  ⚠️ 진단 도구가 아니라 '이 시기 아이들이 보통 하는 것'의 일반적 안내예요.
//  발달 속도는 아이마다 다르니, 체크가 적어도 괜찮습니다. 걱정되면 전문가 상담.
//  대상: 24~48개월. 벗어나면 가장 가까운 구간으로 안내.
// ─────────────────────────────────────────────────────────

export type MilestoneDomain =
  | "신체"
  | "언어"
  | "인지"
  | "사회정서"
  | "일상";

export const DOMAIN_EMOJI: Record<MilestoneDomain, string> = {
  신체: "🤸",
  언어: "💬",
  인지: "🧩",
  사회정서: "💛",
  일상: "🧺",
};

export interface MilestoneItem {
  id: string; // 안정적 식별자 (band + index)
  domain: MilestoneDomain;
  text: string;
}

export interface MilestoneBand {
  key: string;
  minMonths: number;
  maxMonths: number;
  label: string; // 예: "만 2세 전반 (24~29개월)"
  items: MilestoneItem[];
}

// 원자료(라벨/문구). id는 아래에서 band.key + index 로 자동 부여.
interface RawBand {
  key: string;
  minMonths: number;
  maxMonths: number;
  label: string;
  items: Omit<MilestoneItem, "id">[];
}

const RAW: RawBand[] = [
  {
    key: "b24",
    minMonths: 24,
    maxMonths: 29,
    label: "만 2세 전반 (24~29개월)",
    items: [
      { domain: "신체", text: "난간을 잡고 계단을 오르내려요" },
      { domain: "신체", text: "공을 발로 찰 수 있어요" },
      { domain: "언어", text: "두 단어를 붙여 말해요 (예: \"엄마 물\")" },
      { domain: "언어", text: "익숙한 사물의 이름을 말해요" },
      { domain: "인지", text: "간단한 지시를 따라요 (예: \"공 가져와\")" },
      { domain: "인지", text: "같은 색이나 모양을 짝지어요" },
      { domain: "사회정서", text: "다른 아이에게 관심을 보여요" },
      { domain: "일상", text: "숟가락으로 혼자 먹으려 해요" },
    ],
  },
  {
    key: "b30",
    minMonths: 30,
    maxMonths: 35,
    label: "만 2세 후반 (30~35개월)",
    items: [
      { domain: "신체", text: "제자리에서 두 발로 폴짝 뛰어요" },
      { domain: "신체", text: "크레용을 쥐고 선을 그어요" },
      { domain: "언어", text: "세 단어로 된 문장을 말해요" },
      { domain: "언어", text: "자기 이름을 말해요" },
      { domain: "인지", text: "크다/작다를 구분해요" },
      { domain: "인지", text: "2~3조각 퍼즐을 맞춰요" },
      { domain: "사회정서", text: "\"내 거야\"라며 소유를 주장해요 (정상 발달)" },
      { domain: "일상", text: "낮 동안 배변 신호를 알려줘요" },
    ],
  },
  {
    key: "b36",
    minMonths: 36,
    maxMonths: 41,
    label: "만 3세 전반 (36~41개월)",
    items: [
      { domain: "신체", text: "세발자전거 페달을 밟아요" },
      { domain: "신체", text: "동그라미를 따라 그려요" },
      { domain: "언어", text: "\"왜?\" 질문을 자주 해요" },
      { domain: "언어", text: "짧은 이야기를 듣고 이해해요" },
      { domain: "인지", text: "색 이름을 몇 가지 말해요" },
      { domain: "인지", text: "하나, 둘 수를 세기 시작해요" },
      { domain: "사회정서", text: "친구와 번갈아 하기를 시도해요" },
      { domain: "일상", text: "단추를 빼고 혼자 옷을 입으려 해요" },
    ],
  },
  {
    key: "b42",
    minMonths: 42,
    maxMonths: 48,
    label: "만 3세 후반 (42~48개월)",
    items: [
      { domain: "신체", text: "한 발로 잠깐 서 있어요" },
      { domain: "신체", text: "가위로 종이를 잘라요" },
      { domain: "언어", text: "네 단어 이상 문장으로 말해요" },
      { domain: "언어", text: "지난 일을 이야기로 들려줘요" },
      { domain: "인지", text: "색과 모양을 여러 개 구분해요" },
      { domain: "인지", text: "동물/음식처럼 간단히 분류해요" },
      { domain: "사회정서", text: "친구와 협동 놀이를 해요" },
      { domain: "일상", text: "차례를 기다리고 신발을 혼자 신어요" },
    ],
  },
];

export const MILESTONE_BANDS: MilestoneBand[] = RAW.map((b) => ({
  ...b,
  items: b.items.map((it, i) => ({ ...it, id: `${b.key}-${i}` })),
}));

// 개월 수 → 해당(가장 가까운) 구간
export function bandForMonths(months: number): MilestoneBand {
  const exact = MILESTONE_BANDS.find(
    (b) => months >= b.minMonths && months <= b.maxMonths
  );
  if (exact) return exact;
  if (months < MILESTONE_BANDS[0].minMonths) return MILESTONE_BANDS[0];
  return MILESTONE_BANDS[MILESTONE_BANDS.length - 1];
}

// ─── 아이별 체크 상태 (localStorage) ─────────────────────

type CheckMap = Record<string, boolean>;

function keyFor(childId: string): string {
  return `omh.milestones.${childId}`;
}

export function getChecked(childId: string): CheckMap {
  if (typeof window === "undefined" || !childId) return {};
  try {
    const raw = window.localStorage.getItem(keyFor(childId));
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function toggleChecked(childId: string, itemId: string): boolean {
  if (typeof window === "undefined" || !childId) return false;
  const map = getChecked(childId);
  const next = !map[itemId];
  if (next) map[itemId] = true;
  else delete map[itemId];
  window.localStorage.setItem(keyFor(childId), JSON.stringify(map));
  window.dispatchEvent(new Event("omh:storage"));
  return next;
}

// 특정 구간의 체크 진행도
export function progressForBand(
  childId: string,
  band: MilestoneBand
): { done: number; total: number } {
  const map = getChecked(childId);
  const done = band.items.filter((it) => map[it.id]).length;
  return { done, total: band.items.length };
}
