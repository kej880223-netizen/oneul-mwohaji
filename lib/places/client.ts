"use client";

// 클라이언트 → /api/places 호출 래퍼
import { Place } from "../types";

const BASE = process.env.NEXT_PUBLIC_AI_BASE_URL || "";

async function once(lat: number, lng: number, radius?: number): Promise<Place[]> {
  const res = await fetch(`${BASE}/api/places`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng, radius }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `요청 실패 (${res.status})`);
  }
  const data = await res.json();
  return data.places as Place[];
}

// 공개 Overpass가 일시적으로 실패할 수 있어 1회 자동 재시도
export async function requestNearbyPlaces(
  lat: number,
  lng: number,
  radius?: number
): Promise<Place[]> {
  try {
    return await once(lat, lng, radius);
  } catch {
    await new Promise((r) => setTimeout(r, 1500));
    return once(lat, lng, radius);
  }
}
