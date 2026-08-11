// ─────────────────────────────────────────────────────────
//  육아 리포트 계산 (주간/월간/전체) + 발달 영역 균형 분석
//  실제 기록이 충분할 때만 사실 기반으로 요약. 부족하면 추측하지 않음.
// ─────────────────────────────────────────────────────────

import { ActivityLog, DevDomain, DEV_DOMAINS } from "./types";

export type Period = "week" | "month" | "all";

export interface DomainStat {
  domain: DevDomain;
  count: number;
}

export interface Report {
  period: Period;
  periodLabel: string;
  totalPlays: number;
  reactedPlays: number;
  goodCount: number;
  topLiked: { title: string; count: number } | null;
  domainStats: DomainStat[]; // 많은 순
  weakDomains: DevDomain[]; // 상대적으로 부족한 영역(최대 2)
  activePreference: "quiet" | "active" | null;
  insights: string[];
  enough: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

export function computeReport(logs: ActivityLog[], period: Period): Report {
  const now = Date.now();
  const cutoff =
    period === "week" ? now - 7 * DAY : period === "month" ? now - 30 * DAY : 0;
  const periodLabel =
    period === "week" ? "최근 7일" : period === "month" ? "최근 30일" : "전체 기간";

  const inP = logs.filter((l) => +new Date(l.createdAt) >= cutoff);
  const reacted = inP.filter((l) => l.reaction !== null);
  const goodCount = reacted.filter((l) => l.reaction === "good").length;

  // 가장 반응 좋았던 활동
  const goodCounts = new Map<string, number>();
  reacted
    .filter((l) => l.reaction === "good")
    .forEach((l) =>
      goodCounts.set(l.activity.title, (goodCounts.get(l.activity.title) ?? 0) + 1)
    );
  const top = Array.from(goodCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const topLiked = top ? { title: top[0], count: top[1] } : null;

  // 발달 영역 분포 (기간 내 모든 놀이의 domains 집계)
  const domCount: Record<DevDomain, number> = {
    신체: 0,
    언어: 0,
    사회정서: 0,
    인지: 0,
    창의감각: 0,
  };
  inP.forEach((l) =>
    (l.activity.domains || []).forEach((d) => {
      if (d in domCount) domCount[d]++;
    })
  );
  const domainStats: DomainStat[] = DEV_DOMAINS.map((d) => ({
    domain: d,
    count: domCount[d],
  })).sort((a, b) => b.count - a.count);

  const maxC = domainStats[0]?.count ?? 0;
  const weakDomains =
    inP.length >= 3
      ? [...domainStats]
          .sort((a, b) => a.count - b.count)
          .filter((s) => s.count < maxC)
          .slice(0, 2)
          .map((s) => s.domain)
      : [];

  // 조용한 vs 활동적 선호
  const good = reacted.filter((l) => l.reaction === "good");
  let activePreference: "quiet" | "active" | null = null;
  if (good.length >= 3) {
    const quiet = good.filter((l) => l.activity.energyLevel !== "high").length;
    const active = good.length - quiet;
    if (quiet > active) activePreference = "quiet";
    else if (active > quiet) activePreference = "active";
  }

  const enough = reacted.length >= 3;

  const insights: string[] = [];
  if (inP.length > 0)
    insights.push(`${periodLabel} 동안 놀이 ${inP.length}개를 함께했어요.`);
  if (topLiked)
    insights.push(`가장 반응이 좋았던 활동은 "${topLiked.title}"였어요.`);
  if (activePreference === "quiet")
    insights.push("요즘은 함께하는 조용한 놀이의 반응이 더 좋았어요.");
  if (activePreference === "active")
    insights.push("요즘은 몸을 크게 쓰는 활동적인 놀이의 반응이 좋았어요.");
  if (enough && weakDomains.length)
    insights.push(
      `다음엔 '${weakDomains.join(", ")}' 발달을 돕는 놀이를 조금 더 해보면 균형이 좋아져요.`
    );

  return {
    period,
    periodLabel,
    totalPlays: inP.length,
    reactedPlays: reacted.length,
    goodCount,
    topLiked,
    domainStats,
    weakDomains,
    activePreference,
    insights,
    enough,
  };
}
