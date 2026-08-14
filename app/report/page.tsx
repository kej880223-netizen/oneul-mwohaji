"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireChild, useActivityLogs } from "@/lib/useStore";
import { exportAll } from "@/lib/storage";
import { computeReport, Period } from "@/lib/report";
import { DevDomain } from "@/lib/types";
import { cx } from "@/lib/utils";
import { Card, PageHeader, Loading, Button, EmptyState } from "@/components/ui";

const DOMAIN_META: Record<DevDomain, { emoji: string; desc: string }> = {
  신체: { emoji: "🤸", desc: "대근육·소근육·움직임" },
  언어: { emoji: "💬", desc: "말·어휘·표현" },
  사회정서: { emoji: "🤝", desc: "상호작용·감정" },
  인지: { emoji: "🧠", desc: "관찰·수·문제해결" },
  창의감각: { emoji: "🎨", desc: "미술·상상·오감" },
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "이번 주" },
  { key: "month", label: "이번 달" },
  { key: "all", label: "전체" },
];

export default function ReportPage() {
  const router = useRouter();
  const { child, ready } = useRequireChild();
  const { logs } = useActivityLogs();
  const [period, setPeriod] = useState<Period>("week");

  const report = useMemo(() => computeReport(logs, period), [logs, period]);

  if (!ready || !child) return <Loading />;

  function handleExport() {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `오늘뭐하지-백업-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxC = report.domainStats[0]?.count ?? 0;

  return (
    <div>
      <PageHeader
        title="발달 리포트"
        subtitle={`${child.name}의 놀이 기록 분석`}
        onBack={() => router.push("/profile")}
      />

      <div className="px-5 space-y-4 pb-6">
        {/* 기간 선택 */}
        <div className="flex gap-2 no-print">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cx(
                "px-4 py-1.5 rounded-full text-sm font-medium transition",
                period === p.key ? "bg-primary text-white" : "bg-white text-ink-soft"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {report.totalPlays === 0 ? (
          <EmptyState
            emoji="📊"
            title="이 기간엔 놀이 기록이 없어요"
            description="놀이를 해보고 아이 반응을 남기면 발달 리포트가 만들어져요."
            action={<Button onClick={() => router.push("/today")}>놀이 추천받기</Button>}
          />
        ) : (
          <>
            {/* 요약 통계 */}
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="함께한 놀이" value={`${report.totalPlays}`} />
              <StatBox label="반응 기록" value={`${report.reactedPlays}`} />
              <StatBox label="좋아한 놀이" value={`${report.goodCount}`} />
            </div>

            {/* 발달 영역 균형 */}
            <Card>
              <h2 className="text-sm font-bold text-ink mb-1">발달 영역 균형</h2>
              <p className="text-xs text-ink-faint mb-3">
                함께한 놀이가 어떤 발달을 도왔는지 보여줘요.
              </p>
              <div className="space-y-2.5">
                {report.domainStats.map((s) => {
                  const meta = DOMAIN_META[s.domain];
                  const pct = maxC > 0 ? Math.round((s.count / maxC) * 100) : 0;
                  const weak = report.weakDomains.includes(s.domain);
                  return (
                    <div key={s.domain}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-ink">
                          {meta.emoji} {s.domain}
                          <span className="text-ink-faint font-normal">
                            {" "}
                            · {meta.desc}
                          </span>
                        </span>
                        <span className="text-ink-soft">{s.count}회</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-cream overflow-hidden">
                        <div
                          className={cx(
                            "h-full rounded-full transition-all",
                            weak ? "bg-primary-soft" : "bg-accent"
                          )}
                          style={{ width: `${Math.max(pct, s.count > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 인사이트 */}
            <Card>
              <h2 className="text-sm font-bold text-ink mb-2">📌 이런 점이 보여요</h2>
              {report.enough ? (
                <ul className="space-y-2">
                  {report.insights.map((line, i) => (
                    <li key={i} className="text-sm text-ink flex gap-2">
                      <span aria-hidden>•</span>
                      <span className="leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-soft leading-relaxed">
                  조금 더 기록하면 {child.name}에게 맞는 패턴과 발달 균형을
                  분석해드릴게요. 🌱
                </p>
              )}
            </Card>

            {/* 내보내기 / 인쇄 */}
            <div className="flex gap-2 no-print">
              <Button variant="secondary" full onClick={() => window.print()}>
                🖨 인쇄 / PDF 저장
              </Button>
              <Button variant="secondary" full onClick={handleExport}>
                💾 데이터 백업
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-warmwhite rounded-2xl shadow-card p-4 text-center">
      <p className="text-2xl font-extrabold text-primary">{value}</p>
      <p className="text-xs text-ink-soft mt-1">{label}</p>
    </div>
  );
}
