"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useChild,
  useChildren,
  useActivityLogs,
  useQuestions,
} from "@/lib/useStore";
import { resetAll, setActiveChild, deleteChild } from "@/lib/storage";
import { ageLabel, cx } from "@/lib/utils";
import { Card, PageHeader, Button, Loading, SectionTitle } from "@/components/ui";

export default function ProfilePage() {
  const router = useRouter();
  const { child, ready } = useChild();
  const { children, activeId } = useChildren();
  const { logs } = useActivityLogs();
  const { questions } = useQuestions();

  const report = useMemo(() => buildReport(logs), [logs]);

  if (!ready) return <Loading />;
  if (!child) {
    router.replace("/onboarding");
    return <Loading />;
  }

  function handleDeleteChild() {
    if (children.length <= 1) return;
    if (
      window.confirm(
        `'${child!.name}' 프로필과 이 아이의 기록을 삭제할까요? 되돌릴 수 없어요.`
      )
    ) {
      deleteChild(child!.id);
    }
  }

  function handleLogout() {
    // 이 앱은 별도 계정이 없어 데이터를 이 기기에만 저장해요.
    // 로그아웃 = 이 기기의 프로필·기록을 지우고 처음 화면으로.
    if (
      window.confirm(
        "로그아웃할까요?\n이 앱은 계정 없이 기기에만 저장돼서, 로그아웃하면 이 기기의 프로필과 기록이 지워져요."
      )
    ) {
      resetAll();
      router.replace("/onboarding");
    }
  }

  const genderLabel =
    child.gender === "boy" ? "남아" : child.gender === "girl" ? "여아" : "미선택";

  return (
    <div>
      <PageHeader title="아이 프로필" />

      <div className="px-5 space-y-4 pb-6">
        {/* 우리 아이 전환 */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
          {children.map((c) => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveChild(c.id)}
                aria-pressed={active}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <span
                  className={cx(
                    "w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-2xl border-2 transition",
                    active
                      ? "border-primary"
                      : "border-transparent opacity-60"
                  )}
                >
                  {c.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.photo}
                      alt={c.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full bg-primary-soft flex items-center justify-center">
                      👶
                    </span>
                  )}
                </span>
                <span
                  className={cx(
                    "text-xs font-medium max-w-[64px] truncate",
                    active ? "text-ink" : "text-ink-faint"
                  )}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => router.push("/onboarding?mode=add")}
            className="flex flex-col items-center gap-1 shrink-0"
            aria-label="아이 추가"
          >
            <span className="w-14 h-14 rounded-full border-2 border-dashed border-primary-soft flex items-center justify-center text-primary text-xl">
              ＋
            </span>
            <span className="text-xs text-primary font-medium">아이 추가</span>
          </button>
        </div>

        {/* 프로필 요약 */}
        <Card>
          <div className="flex items-center gap-3">
            {child.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={child.photo}
                alt={`${child.name} 사진`}
                className="w-14 h-14 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary-soft flex items-center justify-center text-2xl shrink-0">
                👶
              </div>
            )}
            <div>
              <h2 className="text-lg font-extrabold text-ink">{child.name}</h2>
              <p className="text-sm text-ink-soft">
                {ageLabel(child.birthDate)} · {genderLabel}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <Row label="좋아하는 것" value={child.likes} />
            <Row label="싫어하는 것" value={child.dislikes} />
            <Row
              label="성향"
              value={child.personality.length ? child.personality.join(", ") : ""}
            />
            <Row label="요즘 고민" value={child.concerns} />
          </dl>

          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              full
              onClick={() => router.push("/onboarding")}
            >
              프로필 수정
            </Button>
            {children.length > 1 && (
              <Button variant="secondary" onClick={handleDeleteChild}>
                삭제
              </Button>
            )}
          </div>
        </Card>

        {/* 개인화 리포트 */}
        <section>
          <SectionTitle>최근 육아 기록</SectionTitle>
          <Card>
            {report.enough ? (
              <ul className="space-y-2.5">
                {report.lines.map((line, i) => (
                  <li key={i} className="text-sm text-ink flex gap-2">
                    <span aria-hidden>•</span>
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft leading-relaxed">
                조금 더 기록하면 {child.name}에게 맞는 패턴을 찾아드릴게요. 🌱
                <br />
                놀이를 해보고 아이 반응을 남기면 여기에 요약이 나타나요.
              </p>
            )}
          </Card>
        </section>

        {/* 통계 요약 */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="함께한 놀이" value={`${logs.length}개`} />
          <StatBox label="해결한 상황" value={`${questions.length}개`} />
        </div>

        {/* 안내 및 초기화 */}
        <p className="text-[11px] text-ink-faint leading-relaxed text-center px-2 pt-2">
          이 앱은 의료·응급·진단 서비스가 아니며, 제공되는 내용은 일반적인 육아
          정보예요. 모든 데이터는 이 기기에만 저장돼요.
        </p>

        <Button variant="ghost" full onClick={handleLogout} className="text-ink-faint">
          로그아웃
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-ink-faint w-20 shrink-0">{label}</dt>
      <dd className="text-ink">{value || "—"}</dd>
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

// ─────────────────────────────────────────────────────────
//  개인화 리포트: 실제 데이터가 충분할 때만 사실 기반으로 요약.
//  데이터가 부족하면 추측하지 않는다 (지시서 12번).
// ─────────────────────────────────────────────────────────
function buildReport(
  logs: import("@/lib/types").ActivityLog[]
): { enough: boolean; lines: string[] } {
  const reacted = logs.filter((l) => l.reaction !== null);
  if (reacted.length < 3) return { enough: false, lines: [] };

  const lines: string[] = [];

  // 최근 7일 놀이 수
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = logs.filter(
    (l) => +new Date(l.createdAt) >= weekAgo
  ).length;
  if (recentCount > 0) {
    lines.push(`최근 7일 동안 놀이 ${recentCount}개를 해봤어요.`);
  }

  // 가장 반응이 좋았던 활동
  const goodCounts = new Map<string, number>();
  reacted
    .filter((l) => l.reaction === "good")
    .forEach((l) =>
      goodCounts.set(l.activity.title, (goodCounts.get(l.activity.title) ?? 0) + 1)
    );
  const topLiked = Array.from(goodCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (topLiked) {
    lines.push(`가장 반응이 좋았던 활동은 "${topLiked[0]}"였어요.`);
  }

  // 조용한 놀이 vs 신체 놀이 성향
  const good = reacted.filter((l) => l.reaction === "good");
  if (good.length >= 3) {
    const quiet = good.filter((l) => l.activity.energyLevel !== "high").length;
    const active = good.length - quiet;
    if (quiet > active) {
      lines.push("최근에는 신체 활동보다 함께하는 조용한 놀이의 반응이 좋았어요.");
    } else if (active > quiet) {
      lines.push("최근에는 몸을 크게 쓰는 활동적인 놀이의 반응이 좋았어요.");
    }
  }

  if (!lines.length) return { enough: false, lines: [] };
  return { enough: true, lines };
}
