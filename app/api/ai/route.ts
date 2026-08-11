import { NextRequest, NextResponse } from "next/server";
import { aiToday, aiNow } from "@/lib/ai";

export const runtime = "nodejs";

// UI → (이 라우트) → AI Service → LLM/Mock → 구조화 JSON → UI
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, child } = body;

    if (!child || !child.name) {
      return NextResponse.json(
        { error: "아이 프로필이 필요합니다." },
        { status: 400 }
      );
    }

    if (type === "today") {
      const { conditions, recent = [] } = body;
      if (!conditions) {
        return NextResponse.json(
          { error: "조건이 필요합니다." },
          { status: 400 }
        );
      }
      const result = await aiToday(child, conditions, recent);
      return NextResponse.json(result);
    }

    if (type === "now") {
      const { category = "기타", question = "", recent = [], history = [] } = body;
      const result = await aiNow(child, category, question, recent, history);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "알 수 없는 요청 타입입니다." },
      { status: 400 }
    );
  } catch (e) {
    console.error("[api/ai] error:", e);
    return NextResponse.json(
      { error: "AI 응답 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
