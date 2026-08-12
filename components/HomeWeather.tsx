"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGeolocation } from "@/lib/useGeolocation";
import { fetchWeather, Weather } from "@/lib/weather";

// 홈: 날씨 기반 실내/실외 놀이 제안. 위치는 사용자가 버튼을 눌러야 요청(저장 안 함).
export default function HomeWeather() {
  const { state, coords, request } = useGeolocation();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!coords) return;
    let alive = true;
    fetchWeather(coords.lat, coords.lng)
      .then((w) => alive && setWeather(w))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [coords]);

  // 날씨 로드 완료
  if (weather) {
    return (
      <div className="rounded-2xl bg-white shadow-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{weather.emoji}</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">
              {weather.label} · {weather.tempC}°C
            </p>
            <p className="text-xs text-ink-soft mt-0.5">{weather.note}</p>
          </div>
        </div>
        <Link
          href="/today"
          className="mt-3 block text-center text-sm font-semibold text-white bg-primary rounded-xl py-2.5 active:scale-[0.99] transition"
        >
          {weather.outdoorOk ? "🌳 야외 놀이 추천받기" : "🏠 실내 놀이 추천받기"}
        </Link>
      </div>
    );
  }

  const loading = state === "locating";
  const blocked =
    state === "denied" || state === "unsupported" || state === "error" || failed;

  return (
    <div className="rounded-2xl bg-white shadow-card p-4">
      <p className="text-sm font-bold text-ink mb-1">🌤️ 오늘 날씨로 놀이 정하기</p>
      <p className="text-xs text-ink-faint mb-3">
        {blocked
          ? "위치를 가져오지 못했어요. 그래도 오늘의 놀이를 추천받을 수 있어요."
          : "지금 날씨를 보고 실내·실외 놀이를 제안해드려요."}
      </p>
      {blocked ? (
        <Link
          href="/today"
          className="block text-center text-sm font-semibold text-primary bg-primary-soft rounded-xl py-2.5 active:scale-[0.99] transition"
        >
          놀이 추천받기
        </Link>
      ) : (
        <button
          onClick={request}
          disabled={loading}
          className="w-full text-sm font-semibold text-white bg-primary rounded-xl py-2.5 active:scale-[0.99] transition disabled:opacity-60"
        >
          {loading ? "위치 확인 중..." : "날씨 확인하기"}
        </button>
      )}
    </div>
  );
}
