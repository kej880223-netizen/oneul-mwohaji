"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ageInMonths } from "@/lib/utils";
import {
  bandForMonths,
  progressForBand,
  getChecked,
  MilestoneBand,
} from "@/lib/milestones";

// 홈: 아이 개월 수에 맞는 발달 체크 진행도 미니카드 → /growth 로 이동.
export default function HomeMilestone({
  childId,
  birthDate,
}: {
  childId: string;
  birthDate: string;
}) {
  const band: MilestoneBand = bandForMonths(ageInMonths(birthDate));
  const [progress, setProgress] = useState({ done: 0, total: band.items.length });
  const [nextItem, setNextItem] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setProgress(progressForBand(childId, band));
      const map = getChecked(childId);
      const pending = band.items.find((it) => !map[it.id]);
      setNextItem(pending?.text ?? null);
    };
    refresh();
    window.addEventListener("omh:storage", refresh);
    return () => window.removeEventListener("omh:storage", refresh);
  }, [childId, band]);

  const pct = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <Link href="/growth" aria-label="발달 체크 열기">
      <div className="rounded-2xl bg-white shadow-card p-4 active:scale-[0.99] transition">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-ink">📈 이 시기 발달 체크</p>
          <span className="text-xs text-primary font-semibold">
            {progress.done}/{progress.total}
          </span>
        </div>
        <p className="text-xs text-ink-faint mb-2">{band.label}</p>
        <div className="h-2 rounded-full bg-primary-soft overflow-hidden mb-2">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-ink-soft leading-snug">
          {progress.done >= progress.total
            ? "이 시기 항목을 모두 확인했어요! 🎉"
            : nextItem
              ? `다음: ${nextItem}`
              : "우리 아이 발달을 하나씩 확인해볼까요?"}
        </p>
      </div>
    </Link>
  );
}
