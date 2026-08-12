"use client";

import { useEffect, useState } from "react";
import { tipOfToday, Tip } from "@/lib/tips";

// 홈: 오늘의 육아 팁. 날짜 기준으로 매일 하나 (하이드레이션 불일치 방지 위해
// 마운트 후 클라이언트에서 계산).
export default function HomeTip({ seed = 0 }: { seed?: number }) {
  const [tip, setTip] = useState<Tip | null>(null);
  useEffect(() => {
    setTip(tipOfToday(seed));
  }, [seed]);

  if (!tip) return null;

  return (
    <div className="rounded-2xl bg-cream p-4">
      <p className="text-xs font-bold text-ink-soft mb-1">💡 오늘의 팁</p>
      <p className="text-sm font-bold text-ink mb-0.5">
        {tip.emoji} {tip.title}
      </p>
      <p className="text-sm text-ink-soft leading-relaxed">{tip.body}</p>
    </div>
  );
}
