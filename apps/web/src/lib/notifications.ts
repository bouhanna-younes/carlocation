import { supabase } from "./supabase/client";

export type NotificationCategory =
  | "insurance_expiry"
  | "vignette_expiry"
  | "inspection_expiry"
  | "oil_change_expiry"
  | "license_expiry"
  | "rental_overdue"
  | "rental_created"
  | "rental_returned"
  | "rental_cancelled"
  | "general";

export const categoryLabels: Record<NotificationCategory, string> = {
  insurance_expiry: "تأمين السيارة",
  vignette_expiry: "Vignette",
  inspection_expiry: "فحص تقني",
  oil_change_expiry: "تبديل زيت",
  license_expiry: "رخصة القيادة",
  rental_overdue: "كراء متأخر",
  rental_created: "كراء جديد",
  rental_returned: "إرجاع سيارة",
  rental_cancelled: "إلغاء كراء",
  general: "عام",
};

export const categoryColors: Record<NotificationCategory, string> = {
  insurance_expiry: "bg-amber-500/15 text-amber-400",
  vignette_expiry: "bg-orange-500/15 text-orange-400",
  inspection_expiry: "bg-blue-500/15 text-blue-400",
  oil_change_expiry: "bg-emerald-500/15 text-emerald-400",
  license_expiry: "bg-red-500/15 text-red-400",
  rental_overdue: "bg-red-500/15 text-red-400",
  rental_created: "bg-emerald-500/15 text-emerald-400",
  rental_returned: "bg-blue-500/15 text-blue-400",
  rental_cancelled: "bg-amber-500/15 text-amber-400",
  general: "bg-muted/15 text-muted",
};

/**
 * Sync notifications with actual car/customer data:
 * - Create notifications for dates within 15 days (if not already exists)
 * - DELETE notifications for dates that are now > 15 days or past
 */
export async function checkExpiryDates(): Promise<number> {
  const now = new Date();
  const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let notificationsCreated = 0;
  let notificationsDeleted = 0;

  // Get all existing expiry notifications (unread)
  const { data: existingNotifs } = await supabase
    .from("notifications")
    .select("id, title, category, metadata")
    .in("category", [
      "insurance_expiry",
      "oil_change_expiry",
      "vignette_expiry",
      "inspection_expiry",
      "license_expiry",
    ])
    .eq("is_read", false)
    .returns<{ id: string; title: string; category: string; metadata: string | null }[]>();

  // Build a map of existing notifications by car+category
  const existingMap = new Map<string, string>(); // key: "carId|category" → notificationId
  for (const n of existingNotifs ?? []) {
    try {
      const meta = n.metadata ? JSON.parse(n.metadata) : null;
      if (meta?.carId) {
        existingMap.set(`${meta.carId}|${n.category}`, n.id);
      }
    } catch {}
  }

  // 1. Check car expiry dates
  const { data: cars } = await supabase
    .from("cars")
    .select("id, brand, model, insurance_expiry, oil_change_expiry, vignette_expiry, inspection_expiry")
    .returns<{ id: string; brand: string; model: string; insurance_expiry: string | null; oil_change_expiry: string | null; vignette_expiry: string | null; inspection_expiry: string | null }[]>();

  const carExpiryFields: Array<{
    field: string;
    category: NotificationCategory;
    label: string;
  }> = [
    { field: "insurance_expiry", category: "insurance_expiry", label: "تأمين السيارة" },
    { field: "oil_change_expiry", category: "oil_change_expiry", label: "تبديل الزيت" },
    { field: "vignette_expiry", category: "vignette_expiry", label: "Vignette" },
    { field: "inspection_expiry", category: "inspection_expiry", label: "الفحص التقني" },
  ];

  for (const car of cars ?? []) {
    const subject = `${car.brand} ${car.model}`;

    for (const { field, category, label } of carExpiryFields) {
      const expiryDate = car[field as keyof typeof car] as string | null;
      const existingId = existingMap.get(`${car.id}|${category}`);

      if (expiryDate) {
        const exp = new Date(expiryDate);
        const isWithin15Days = exp <= in15Days && exp > now;
        const isPastOrSafe = exp > in15Days || exp <= now;

        if (isWithin15Days) {
          // Date is within 15 days → create notification if not exists
          if (!existingId) {
            const created = await createExpiryNotification(
              subject,
              category,
              `${label} ينتهي في ${exp.toLocaleDateString("ar-DZ")}`,
              exp,
              car.id,
            );
            if (created) notificationsCreated++;
          }
        } else if (existingId) {
          // Date is safe (> 15 days) but notification exists → DELETE it
          const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("id", existingId);
          if (!error) notificationsDeleted++;
        }
      }
    }
  }

  // 2. Check customer license expiry
  const { data: customers } = await supabase
    .from("customers")
    .select("id, first_name, last_name, driver_license_expiry")
    .returns<{ id: string; first_name: string; last_name: string; driver_license_expiry: string | null }[]>();

  for (const customer of customers ?? []) {
    if (customer.driver_license_expiry) {
      const expiryDate = new Date(customer.driver_license_expiry);
      const subject = `${customer.first_name} ${customer.last_name}`;
      const existingId = existingMap.get(`${customer.id}|license_expiry`);

      if (expiryDate <= in30Days && expiryDate > now) {
        if (!existingId) {
          const created = await createExpiryNotification(
            subject,
            "license_expiry",
            `رخصة القيادة للعميل تنتهي في ${expiryDate.toLocaleDateString("ar-DZ")}`,
            expiryDate,
            customer.id,
          );
          if (created) notificationsCreated++;
        }
      } else if (existingId) {
        // License is safe → DELETE notification
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("id", existingId);
        if (!error) notificationsDeleted++;
      }
    }
  }

  return notificationsCreated;
}

async function createExpiryNotification(
  subject: string,
  category: NotificationCategory,
  message: string,
  expiryDate: Date,
  carId?: string
): Promise<boolean> {
  // Check if similar unread notification already exists (any time)
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("category", category)
    .ilike("title", `%${subject}%`)
    .eq("is_read", false)
    .limit(1);

  if (existing && existing.length > 0) return false;

  // Create notification
  const { error } = await supabase.from("notifications").insert({
    title: `${categoryLabels[category]} — ${subject}`,
    message,
    type: "warning",
    category,
    metadata: carId ? JSON.stringify({ carId }) : null,
  } as any);

  return !error;
}

export async function createRentalNotification(
  type: "rental_created" | "rental_returned" | "rental_cancelled",
  subject: string,
  message: string
): Promise<void> {
  await supabase.from("notifications").insert({
    title: `${categoryLabels[type]} — ${subject}`,
    message,
    type: type === "rental_returned" ? "success" : type === "rental_cancelled" ? "warning" : "info",
    category: type,
  } as any);
}
