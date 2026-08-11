"use client";

import { useEffect } from "react";
import { getFamilyCode, syncOnce, pushToCloud } from "@/lib/share";

// 가족 코드가 설정돼 있으면 앱이 열려 있는 동안 주기적으로 동기화.
export default function FamilySync() {
  useEffect(() => {
    let debounce: number | undefined;

    const tick = async () => {
      const code = getFamilyCode();
      if (!code) return;
      try {
        await syncOnce(code);
      } catch (e) {
        console.warn("[familySync] sync failed", e);
      }
    };

    // 로컬 변경 시 디바운스 업로드
    const onChange = () => {
      const code = getFamilyCode();
      if (!code) return;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        pushToCloud(code).catch(() => {});
      }, 2500);
    };

    tick();
    const id = window.setInterval(tick, 30000); // 30초마다
    window.addEventListener("omh:storage", onChange);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(debounce);
      window.removeEventListener("omh:storage", onChange);
    };
  }, []);

  return null;
}
