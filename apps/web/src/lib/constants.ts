export const inputClass =
  "w-full bg-input/80 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all duration-200";

export const carStatusMap: Record<
  string,
  { label: string; colorClass: string }
> = {
  available: {
    label: "متاحة",
    colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  rented: {
    label: "مستأجرة",
    colorClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  maintenance: {
    label: "صيانة",
    colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  out_of_service: {
    label: "خارج الخدمة",
    colorClass: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

export const rentalStatusMap: Record<
  string,
  { label: string; colorClass: string }
> = {
  active: {
    label: "نشط",
    colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  completed: {
    label: "مكتمل",
    colorClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  overdue: {
    label: "متأخر",
    colorClass: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  cancelled: {
    label: "ملغى",
    colorClass: "bg-muted/15 text-muted border-muted/30",
  },
};

export const maintenanceStatusMap: Record<
  string,
  { label: string; colorClass: string }
> = {
  pending: {
    label: "قيد الانتظار",
    colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  in_progress: {
    label: "قيد التنفيذ",
    colorClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  completed: {
    label: "مكتمل",
    colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  cancelled: {
    label: "ملغى",
    colorClass: "bg-muted/15 text-muted border-muted/30",
  },
};

export const maintenanceTypeMap: Record<string, string> = {
  oil_change: "تغيير زيت",
  brake_service: "فرامل",
  tire_rotation: "إطارات",
  engine_repair: "محرّك",
  inspection: "فحص",
  other: "أخرى",
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

export const transmissionOptions = [
  { value: "manual", label: "يدوي" },
  { value: "automatic", label: "أوتوماتيكي" },
];

export const categoryOptions = [
  { value: "economy", label: "اقتصادية" },
  { value: "sedan", label: "سيدان" },
  { value: "suv", label: "SUV" },
  { value: "luxury", label: "فاخرة" },
  { value: "van", label: "فان" },
  { value: "truck", label: "شاحنة" },
];

export const priorityMap: Record<
  string,
  { label: string; colorClass: string }
> = {
  low: {
    label: "منخفضة",
    colorClass: "bg-muted/15 text-muted border-muted/30",
  },
  medium: {
    label: "متوسطة",
    colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  high: {
    label: "عالية",
    colorClass: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  critical: {
    label: "حرجة",
    colorClass: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};
