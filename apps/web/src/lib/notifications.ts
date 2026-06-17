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
 * Check all expiry dates and create notifications
 * This should be called periodically (e.g., on page load or via cron)
 */
export async function checkExpiryDates(): Promise<number> {
  const now = new Date();
  const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let notificationsCreated = 0;

  // 1. Check car insurance expiry
  const { data: cars } = await supabase
    .from("cars")
    .select("id, brand, model, insurance_expiry, oil_change_expiry, vignette_expiry, inspection_expiry")
    .returns<{ id: string; brand: string; model: string; insurance_expiry: string | null; oil_change_expiry: string | null; vignette_expiry: string | null; inspection_expiry: string | null }[]>();

  for (const car of cars ?? []) {
    // Insurance expiry
    if (car.insurance_expiry) {
      const expiryDate = new Date(car.insurance_expiry);
      if (expiryDate <= in15Days && expiryDate > now) {
        const created = await createExpiryNotification(
          `${car.brand} ${car.model}`,
          "insurance_expiry",
          `تأمين السيارة ينتهي في ${expiryDate.toLocaleDateString("ar-DZ")}`,
          expiryDate,
          car.id
        );
        if (created) notificationsCreated++;
      }
    }

    // Oil change expiry
    if (car.oil_change_expiry) {
      const expiryDate = new Date(car.oil_change_expiry);
      if (expiryDate <= in15Days && expiryDate > now) {
        const created = await createExpiryNotification(
          `${car.brand} ${car.model}`,
          "oil_change_expiry",
          `تبديل الزيت للسيارة ينتهي في ${expiryDate.toLocaleDateString("ar-DZ")}`,
          expiryDate,
          car.id
        );
        if (created) notificationsCreated++;
      }
    }

    // Vignette expiry
    if (car.vignette_expiry) {
      const expiryDate = new Date(car.vignette_expiry);
      if (expiryDate <= in15Days && expiryDate > now) {
        const created = await createExpiryNotification(
          `${car.brand} ${car.model}`,
          "vignette_expiry",
          `Vignette السيارة ينتهي في ${expiryDate.toLocaleDateString("ar-DZ")}`,
          expiryDate,
          car.id
        );
        if (created) notificationsCreated++;
      }
    }

    // Inspection expiry
    if (car.inspection_expiry) {
      const expiryDate = new Date(car.inspection_expiry);
      if (expiryDate <= in15Days && expiryDate > now) {
        const created = await createExpiryNotification(
          `${car.brand} ${car.model}`,
          "inspection_expiry",
          `الفحص التقني للسيارة ينتهي في ${expiryDate.toLocaleDateString("ar-DZ")}`,
          expiryDate,
          car.id
        );
        if (created) notificationsCreated++;
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
      if (expiryDate <= in30Days && expiryDate > now) {
        const created = await createExpiryNotification(
          `${customer.first_name} ${customer.last_name}`,
          "license_expiry",
          `رخصة القيادة للعميل تنتهي في ${expiryDate.toLocaleDateString("ar-DZ")}`,
          expiryDate
        );
        if (created) notificationsCreated++;
      }
    }
  }

  // 3. Check overdue rentals
  const nowIso = now.toISOString();
  const { data: overdueRentals } = await supabase
    .from("rentals")
    .select("id, customer_id, car_id, end_date, customer:customers(first_name, last_name), car:cars(brand, model)")
    .eq("status", "active")
    .lt("end_date", nowIso)
    .returns<{ id: string; customer_id: string; car_id: string; end_date: string; customer: { first_name: string; last_name: string }[] | { first_name: string; last_name: string }; car: { brand: string; model: string }[] | { brand: string; model: string } }[]>();

  for (const rental of overdueRentals ?? []) {
    const cust = Array.isArray(rental.customer) ? rental.customer[0] : rental.customer;
    const car = Array.isArray(rental.car) ? rental.car[0] : rental.car;
    if (cust && car) {
      const created = await createExpiryNotification(
        `${cust.first_name} ${cust.last_name} - ${car.brand} ${car.model}`,
        "rental_overdue",
        `الكراء متأخر — تاريخ الانتهاء كان ${new Date(rental.end_date).toLocaleDateString("ar-DZ")}`,
        now
      );
      if (created) notificationsCreated++;
    }
  }

  return notificationsCreated;
}

/**
 * Create a notification if one doesn't already exist for this car/category combo today
 */
async function createExpiryNotification(
  subject: string,
  category: NotificationCategory,
  message: string,
  expiryDate: Date,
  carId?: string
): Promise<boolean> {
  // Check if similar notification exists today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("category", category)
    .ilike("title", `%${subject}%`)
    .gte("created_at", todayStart.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return false;

  // Create notification with carId in metadata
  const { error } = await supabase.from("notifications").insert({
    title: `${categoryLabels[category]} — ${subject}`,
    message,
    type: "warning",
    category,
    metadata: carId ? JSON.stringify({ carId }) : null,
  } as any);

  return !error;
}

/**
 * Create a rental notification
 */
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
