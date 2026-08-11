"use client";

// 페이지 간 "선택한 놀이" 전달용 (sessionStorage).
// 추천 놀이는 매번 생성되므로 URL id 대신 세션에 담아 상세로 넘긴다.

import { Activity } from "./types";

const KEY = "omh.selectedActivity";

export function setSelectedActivity(a: Activity): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(a));
}

export function getSelectedActivity(): Activity | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Activity) : null;
}
