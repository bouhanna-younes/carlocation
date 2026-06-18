import type { CarStatus, Transmission, MaintenanceStatus, Priority } from "@/lib/supabase/database.types";

type StatusStyle = { label: string; colorClass: string };

const SEMAPHORE = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  red: "bg-red-500/15 text-red-400 border-red-500/30",
  muted: "bg-muted/15 text-muted border-muted/30",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/30",
} as const;

export const inputClass =
  "w-full bg-input/80 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors duration-200";

export const carStatusMap: Record<CarStatus, StatusStyle> = {
  available: { label: "متاحة", colorClass: SEMAPHORE.emerald },
  rented: { label: "مستأجرة", colorClass: SEMAPHORE.blue },
  maintenance: { label: "صيانة", colorClass: SEMAPHORE.amber },
  out_of_service: { label: "خارج الخدمة", colorClass: SEMAPHORE.red },
};

export const rentalStatusMap: Record<string, StatusStyle> = {
  active: { label: "نشط", colorClass: SEMAPHORE.emerald },
  completed: { label: "مكتمل", colorClass: SEMAPHORE.blue },
  overdue: { label: "متأخر", colorClass: SEMAPHORE.red },
  cancelled: { label: "ملغى", colorClass: SEMAPHORE.muted },
  reserved: { label: "محجوز", colorClass: SEMAPHORE.amber },
};

export const maintenanceStatusMap: Record<MaintenanceStatus, StatusStyle> = {
  pending: { label: "قيد الانتظار", colorClass: SEMAPHORE.amber },
  in_progress: { label: "قيد التنفيذ", colorClass: SEMAPHORE.blue },
  completed: { label: "مكتمل", colorClass: SEMAPHORE.emerald },
  cancelled: { label: "ملغى", colorClass: SEMAPHORE.muted },
};

export const maintenanceTypeMap: Record<string, string> = {
  oil_change: "تغيير زيت",
  brake_service: "فرامل",
  tire_rotation: "إطارات",
  engine_repair: "محرّك",
  inspection: "فحص",
  other: "أخرى",
};

export const priorityMap: Record<Priority, StatusStyle> = {
  low: { label: "منخفضة", colorClass: SEMAPHORE.muted },
  medium: { label: "متوسطة", colorClass: SEMAPHORE.amber },
  high: { label: "عالية", colorClass: SEMAPHORE.orange },
  critical: { label: "حرجة", colorClass: SEMAPHORE.red },
};

export const fuelTypeOptions = [
  { value: "بنزين", label: "بنزين" },
  { value: "ديزل", label: "ديزل" },
  { value: "غاز", label: "غاز" },
  { value: "كهرباء", label: "كهرباء" },
  { value: "هجينة", label: "هجينة" },
];

export const colorOptions = [
  { value: "أبيض", label: "أبيض" },
  { value: "أسود", label: "أسود" },
  { value: "رمادي", label: "رمادي" },
  { value: "فضي", label: "فضي" },
  { value: "أحمر", label: "أحمر" },
  { value: "أزرق", label: "أزرق" },
  { value: "أخضر", label: "أخضر" },
  { value: "بني", label: "بني" },
  { value: "ذهبي", label: "ذهبي" },
  { value: "أخرى", label: "أخرى" },
];

export const transmissionOptions: { value: Transmission; label: string }[] = [
  { value: "manual", label: "يدوي" },
  { value: "automatic", label: "أوتوماتيكي" },
];

export const notificationCategoryLabels: Record<string, string> = {
  general: "عام",
  insurance: "تأمين",
  oil_change: "زيت",
  vignette: "فيغنيت",
  inspection: "معاينة",
  license_expiry: "رخصة قيادة",
  rental: "كراء",
};

// Arabic month names (used by reports + dashboard) — single source of truth
export const ARABIC_MONTHS = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
] as const;
