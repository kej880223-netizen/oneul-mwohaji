"use client";

import { useCallback, useState } from "react";

export type GeoState =
  | "idle"
  | "locating"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

export interface Coords {
  lat: number;
  lng: number;
}

// 브라우저 Geolocation을 명시적 사용자 동작(버튼 클릭)으로 요청하는 훅.
// 위치는 상태로만 들고 있고 저장하지 않는다.
export function useGeolocation() {
  const [state, setState] = useState<GeoState>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState("");

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    setState("locating");
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setState("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState("denied");
        } else {
          setState("error");
          setError(err.message || "위치를 가져오지 못했어요.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { state, coords, error, request };
}
