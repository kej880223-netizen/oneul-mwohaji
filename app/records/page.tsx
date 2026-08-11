"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useChild, useActivityLogs, useQuestions } from "@/lib/useStore";
import { formatRelative } from "@/lib/utils";
import { Card, PageHeader, EmptyState, Button, Loading } from "@/components/ui";
import { Reaction } from "@/lib/types";

const REACTION_EMOJI: Record<Reaction, string> = {
  good: "👍",
  soso: "😐",
  bad: "👎",
};

type Tab = "all" | "play" | "situation";

export default function RecordsPage() {
  const router = useRouter();
  const { child, ready } = useChild();
  const { logs } = useActivityLogs();
  const { questions } = useQuestions();
  const [tab, setTab] = useState<Tab>("all");

  const items = useMemo(() => {
    const play = logs.map((l) => ({
      kind: "play" as const,
      id: l.id,
      createdAt: l.createdAt,
      data: l,
    }));
    const situation = questions.map((q) => ({
      kind: "situation" as const,
      id: q.id,
      createdAt: q.createdAt,
      data: q,
    }));
    const merged = [...play, ...situation].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
    );
    if (tab === "play") return merged.filter((m) => m.kind === "play");
    if (tab === "situation") return merged.filter((m) => m.kind === "situation");
    return merged;
  }, [logs, questions, tab]);

  if (!ready) return <Loading />;
  if (!child) {
    router.replace("/onboarding");
    return <Loading />;
  }

  return (
    <div>
      <PageHeader title="기록" subtitle={`${child.name}과 함께한 순간들`} />

      <div className="px-5">
        <div className="flex gap-2 mb-4">
          {(
            [
              { key: "all", label: "전체" },
              { key: "play", label: "놀이" },
              { key: "situation", label: "상황" },
            ] as { key: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "px-4 py-1.5 rounded-full text-sm font-medium transition " +
                (tab === t.key
                  ? "bg-primary text-white"
                  : "bg-white text-ink-soft")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <EmptyState
            emoji="📔"
            title="아직 기록이 없어요"
            description="놀이를 해보거나 육아 고민을 물어보면 여기에 쌓여요."
            action={
              <div className="flex gap-2">
                <Button onClick={() => router.push("/today")}>놀이 추천</Button>
                <Button variant="secondary" onClick={() => router.push("/now")}>
                  고민 상담
                </Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-3 pb-6">
            {items.map((item) =>
              item.kind === "play" ? (
                <Card key={item.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-accent bg-accent-soft rounded px-1.5 py-0.5">
                        놀이
                      </span>
                      <h3 className="font-bold text-ink mt-1.5">
                        {item.data.activity.title}
                      </h3>
                    </div>
                    <span className="text-xs text-ink-faint shrink-0">
                      {formatRelative(item.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm text-ink-soft">
                    {item.data.reaction && (
                      <span>
                        {REACTION_EMOJI[item.data.reaction]} 아이 반응
                      </span>
                    )}
                    {item.data.wantAgain === true && <span>🔁 또 하고 싶어함</span>}
                    {item.data.wantAgain === false && <span>🙅 별로</span>}
                  </div>
                  {item.data.note && (
                    <p className="text-sm text-ink-soft mt-2 bg-cream rounded-lg px-2.5 py-1.5">
                      “{item.data.note}”
                    </p>
                  )}
                </Card>
              ) : (
                <Card key={item.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-primary-dark bg-primary-soft rounded px-1.5 py-0.5">
                        상황
                      </span>
                      <h3 className="font-bold text-ink mt-1.5">
                        {item.data.question}
                      </h3>
                    </div>
                    <span className="text-xs text-ink-faint shrink-0">
                      {formatRelative(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-ink-soft mt-2 leading-relaxed">
                    💡 {item.data.aiResponse.firstStep}
                  </p>
                  {item.data.note && (
                    <p className="text-sm text-ink-soft mt-2 bg-cream rounded-lg px-2.5 py-1.5">
                      “{item.data.note}”
                    </p>
                  )}
                </Card>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
