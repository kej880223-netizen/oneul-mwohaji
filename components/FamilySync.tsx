"use client";

import { useEffect } from "react";
import { getFamilyCode, syncOnce, pushToCloud } from "@/lib/share";
import { notifyPartnerActivity, notifyMemberJoined } from "@/lib/notifications";

// 가족 코드가 설정돼 있으면 앱이 열려 있는 동안 주기적으로 동기화.
export default function FamilySync() {
  useEffect(() => {
    let debounce: number | undefined;
    let id: number | undefined;

    const tick = async () => {
      const code = getFamilyCode();
      if (!code) return;
      try {
        const { partnerNew, memberJoined } = await syncOnce(code);
        if (memberJoined.length) notifyMemberJoined(memberJoined);
        if (partnerNew.length) notifyPartnerActivity(partnerNew);
        // 배경 동기화 성공 — 실패 표시가 있었다면 해제되도록 알림
        window.dispatchEvent(new Event("omh:sync-ok"));
      } catch (e) {
        console.warn("[familySync] sync failed", e);
        // 배경 동기화 실패를 화면(부부 공유 카드)에서 알 수 있게 알림
        window.dispatchEvent(new Event("omh:sync-fail"));
      }
    };

    // 가족 코드가 생기기 전에는 30초 폴링을 돌리지 않는다(온보딩 등).
    const startPolling = () => {
      if (id !== undefined || !getFamilyCode()) return;
      tick();
      id = window.setInterval(tick, 30000); // 30초마다
    };

    // 로컬 변경 시 디바운스 업로드 (+ 코드가 방금 생겼다면 폴링 시작)
    const onChange = () => {
      startPolling();
      const code = getFamilyCode();
      if (!code) return;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        pushToCloud(code)
          .then(() => window.dispatchEvent(new Event("omh:sync-ok")))
          .catch(() => window.dispatchEvent(new Event("omh:sync-fail")));
      }, 2500);
    };

    startPolling();
    window.addEventListener("omh:storage", onChange);

    return () => {
      if (id !== undefined) window.clearInterval(id);
      window.clearTimeout(debounce);
      window.removeEventListener("omh:storage", onChange);
    };
  }, []);

  return null;
}
