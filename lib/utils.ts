// 공용 유틸

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

// 개월 수 계산
export function ageInMonths(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 +
    (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
}

// "만 2세 3개월" 형태
export function ageLabel(birthDate: string): string {
  const m = ageInMonths(birthDate);
  const years = Math.floor(m / 12);
  const months = m % 12;
  if (years <= 0) return `${months}개월`;
  if (months === 0) return `만 ${years}세`;
  return `만 ${years}세 ${months}개월`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "오늘";
  if (diff < 2 * day) return "어제";
  const days = Math.floor(diff / day);
  if (days < 7) return `${days}일 전`;
  return formatDate(iso);
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
