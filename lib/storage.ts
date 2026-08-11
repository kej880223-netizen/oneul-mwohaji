"use client";

// ─────────────────────────────────────────────────────────
//  localStorage 기반 데이터 레이어 (익명 사용 / 로그인 불필요)
//  나중에 SQLite/Supabase로 교체할 때 이 파일의 함수 시그니처만
//  유지하면 화면 코드는 바뀌지 않도록 캡슐화.
// ─────────────────────────────────────────────────────────

import { Child, ActivityLog, ParentingQuestion } from "./types";

const KEYS = {
  child: "omh.child",
  logs: "omh.activityLogs",
  questions: "omh.parentingQuestions",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  // 같은 탭 내 다른 컴포넌트에 변경 알림
  window.dispatchEvent(new Event("omh:storage"));
}

// ─── Child (MVP는 아이 1명) ────────────────────────────────

export function getChild(): Child | null {
  return read<Child | null>(KEYS.child, null);
}

export function saveChild(child: Child): void {
  write(KEYS.child, child);
}

// ─── ActivityLog ──────────────────────────────────────────

export function getActivityLogs(): ActivityLog[] {
  return read<ActivityLog[]>(KEYS.logs, []).sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}

export function addActivityLog(log: ActivityLog): void {
  const logs = read<ActivityLog[]>(KEYS.logs, []);
  write(KEYS.logs, [log, ...logs]);
}

export function updateActivityLog(
  id: string,
  patch: Partial<ActivityLog>
): void {
  const logs = read<ActivityLog[]>(KEYS.logs, []);
  write(
    KEYS.logs,
    logs.map((l) => (l.id === id ? { ...l, ...patch } : l))
  );
}

// ─── ParentingQuestion ────────────────────────────────────

export function getQuestions(): ParentingQuestion[] {
  return read<ParentingQuestion[]>(KEYS.questions, []).sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}

export function addQuestion(q: ParentingQuestion): void {
  const qs = read<ParentingQuestion[]>(KEYS.questions, []);
  write(KEYS.questions, [q, ...qs]);
}

export function updateQuestion(
  id: string,
  patch: Partial<ParentingQuestion>
): void {
  const qs = read<ParentingQuestion[]>(KEYS.questions, []);
  write(
    KEYS.questions,
    qs.map((q) => (q.id === id ? { ...q, ...patch } : q))
  );
}

// ─── 개발용: 전체 초기화 ──────────────────────────────────

export function resetAll(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  window.dispatchEvent(new Event("omh:storage"));
}
