"use client";

import { useEffect } from "react";
import { getChild } from "@/lib/storage";
import { maybeShowDailyReminder } from "@/lib/notifications";

// 앱이 열려 있는 동안 주기적으로 '오늘의 놀이' 리마인더 조건을 확인.
// (완전 종료 상태 예약 푸시는 백엔드 필요 — 후속 과제)
export default function NotificationScheduler() {
  useEffect(() => {
    let id: number | undefined;

    const check = () => {
      const child = getChild();
      if (!child) return; // 프로필 없음(첫 실행/온보딩) — 리마인더 대상 아님
      maybeShowDailyReminder(child.name ?? "");
    };

    // 프로필이 생기기 전에는 1분 타이머를 돌리지 않는다(온보딩 화면 등).
    const start = () => {
      if (id !== undefined || !getChild()) return;
      check();
      id = window.setInterval(check, 60 * 1000);
    };

    start();
    // 온보딩 완료 등으로 프로필이 생기면 그때 타이머를 시작.
    window.addEventListener("omh:storage", start);
    return () => {
      if (id !== undefined) window.clearInterval(id);
      window.removeEventListener("omh:storage", start);
    };
  }, []);

  return null;
}
