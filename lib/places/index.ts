// ─────────────────────────────────────────────────────────
//  서버 측 장소 검색 어댑터 선택기 + 결과 캐시
//  현재는 Overpass(무료, 키 불필요)만 구현.
//  공개 Overpass가 자주 느리므로, 좌표 반올림 기준 10분 캐시로
//  재시도/같은 지역 재요청 시 외부 호출을 줄이고 실패율을 낮춘다.
//  추후 카카오 로컬 API 등으로 교체/추가 가능하도록 캡슐화.
// ─────────────────────────────────────────────────────────

import { Place } from "../types";
import { searchNearbyOverpass } from "./overpass";

const TTL_MS = 10 * 60 * 1000; // 10분
const cache = new Map<string, { ts: number; places: Place[] }>();

function cacheKey(lat: number, lng: number, radius: number) {
  // 소수점 3자리 ≈ 110m 단위로 반올림해 캐시 적중률 향상
  return `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
}

export async function searchNearby(
  lat: number,
  lng: number,
  radius = 3000
): Promise<{ places: Place[]; source: string }> {
  const key = cacheKey(lat, lng, radius);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return { places: hit.places, source: "cache" };
  }

  const places = await searchNearbyOverpass(lat, lng, radius);
  cache.set(key, { ts: Date.now(), places });
  return { places, source: "overpass" };
}
