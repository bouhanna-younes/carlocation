import { supabase } from "./supabase/client";
import type { Json } from "@/lib/supabase/database.types";

export type NotificationCategory =
  | "insurance"
  | "oil_change"
  | "vignette"
  | "inspection"
  | "license_expiry"
  | "rental_overdue"
  | "rental_created"
  | "rental_returned"
  | "rental_cancelled"
  | "general";

export const categoryLabels: Record<NotificationCategory, string> = {
  insurance: "تأمين السيارة",
  oil_change: "تبديل الزيت",
  vignette: "Vignette",
  inspection: "فحص تقني",
  license_expiry: "رخصة القيادة",
  rental_overdue: "كراء متأخر",
  rental_created: "كراء جديد",
  rental_returned: "إرجاع سيارة",
  rental_cancelled: "إلغاء كراء",
  general: "عام",
};

export const categoryColors: Record<NotificationCategory, string> = {
  insurance: "bg-amber-500/15 text-amber-400",
  oil_change: "bg-emerald-500/15 text-emerald-400",
  vignette: "bg-orange-500/15 text-orange-400",
  inspection: "bg-blue-500/15 text-blue-400",
  license_expiry: "bg-red-500/15 text-red-400",
  rental_overdue: "bg-red-500/15 text-red-400",
  rental_created: "bg-emerald-500/15 text-emerald-400",
  rental_returned: "bg-blue-500/15 text-blue-400",
  rental_cancelled: "bg-amber-500/15 text-amber-400",
  general: "bg-muted/15 text-muted",
};

/**
 * Trigger the server-side expiry check RPC (migration 007).
 * In production this runs automatically via pg_cron daily at 08:00;
 * this function is a manual fallback (e.g., on dashboard mount).
 * Returns the number of notifications created.
 */
export async function checkExpiryDates(): Promise<number> {
  const { data, error } = await supabase.rpc("check_and_create_expiry_notifications");
  if (error) {
    console.error("checkExpiryDates RPC failed:", error.message);
    return 0;
  }
  return (data as number) ?? 0;
}

/**
 * Create a rental lifecycle notification (broadcast; recipient_id = NULL).
 */
export async function createRentalNotification(
  type: "rental_created" | "rental_returned" | "rental_cancelled",
  subject: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    title: `${categoryLabels[type]} — ${subject}`,
    message,
    type: type === "rental_returned" ? "success" : type === "rental_cancelled" ? "warning" : "info",
    category: type,
    metadata: (metadata ?? null) as unknown as Json,
  });
  if (error) {
    console.error("Failed to create rental notification:", error.message);
  }
}
