import { PlaceCategory } from "../types";

// 장소 분류 → 이모지 + 한국어 라벨 (클라이언트/서버 공용)
export const PLACE_META: Record<PlaceCategory, { emoji: string; label: string }> = {
  playground: { emoji: "🧗", label: "놀이터" },
  park: { emoji: "🌳", label: "공원" },
  zoo: { emoji: "🦁", label: "동물원" },
  aquarium: { emoji: "🐠", label: "아쿠아리움" },
  museum: { emoji: "🏛️", label: "박물관·전시" },
  themepark: { emoji: "🎡", label: "테마파크" },
  waterpark: { emoji: "💦", label: "물놀이장" },
  library: { emoji: "📚", label: "도서관" },
  other: { emoji: "📍", label: "가볼 만한 곳" },
};
