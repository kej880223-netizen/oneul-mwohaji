"use client";

// ─────────────────────────────────────────────────────────
//  부부 공유 (가족 코드) — 레코드 단위 병합 동기화
//  두 사람의 기록이 합쳐지도록 id(놀이 즐겨찾기는 title) 기준으로 union.
//  같은 키가 겹치면 updatedAt 최신본 우선(LWW) → 편집 유실 방지.
//  활성 아이 선택(activeChildId)은 기기별로 유지(동기화 대상 아님).
//  삭제 전파: 삭제 묘비(deletions 맵)를 함께 동기화하고, 병합 후 묘비보다
//  오래된 항목은 걷어낸다 → 합집합 병합의 '부활' 버그 해소. 재추가는 항목의
//  시각(createdAt/favedAt)이 묘비보다 최신이면 살아남는다.
// ─────────────────────────────────────────────────────────

import { getDeviceId } from "./identity";
import { upsertSelfMember } from "./members";
import type { PartnerItem } from "./notifications";

const CODE_KEY = "omh.familyCode";
const SAFE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0,O,1,I 제외

const TOMB_TTL_MS = 1000 * 60 * 60 * 24 * 180; // 묘비 보관 180일(무한 증가 방지)
const PARTNER_FRESH_MS = 1000 * 60 * 30; // 30분 내 생성분만 '새 기록' 알림 대상

