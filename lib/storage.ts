"use client";

// ─────────────────────────────────────────────────────────
//  localStorage 기반 데이터 레이어 (익명 사용 / 로그인 불필요)
//  다자녀 지원: children[] + activeChildId. getChild()는 "활성 아이"를 반환해
//  기존 화면 코드는 그대로 동작. 구버전 단일 저장(omh.child)은 자동 마이그레이션.
//  기록/질문은 활성 아이 기준으로 필터링.
// ─────────────────────────────────────────────────────────

import { Child, ActivityLog, ParentingQuestion, Activity } from "./types";

const KEYS = {
  children: "omh.children",
  activeChildId: "omh.activeChildId",
  legacyChild: "omh.child", // 구버전 단일 저장 (마이그레이션용)
  logs: "omh.activityLogs",
  questions: "omh.parentingQuestions",
  favorites: "omh.favorites",
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

// 구버전(단일 아이) → 다자녀 구조로 1회 마이그레이션
function ensureMigrated(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(KEYS.children)) return;
  const legacy = window.localStorage.getItem(KEYS.legacyChild);
  if (!legacy) return;
  try {
    const c = JSON.parse(legacy) as Child;
    window.localStorage.setItem(KEYS.children, JSON.stringify([c]));
    window.localStorage.setItem(KEYS.activeChildId, JSON.stringify(c.id));
    window.localStorage.removeItem(KEYS.legacyChild);
  } catch {
    /* noop */
  }
}

// ─── Children (다자녀) ────────────────────────────────────

export function getChildren(): Child[] {
  ensureMigrated();
  return read<Child[]>(KEYS.children, []);
}

export function getActiveChildId(): string | null {
  ensureMigrated();
  const id = read<string | null>(KEYS.activeChildId, null);
  const children = read<Child[]>(KEYS.children, []);
  if (id && children.some((c) => c.id === id)) return id;
  return children[0]?.id ?? null;
}

// 활성 아이 (없으면 null) — 기존 화면은 이 함수만 쓰면 됨
export function getChild(): Child | null {
  const id = getActiveChildId();
  if (!id) return null;
  return getChildren().find((c) => c.id === id) ?? null;
}

export function setActiveChild(id: string): void {
  write(KEYS.activeChildId, id);
}

// 기존/활성 아이 저장(수정) — id가 있으면 교체, 없으면 추가.
// 활성 아이가 아직 없으면(첫 생성) 이 아이를 활성으로 지정.
export function saveChild(child: Child): void {
  const children = getChildren();
  const exists = children.some((c) => c.id === child.id);
  const next = exists
    ? children.map((c) => (c.id === child.id ? child : c))
    : [...children, child];
  write(KEYS.children, next);
  if (!read<string | null>(KEYS.activeChildId, null)) {
    write(KEYS.activeChildId, child.id);
  }
}

// 새 아이 추가 + 그 아이로 전환
export function addChild(child: Child): void {
  write(KEYS.children, [...getChildren(), child]);
  write(KEYS.activeChildId, child.id);
}

// 아이 삭제 (해당 아이의 기록·질문도 함께 삭제)
export function deleteChild(id: string): void {
  const children = getChildren().filter((c) => c.id !== id);
  write(KEYS.children, children);
  write(
    KEYS.logs,
    read<ActivityLog[]>(KEYS.logs, []).filter((l) => l.childId !== id)
  );
  write(
    KEYS.questions,
    read<ParentingQuestion[]>(KEYS.questions, []).filter((q) => q.childId !== id)
  );
  if (read<string | null>(KEYS.activeChildId, null) === id) {
    write(KEYS.activeChildId, children[0]?.id ?? null);
  }
}

// ─── ActivityLog (활성 아이 기준) ─────────────────────────

export function getActivityLogs(): ActivityLog[] {
  const active = getActiveChildId();
  return read<ActivityLog[]>(KEYS.logs, [])
    .filter((l) => !active || l.childId === active)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
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

// ─── ParentingQuestion (활성 아이 기준) ───────────────────

export function getQuestions(): ParentingQuestion[] {
  const active = getActiveChildId();
  return read<ParentingQuestion[]>(KEYS.questions, [])
    .filter((q) => !active || q.childId === active)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
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

// ─── 즐겨찾기 놀이 (아이 공통) ────────────────────────────
// 놀이는 매번 새로 생성(id 변동)되므로 제목(title)을 기준으로 중복 방지.

export function getFavorites(): Activity[] {
  return read<Activity[]>(KEYS.favorites, []);
}

export function isFavorite(title: string): boolean {
  return getFavorites().some((a) => a.title === title);
}

// 있으면 제거, 없으면 추가. 최종 즐겨찾기 여부를 반환.
export function toggleFavorite(activity: Activity): boolean {
  const list = read<Activity[]>(KEYS.favorites, []);
  if (list.some((a) => a.title === activity.title)) {
    write(
      KEYS.favorites,
      list.filter((a) => a.title !== activity.title)
    );
    return false;
  }
  write(KEYS.favorites, [{ ...activity }, ...list]);
  return true;
}

export function removeFavorite(title: string): void {
  const list = read<Activity[]>(KEYS.favorites, []);
  write(
    KEYS.favorites,
    list.filter((a) => a.title !== title)
  );
}

// ─── 전체 초기화(로그아웃) ────────────────────────────────

export function resetAll(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  window.dispatchEvent(new Event("omh:storage"));
}
