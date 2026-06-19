"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/lib/constants";
import type { Customer, AvailableCar, Rental } from "@/lib/mappers";

// ─── Scratch locations ───
export const SCRATCH_LOCATIONS: { value: string; label: string }[] = [
  { value: "front_bumper", label: "صدام أمامي" },
  { value: "rear_bumper", label: "صدام خلفي" },
  { value: "left_door", label: "باب يسار" },
  { value: "right_door", label: "باب يمين" },
  { value: "hood", label: "كابوت" },
  { value: "roof", label: "سقف" },
  { value: "trunk", label: "صندوق" },
  { value: "left_fender", label: "رفرف يسار" },
  { value: "right_fender", label: "رفرف يمين" },
  { value: "windshield", label: "زجاج أمامي" },
];

export const FUEL_LEVELS: { value: string; label: string }[] = [
  { value: "full", label: "ممتلئة" },
  { value: "half", label: "نصف ممتلئة" },
  { value: "quarter", label: "ربع" },
  { value: "low", label: "أقل من ربع" },
];

// ─── Create rental schema ───
const scratchSchema = z.object({
  location: z.string().min(1, "الموقع مطلوب"),
  description: z.string().optional(),
});

export const rentalSchema = z
  .object({
    customerId: z.string().min(1, "العميل مطلوب"),
    carId: z.string().min(1, "السيارة مطلوبة"),
    startDate: z
      .string()
      .min(1, "تاريخ البداية مطلوب")
      .refine((val) => {
        const date = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      }, "تاريخ البداية لا يمكن أن يكون في الماضي"),
    endDate: z.string().min(1, "تاريخ النهاية مطلوب"),
    startMileage: z.coerce.number().min(0, "المسافة يجب أن تكون موجبة"),
    dailyRate: z.coerce.number().min(0).optional(),
    discountPercent: z.coerce.number().min(0).max(50, "الحد الأقصى للتخفيض 50%").optional(),
    discountReason: z.string().optional(),
    depositAmount: z.coerce.number().min(0).optional(),
    amountPaid: z.coerce.number().min(0).optional(),
    fuelLevelStart: z.string().optional(),
    isWashedStart: z.boolean().optional(),
    scratchesStart: z.array(scratchSchema).optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) > new Date(data.startDate);
    },
    {
      message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
      path: ["endDate"],
    },
  );

export type RentalFormData = z.input<typeof rentalSchema>;

// ─── Edit rental schema ───
export const editRentalSchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) > new Date(data.startDate);
    },
    {
      message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
      path: ["endDate"],
    },
  );

export type EditRentalFormData = z.input<typeof editRentalSchema>;

// ─── Cancel schema ───
export const cancelSchema = z.object({
  reason: z.string().optional(),
});
export type CancelFormData = z.input<typeof cancelSchema>;

// ─── Return rental schema ───
export const returnRentalSchema = z.object({
  endMileage: z.coerce.number().min(0, "المسافة يجب أن تكون موجبة"),
  fuelLevelEnd: z.string().min(1, "مستوى الوقود مطلوب"),
  isWashedEnd: z.boolean().optional(),
  scratchesEnd: z.array(scratchSchema).optional(),
  additionalPayment: z.coerce.number().min(0).optional(),
});
export type ReturnRentalFormData = z.input<typeof returnRentalSchema>;

