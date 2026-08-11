"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSelectedActivity } from "@/lib/session";
import { useChild } from "@/lib/useStore";
import { addActivityLog, updateActivityLog } from "@/lib/storage";
import { Activity, ActivityLog, Reaction } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Button, Card, PageHeader, OptionButton, EmptyState, Loading } from "@/components/ui";
import { energyLabel, difficultyStars } from "@/components/ActivityCard";
import FavoriteButton from "@/components/FavoriteButton";

type Phase = "detail" | "record";

const REACTIONS: { value: Reaction; emoji: string; label: string }[] = [
  { value: "good", emoji: "👍", label: "좋아했어요" },
  { value: "soso", emoji: "😐", label: "그냥 그랬어요" },
  { value: "bad", emoji: "👎", label: "별로였어요" },
];

export default function ActivityPage() {
  const router = useRouter();
  const { child, ready } = useChild();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [phase, setPhase] = useState<Phase>("detail");
  const [logId, setLogId] = useState<string | null>(null);

  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [wantAgain, setWantAgain] = useState<boolean | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    setActivity(getSelectedActivity());
  }, []);

  if (!ready) return <Loading />;

  if (!activity)
    return (
      <div>
        <PageHeader title="놀이" onBack={() => router.push("/")} />
        <EmptyState
          emoji="🧸"
          title="선택된 놀이가 없어요"
          description="홈이나 '오늘 뭐하지'에서 놀이를 골라주세요."
          action={<Button onClick={() => router.push("/today")}>놀이 추천받기</Button>}
        />
      </div>
    );

  // "오늘 해보기" → 로그 생성(반응 미입력) 후 기록 단계로
  function startPlay() {
    if (!child || !activity) return;
    const id = uid();
    const log: ActivityLog = {
      id,
      childId: child.id,
      activityId: activity.id,
      activity,
      reaction: null,
      wantAgain: null,
      note: "",
      createdAt: new Date().toISOString(),
    };
    addActivityLog(log);
    setLogId(id);
    setPhase("record");
  }

  function saveRecord() {
    if (!logId) return;
    updateActivityLog(logId, { reaction, wantAgain, note: note.trim() });
    router.push("/");
  }

  function skipRecord() {
    router.push("/");
  }

  // ─── 기록 단계 ───────────────────────────────
  if (phase === "record") {
    return (
      <div>
        <PageHeader title="기록해둘까요?" onBack={() => setPhase("detail")} />
        <div className="px-5 space-y-5">
          <Card>
            <p className="text-sm font-semibold text-ink mb-3">
              오늘 {child?.name}은 이 놀이 어땠어요?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {REACTIONS.map((r) => (
                <OptionButton
                  key={r.value}
                  selected={reaction === r.value}
                  onClick={() => setReaction(r.value)}
                  className="flex flex-col items-center gap-1 py-3"
                >
                  <span className="text-2xl" aria-hidden>
                    {r.emoji}
                  </span>
                  <span className="text-xs">{r.label}</span>
                </OptionButton>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-ink mb-3">
              다음에 또 해보고 싶으세요?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <OptionButton
                selected={wantAgain === true}
                onClick={() => setWantAgain(true)}
                className="text-center"
              >
                🔁 또 할래요
              </OptionButton>
              <OptionButton
                selected={wantAgain === false}
                onClick={() => setWantAgain(false)}
                className="text-center"
              >
                🙅 안 할래요
              </OptionButton>
            </div>
          </Card>

          <Card>
            <label className="block text-sm font-semibold text-ink mb-2">
              메모 (선택)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="예: 색깔 찾는 걸 특히 좋아했어요"
              className="w-full rounded-xl border border-primary-soft px-3 py-2.5 text-sm focus:border-primary outline-none resize-none"
            />
          </Card>

          <div className="space-y-2 pb-6">
            <Button size="lg" full onClick={saveRecord}>
              기록 저장하고 홈으로
            </Button>
            <Button variant="ghost" full onClick={skipRecord}>
              건너뛰기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 상세 단계 ───────────────────────────────
  return (
    <div>
      <PageHeader title="놀이 방법" onBack={() => router.back()} />
      <div className="px-5 space-y-4 pb-6">
        <div className="animate-fade-up">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-extrabold text-ink leading-snug">
              {activity.title}
            </h1>
            <FavoriteButton activity={activity} className="mt-1" />
          </div>
          <p className="text-ink-soft mt-1">{activity.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <MetaBox label="소요 시간" value={`${activity.duration}분`} />
          <MetaBox label="부모 체력" value={energyLabel(activity.energyLevel)} />
          <MetaBox label="난이도" value={difficultyStars(activity.difficulty)} />
        </div>

        <Card>
          <h2 className="text-sm font-bold text-ink mb-2">🧰 준비물</h2>
          <p className="text-sm text-ink-soft">
            {activity.materials.length
              ? activity.materials.join(", ")
              : "따로 준비할 게 없어요"}
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-ink mb-3">👀 놀이 방법</h2>
          <ol className="space-y-2.5">
            {activity.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary-soft text-primary-dark font-bold flex items-center justify-center text-xs">
                  {i + 1}
                </span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </Card>

        {activity.parentPhrases.length > 0 && (
          <Card className="bg-accent-soft">
            <h2 className="text-sm font-bold text-ink mb-2">
              💬 이렇게 말해보세요
            </h2>
            <ul className="space-y-1.5">
              {activity.parentPhrases.map((p, i) => (
                <li key={i} className="text-sm text-ink">
                  “{p}”
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <h2 className="text-sm font-bold text-ink mb-1">
            🌱 이 놀이가 좋은 이유
          </h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            {activity.purpose}
          </p>
        </Card>

        <div className="pt-1">
          <Button size="lg" full onClick={startPlay}>
            오늘 해보기 ✋
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-warmwhite rounded-2xl shadow-card py-3">
      <p className="text-[11px] text-ink-faint">{label}</p>
      <p className="text-sm font-bold text-ink mt-0.5">{value}</p>
    </div>
  );
}
