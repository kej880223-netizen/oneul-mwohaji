"use client";

// 페이지 간 "선택한 놀이" 전달용 (sessionStorage).
// 추천 놀이는 매번 생성되므로 URL id 대신 세션에 담아 상세로 넘긴다.

import { Activity } from "./types";

const KEY = "omh.selectedActivity";

export function setSelectedActivity(a: Activity): void {
  if (typeof window === "undefined") return;
  try {
    // Safari 프라이빗 모드 등에서 setItem이 던질 수 있어 방어한다.
    sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* noop — 저장 실패해도 앱은 계속 동작 */
  }
}

export function getSelectedActivity(): Activity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Activity) : null;
  } catch {
    return null; // 손상/접근불가 시 안전 폴백
  }
}
