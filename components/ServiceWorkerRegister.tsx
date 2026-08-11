"use client";

import { useEffect } from "react";

// 서비스 워커 등록 (프로덕션에서만 — 개발 중 캐시로 인한 혼선 방지)
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((e) => console.warn("[sw] register failed", e));
    }
  }, []);

  return null;
}
