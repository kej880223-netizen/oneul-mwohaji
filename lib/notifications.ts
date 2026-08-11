"use client";

// ─────────────────────────────────────────────────────────
//  알림 (로컬 리마인더)
//  ⚠️ 앱이 완전히 꺼진 상태의 '예약 푸시'는 푸시 서버(백엔드)가 필요.
//  여기서는 백엔드 없이 가능한 범위 — 알림 권한 + 매일 '오늘의 놀이'
//  리마인더(앱을 열었을 때 지정 시간이 지났으면 1회 알림)를 제공한다.
// ─────────────────────────────────────────────────────────

const KEY = "omh.notify";

export interface NotifySettings {
  enabled: boolean;
  time: string; // "HH:MM"
  lastShown: string; // YYYY-MM-DD
}

const DEFAULTS: NotifySettings = {
  enabled: false,
  time: "10:00",
  lastShown: "",
};

export function getNotifySettings(): NotifySettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveNotifySettings(s: NotifySettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("omh:storage"));
}

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotifyPermission(): Promise<NotificationPermission> {
  if (!notifySupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// 앱을 열었을 때 호출 — 조건 충족 시 '오늘의 놀이' 리마인더 1회 표시
export function maybeShowDailyReminder(childName: string): void {
  if (!notifySupported()) return;
  if (Notification.permission !== "granted") return;

  const s = getNotifySettings();
  if (!s.enabled) return;
  if (s.lastShown === todayStr()) return; // 오늘 이미 알림함

  const [h, m] = s.time.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h || 10, m || 0, 0, 0);
  if (now < target) return; // 아직 지정 시간 전

  try {
    const n = new Notification(`오늘 ${childName || "아이"}와 뭐하지? 🧸`, {
      body: "오늘의 놀이를 확인하고 함께 놀아볼까요?",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "omh-daily",
    });
    n.onclick = () => {
      window.focus();
      window.location.href = "/today";
      n.close();
    };
    saveNotifySettings({ ...s, lastShown: todayStr() });
  } catch {
    /* noop */
  }
}