const K = {
  children: "omh.children",
  logs: "omh.activityLogs",
  questions: "omh.parentingQuestions",
  favorites: "omh.favorites",
  deletions: "omh.deletions",
  members: "omh.members",
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

function readMap(key: string): Record<string, string> {
  try {
    const r = window.localStorage.getItem(key);
    const v = r ? JSON.parse(r) : {};
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function localBlob() {
  return {
    children: readArr(K.children),
    logs: readArr(K.logs),
    questions: readArr(K.questions),
    favorites: readArr(K.favorites),
    deletions: readMap(K.deletions), // 삭제 묘비도 함께 동기화
    members: readArr(K.members), // 공유 구성원도 함께 동기화
  };
}

function serialize(): string {
  return JSON.stringify(localBlob());
}

// 같은 키가 양쪽에 있으면 더 최신본(updatedAt→createdAt→favedAt 순)을 채택.
// 편집이 서로 덮어써 사라지던 문제(특히 아이 프로필 동시 수정)를 해결한다.
function tsOf(x: any): number {
  const t = x?.updatedAt || x?.createdAt || x?.favedAt;
  return t ? +new Date(t) : 0;
}

// 두 동일 키 레코드 중 남길 것 선택.
// 시각이 다르면 최신본. 동률이면 사진이 있는 쪽(업로드 트리밍으로 사진이
// 빠진 원격본이 로컬 원본을 덮어써 사진이 사라지는 것을 방지).
function pickWinner(a: any, b: any): any {
  const ta = tsOf(a);
  const tb = tsOf(b);
  if (tb > ta) return b;
  if (ta > tb) return a;
  const pa = !!a?.photo;
  const pb = !!b?.photo;
  if (pb && !pa) return b;
  return a;
}

function unionBy(a: any[], b: any[], keyOf: (x: any) => string | undefined) {
  const m = new Map<string, any>();
  [...a, ...b].forEach((x) => {
    const k = keyOf(x);
    if (!k) return;
    const cur = m.get(k);
    m.set(k, cur ? pickWinner(cur, x) : x);
  });
  return Array.from(m.values());
}

// 두 묘비 맵을 합치되 키별로 더 최신(늦은) 삭제 시각을 채택.
// 동시에 TTL이 지난 묘비는 정리해 무한 증가를 막는다.
function mergeDeletions(
  a: Record<string, string>,
  b: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  const cutoff = Date.now() - TOMB_TTL_MS;
  for (const src of [a, b]) {
    for (const [k, ts] of Object.entries(src)) {
      if (typeof ts !== "string") continue;
      if (+new Date(ts) < cutoff) continue; // 오래된 묘비 폐기
      if (!out[k] || ts > out[k]) out[k] = ts;
    }
  }
  return out;
}

// 묘비보다 '오래되었거나 시각이 없는' 항목은 삭제된 것으로 보고 제거.
// 재추가(항목 시각 > 묘비 시각)한 항목은 살린다.
function keptBy<T>(
  items: T[],
  del: Record<string, string>,
  tombKey: (x: T) => string,
  itemTs: (x: T) => string | undefined
): T[] {
  return items.filter((x) => {
    const d = del[tombKey(x)];
    if (!d) return true;
    const t = itemTs(x);
    return !!t && t > d;
  });
}

export interface MergeResult {
  changed: boolean;
  partnerNew: PartnerItem[]; // 배우자가 방금 남긴 새 기록(알림용)
  memberJoined: string[]; // 새로 참여한 구성원 라벨(알림용)
}

// 원격 blob을 로컬에 병합. 변경 여부 + 배우자 새 기록/신규 구성원 반환.
function mergeRemote(remote: any): MergeResult {
  const before = serialize();
  const local = localBlob();

  // 병합 전 로컬에 이미 있던 id — '이 기기에 처음 들어온' 기록 판별용
  const hadLog = new Set(local.logs.map((x: any) => x?.id));
  const hadQ = new Set(local.questions.map((x: any) => x?.id));
  const hadMember = new Set(local.members.map((x: any) => x?.id));

  // 1) 삭제 묘비 먼저 합치기(양쪽 삭제 이력 통합)
  const del = mergeDeletions(local.deletions, remote.deletions || {});

  // 2) 레코드 union
  const union = {
    children: unionBy(local.children, remote.children || [], (x) => x?.id),
    logs: unionBy(local.logs, remote.logs || [], (x) => x?.id),
    questions: unionBy(local.questions, remote.questions || [], (x) => x?.id),
    favorites: unionBy(local.favorites, remote.favorites || [], (x) => x?.title),
  };

  // 구성원은 삭제 묘비 없이 id 기준 LWW union(나감은 left 플래그로 표현)
  const members = unionBy(
    local.members,
    remote.members || [],
    (x) => x?.id
  );

  // 3) 묘비 적용(삭제 전파). 재추가분은 시각 비교로 생존.
  const merged = {
    children: keptBy(
      union.children,
      del,
      (x) => `child:${x?.id}`,
      (x) => x?.createdAt
    ),
    logs: keptBy(
      union.logs,
      del,
      (x) => `log:${x?.id}`,
      (x) => x?.createdAt
    ),
    questions: keptBy(
      union.questions,
      del,
      (x) => `question:${x?.id}`,
      (x) => x?.createdAt
    ),
    favorites: keptBy(
      union.favorites,
      del,
      (x) => `favorite:${x?.title}`,
      (x) => x?.favedAt
    ),
  };

  window.localStorage.setItem(K.children, JSON.stringify(merged.children));
  window.localStorage.setItem(K.logs, JSON.stringify(merged.logs));
  window.localStorage.setItem(K.questions, JSON.stringify(merged.questions));
  window.localStorage.setItem(K.favorites, JSON.stringify(merged.favorites));
  window.localStorage.setItem(K.deletions, JSON.stringify(del));
  window.localStorage.setItem(K.members, JSON.stringify(members));

  const changed = before !== serialize();
  if (changed) window.dispatchEvent(new Event("omh:storage"));

  // 배우자 새 기록 감지: 이 기기에 처음 들어왔고 + 남이 작성했고 + 최근 30분 내
  const myId = getDeviceId();
  const now = Date.now();
  const isPartnerFresh = (x: any, had: Set<any>) =>
    !had.has(x?.id) &&
    x?.createdBy &&
    x.createdBy.id !== myId &&
    now - +new Date(x?.createdAt) < PARTNER_FRESH_MS;

  const partnerNew: PartnerItem[] = [
    ...merged.logs
      .filter((l: any) => isPartnerFresh(l, hadLog))
      .map((l: any) => ({
        kind: "play" as const,
        by: l.createdBy?.label,
        title: l.activity?.title,
      })),
    ...merged.questions
      .filter((q: any) => isPartnerFresh(q, hadQ))
      .map((q: any) => ({
        kind: "situation" as const,
        by: q.createdBy?.label,
        title: q.question,
      })),
  ];

  // 새 구성원 감지: 이 기기에 처음 들어왔고 + 내가 아니고 + 나가지 않았고 + 최근 참여
  const memberJoined: string[] = members
    .filter(
      (m: any) =>
        !hadMember.has(m?.id) &&
        m?.id !== myId &&
        !m?.left &&
        now - +new Date(m?.joinedAt) < PARTNER_FRESH_MS
    )
    .map((m: any) => m?.label || "배우자");

  return { changed, partnerNew, memberJoined };
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

// 서버 한계(1MB)보다 낮은 안전 임계치. 넘으면 사진부터 덜어 업로드.
const UPLOAD_SAFE_BYTES = 950_000;

function byteLen(s: string): number {
  try {
    return new TextEncoder().encode(s).length;
  } catch {
    return s.length; // 최악의 경우라도 대략치로 동작
  }
}

// 업로드 payload가 한계를 넘으면 큰 사진부터 제거해 안전 크기로 맞춘다.
// 로컬 데이터는 건드리지 않고 '업로드용 사본'에서만 사진을 뺀다(텍스트 기록·
// 삭제 이력은 100% 동기화 유지). trimmed = 사진이 빠진 항목 수.
function trimForUpload(blob: any): { blob: any; trimmed: number } {
  if (byteLen(JSON.stringify(blob)) <= UPLOAD_SAFE_BYTES) {
    return { blob, trimmed: 0 };
  }
  // 사진 보유 항목을 사진 크기 내림차순으로 모아 큰 것부터 제거
  const carriers: any[] = [
    ...(blob.logs || []),
    ...(blob.children || []),
  ].filter((x) => typeof x?.photo === "string" && x.photo.length > 0);
  carriers.sort((a, b) => (b.photo?.length || 0) - (a.photo?.length || 0));

  const dropped = new Set<any>();
  const copy = {
    ...blob,
    logs: (blob.logs || []).map((l: any) => ({ ...l })),
    children: (blob.children || []).map((c: any) => ({ ...c })),
  };
  const idxLog = new Map<string, any>(copy.logs.map((l: any) => [l.id, l]));
  const idxChild = new Map<string, any>(copy.children.map((c: any) => [c.id, c]));

  for (const c of carriers) {
    if (byteLen(JSON.stringify(copy)) <= UPLOAD_SAFE_BYTES) break;
    const target = idxLog.get(c.id) || idxChild.get(c.id);
    if (target && target.photo) {
      delete target.photo;
      dropped.add(c);
    }
  }
  return { blob: copy, trimmed: dropped.size };
}

export async function pushToCloud(
  code: string,
  opts?: { register?: boolean }
): Promise<{ source: string; trimmed: number }> {
  // register=false 는 '나가기'처럼 자신을 다시 활성 구성원으로 만들면
  // 안 되는 경우에 사용(left=true 상태를 그대로 업로드).
  if (opts?.register !== false) upsertSelfMember();
  const { blob, trimmed } = trimForUpload(localBlob());
  const j = await api({ action: "push", code, blob });
  return { source: j.source, trimmed };
}

export async function pullAndMerge(code: string): Promise<{
  changed: boolean;
  source: string;
  empty: boolean;
  partnerNew: PartnerItem[];
  memberJoined: string[];
}> {
  const j = await api({ action: "pull", code });
  if (j.empty)
    return {
      changed: false,
      source: j.source,
      empty: true,
      partnerNew: [],
      memberJoined: [],
    };
  const r = mergeRemote(j.blob);
  return {
    changed: r.changed,
    source: j.source,
    empty: false,
    partnerNew: r.partnerNew,
    memberJoined: r.memberJoined,
  };
}

// 양방향 1회 동기화(원격 병합 → 로컬 업로드)
export async function syncOnce(code: string): Promise<{
  changed: boolean;
  source: string;
  partnerNew: PartnerItem[];
  memberJoined: string[];
  trimmed: number;
}> {
  const pulled = await pullAndMerge(code);
  const pushed = await pushToCloud(code);
  return {
    changed: pulled.changed,
    source: pushed.source,
    partnerNew: pulled.partnerNew,
    memberJoined: pulled.memberJoined,
    trimmed: pushed.trimmed,
  };
}
