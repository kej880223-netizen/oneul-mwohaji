"use client";

// ─────────────────────────────────────────────────────────
//  부부 공유 구성원(멤버) — 가족 코드에 참여한 기기 목록.
//  omh.members 에 저장하고 공유 블롭으로 함께 동기화(share.ts).
//  각 기기는 동기화할 때마다 자신을 upsert(lastSeenAt 갱신)하고,
//  나갈 때는 left=true 로 표시해 배우자 기기에서도 보이게 한다.
// ─────────────────────────────────────────────────────────

import { FamilyMember } from "./types";
import { getDeviceId, getAuthor, ROLE_META } from "./identity";

const KEY = "omh.members";

function read(): FamilyMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// silent=true 면 omh:storage 이벤트를 쏘지 않는다.
// (자기 lastSeenAt 갱신이 FamilySync의 변경-업로드 디바운스를 다시 트리거해
//  무한 업로드 루프가 되는 것을 막기 위함.)
function write(list: FamilyMember[], silent = false): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  if (!silent) window.dispatchEvent(new Event("omh:storage"));
}

export function getMembers(): FamilyMember[] {
  // 나간 구성원은 목록 뒤로, 최근 활동순 정렬
  return read().sort((a, b) => {
    if (!!a.left !== !!b.left) return a.left ? 1 : -1;
    return +new Date(b.lastSeenAt) - +new Date(a.lastSeenAt);
  });
}

// 이 기기(=나)를 구성원 목록에 반영. lastSeenAt을 지금으로 갱신.
// 프로필(역할)이 없어도 기본값으로 등록해 목록에 나타나게 한다.
export function upsertSelfMember(): void {
  if (typeof window === "undefined") return;
  const id = getDeviceId();
  if (!id) return;
  const author = getAuthor();
  const now = new Date().toISOString();
  const list = read();
  const me = list.find((m) => m.id === id);
  const role = author?.role ?? "other";
  const label = author?.label ?? ROLE_META.other.label;

  if (me) {
    me.role = role;
    me.label = label;
    me.lastSeenAt = now;
    me.left = false; // 다시 활동 중
    me.updatedAt = now;
  } else {
    list.push({
      id,
      role,
      label,
      joinedAt: now,
      lastSeenAt: now,
      updatedAt: now,
    });
  }
  write(list, true); // 조용히 저장(업로드 루프 방지)
}

// 이 기기를 '나감'으로 표시(배우자 기기에 전파되도록 남겨둠).
export function markSelfLeft(): void {
  const id = getDeviceId();
  if (!id) return;
  const now = new Date().toISOString();
  const list = read();
  const me = list.find((m) => m.id === id);
  if (!me) return;
  me.left = true;
  me.updatedAt = now;
  write(list);
}

// 공유를 완전히 중단할 때 로컬 구성원 목록 비우기.
export function clearMembers(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("omh:storage"));
}

export function isSelf(m: FamilyMember): boolean {
  return m.id === getDeviceId();
}
