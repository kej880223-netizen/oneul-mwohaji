"use client";

// 클라이언트 → /api/places 호출 래퍼
import { Place } from "../types";

const BASE = process.env.NEXT_PUBLIC_AI_BASE_URL || "";

export async function requestNearbyPlaces(
  lat: number,
  lng: number,
  radius?: number
): Promise<Place[]> {
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
