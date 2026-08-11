"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useChild, useActivityLogs } from "@/lib/useStore";
import { requestToday } from "@/lib/ai/client";
import { Activity, TodayConditions } from "@/lib/types";
import { ageLabel } from "@/lib/utils";
import { Card, Loading, SectionTitle, Button } from "@/components/ui";
import ActivityCard from "@/components/ActivityCard";
import { setSelectedActivity } from "@/lib/session";

// 홈 미리보기용 기본 조건 (부담 없는 무난한 세팅)
const DEFAULT_CONDITIONS: TodayConditions = {
  place: "집",
  time: "10~30분",
  parentEnergy: "보통",
  childState: "모름",
};

export default function HomePage() {
  const router = useRouter();
  const { child, ready } = useChild();
  const { logs } = useActivityLogs();

  const [picks, setPicks] = useState<Activity[] | null>(null);
  const [error, setError] = useState(false);

  // 프로필 없으면 온보딩으로
  useEffect(() => {
    if (ready && !child) router.replace("/onboarding");
  }, [ready, child, router]);

  // 오늘의 추천 미리보기 (하루 1번 세션 캐시)
  useEffect(() => {
    if (!child) return;
    const cacheKey = `omh.homePicks.${child.id}.${new Date().toDateString()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setPicks(JSON.parse(cached));
      return;
    }
    setError(false);
    requestToday(child, DEFAULT_CONDITIONS, logs.slice(0, 10))
      .then((acts) => {
        setPicks(acts);
        sessionStorage.setItem(cacheKey, JSON.stringify(acts));
      })
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child]);

  if (!ready || !child) return <Loading label="준비 중..." />;

  function openActivity(a: Activity) {
    setSelectedActivity(a);
    router.push("/activity");
  }

  return (
    <div className="px-5 pt-8">
      {/* 인사 헤더 */}
      <header className="mb-6 flex items-center gap-3">
        {child.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={child.photo}
            alt={`${child.name} 사진`}
            className="w-14 h-14 rounded-full object-cover shadow-card shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary-soft flex items-center justify-center text-2xl shrink-0">
            👶
          </div>
        )}
        <div>
          <p className="text-sm text-ink-soft">
            {ageLabel(child.birthDate)} · 오늘도 반가워요
          </p>
          <h1 className="text-xl font-extrabold text-ink mt-0.5 leading-snug">
            오늘 {child.name}와 뭐하지? 🌤️
          </h1>
        </div>
      </header>

      {/* 두 개의 핵심 CTA */}
      <div className="grid grid-cols-1 gap-3 mb-8">
        <Link href="/today" aria-label="오늘 뭐하지 시작">
          <div className="rounded-2xl bg-primary text-white p-5 shadow-soft active:scale-[0.99] transition">
            <div className="text-2xl mb-1">🧸 오늘 뭐하지?</div>
            <p className="text-sm text-white/90">
              지금 상황에 맞는 놀이를 추천해드려요.
            </p>
          </div>
        </Link>
        <Link href="/now" aria-label="지금 어떡하지 시작">
          <div className="rounded-2xl bg-accent text-white p-5 shadow-soft active:scale-[0.99] transition">
            <div className="text-2xl mb-1">😵 지금 어떡하지?</div>
            <p className="text-sm text-white/90">
              육아 고민을 바로 해결해드려요.
            </p>
          </div>
        </Link>
      </div>

      {/* 오늘의 추천 */}
      <section className="mb-4">
        <SectionTitle
          action={
            <Link href="/today" className="text-xs text-primary font-semibold">
              더보기
            </Link>
          }
        >
          오늘의 추천
        </SectionTitle>

        {error && (
          <Card>
            <p className="text-sm text-ink-soft">
              추천을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
            </p>
          </Card>
        )}

        {!error && !picks && <Loading label="오늘의 놀이를 고르는 중..." />}

        {picks && (
          <div className="space-y-3">
            {picks.slice(0, 3).map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                onClick={() => openActivity(a)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
