"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/today", label: "오늘 뭐하지", icon: "🧸" },
  { href: "/now", label: "지금 어떡하지", icon: "😵" },
  { href: "/records", label: "기록", icon: "📔" },
  { href: "/profile", label: "아이", icon: "👶" },
];

// 온보딩 화면에서는 네비를 숨긴다.
const HIDDEN_ON = ["/onboarding"];

export default function BottomNav() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname?.startsWith(p))) return null;

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app z-40
                 bg-warmwhite/95 backdrop-blur border-t border-primary-soft/60"
    >
      <ul className="flex">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition",
                  active ? "text-primary" : "text-ink-faint hover:text-ink-soft"
                )}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* iOS 홈 인디케이터 여백 */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
