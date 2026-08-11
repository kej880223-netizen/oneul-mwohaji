"use client";

import { cx } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

// ─── Button ───────────────────────────────────────────────

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  full?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  full,
  className,
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-primary text-white shadow-soft hover:bg-primary-dark",
    secondary: "bg-white text-ink border border-primary-soft hover:bg-primary-soft/40",
    ghost: "bg-transparent text-ink-soft hover:bg-black/5",
  };
  const sizes = {
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-4 text-base",
  };
  return (
    <button
      className={cx(base, variants[variant], sizes[size], full && "w-full", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "bg-warmwhite rounded-2xl shadow-card p-4",
        onClick && "cursor-pointer transition hover:shadow-soft active:scale-[0.99]",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Chip / 선택 버튼 ──────────────────────────────────────

export function OptionButton({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "rounded-2xl px-4 py-3 text-sm font-medium border-2 transition text-left",
        selected
          ? "border-primary bg-primary-soft text-ink"
          : "border-transparent bg-white text-ink-soft hover:border-primary-soft",
        className
      )}
    >
      {children}
    </button>
  );
}

// ─── 섹션 제목 ─────────────────────────────────────────────

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-bold text-ink">{children}</h2>
      {action}
    </div>
  );
}

// ─── 페이지 헤더 ───────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <header className="px-5 pt-6 pb-3 flex items-start gap-3">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="뒤로가기"
          className="mt-0.5 text-ink-soft text-xl leading-none"
        >
          ←
        </button>
      )}
      <div>
        <h1 className="text-xl font-extrabold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft mt-0.5">{subtitle}</p>}
      </div>
    </header>
  );
}

// ─── 상태 컴포넌트: Loading / Error / Empty ────────────────

export function Loading({ label = "불러오는 중..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-16 gap-4 text-ink-soft"
    >
      <div className="w-10 h-10 rounded-full border-4 border-primary-soft border-t-primary spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 gap-4 text-center">
      <div className="text-4xl">🙏</div>
      <p className="text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  emoji = "🌱",
  title,
  description,
  action,
}: {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 gap-2 text-center">
      <div className="text-5xl mb-1">{emoji}</div>
      <p className="font-bold text-ink">{title}</p>
      {description && <p className="text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
