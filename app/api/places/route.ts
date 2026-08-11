import { NextRequest, NextResponse } from "next/server";
import { searchNearby } from "@/lib/places";

export const runtime = "nodejs";

// UI → (이 라우트) → Overpass(OSM) → 구조화 JSON → UI
export async function POST(req: NextRequest) {
  try {
    const { lat, lng, radius } = await req.json();

    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return NextResponse.json(
        { error: "유효한 위치 좌표가 필요합니다." },
        { status: 400 }
      );
    }

    const safeRadius =
      typeof radius === "number" && radius >= 500 && radius <= 10000
        ? radius
        : 3000;

    const result = await searchNearby(lat, lng, safeRadius);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/places] error:", e);
    return NextResponse.json(
      { error: "주변 장소를 불러오지 못했어요. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
