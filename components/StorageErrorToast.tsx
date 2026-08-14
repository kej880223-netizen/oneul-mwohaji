"use client";

import { useEffect, useState } from "react";

// localStorage 저장 실패(주로 용량 초과)를 사용자에게 알리는 전역 토스트.
// storage.ts의 write()가 실패 시 발화하는 omh:storage-error 를 구독한다.
// 저장이 조용히 유실되던 문제(사진 누적으로 용량 초과)를 눈에 보이게 한다.
export default function StorageErrorToast() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const quota = (e as CustomEvent<{ quota?: boolean }>).detail?.quota;
      setMsg(
        quota
          ? "저장 공간이 가득 찼어요. 오래된 기록이나 사진을 정리하면 다시 저장할 수 있어요."
          : "저장에 실패했어요. 잠시 후 다시 시도해주세요."
      );
    };
    window.addEventListener("omh:storage-error", handler);
    return () => window.removeEventListener("omh:storage-error", handler);
  }, []);

  if (!msg) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div
        role="alert"
        className="max-w-md w-full rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-card flex items-start gap-2"
      >
        <span aria-hidden className="text-lg leading-none">
          ⚠️
        </span>
        <p className="leading-relaxed flex-1">{msg}</p>
        <button
          type="button"
          aria-label="닫기"
          onClick={() => setMsg(null)}
          className="text-red-400 text-lg leading-none px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
