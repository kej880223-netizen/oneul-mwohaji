"use client";

import { useEffect, useMemo, useState } from "react";
import { Child, Place } from "@/lib/types";
import { useGeolocation } from "@/lib/useGeolocation";
import { requestNearbyPlaces } from "@/lib/places/client";
import { PLACE_META } from "@/lib/places/meta";
import { briefPlace, PlaceBrief, RecommendCtx } from "@/lib/places/recommend";
import { formatDistance, cx } from "@/lib/utils";
import { Button, Card, Loading, SectionTitle } from "./ui";

type FetchStatus = "idle" | "loading" | "done" | "error";
type SortMode = "recommend" | "distance";

interface EnrichedPlace extends Place {
  brief: PlaceBrief;
}

// "야외" 선택 시 결과 화면에 붙는 GPS 기반 주변 장소 리스트.
export default function NearbyPlaces({
  child,
  childState,
}: {
  child: Child;
  childState?: string;
}) {
  const { state: geoState, coords, error: geoError, request } = useGeolocation();
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [sort, setSort] = useState<SortMode>("recommend");

  function fetchPlaces(lat: number, lng: number) {
    setStatus("loading");
    requestNearbyPlaces(lat, lng)
      .then((p) => {
        setPlaces(p);
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    if (coords) fetchPlaces(coords.lat, coords.lng);
  }, [coords]);

  // 아이 맞춤 점수·브리핑 계산 + 정렬
  const enriched = useMemo<EnrichedPlace[]>(() => {
    if (!places) return [];
    const ctx: RecommendCtx = {
      name: child.name,
      personality: child.personality,
      childState,
      likes: child.likes,
    };
    const list = places.map((p) => ({ ...p, brief: briefPlace(p, ctx) }));
    list.sort((a, b) =>
      sort === "distance"
        ? a.distanceM - b.distanceM
        : b.brief.score - a.brief.score || a.distanceM - b.distanceM
    );
    return list;
  }, [places, sort, child, childState]);

  const busy = geoState === "locating" || status === "loading";
  const hasList = status === "done" && enriched.length > 0;

  return (
    <section className="pt-2">
      <SectionTitle>📍 근처에서 가볼 만한 곳</SectionTitle>

      {geoState === "idle" && (
        <Card>
          <p className="text-sm text-ink-soft leading-relaxed mb-3">
            현재 위치를 기준으로 {child.name}와 갈 만한 놀이터·공원·도서관 등을
            찾아드려요. 위치는 검색에만 쓰고 저장하지 않아요.
          </p>
          <Button full onClick={request}>
            📍 내 주변 장소 찾기
          </Button>
        </Card>
      )}

      {busy && <Loading label="주변 장소를 찾는 중..." />}

      {geoState === "denied" && (
        <Card>
          <p className="text-sm text-ink-soft leading-relaxed">
            위치 권한이 꺼져 있어요. 브라우저 주소창의 위치 아이콘에서 권한을
            허용한 뒤 다시 시도해주세요.
          </p>
          <Button variant="secondary" full className="mt-3" onClick={request}>
            다시 시도
          </Button>
        </Card>
      )}

      {geoState === "unsupported" && (
        <Card>
          <p className="text-sm text-ink-soft">
            이 기기/브라우저에서는 위치 기능을 사용할 수 없어요.
          </p>
        </Card>
      )}

      {geoState === "error" && (
        <Card>
          <p className="text-sm text-ink-soft">
            위치를 가져오지 못했어요. {geoError}
          </p>
          <Button variant="secondary" full className="mt-3" onClick={request}>
            다시 시도
          </Button>
        </Card>
      )}

      {geoState === "granted" && status === "error" && (
        <Card>
          <p className="text-sm text-ink-soft">
            주변 장소를 불러오지 못했어요. 인터넷 연결을 확인하고 다시
            시도해주세요.
          </p>
          <Button
            variant="secondary"
            full
            className="mt-3"
            onClick={() => coords && fetchPlaces(coords.lat, coords.lng)}
          >
            다시 시도
          </Button>
        </Card>
      )}

      {status === "done" && enriched.length === 0 && (
        <Card>
          <p className="text-sm text-ink-soft leading-relaxed">
            반경 3km 안에 등록된 장소를 찾지 못했어요. 조금 이동한 뒤 다시
            시도하거나, 오늘은 근처 산책으로 즐겨보는 건 어때요?
          </p>
        </Card>
      )}

      {hasList && (
        <>
          {/* 정렬 필터 */}
          <div className="flex gap-2 mb-3">
            {(
              [
                { key: "recommend", label: "✨ 추천순" },
                { key: "distance", label: "📏 거리순" },
              ] as { key: SortMode; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setSort(t.key)}
                aria-pressed={sort === t.key}
                className={cx(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition",
                  sort === t.key
                    ? "bg-primary text-white"
                    : "bg-white text-ink-soft"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {enriched.map((p, i) => {
              const meta = PLACE_META[p.category] ?? PLACE_META.other;
              return (
                <Card key={p.id} className="animate-fade-up">
                  {/* 헤더 */}
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-accent-soft flex items-center justify-center text-xl shrink-0">
                      {meta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-ink truncate">{p.name}</p>
                        <span className="text-sm font-semibold text-primary shrink-0">
                          {formatDistance(p.distanceM)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-faint truncate">
                        {meta.label}
                        {sort === "recommend" && i === 0 ? " · 오늘의 추천 ⭐" : ""}
                      </p>
                    </div>
                  </div>

                  {/* 왜 추천 (개인화) */}
                  {p.brief.matchReason && (
                    <p className="text-xs text-accent bg-accent-soft rounded-lg px-2.5 py-1.5 mt-2.5">
                      ✨ {p.brief.matchReason}
                    </p>
                  )}

                  {/* 이 유형이 좋은 점 */}
                  <p className="text-xs text-ink-soft leading-relaxed mt-2">
                    💡 {p.brief.why}
                  </p>

                  {/* 해볼 수 있는 놀이 */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <span className="text-xs text-ink-faint">🎈 놀이</span>
                    {p.brief.plays.map((play) => (
                      <span
                        key={play}
                        className="text-[11px] text-ink bg-cream rounded-full px-2 py-0.5"
                      >
                        {play}
                      </span>
                    ))}
                  </div>

                  {/* 지도 링크 */}
                  <a
                    href={p.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-semibold text-primary mt-3"
                  >
                    지도에서 열기 →
                  </a>
                </Card>
              );
            })}
          </div>

          <p className="text-[11px] text-ink-faint leading-relaxed text-center px-2 pt-3">
            OpenStreetMap 데이터 · 실제 운영시간·휴무는 방문 전 확인해주세요.
            위치 정보는 저장하지 않아요.
          </p>
        </>
      )}
    </section>
  );
}
