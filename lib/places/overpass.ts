// ─────────────────────────────────────────────────────────
//  Overpass API(OpenStreetMap) 주변 장소 검색 — 서버 전용
//  무료·API 키 불필요. 놀이터/공원/도서관/박물관/동물원 등 조회.
//
//  안정성: 공개 Overpass 인스턴스는 자주 느리거나 504/429를 내므로
//  여러 미러를 동시에 요청해(Promise.any) 가장 먼저 응답한 결과를 사용.
//  (Vercel 무료 함수 10초 제한 안에서 동작하도록 전체 9초 타임아웃)
// ─────────────────────────────────────────────────────────

import { Place, PlaceCategory } from "../types";
import { haversineM, uid } from "../utils";

const DEFAULT_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

function endpoints(): string[] {
  // OVERPASS_URL이 지정되면 그것만 사용, 아니면 기본 미러 목록
  return process.env.OVERPASS_URL
    ? [process.env.OVERPASS_URL]
    : DEFAULT_ENDPOINTS;
}

function categorize(tags: Record<string, string>): PlaceCategory {
  if (!tags) return "other";
  if (tags.leisure === "playground") return "playground";
  if (tags.leisure === "park") return "park";
  if (tags.leisure === "water_park") return "waterpark";
  if (tags.tourism === "zoo") return "zoo";
  if (tags.tourism === "aquarium") return "aquarium";
  if (tags.tourism === "museum") return "museum";
  if (tags.tourism === "theme_park") return "themepark";
  if (tags.amenity === "library") return "library";
  return "other";
}

function buildQuery(lat: number, lng: number, radius: number, limit: number) {
  return `[out:json][timeout:8];
(
  node["leisure"="playground"](around:${radius},${lat},${lng});
  node["leisure"="park"](around:${radius},${lat},${lng});
  way["leisure"="park"](around:${radius},${lat},${lng});
  node["leisure"="water_park"](around:${radius},${lat},${lng});
  way["leisure"="water_park"](around:${radius},${lat},${lng});
  node["tourism"="zoo"](around:${radius},${lat},${lng});
  way["tourism"="zoo"](around:${radius},${lat},${lng});
  node["tourism"="aquarium"](around:${radius},${lat},${lng});
  node["tourism"="museum"](around:${radius},${lat},${lng});
  way["tourism"="museum"](around:${radius},${lat},${lng});
  node["tourism"="theme_park"](around:${radius},${lat},${lng});
  way["tourism"="theme_park"](around:${radius},${lat},${lng});
  node["amenity"="library"](around:${radius},${lat},${lng});
);
out center ${limit * 5};`;
}

async function fetchFrom(
  endpoint: string,
  query: string,
  signal: AbortSignal
): Promise<any> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "oneul-mwohaji/1.0 (parenting web app)",
    },
    body: "data=" + encodeURIComponent(query),
    signal,
  });
  if (!res.ok) throw new Error(`overpass ${res.status} @ ${endpoint}`);
  return res.json();
}

function parse(
  data: any,
  lat: number,
  lng: number,
  limit: number
): Place[] {
  const seen = new Set<string>();
  const places: Place[] = [];

  for (const el of data.elements || []) {
    const tags = el.tags || {};
    const name: string | undefined = tags.name || tags["name:ko"];
    if (!name) continue;

    const plat: number | undefined = el.lat ?? el.center?.lat;
    const plng: number | undefined = el.lon ?? el.center?.lon;
    if (plat == null || plng == null) continue;

    const key = `${name}@${plat.toFixed(4)},${plng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const address =
      tags["addr:full"] ||
      [tags["addr:city"], tags["addr:district"], tags["addr:street"]]
        .filter(Boolean)
        .join(" ") ||
      undefined;

    places.push({
      id: String(el.id ?? uid()),
      name,
      category: categorize(tags),
      lat: plat,
      lng: plng,
      distanceM: Math.round(haversineM(lat, lng, plat, plng)),
      address,
      mapUrl: `https://map.kakao.com/link/map/${encodeURIComponent(
        name
      )},${plat},${plng}`,
    });
  }

  places.sort((a, b) => a.distanceM - b.distanceM);
  return places.slice(0, limit);
}

export async function searchNearbyOverpass(
  lat: number,
  lng: number,
  radius = 3000,
  limit = 12
): Promise<Place[]> {
  const query = buildQuery(lat, lng, radius, limit);
  const eps = endpoints();
  const controllers = eps.map(() => new AbortController());
  const timer = setTimeout(() => controllers.forEach((c) => c.abort()), 9000);

  try {
    // 여러 미러를 동시에 → 가장 먼저 성공한 응답 사용
    const data = await Promise.any(
      eps.map((ep, i) => fetchFrom(ep, query, controllers[i].signal))
    );
    // 나머지 요청 취소
    controllers.forEach((c) => {
      if (!c.signal.aborted) c.abort();
    });
    return parse(data, lat, lng, limit);
  } catch {
    throw new Error("모든 Overpass 미러 요청 실패");
  } finally {
    clearTimeout(timer);
  }
}
