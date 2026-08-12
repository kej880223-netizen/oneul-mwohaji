"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useChild } from "@/lib/useStore";
import { ageInMonths, ageLabel } from "@/lib/utils";
import { PageHeader, Card, Loading } from "@/components/ui";
import {
  MILESTONE_BANDS,
  bandForMonths,
  getChecked,
  toggleChecked,
  DOMAIN_EMOJI,
  MilestoneDomain,
  MilestoneBand,
} from "@/lib/milestones";

const DOMAIN_ORDER: MilestoneDomain[] = [
  "신체",
  "언어",
  "인지",
  "사회정서",
  "일상",
];

export default function GrowthPage() {
  const router = useRouter();
  const { child, ready } = useChild();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [bandKey, setBandKey] = useState<string | null>(null);

  // 아이 나이에 맞는 기본 구간 선택 + 체크 상태 로드
  useEffect(() => {
    if (!child) return;
    setChecked(getChecked(child.id));
    setBandKey((prev) => prev ?? bandForMonths(ageInMonths(child.birthDate)).key);
  }, [child]);

  const band: MilestoneBand | null = useMemo(() => {
    if (!bandKey) return null;
    return MILESTONE_BANDS.find((b) => b.key === bandKey) ?? MILESTONE_BANDS[0];
  }, [bandKey]);

  if (!ready) return <Loading />;
  if (!child) {
    router.replace("/onboarding");
    return <Loading />;
  }

  function toggle(itemId: string) {
    if (!child) return;
    toggleChecked(child.id, itemId);
    setChecked(getChecked(child.id));
  }

  const done = band ? band.items.filter((it) => checked[it.id]).length : 0;
  const total = band ? band.items.length : 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const currentBandKey = bandForMonths(ageInMonths(child.birthDate)).key;

  return (
    <div>
      <PageHeader
        title="발달 체크"
        subtitle={`${child.name} · ${ageLabel(child.birthDate)}`}
        onBack={() => router.back()}
      />

      <div className="px-5 pb-8">
        {/* 구간 선택 칩 */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
          {MILESTONE_BANDS.map((b) => (
            <button
              key={b.key}
              onClick={() => setBandKey(b.key)}
              className={
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition " +
                (b.key === bandKey
                  ? "bg-primary text-white"
                  : "bg-white text-ink-soft border border-primary-soft")
              }
            >
              {b.label.split(" (")[0]}
              {b.key === currentBandKey ? " ·지금" : ""}
            </button>
          ))}
        </div>

        {band && (
          <>
            {/* 진행도 */}
            <Card className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-ink">{band.label}</p>
                <span className="text-sm font-bold text-primary">
                  {done}/{total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-primary-soft overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>

            {/* 영역별 체크리스트 */}
            <div className="space-y-4">
              {DOMAIN_ORDER.map((domain) => {
                const items = band.items.filter((it) => it.domain === domain);
                if (items.length === 0) return null;
                return (
                  <div key={domain}>
                    <p className="text-xs font-bold text-ink-soft mb-2 px-1">
                      {DOMAIN_EMOJI[domain]} {domain}
                    </p>
                    <div className="space-y-2">
                      {items.map((it) => {
                        const on = !!checked[it.id];
                        return (
                          <button
                            key={it.id}
                            onClick={() => toggle(it.id)}
                            className={
                              "w-full flex items-start gap-3 text-left rounded-xl px-3 py-3 transition active:scale-[0.99] " +
                              (on ? "bg-primary-soft" : "bg-white")
                            }
                          >
                            <span
                              className={
                                "mt-0.5 w-5 h-5 rounded-md flex items-center justify-center text-[13px] shrink-0 " +
                                (on
                                  ? "bg-primary text-white"
                                  : "border-2 border-primary-soft text-transparent")
                              }
                            >
                              ✓
                            </span>
                            <span
                              className={
                                "text-sm leading-snug " +
                                (on ? "text-ink font-medium" : "text-ink-soft")
                              }
                            >
                              {it.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 비진단 안내 */}
            <p className="text-[11px] text-ink-faint mt-5 leading-relaxed bg-cream rounded-xl px-3 py-2.5">
              ※ 발달 속도는 아이마다 달라요. 아직 못 하는 게 있어도 대부분 괜찮습니다.
              이 목록은 참고용이며 진단이 아니에요. 걱정되는 부분이 있으면 소아과·
              영유아 검진에서 전문가와 상담해보세요.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
