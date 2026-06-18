import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDZD(amount: number): string {
  return (
    new Intl.NumberFormat("ar-DZ", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount ?? 0) + " DZD"
  );
}

const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

/**
 * Arabic relative time using Intl.RelativeTimeFormat.
 * Returns strings like "منذ 5 ساعات", "خلال يومين", "الآن".
 */
export function timeAgo(dateStr: string): string {
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return "";
  const diffMs = ts - Date.now();
  if (Math.abs(diffMs) < 30_000) return "الآن";

  const sec = diffMs / 1000;
  const absSec = Math.abs(sec);
  const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 30, unit: "day" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ];

  let duration = sec;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (const d of divisions) {
    if (absSec < d.amount) {
      unit = d.unit;
      break;
    }
    duration = duration / d.amount;
    unit = d.unit;
  }
  const rounded = Math.round(duration);
  return rtf.format(rounded, unit);
}

export type BadgeVariant =
  | "default"
  | "secondary"
  | "danger"
  | "warning"
  | "success"
  | "info"
  | "muted";

export const statusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  active: { label: "نشط", variant: "default" },
  completed: { label: "مكتمل", variant: "secondary" },
  overdue: { label: "متأخر", variant: "danger" },
  cancelled: { label: "ملغي", variant: "muted" },
  pending: { label: "قيد الانتظار", variant: "warning" },
  available: { label: "متاح", variant: "success" },
  rented: { label: "مؤجر", variant: "default" },
  maintenance: { label: "صيانة", variant: "warning" },
  in_progress: { label: "قيد التنفيذ", variant: "info" },
  returned: { label: "تم الإرجاع", variant: "secondary" },
};
