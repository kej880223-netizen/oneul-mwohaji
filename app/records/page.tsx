"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useRequireChild,
  useActivityLogs,
  useQuestions,
  useFavorites,
} from "@/lib/useStore";
import { formatRelative } from "@/lib/utils";
import { Card, PageHeader, EmptyState, Button, Loading } from "@/components/ui";
import { Activity, Author, Reaction } from "@/lib/types";
import { ROLE_META, isMine } from "@/lib/identity";
import ActivityCard from "@/components/ActivityCard";
import { setSelectedActivity } from "@/lib/session";

const REACTION_EMOJI: Record<Reaction, string> = {
  good: "👍",
  soso: "😐",
  bad: "👎",
};

// "누가 기록했나" 배지 (부부 공유). 작성자 정보가 없는 구버전 기록은 숨김.
function AuthorTag({ author }: { author?: Author }) {
  if (!author) return null;
  const emoji = ROLE_META[author.role]?.emoji ?? "🧑";
  const mine = isMine(author);
  return (
    <span
      className={
        "inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 " +
        (mine
          ? "bg-primary-soft text-primary-dark"
          : "bg-accent-soft text-accent")
      }
    >
      {emoji} {author.label}
      {mine ? " · 나" : ""}
    </span>
  );
}

type Tab = "all" | "play" | "situation" | "fav";

export default function RecordsPage() {
  const router = useRouter();
  const { child, ready } = useRequireChild();
  const { logs } = useActivityLogs();
  const { questions } = useQuestions();
  const { favorites } = useFavorites();
  const [tab, setTab] = useState<Tab>("all");

  function openActivity(a: Activity) {
    setSelectedActivity(a);
    router.push("/activity");
  }

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

  if (!ready || !child) return <Loading />;

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
              { key: "fav", label: "⭐ 즐겨찾기" },
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

        {tab === "fav" ? (
          favorites.length === 0 ? (
            <EmptyState
              emoji="🤍"
              title="즐겨찾기한 놀이가 없어요"
              description="놀이 카드나 상세 화면에서 하트를 누르면 여기에 모여요."
              action={
                <Button onClick={() => router.push("/today")}>놀이 추천받기</Button>
              }
            />
          ) : (
            <div className="space-y-3 pb-6">
              <p className="text-xs text-ink-faint">
                하트를 다시 누르면 즐겨찾기에서 빠져요. 카드를 누르면 놀이를 다시
                볼 수 있어요.
              </p>
              {favorites.map((a) => (
                <ActivityCard
                  key={a.title}
                  activity={a}
                  onClick={() => openActivity(a)}
                />
              ))}
            </div>
          )
        ) : items.length === 0 ? (
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
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-2 text-sm text-ink-soft">
                    {item.data.reaction && (
                      <span>
                        {REACTION_EMOJI[item.data.reaction]} 아이 반응
                      </span>
                    )}
                    {item.data.wantAgain === true && <span>🔁 또 하고 싶어함</span>}
                    {item.data.wantAgain === false && <span>🙅 별로</span>}
                    <AuthorTag author={item.data.createdBy} />
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
                  {item.data.createdBy && (
                    <div className="mt-2">
                      <AuthorTag author={item.data.createdBy} />
                    </div>
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
