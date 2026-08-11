"use client";

import { useEffect, useState } from "react";
import { useGeolocation } from "@/lib/useGeolocation";
import { fetchWeather, Weather } from "@/lib/weather";
import { Card, Button } from "./ui";

// "오늘 뭐하지" 질문 화면 상단: 현재 위치 날씨로 실내/실외를 안내.
export default function WeatherBadge({
  currentPlace,
  onWeather,
  onPickPlace,
}: {
  currentPlace: string;
  onWeather: (summary: string) => void;
  onPickPlace: (place: string) => void;
}) {
  const { state: geo, coords, request } = useGeolocation();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  useEffect(() => {
    if (!coords) return;
    setStatus("loading");
    fetchWeather(coords.lat, coords.lng)
      .then((w) => {
        setWeather(w);
        setStatus("done");
        onWeather(`${w.label} ${w.tempC}°C`);
      })
      .catch(() => setStatus("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  const busy = geo === "locating" || status === "loading";

  if (status === "done" && weather) {
    const suggestPlace = weather.outdoorOk ? "야외" : "집";
    return (
      <Card className="bg-accent-soft">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {weather.emoji}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-ink">
              {weather.label} · {weather.tempC}°C
            </p>
            <p className="text-xs text-ink-soft">{weather.note}</p>
          </div>
        </div>
        {currentPlace !== suggestPlace && (
          <Button
            variant="secondary"
            full
            className="mt-3"
            onClick={() => onPickPlace(suggestPlace)}
          >
            {suggestPlace === "야외"
              ? "🌳 야외 놀이로 맞춰보기"
              : "🏠 실내 놀이로 맞춰보기"}
          </Button>
        )}
      </Card>
    );
  }

  if (busy) {
    return (
      <Card className="bg-accent-soft">
        <p className="text-sm text-ink-soft">🌤️ 오늘 날씨 확인 중...</p>
      </Card>
    );
  }

  if (geo === "denied" || status === "error") {
    // 실패해도 흐름을 막지 않음 — 조용히 안내만
    return (
      <p className="text-xs text-ink-faint px-1">
        날씨를 불러오지 못했어요. 장소는 직접 골라주세요.
      </p>
    );
  }

  // idle
  return (
    <Card className="bg-accent-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          오늘 날씨에 맞춰 실내·실외를 추천해드릴까요?
        </p>
        <Button onClick={request} className="shrink-0">
          🌤️ 날씨 반영
        </Button>
      </div>
    </Card>
  );
}
