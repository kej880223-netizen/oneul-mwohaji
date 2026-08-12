"use client";

import { useEffect, useState } from "react";
import { FamilyMember } from "@/lib/types";
import { getMembers, isSelf } from "@/lib/members";
import { ROLE_META } from "@/lib/identity";
import { formatRelative } from "@/lib/utils";

// 부부 공유 구성원 목록 — 누가 함께 쓰는지, 마지막 활동, 나감 여부를 보여준다.
export default function FamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    const refresh = () => setMembers(getMembers());
    refresh();
    window.addEventListener("omh:storage", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("omh:storage", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const active = members.filter((m) => !m.left);

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-ink-soft mb-2">
        👨‍👩‍👧 함께 쓰는 사람 {active.length > 0 ? `(${active.length})` : ""}
      </p>
      <div className="space-y-1.5">
        {members.map((m) => {
          const mine = isSelf(m);
          return (
            <div
              key={m.id}
              className={
                "flex items-center gap-2 rounded-xl px-3 py-2 " +
                (m.left ? "bg-cream opacity-60" : "bg-primary-soft/40")
              }
            >
              <span className="text-lg leading-none">
                {ROLE_META[m.role]?.emoji ?? "🧑"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">
                  {m.label}
                  {mine && (
                    <span className="ml-1 text-[11px] font-bold text-primary">
                      · 나
                    </span>
                  )}
                  {m.left && (
                    <span className="ml-1 text-[11px] text-ink-faint">· 나감</span>
                  )}
                </p>
                <p className="text-[11px] text-ink-faint">
                  {m.left
                    ? "공유를 나갔어요"
                    : `최근 활동 ${formatRelative(m.lastSeenAt)}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {active.length <= 1 && (
        <p className="text-[11px] text-ink-faint mt-2 leading-relaxed">
          아직 배우자가 참여하지 않았어요. 위 초대 링크나 코드를 보내보세요.
        </p>
      )}
    </div>
  );
}