// ═══════════════════════════════════════════════════════
// CREATE RENTAL FORM
// ═══════════════════════════════════════════════════════
export function RentalForm({
  customers,
  availableCars,
  onSubmit,
  onCancel,
  isLoading,
}: {
  customers: Customer[];
  availableCars: AvailableCar[];
  onSubmit: (data: RentalFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<RentalFormData>({
    resolver: zodResolver(rentalSchema),
    defaultValues: {
      customerId: "",
      carId: "",
      startDate: "",
      endDate: "",
      startMileage: 0,
      dailyRate: undefined,
      discountPercent: 0,
      discountReason: "",
      depositAmount: 0,
      amountPaid: 0,
      fuelLevelStart: "full",
      isWashedStart: true,
      scratchesStart: [],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "scratchesStart" });

  const watchedCarId = watch("carId");
  const watchedStart = watch("startDate");
  const watchedEnd = watch("endDate");
  const watchedDailyRate = watch("dailyRate") as number | undefined;
  const watchedDiscount = watch("discountPercent") as number | undefined;
  const watchedAmountPaid = watch("amountPaid") as number | undefined;
  const selectedCar = availableCars?.find((c) => c.id === watchedCarId);

  const handleCarChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const carId = e.target.value;
    setValue("carId", carId);
    const car = availableCars?.find((c) => c.id === carId);
    if (car) setValue("dailyRate", car.dailyRate);
  };

  const baseRate = watchedDailyRate || selectedCar?.dailyRate || 0;
  const discount = watchedDiscount || 0;
  const effectiveRate = Math.round(baseRate * (1 - discount / 100));
  const estimatedDays =
    watchedStart && watchedEnd
      ? Math.max(1, Math.ceil((new Date(watchedEnd).getTime() - new Date(watchedStart).getTime()) / 86400000))
      : 0;
  const estimatedTotal = estimatedDays * effectiveRate;
  const originalTotal = estimatedDays * baseRate;
  const hasDiscount = discount > 0 && baseRate > 0;
  const remaining = Math.max(0, estimatedTotal - (watchedAmountPaid ?? 0));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">العميل</label>
        <select {...register("customerId")} className={inputClass}>
          <option value="">اختر العميل</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </select>
        {errors.customerId && <p className="text-xs text-danger mt-1">{errors.customerId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">السيارة</label>
        <select {...register("carId")} className={inputClass} onChange={handleCarChange}>
          <option value="">اختر السيارة</option>
          {availableCars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.brand} {car.model} ({car.plateNumber}) — {new Intl.NumberFormat("ar-DZ").format(car.dailyRate)} DZD/يوم
            </option>
          ))}
        </select>
        {errors.carId && <p className="text-xs text-danger mt-1">{errors.carId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">تاريخ البداية</label>
          <input type="date" {...register("startDate")} className={inputClass} />
          {errors.startDate && <p className="text-xs text-danger mt-1">{errors.startDate.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">تاريخ النهاية</label>
          <input type="date" {...register("endDate")} className={inputClass} />
          {errors.endDate && <p className="text-xs text-danger mt-1">{errors.endDate.message}</p>}
        </div>
      </div>

      {/* ─── Car Condition Section ─── */}
      <div className="space-y-3 rounded-xl border border-border p-4 bg-surface/50">
        <h4 className="text-sm font-semibold text-foreground/80">حالة السيارة عند الاستلام</h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">العداد (km)</label>
            <input type="number" min="0" {...register("startMileage")} className={inputClass} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">مستوى الوقود</label>
            <select {...register("fuelLevelStart")} className={inputClass}>
              {FUEL_LEVELS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register("isWashedStart")} className="w-4 h-4 rounded border-border text-primary" />
          <span className="text-sm text-foreground/70">السيارة مغسولة</span>
        </label>

        {/* Scratches */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-foreground/70">الخدوش</label>
            <button type="button" onClick={() => append({ location: "", description: "" })}
              className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
              + إضافة خدش
            </button>
          </div>
          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 mb-2">
              <select {...register(`scratchesStart.${idx}.location` as const)} className={inputClass}>
                <option value="">الموقع</option>
                {SCRATCH_LOCATIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input type="text" {...register(`scratchesStart.${idx}.description` as const)}
                className={inputClass} placeholder="وصف الخدش" />
              <button type="button" onClick={() => remove(idx)}
                className="px-2 text-danger hover:bg-danger/10 rounded-lg shrink-0">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Pricing Section ─── */}
      <div className="space-y-3 rounded-xl border border-border p-4 bg-surface/50">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/80">السعر اليومي (DZD)</label>
          {selectedCar && (
            <span className="text-xs text-muted">سعر السيارة: {new Intl.NumberFormat("ar-DZ").format(selectedCar.dailyRate)} DZD</span>
          )}
        </div>
        <input type="number" min="0" {...register("dailyRate")} className={inputClass} placeholder={selectedCar ? `${selectedCar.dailyRate}` : "0"} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">نسبة التخفيض (%)</label>
            <input type="number" min="0" max="50" {...register("discountPercent")} className={inputClass} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">سبب التخفيض</label>
            <input type="text" {...register("discountReason")} className={inputClass} placeholder="عميل مفضل..." />
          </div>
        </div>

        {baseRate > 0 && (
          <div className="text-center pt-2 border-t border-border/50">
            {hasDiscount && <p className="text-xs text-muted line-through">{new Intl.NumberFormat("ar-DZ").format(originalTotal)} DZD</p>}
            <p className="text-lg font-bold text-primary">{new Intl.NumberFormat("ar-DZ").format(estimatedTotal)} DZD</p>
            <p className="text-xs text-muted">{estimatedDays} يوم × {new Intl.NumberFormat("ar-DZ").format(effectiveRate)} DZD/يوم</p>
          </div>
        )}
      </div>

      {/* ─── Payment Section ─── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">الوديعة (DZD)</label>
          <input type="number" min="0" {...register("depositAmount")} className={inputClass} placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">المبلغ المدفوع مقدماً (DZD)</label>
          <input type="number" min="0" {...register("amountPaid")} className={inputClass} placeholder="0" />
        </div>
      </div>
      {estimatedTotal > 0 && (watchedAmountPaid ?? 0) > 0 && (
        <div className="rounded-lg bg-surface/70 border border-border p-3 text-sm flex justify-between">
          <span className="text-muted">المتبقي بعد الدفعة المقدمة:</span>
          <span className="font-bold text-warning">{new Intl.NumberFormat("ar-DZ").format(remaining)} DZD</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">ملاحظات (اختياري)</label>
        <textarea {...register("notes")} rows={2} className={`${inputClass} resize-none`} placeholder="ملاحظات إضافية..." />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" size="sm" disabled={isLoading} loading={isLoading}>
          {isLoading ? "جاري الإنشاء..." : "إنشاء"}
        </Button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════
// EDIT RENTAL FORM
// ═══════════════════════════════════════════════════════
export function EditRentalForm({
  rental,
  onSubmit,
  onCancel,
  isLoading,
}: {
  rental: Rental;
  onSubmit: (data: EditRentalFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditRentalFormData>({
    resolver: zodResolver(editRentalSchema),
    defaultValues: {
      startDate: rental.startDate.split("T")[0],
      endDate: rental.endDate.split("T")[0],
      notes: rental.notes ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">تاريخ البداية</label>
          <input type="date" {...register("startDate")} className={inputClass} />
          {errors.startDate && <p className="text-xs text-danger mt-1">{errors.startDate.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">تاريخ النهاية</label>
          <input type="date" {...register("endDate")} className={inputClass} />
          {errors.endDate && <p className="text-xs text-danger mt-1">{errors.endDate.message}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">ملاحظات</label>
        <textarea {...register("notes")} rows={3} className={`${inputClass} resize-none`} placeholder="ملاحظات..." />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" size="sm" disabled={isLoading} loading={isLoading}>
          {isLoading ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════
// RETURN RENTAL FORM
// ═══════════════════════════════════════════════════════
export function ReturnRentalForm({
  rental,
  onSubmit,
  onCancel,
  isLoading,
}: {
  rental: Rental;
  onSubmit: (data: ReturnRentalFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ReturnRentalFormData>({
    resolver: zodResolver(returnRentalSchema),
    defaultValues: {
      endMileage: rental.startMileage ?? 0,
      fuelLevelEnd: rental.fuelLevelStart ?? "full",
      isWashedEnd: true,
      scratchesEnd: [],
      additionalPayment: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "scratchesEnd" });
  const watchedAdditional = watch("additionalPayment") as number | undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Show start condition for reference */}
      <div className="rounded-xl border border-border/50 bg-surface/30 p-3 text-xs space-y-1">
        <p className="font-medium text-muted mb-1">الحالة عند الاستلام:</p>
        <p>العداد: {rental.startMileage ?? "—"} km | الوقود: {FUEL_LEVELS.find(f => f.value === rental.fuelLevelStart)?.label ?? "—"} | مغسولة: {rental.isWashedStart ? "نعم" : "لا"}</p>
        {rental.scratchesStart && rental.scratchesStart.length > 0 && (
          <p>خدوش سابقة: {rental.scratchesStart.map(s => SCRATCH_LOCATIONS.find(l => l.value === s.location)?.label ?? s.location).join("، ")}</p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-border p-4 bg-surface/50">
        <h4 className="text-sm font-semibold text-foreground/80">حالة السيارة عند الإرجاع</h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">العداد النهائي (km)</label>
            <input type="number" min="0" {...register("endMileage")} className={inputClass} />
            {errors.endMileage && <p className="text-xs text-danger mt-1">{errors.endMileage.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">مستوى الوقود</label>
            <select {...register("fuelLevelEnd")} className={inputClass}>
              {FUEL_LEVELS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register("isWashedEnd")} className="w-4 h-4 rounded border-border text-primary" />
          <span className="text-sm text-foreground/70">السيارة مغسولة</span>
        </label>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-foreground/70">خدوش عند الإرجاع</label>
            <button type="button" onClick={() => append({ location: "", description: "" })}
              className="text-xs text-primary hover:text-primary-hover">+ إضافة خدش</button>
          </div>
          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 mb-2">
              <select {...register(`scratchesEnd.${idx}.location` as const)} className={inputClass}>
                <option value="">الموقع</option>
                {SCRATCH_LOCATIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input type="text" {...register(`scratchesEnd.${idx}.description` as const)} className={inputClass} placeholder="وصف الخدش" />
              <button type="button" onClick={() => remove(idx)} className="px-2 text-danger hover:bg-danger/10 rounded-lg shrink-0">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">دفع إضافي (DZD)</label>
        <input type="number" min="0" {...register("additionalPayment")} className={inputClass} placeholder="0" />
        {(watchedAdditional ?? 0) > 0 && (
          <p className="text-xs text-muted mt-1">سيتم إضافته للمبلغ المدفوع عند إنشاء الكراء</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" variant="primary" size="sm" disabled={isLoading} loading={isLoading}>
          {isLoading ? "جاري الإرجاع..." : "تأكيد الإرجاع"}
        </Button>
      </div>
    </form>
  );
}
