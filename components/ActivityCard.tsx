"use client";

import { Activity } from "@/lib/types";
import { Card } from "./ui";
import FavoriteButton from "./FavoriteButton";

export function energyLabel(e: Activity["energyLevel"]): string {
  return e === "low" ? "낮음" : e === "medium" ? "보통" : "높음";
}

export function difficultyStars(n: number): string {
  return "⭐".repeat(Math.min(3, Math.max(1, n)));
}

// 홈/결과 목록용 요약 카드
export default function ActivityCard({
  activity,
  onClick,
}: {
  activity: Activity;
  onClick?: () => void;
}) {
  return (
    <Card onClick={onClick} className="animate-fade-up">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-ink leading-snug">{activity.title}</h3>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className="text-xs">{difficultyStars(activity.difficulty)}</span>
          <FavoriteButton activity={activity} />
        </div>
      </div>
      <p className="text-sm text-ink-soft mt-1">{activity.description}</p>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs text-ink-faint">
        <span>⏱ {activity.duration}분</span>
        <span>💪 체력 {energyLabel(activity.energyLevel)}</span>
        <span>
          🧰{" "}
          {activity.materials.length
            ? activity.materials.join(", ")
            : "준비물 없음"}
        </span>
      </div>

      {activity.purpose && (
        <p className="text-xs text-accent mt-2 bg-accent-soft rounded-lg px-2.5 py-1.5">
          🌱 {activity.purpose}
        </p>
      )}
    </Card>
  );
}
