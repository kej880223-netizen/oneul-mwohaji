// ─────────────────────────────────────────────────────────
//  서버 측 AI 어댑터 선택기
//  AI_PROVIDER 환경변수로 mock / openai 전환.
//  openai 호출 실패 시 데모가 끊기지 않도록 mock으로 자동 폴백.
// ─────────────────────────────────────────────────────────

import { ActivityLog, Child, SituationAdvice, TodayConditions, Activity } from "../types";
import { mockAdapter } from "./mock";
import { openaiAdapter } from "./openai";

function provider(): "mock" | "openai" {
  const p = (process.env.AI_PROVIDER || "mock").toLowerCase();
  if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export async function aiToday(
  child: Child,
  conditions: TodayConditions,
  recent: ActivityLog[]
): Promise<{ activities: Activity[]; source: string }> {
  if (provider() === "openai") {
    try {
      const r = await openaiAdapter.today(child, conditions, recent);
      if (r.activities.length) return { ...r, source: "openai" };
    } catch (e) {
      console.error("[ai] openai today failed, fallback to mock:", e);
    }
  }
  return { ...mockAdapter.today(child, conditions, recent), source: "mock" };
}

export interface AdviceTurn {
  question: string;
  advice: SituationAdvice;
}

export async function aiNow(
  child: Child,
  category: string,
  question: string,
  recent: ActivityLog[],
  history: AdviceTurn[] = []
): Promise<SituationAdvice & { source: string }> {
  if (provider() === "openai") {
    try {
      const r = await openaiAdapter.now(child, category, question, recent, history);
      return { ...r, source: "openai" };
    } catch (e) {
      console.error("[ai] openai now failed, fallback to mock:", e);
    }
  }
  return {
    ...mockAdapter.now(child, category, question, recent, history),
    source: "mock",
  };
}
