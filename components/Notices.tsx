"use client";

// 안전장치 관련 표시 컴포넌트 (지시서 16번)

export function SafetyNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2"
    >
      <span aria-hidden className="text-lg leading-none">
        🚨
      </span>
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}

// 모든 AI 답변 하단에 붙는 일반 안내 문구
export function Disclaimer() {
  return (
    <p className="text-[11px] text-ink-faint leading-relaxed text-center px-2">
      이 시기의 모든 아이가 동일하지는 않으며, 위 내용은 일반적인 육아 정보예요.
      걱정되는 부분이 있다면 소아과 전문의 등 전문가와 상담해주세요.
    </p>
  );
}
