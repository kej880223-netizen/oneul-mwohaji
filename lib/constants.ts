// 화면에서 공용으로 쓰는 선택지 상수

export const TODAY_PLACES = ["집", "야외", "어린이집·기관", "이동 중"] as const;

export const TODAY_TIMES = [
  "10분 이하",
  "10~30분",
  "30분~1시간",
  "1시간 이상",
] as const;

export const PARENT_ENERGY = [
  { value: "힘들어요", emoji: "😵", label: "정말 힘들어요" },
  { value: "보통", emoji: "😐", label: "보통이에요" },
  { value: "같이 놀고싶어요", emoji: "😊", label: "같이 놀아주고 싶어요" },
] as const;

export const CHILD_STATES = [
  { value: "심심", emoji: "🥱", label: "심심해해요" },
  { value: "에너지넘침", emoji: "⚡", label: "에너지가 넘쳐요" },
  { value: "짜증", emoji: "😣", label: "짜증을 많이 내요" },
  { value: "차분", emoji: "😌", label: "차분해요" },
  { value: "모름", emoji: "🤔", label: "잘 모르겠어요" },
] as const;

// "지금 어떡하지?" 자주 발생하는 상황
export const SITUATIONS = [
  { emoji: "😤", label: "떼를 써요", category: "떼쓰기" },
  { emoji: "🧸", label: "장난감을 안 빌려줘요", category: "공유거부" },
  { emoji: "🍚", label: "밥을 안 먹어요", category: "식사거부" },
  { emoji: "😴", label: "낮잠을 안 자요", category: "낮잠거부" },
  { emoji: "🚽", label: "배변훈련이 어려워요", category: "배변훈련" },
  { emoji: "🏃", label: "계속 뛰어다녀요", category: "과활동" },
  { emoji: "👋", label: "어린이집 가기 싫어해요", category: "등원거부" },
  { emoji: "😭", label: "계속 울어요", category: "울음" },
  { emoji: "🛒", label: "밖에서 난리가 났어요", category: "외출난동" },
] as const;
