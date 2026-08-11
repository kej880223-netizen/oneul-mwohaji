"use client";

// ─────────────────────────────────────────────────────────
//  클라이언트 → /api/ai 호출 래퍼
//  화면은 이 함수만 쓰고, 실제 mock/LLM 선택은 서버가 담당.
//
//  PWA/오프라인 대비: 서버 호출이 실패하면(네트워크 끊김 등)
//  번들된 mock으로 자동 폴백하여 앱이 끊기지 않도록 한다.
//  NEXT_PUBLIC_AI_BASE_URL 을 지정하면 원격 백엔드로 호출 가능.
// ─────────────────────────────────────────────────────────

import {
  Activity,
  ActivityLog,
  Child,
  SituationAdvice,
  TodayConditions,
} from "../types";
import { mockAdapter } from "./mock";

const BASE = process.env.NEXT_PUBLIC_AI_BASE_URL || "";

async function post(body: unknown) {
  const res = await fetch(`${BASE}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `요청 실패 (${res.status})`);
  }
  return res.json();
}

export async function requestToday(
  child: Child,
  conditions: TodayConditions,
  recent: ActivityLog[]
): Promise<Activity[]> {
  try {
    const data = await post({ type: "today", child, conditions, recent });
    return data.activities as Activity[];
  } catch (e) {
    // 오프라인/서버 오류 → 번들 mock으로 폴백
    console.warn("[ai/client] today fallback to local mock:", e);
    return mockAdapter.today(child, conditions, recent).activities;
  }
}

export async function requestNow(
  child: Child,
  category: string,
  question: string,
  recent: ActivityLog[]
): Promise<SituationAdvice> {
  try {
    const data = await post({ type: "now", child, category, question, recent });
    return data as SituationAdvice;
  } catch (e) {
    console.warn("[ai/client] now fallback to local mock:", e);
    return mockAdapter.now(child, category, question, recent);
  }
}
