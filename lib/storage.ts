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
  deletions: "omh.deletions", // 삭제 묘비(tombstone): 부부 공유 시 삭제 전파용
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

// localStorage 용량 초과(사진 누적 등)로 setItem이 던지면 앱이 조용히
// 크래시하며 저장이 유실되던 문제를 방어한다. 저장 실패 시 이전 값이 그대로
// 남고, 화면 어디서든 안내할 수 있도록 omh:storage-error 이벤트를 발화한다.
export class StorageWriteError extends Error {
  constructor(public quota: boolean) {
    super(quota ? "저장 공간이 가득 찼어요" : "저장에 실패했어요");
    this.name = "StorageWriteError";
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22)
  );
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    const quota = isQuotaError(e);
    window.dispatchEvent(
      new CustomEvent("omh:storage-error", { detail: { quota } })
    );
    throw new StorageWriteError(quota);
  }
  // 같은 탭 내 다른 컴포넌트에 변경 알림
  window.dispatchEvent(new Event("omh:storage"));
}

// ─── 삭제 묘비(tombstone) ─────────────────────────────────
// 하드 삭제 대신 "삭제됨 + 시각"을 남겨, 병합 동기화 시 삭제가 배우자
// 기기로 전파되고(합집합 병합의 부활 버그 방지), 재추가는 시각 비교로 살린다.
// 형태: { "log:<id>": ISO, "question:<id>": ISO, "child:<id>": ISO, "favorite:<title>": ISO }

export type DeletionMap = Record<string, string>;

export function getDeletions(): DeletionMap {
  return read<DeletionMap>(KEYS.deletions, {});
}

function tombstone(...tombKeys: string[]): void {
  if (tombKeys.length === 0) return;
  const map = getDeletions();
  const now = new Date().toISOString();
  tombKeys.forEach((k) => {
    map[k] = now;
  });
  write(KEYS.deletions, map);
}

// 재추가 시 해당 항목의 묘비를 걷어낸다(로컬 정리; 병합은 시각 비교로도 안전).
function clearTombstone(tombKey: string): void {
  const map = getDeletions();
  if (map[tombKey] === undefined) return;
  delete map[tombKey];
  write(KEYS.deletions, map);
}

// tombstone 키 규칙 (share.ts 병합과 반드시 동일하게 유지)
export const tombKeyFor = {
  log: (id: string) => `log:${id}`,
  question: (id: string) => `question:${id}`,
  child: (id: string) => `child:${id}`,
  favorite: (title: string) => `favorite:${title}`,
};

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
  const stamped = { ...child, updatedAt: new Date().toISOString() };
  const next = exists
    ? children.map((c) => (c.id === child.id ? stamped : c))
    : [...children, stamped];
  write(KEYS.children, next);
  if (!read<string | null>(KEYS.activeChildId, null)) {
    write(KEYS.activeChildId, child.id);
  }
}

// 새 아이 추가 + 그 아이로 전환
export function addChild(child: Child): void {
  const stamped = { ...child, updatedAt: child.updatedAt ?? child.createdAt };
  write(KEYS.children, [...getChildren(), stamped]);
  write(KEYS.activeChildId, child.id);
}

// 아이 삭제 (해당 아이의 기록·질문도 함께 삭제)
export function deleteChild(id: string): void {
  const children = getChildren().filter((c) => c.id !== id);
  const gone = { logs: [] as string[], questions: [] as string[] };
  write(KEYS.children, children);
  write(
    KEYS.logs,
    read<ActivityLog[]>(KEYS.logs, []).filter((l) => {
      if (l.childId === id) gone.logs.push(l.id);
      return l.childId !== id;
    })
  );
  write(
    KEYS.questions,
    read<ParentingQuestion[]>(KEYS.questions, []).filter((q) => {
      if (q.childId === id) gone.questions.push(q.id);
      return q.childId !== id;
    })
  );
  // 아이 + 그 아이의 기록·질문 모두 묘비 처리(배우자 기기로 삭제 전파)
  tombstone(
    tombKeyFor.child(id),
    ...gone.logs.map(tombKeyFor.log),
    ...gone.questions.map(tombKeyFor.question)
  );
  if (read<string | null>(KEYS.activeChildId, null) === id) {
    write(KEYS.activeChildId, children[0]?.id ?? null);
  }
}

// 놀이 기록 삭제 (묘비 전파)
export function deleteActivityLog(id: string): void {
  write(
    KEYS.logs,
    read<ActivityLog[]>(KEYS.logs, []).filter((l) => l.id !== id)
  );
  tombstone(tombKeyFor.log(id));
}

// 상황 질문 삭제 (묘비 전파)
export function deleteQuestion(id: string): void {
  write(
    KEYS.questions,
    read<ParentingQuestion[]>(KEYS.questions, []).filter((q) => q.id !== id)
  );
  tombstone(tombKeyFor.question(id));
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
  const stamped = { ...log, updatedAt: log.updatedAt ?? log.createdAt };
  write(KEYS.logs, [stamped, ...logs]);
}

export function updateActivityLog(
  id: string,
  patch: Partial<ActivityLog>
): void {
  const logs = read<ActivityLog[]>(KEYS.logs, []);
  const now = new Date().toISOString();
  write(
    KEYS.logs,
    logs.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: now } : l))
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
  const stamped = { ...q, updatedAt: q.updatedAt ?? q.createdAt };
  write(KEYS.questions, [stamped, ...qs]);
}

export function updateQuestion(
  id: string,
  patch: Partial<ParentingQuestion>
): void {
  const qs = read<ParentingQuestion[]>(KEYS.questions, []);
  const now = new Date().toISOString();
  write(
    KEYS.questions,
    qs.map((q) => (q.id === id ? { ...q, ...patch, updatedAt: now } : q))
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
    tombstone(tombKeyFor.favorite(activity.title));
    return false;
  }
  // 재추가: favedAt을 지금으로 찍어 이전 삭제 묘비보다 최신임을 표시
  write(KEYS.favorites, [
    { ...activity, favedAt: new Date().toISOString() },
    ...list,
  ]);
  clearTombstone(tombKeyFor.favorite(activity.title));
  return true;
}

export function removeFavorite(title: string): void {
  const list = read<Activity[]>(KEYS.favorites, []);
  write(
    KEYS.favorites,
    list.filter((a) => a.title !== title)
  );
  tombstone(tombKeyFor.favorite(title));
}

// ─── 데이터 내보내기(백업) ────────────────────────────────

export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  if (typeof window === "undefined") return out;
  (Object.entries(KEYS) as [string, string][]).forEach(([name, key]) => {
    if (name === "legacyChild") return;
    const raw = window.localStorage.getItem(key);
    out[name] = raw ? JSON.parse(raw) : null;
  });
  return out;
}

// ─── 전체 초기화(로그아웃) ────────────────────────────────

export function resetAll(): void {
  if (typeof window === "undefined") return;
  // omh.* 로 시작하는 모든 키 제거 (알림 설정 등 포함)
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith("omh.")) keys.push(k);
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
  window.dispatchEvent(new Event("omh:storage"));
}
