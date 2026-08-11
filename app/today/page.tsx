"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChild, useActivityLogs } from "@/lib/useStore";
import { requestToday } from "@/lib/ai/client";
import { Activity, TodayConditions } from "@/lib/types";
import {
  TODAY_PLACES,
  TODAY_TIMES,
  PARENT_ENERGY,
  CHILD_STATES,
} from "@/lib/constants";
import {
  Button,
  OptionButton,
  PageHeader,
  Loading,
  ErrorState,
} from "@/components/ui";
import ActivityCard from "@/components/ActivityCard";
import { Disclaimer } from "@/components/Notices";
import { setSelectedActivity } from "@/lib/session";

type Step = "ask" | "loading" | "result" | "error";

export default function TodayPage() {
  const router = useRouter();
  const { child, ready } = useChild();
  const { logs } = useActivityLogs();

  const [step, setStep] = useState<Step>("ask");
  const [place, setPlace] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [energy, setEnergy] = useState<string>("");
  const [childState, setChildState] = useState<string>("");
  const [results, setResults] = useState<Activity[]>([]);

  if (!ready) return <Loading />;
  if (!child) {
    router.replace("/onboarding");
    return <Loading />;
  }

  const canSubmit = place && time && energy && childState;

  async function submit() {
    if (!canSubmit || !child) return;
    setStep("loading");
    const conditions: TodayConditions = {
      place,
      time,
      parentEnergy: energy,
      childState,
    };
    try {
      const acts = await requestToday(child, conditions, logs.slice(0, 10));
      setResults(acts);
      setStep("result");
    } catch {
      setStep("error");
    }
  }

  function openActivity(a: Activity) {
    setSelectedActivity(a);
    router.push("/activity");
  }

  // ─── 결과 화면 ───────────────────────────────
  if (step === "result") {
    return (
      <div>
        <PageHeader
          title="오늘의 놀이 추천"
          subtitle={`${child.name}에게 맞춰 골랐어요`}
          onBack={() => setStep("ask")}
        />
        <div className="px-5 space-y-3">
          {results.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              onClick={() => openActivity(a)}
            />
          ))}
          <p className="text-center text-xs text-ink-faint pt-1">
            카드를 누르면 놀이 방법을 볼 수 있어요.
          </p>
          <div className="pt-2">
            <Button variant="secondary" full onClick={() => setStep("ask")}>
              조건 바꿔서 다시 추천받기
            </Button>
          </div>
          <div className="pt-2 pb-4">
            <Disclaimer />
          </div>
        </div>
      </div>
    );
  }

  if (step === "loading")
    return <Loading label={`${child.name}에게 맞는 놀이를 고르는 중...`} />;

  if (step === "error")
    return (
      <ErrorState
        message="추천을 불러오지 못했어요. 다시 시도해주세요."
        onRetry={submit}
      />
    );

  // ─── 질문 화면 ───────────────────────────────
  return (
    <div className="pb-8">
      <PageHeader
        title="오늘 뭐하지?"
        subtitle="4가지만 골라주시면 놀이를 추천해드려요"
        onBack={() => router.push("/")}
      />

      <div className="px-5 space-y-6">
        <Question title="오늘 어디에서 놀 예정인가요?">
          <div className="grid grid-cols-2 gap-2">
            {TODAY_PLACES.map((p) => (
              <OptionButton
                key={p}
                selected={place === p}
                onClick={() => setPlace(p)}
                className="text-center"
              >
                {p}
              </OptionButton>
            ))}
          </div>
        </Question>

        <Question title="오늘 사용할 수 있는 시간은?">
          <div className="grid grid-cols-2 gap-2">
            {TODAY_TIMES.map((t) => (
              <OptionButton
                key={t}
                selected={time === t}
                onClick={() => setTime(t)}
                className="text-center"
              >
                {t}
              </OptionButton>
            ))}
          </div>
        </Question>

        <Question title="오늘 부모님의 체력은?">
          <div className="grid grid-cols-1 gap-2">
            {PARENT_ENERGY.map((e) => (
              <OptionButton
                key={e.value}
                selected={energy === e.value}
                onClick={() => setEnergy(e.value)}
              >
                <span className="mr-2">{e.emoji}</span>
                {e.label}
              </OptionButton>
            ))}
          </div>
        </Question>

        <Question title={`지금 ${child.name}의 상태는?`}>
          <div className="grid grid-cols-1 gap-2">
            {CHILD_STATES.map((s) => (
              <OptionButton
                key={s.value}
                selected={childState === s.value}
                onClick={() => setChildState(s.value)}
              >
                <span className="mr-2">{s.emoji}</span>
                {s.label}
              </OptionButton>
            ))}
          </div>
        </Question>

        <Button size="lg" full disabled={!canSubmit} onClick={submit}>
          놀이 3개 추천받기 🎈
        </Button>
      </div>
    </div>
  );
}

function Question({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-bold text-ink mb-2.5">{title}</h2>
      {children}
    </div>
  );
}
