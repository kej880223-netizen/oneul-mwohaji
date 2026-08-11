"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getChild,
  getActivityLogs,
  getQuestions,
  getFavorites,
} from "./storage";
import { Child, ActivityLog, ParentingQuestion, Activity } from "./types";

// localStorage 변경(같은 탭 커스텀 이벤트 + 다른 탭 storage 이벤트)을
// 구독해 화면을 최신 상태로 유지하는 훅.
function useReactiveStore<T>(getter: () => T): [T, () => void] {
  const [value, setValue] = useState<T>(getter);
  const refresh = useCallback(() => setValue(getter()), [getter]);

  useEffect(() => {
    refresh(); // 마운트 시 클라이언트 값으로 동기화 (hydration 대비)
    const handler = () => refresh();
    window.addEventListener("omh:storage", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("omh:storage", handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  return [value, refresh];
}

export function useChild() {
  const [child, refresh] = useReactiveStore<Child | null>(getChild);
  // 초기 서버 렌더와 클라이언트 값 불일치를 구분하기 위한 로딩 플래그
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return { child, ready, refresh };
}

export function useActivityLogs() {
  const [logs, refresh] = useReactiveStore<ActivityLog[]>(getActivityLogs);
  return { logs, refresh };
}

export function useQuestions() {
  const [questions, refresh] =
    useReactiveStore<ParentingQuestion[]>(getQuestions);
  return { questions, refresh };
}

export function useFavorites() {
  const [favorites, refresh] = useReactiveStore<Activity[]>(getFavorites);
  return { favorites, refresh };
}
