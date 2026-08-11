"use client";

// ─────────────────────────────────────────────────────────
//  부부 공유 (가족 코드) — 레코드 단위 병합 동기화
//  두 사람의 기록이 합쳐지도록 id(놀이 즐겨찾기는 title) 기준으로 union.
//  활성 아이 선택(activeChildId)은 기기별로 유지(동기화 대상 아님).
//  ⚠️ 현재 방식은 '삭제'는 서로 전파되지 않음(추가·수정 중심).
// ─────────────────────────────────────────────────────────

const CODE_KEY = "omh.familyCode";
const SAFE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0,O,1,I 제외

const K = {
  children: "omh.children",
  logs: "omh.activityLogs",
  questions: "omh.parentingQuestions",
  favorites: "omh.favorites",
} as const;

export function getFamilyCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

export function setFamilyCode(code: string | null): void {
  if (typeof window === "undefined") return;
  if (code) window.localStorage.setItem(CODE_KEY, code);
  else window.localStorage.removeItem(CODE_KEY);
  window.dispatchEvent(new Event("omh:storage"));
}

export function generateFamilyCode(): string {
  const arr = crypto.getRandomValues(new Uint32Array(6));
  let s = "";
  for (let i = 0; i < 6; i++) s += SAFE[arr[i] % SAFE.length];
  return s;
}

// ─── 로컬 데이터 blob ─────────────────────────────────────

function readArr(key: string): any[] {
  try {
    const r = window.localStorage.getItem(key);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}

function localBlob() {
  return {
    children: readArr(K.children),
    logs: readArr(K.logs),
    questions: readArr(K.questions),
    favorites: readArr(K.favorites),
  };
}

function serialize(): string {
  return JSON.stringify(localBlob());
}

function unionBy(a: any[], b: any[], keyOf: (x: any) => string | undefined) {
  const m = new Map<string, any>();
  [...a, ...b].forEach((x) => {
    const k = keyOf(x);
    if (k) m.set(k, x);
  });
  return Array.from(m.values());
}

// 원격 blob을 로컬에 병합. 변경이 있으면 true 반환.
function mergeRemote(remote: any): boolean {
  const before = serialize();
  const local = localBlob();
  const merged = {
    children: unionBy(local.children, remote.children || [], (x) => x?.id),
    logs: unionBy(local.logs, remote.logs || [], (x) => x?.id),
    questions: unionBy(local.questions, remote.questions || [], (x) => x?.id),
    favorites: unionBy(local.favorites, remote.favorites || [], (x) => x?.title),
  };
  window.localStorage.setItem(K.children, JSON.stringify(merged.children));
  window.localStorage.setItem(K.logs, JSON.stringify(merged.logs));
  window.localStorage.setItem(K.questions, JSON.stringify(merged.questions));
  window.localStorage.setItem(K.favorites, JSON.stringify(merged.favorites));
  const changed = before !== serialize();
  if (changed) window.dispatchEvent(new Event("omh:storage"));
  return changed;
}

// ─── API ──────────────────────────────────────────────────

async function api(body: unknown): Promise<any> {
  const res = await fetch("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `요청 실패 (${res.status})`);
  return j;
}

export async function pushToCloud(code: string): Promise<{ source: string }> {
  const j = await api({ action: "push", code, blob: localBlob() });
  return { source: j.source };
}

export async function pullAndMerge(
  code: string
): Promise<{ changed: boolean; source: string; empty: boolean }> {
  const j = await api({ action: "pull", code });
  if (j.empty) return { changed: false, source: j.source, empty: true };
  return { changed: mergeRemote(j.blob), source: j.source, empty: false };
}

// 양방향 1회 동기화(원격 병합 → 로컬 업로드)
export async function syncOnce(
  code: string
): Promise<{ changed: boolean; source: string }> {
  const pulled = await pullAndMerge(code);
  const pushed = await pushToCloud(code);
  return { changed: pulled.changed, source: pushed.source };
}
