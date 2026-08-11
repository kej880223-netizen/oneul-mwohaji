"use client";

import { useEffect } from "react";
import { getChild } from "@/lib/storage";
import { maybeShowDailyReminder } from "@/lib/notifications";

// 앱이 열려 있는 동안 주기적으로 '오늘의 놀이' 리마인더 조건을 확인.
// (완전 종료 상태 예약 푸시는 백엔드 필요 — 후속 과제)
export default function NotificationScheduler() {
  useEffect(() => {
    const check = () => {
      const child = getChild();
      maybeShowDailyReminder(child?.name ?? "");
    };
    check();
    const id = window.setInterval(check, 60 * 1000); // 1분마다 확인
    return () => window.clearInterval(id);
  }, []);

  return null;
}
