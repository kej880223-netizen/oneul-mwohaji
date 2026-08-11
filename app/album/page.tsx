"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useChild, useActivityLogs } from "@/lib/useStore";
import { formatDate } from "@/lib/utils";
import { Card, PageHeader, Loading, EmptyState, Button } from "@/components/ui";
import { ActivityLog, Reaction } from "@/lib/types";

const REACTION_EMOJI: Record<Reaction, string> = {
  good: "👍",
  soso: "😐",
  bad: "👎",
};

export default function AlbumPage() {
  const router = useRouter();
  const { child, ready } = useChild();
  const { logs } = useActivityLogs();

  // 월별 그룹핑 (최신순)
  const groups = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    for (const l of logs) {
      const d = new Date(l.createdAt);
      const key = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries());
  }, [logs]);

  if (!ready) return <Loading />;
  if (!child) {
    router.replace("/onboarding");
    return <Loading />;
  }

  const photoCount = logs.filter((l) => l.photo).length;

  return (
    <div>
      <PageHeader
        title="성장 앨범"
        subtitle={`${child.name}과 함께한 놀이의 순간들`}
        onBack={() => router.push("/profile")}
      />

      <div className="px-5 pb-6">
        {logs.length === 0 ? (
          <EmptyState
            emoji="📸"
            title="아직 앨범이 비어 있어요"
            description="놀이를 기록할 때 사진을 남기면 여기에 성장 앨범이 쌓여요."
            action={<Button onClick={() => router.push("/today")}>놀이 시작하기</Button>}
          />
        ) : (
          <>
            <p className="text-xs text-ink-faint mb-4">
              총 {logs.length}개의 놀이 · 사진 {photoCount}장
            </p>
            <div className="space-y-6">
              {groups.map(([month, items]) => (
                <section key={month}>
                  <h2 className="text-sm font-bold text-ink mb-2.5">{month}</h2>
                  <div className="space-y-3">
                    {items.map((l) => (
                      <Card key={l.id} className="flex gap-3">
                        {l.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={l.photo}
                            alt={l.activity.title}
                            className="w-20 h-20 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-cream flex items-center justify-center text-3xl shrink-0">
                            {l.activity.title.match(/\p{Emoji}/u)?.[0] ?? "🧸"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-ink text-sm truncate">
                              {l.activity.title}
                            </h3>
                            <span className="text-xs text-ink-faint shrink-0">
                              {formatDate(l.createdAt)}
                            </span>
                          </div>
                          {l.reaction && (
                            <p className="text-sm text-ink-soft mt-1">
                              {REACTION_EMOJI[l.reaction]} 아이 반응
                              {l.wantAgain === true && " · 🔁 또 하고 싶어함"}
                            </p>
                          )}
                          {l.note && (
                            <p className="text-sm text-ink-soft mt-1.5 bg-cream rounded-lg px-2.5 py-1.5">
                              “{l.note}”
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
