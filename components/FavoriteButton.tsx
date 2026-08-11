"use client";

import { Activity } from "@/lib/types";
import { toggleFavorite } from "@/lib/storage";
import { useFavorites } from "@/lib/useStore";
import { cx } from "@/lib/utils";

// 놀이 즐겨찾기 하트 토글. 카드 안에서도 쓰이므로 클릭 전파를 막는다.
export default function FavoriteButton({
  activity,
  className,
}: {
  activity: Activity;
  className?: string;
}) {
  const { favorites } = useFavorites();
  const fav = favorites.some((a) => a.title === activity.title);

  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      title={fav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite(activity);
      }}
      className={cx(
        "shrink-0 leading-none transition active:scale-90",
        fav ? "opacity-100" : "opacity-70 hover:opacity-100",
        className
      )}
    >
      <span className="text-xl">{fav ? "❤️" : "🤍"}</span>
    </button>
  );
}
