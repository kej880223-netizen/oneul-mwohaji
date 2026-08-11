// ─────────────────────────────────────────────────────────
//  OpenAI(호환) 어댑터 — 서버에서만 실행
//  OPENAI_BASE_URL 을 바꾸면 OpenAI 호환 타 LLM으로 교체 가능.
//  응답은 반드시 구조화 JSON으로 파싱 → 실패 시 상위에서 mock fallback.
// ─────────────────────────────────────────────────────────

import { Activity, ActivityLog, Child, SituationAdvice, TodayConditions } from "../types";
import { uid } from "../utils";
import { needsSafetyNotice, SAFETY_MESSAGE } from "./safety";
import {
  SYSTEM_PROMPT,
  buildTodayPrompt,
  buildNowPrompt,
} from "./prompts";

const BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

async function chatJSON(userPrompt: string): Promise<any> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM empty response");
  return JSON.parse(content);
}

function normalizeActivity(raw: any): Activity {
  return {
    id: uid(),
    title: String(raw.title ?? "놀이"),
    description: String(raw.description ?? ""),
    ageRange: String(raw.ageRange ?? "24-48"),
    duration: Number(raw.duration ?? 15),
    materials: Array.isArray(raw.materials) ? raw.materials.map(String) : [],
    energyLevel: ["low", "medium", "high"].includes(raw.energyLevel)
      ? raw.energyLevel
      : "medium",
    difficulty: Math.min(3, Math.max(1, Number(raw.difficulty ?? 1))),
    purpose: String(raw.purpose ?? ""),
    steps: Array.isArray(raw.steps) ? raw.steps.map(String) : [],
    parentPhrases: Array.isArray(raw.parentPhrases)
      ? raw.parentPhrases.map(String)
      : [],
  };
}

export const openaiAdapter = {
  async today(
    child: Child,
    conditions: TodayConditions,
    recent: ActivityLog[]
  ): Promise<{ activities: Activity[] }> {
    const json = await chatJSON(buildTodayPrompt(child, conditions, recent));
    const list = Array.isArray(json.activities) ? json.activities : [];
    return { activities: list.slice(0, 3).map(normalizeActivity) };
  },

  async now(
    child: Child,
    category: string,
    question: string,
    recent: ActivityLog[]
  ): Promise<SituationAdvice> {
    const json = await chatJSON(
      buildNowPrompt(child, category, question, recent)
    );
    const forcedSafety =
      needsSafetyNotice(question) || needsSafetyNotice(category);
    return {
      title: String(json.title ?? "지금은 이렇게 해보세요"),
      firstStep: String(json.firstStep ?? ""),
      sayThis: String(json.sayThis ?? ""),
      avoidThis: String(json.avoidThis ?? ""),
      why: String(json.why ?? ""),
      afterwards: String(json.afterwards ?? ""),
      safetyNotice: forcedSafety
        ? SAFETY_MESSAGE
        : json.safetyNotice
          ? String(json.safetyNotice)
          : null,
    };
  },
};
