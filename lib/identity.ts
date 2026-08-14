"use client";

// ─────────────────────────────────────────────────────────
//  기기 정체성 + 양육자 프로필 (부부 공유용 "누가 기록했나")
//  · deviceId: 이 기기의 고유 id. 동기화되지 않고 기기에만 남는다.
//  · profile:  이 기기 사용자의 역할(엄마/아빠/양육자)과 표시 이름.
//  기록을 만들 때 이 값을 스냅샷으로 박아(createdBy) 배우자 기기에서도
//  "👩 엄마가 기록"처럼 보이게 한다.
// ─────────────────────────────────────────────────────────

import { Author, CaregiverRole } from "./types";

const DEVICE_KEY = "omh.deviceId";
const PROFILE_KEY = "omh.profile";

export const ROLE_META: Record<
  CaregiverRole,
  { label: string; emoji: string }
> = {
  mom: { label: "엄마", emoji: "👩" },
  dad: { label: "아빠", emoji: "👨" },
  grandma: { label: "할머니", emoji: "👵" },
  grandpa: { label: "할아버지", emoji: "👴" },
  aunt: { label: "이모·고모", emoji: "👩‍🦱" },
  uncle: { label: "삼촌·외삼촌", emoji: "👨‍🦱" },
  other: { label: "그 외", emoji: "🧑" },
};

export const ROLE_OPTIONS: CaregiverRole[] = [
  "mom",
  "dad",
  "grandma",
  "grandpa",
  "aunt",
  "uncle",
  "other",
];

// 이 기기의 고유 id (없으면 생성해 저장). 동기화 대상 아님.
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `dev_${Date.now().toString(36)}_${Math.random()
              .toString(36)
              .slice(2, 8)}`;
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

interface StoredProfile {
  role: CaregiverRole;
  label?: string; // 커스텀 이름(선택). 없으면 역할 기본 라벨 사용.
}

export function getProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StoredProfile;
    if (!p?.role || !(p.role in ROLE_META)) return null;
    return p;
  } catch {
    return null;
  }
}

export function setProfile(role: CaregiverRole, label?: string): void {
  if (typeof window === "undefined") return;
  const clean = label?.trim();
  const p: StoredProfile = clean ? { role, label: clean } : { role };
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  getDeviceId(); // 프로필 설정 시 기기 id도 함께 보장
  window.dispatchEvent(new Event("omh:storage"));
}

export function getRole(): CaregiverRole | null {
  return getProfile()?.role ?? null;
}

// 역할 → 표시 라벨(커스텀 이름 우선)
export function labelFor(p: StoredProfile | null): string {
  if (!p) return ROLE_META.other.label;
  return p.label?.trim() || ROLE_META[p.role].label;
}

// 기록에 박아둘 작성자 스냅샷. 프로필 미설정이면 null(익명 기록).
export function getAuthor(): Author | null {
  const p = getProfile();
  if (!p) return null;
  return {
    id: getDeviceId(),
    role: p.role,
    label: labelFor(p),
  };
}

// 이 기기(=나)가 작성한 기록인지 판정
export function isMine(author?: Author | null): boolean {
  if (!author) return false;
  return author.id === getDeviceId();
}
