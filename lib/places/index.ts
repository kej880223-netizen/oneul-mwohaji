// ─────────────────────────────────────────────────────────
//  서버 측 장소 검색 어댑터 선택기
//  현재는 Overpass(무료, 키 불필요)만 구현.
//  추후 카카오 로컬 API 등으로 교체/추가 가능하도록 캡슐화.
// ─────────────────────────────────────────────────────────

import { Place } from "../types";
import { searchNearbyOverpass } from "./overpass";

export async function searchNearby(
  lat: number,
  lng: number,
  radius?: number
): Promise<{ places: Place[]; source: string }> {
  const places = await searchNearbyOverpass(lat, lng, radius);
  return { places, source: "overpass" };
}
