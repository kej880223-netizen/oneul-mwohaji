"use client";

import { useEffect, useState } from "react";
import {
  getNotifySettings,
  saveNotifySettings,
  requestNotifyPermission,
  notifySupported,
  NotifySettings as Settings,
} from "@/lib/notifications";
import { Card } from "./ui";

export default function NotifySettings() {
  const [mounted, setMounted] = useState(false);
  const [s, setS] = useState<Settings>({
    enabled: false,
    time: "10:00",
    lastShown: "",
  });
  const [perm, setPerm] = useState<NotificationPermission>("default");

  useEffect(() => {
    setMounted(true);
    setS(getNotifySettings());
    if (notifySupported()) setPerm(Notification.permission);
  }, []);

  if (!mounted) return null;

  if (!notifySupported()) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink mb-1">🔔 놀이 알림</p>
        <p className="text-xs text-ink-soft">
          이 브라우저에서는 알림을 지원하지 않아요.
        </p>
      </Card>
    );
  }

  async function toggle() {
    if (!s.enabled) {
      const p = await requestNotifyPermission();
      setPerm(p);
      if (p !== "granted") return;
    }
    const next = { ...s, enabled: !s.enabled };
    setS(next);
    saveNotifySettings(next);
  }

  function changeTime(time: string) {
    const next = { ...s, time };
    setS(next);
    saveNotifySettings(next);
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">🔔 매일 놀이 알림</p>
          <p className="text-xs text-ink-faint mt-0.5">
            매일 정한 시간에 오늘의 놀이를 알려드려요.
          </p>
        </div>
        <button
          onClick={toggle}
          role="switch"
          aria-checked={s.enabled && perm === "granted"}
          className={
            "relative w-12 h-7 rounded-full transition shrink-0 " +
            (s.enabled && perm === "granted" ? "bg-primary" : "bg-ink-faint/30")
          }
        >
          <span
            className={
              "absolute top-1 w-5 h-5 rounded-full bg-white transition-all " +
              (s.enabled && perm === "granted" ? "left-6" : "left-1")
            }
          />
        </button>
      </div>

      {s.enabled && perm === "granted" && (
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="notify-time" className="text-sm text-ink-soft">
            알림 시간
          </label>
          <input
            id="notify-time"
            type="time"
            value={s.time}
            onChange={(e) => changeTime(e.target.value)}
            className="rounded-lg border border-primary-soft px-2.5 py-1.5 text-sm focus:border-primary outline-none"
          />
        </div>
      )}

      {perm === "denied" && (
        <p className="text-xs text-primary-dark mt-2">
          브라우저에서 알림이 차단돼 있어요. 주소창의 사이트 설정에서 알림을
          허용해주세요.
        </p>
      )}

      <p className="text-[11px] text-ink-faint mt-3 leading-relaxed">
        ※ 앱을 완전히 종료한 상태의 예약 알림은 준비 중이에요. 지금은 앱을 열어둘
        때 지정 시간 이후 한 번 알려드려요.
      </p>
    </Card>
  );
}
