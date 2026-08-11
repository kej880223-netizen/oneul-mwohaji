"use client";

import { useEffect, useState } from "react";
import { Place } from "@/lib/types";
import { useGeolocation } from "@/lib/useGeolocation";
import { requestNearbyPlaces } from "@/lib/places/client";
import { PLACE_META } from "@/lib/places/meta";
import { formatDistance } from "@/lib/utils";
import { Button, Card, Loading, SectionTitle } from "./ui";

type FetchStatus = "idle" | "loading" | "done" | "error";

// "야외" 선택 시 결과 화면에 붙는 GPS 기반 주변 장소 리스트.
export default function NearbyPlaces() {
  const { state: geoState, coords, error: geoError, request } = useGeolocation();
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");

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

  const busy = geoState === "locating" || status === "loading";

  return (
    <section className="pt-2">
      <SectionTitle>📍 근처에서 가볼 만한 곳</SectionTitle>

      {/* 시작 전 안내 + 버튼 */}
      {geoState === "idle" && (
        <Card>
          <p className="text-sm text-ink-soft leading-relaxed mb-3">
            현재 위치를 기준으로 아이와 갈 만한 놀이터·공원·도서관 등을 찾아드려요.
            위치는 검색에만 쓰고 저장하지 않아요.
          </p>
          <Button full onClick={request}>
            📍 내 주변 장소 찾기
          </Button>
        </Card>
      )}

      {busy && <Loading label="주변 장소를 찾는 중..." />}

      {/* 권한 거부 */}
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

      {/* 미지원 */}
      {geoState === "unsupported" && (
        <Card>
          <p className="text-sm text-ink-soft">
            이 기기/브라우저에서는 위치 기능을 사용할 수 없어요.
          </p>
        </Card>
      )}

      {/* 위치 오류 */}
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

      {/* 검색 실패 */}
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

      {/* 결과 없음 */}
      {status === "done" && places && places.length === 0 && (
        <Card>
          <p className="text-sm text-ink-soft leading-relaxed">
            반경 3km 안에 등록된 장소를 찾지 못했어요. 조금 이동한 뒤 다시
            시도하거나, 오늘은 집·근처 산책으로 즐겨보는 건 어때요?
          </p>
        </Card>
      )}

      {/* 목록 */}
      {status === "done" && places && places.length > 0 && (
        <>
          <div className="space-y-2.5">
            {places.map((p) => {
              const meta = PLACE_META[p.category] ?? PLACE_META.other;
              return (
                <a
                  key={p.id}
                  href={p.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="flex items-center gap-3 animate-fade-up">
                    <div className="w-11 h-11 rounded-2xl bg-accent-soft flex items-center justify-center text-xl shrink-0">
                      {meta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink truncate">{p.name}</p>
                      <p className="text-xs text-ink-faint">
                        {meta.label}
                        {p.address ? ` · ${p.address}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary">
                        {formatDistance(p.distanceM)}
                      </p>
                      <p className="text-[11px] text-ink-faint">지도 열기 →</p>
                    </div>
                  </Card>
                </a>
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
