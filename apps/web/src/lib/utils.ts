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
    }).format(amount) + " DZD"
  );
}

export function timeAgo(dateStr: string): string {
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return "";
  const diff = Date.now() - ts;
  if (diff < 0) return "الآن";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "الآن";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} ي`;
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} ش`;
  const years = Math.floor(months / 12);
  return `منذ ${years} س`;
}

type BadgeVariant =
  | "default"
  | "secondary"
  | "danger"
  | "warning"
  | "success"
  | "info"
  | "muted";

export const statusMap: Record<
  string,
  { label: string; variant: BadgeVariant }
> = {
  active: { label: "نشط", variant: "default" },
  completed: { label: "مكتمل", variant: "secondary" },
  overdue: { label: "متأخر", variant: "danger" },
  cancelled: { label: "ملغي", variant: "muted" },
  pending: { label: "قيد الانتظار", variant: "warning" },
  available: { label: "متاح", variant: "success" },
  rented: { label: "مؤجر", variant: "default" },
  in_maintenance: { label: "صيانة", variant: "warning" },
  in_progress: { label: "قيد التنفيذ", variant: "info" },
  returned: { label: "تم الإرجاع", variant: "secondary" },
};
