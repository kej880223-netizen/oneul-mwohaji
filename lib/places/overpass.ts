// ─────────────────────────────────────────────────────────
//  Overpass API(OpenStreetMap) 주변 장소 검색 — 서버 전용
//  무료·API 키 불필요. 놀이터/공원/도서관/박물관/동물원 등
//  아이와 갈 만한 장소를 반경 내에서 조회한다.
// ─────────────────────────────────────────────────────────

import { Place, PlaceCategory } from "../types";
import { haversineM, uid } from "../utils";

const ENDPOINT =
  process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";

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

export async function searchNearbyOverpass(
  lat: number,
  lng: number,
  radius = 3000,
  limit = 12
): Promise<Place[]> {
  const q = `[out:json][timeout:15];
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

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  let data: any;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // 공개 Overpass 인스턴스는 UA/Accept 없는 요청을 406으로 거부하기도 함
        Accept: "application/json",
        "User-Agent": "oneul-mwohaji/1.0 (parenting web app)",
      },
      body: "data=" + encodeURIComponent(q),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`overpass ${res.status}`);
    data = await res.json();
  } finally {
    clearTimeout(timer);
  }

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
      // 카카오맵 링크: 별도 키 없이 웹으로 열림 (마커 + 이름)
      mapUrl: `https://map.kakao.com/link/map/${encodeURIComponent(
        name
      )},${plat},${plng}`,
    });
  }

  places.sort((a, b) => a.distanceM - b.distanceM);
  return places.slice(0, limit);
}
