"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/lib/constants";
import type { Customer, AvailableCar } from "@/lib/mappers";

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

export const cancelSchema = z.object({
  reason: z.string().optional(),
});

export type CancelFormData = z.input<typeof cancelSchema>;

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
      notes: "",
    },
  });

  const watchedCarId = watch("carId");
  const watchedStart = watch("startDate");
  const watchedEnd = watch("endDate");
  const watchedDailyRate = watch("dailyRate") as number | undefined;
  const watchedDiscount = watch("discountPercent") as number | undefined;
  const selectedCar = availableCars?.find((c) => c.id === watchedCarId);

  // Auto-fill dailyRate when car is selected
  const handleCarChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const carId = e.target.value;
    setValue("carId", carId);
    const car = availableCars?.find((c) => c.id === carId);
    if (car) {
      setValue("dailyRate", car.dailyRate);
    }
  };

  const baseRate = watchedDailyRate || selectedCar?.dailyRate || 0;
  const discount = watchedDiscount || 0;
  const effectiveRate = Math.round(baseRate * (1 - discount / 100));

  // Full days calculation (not fractional)
  const estimatedDays =
    watchedStart && watchedEnd
      ? Math.max(
          1,
          Math.ceil(
            (new Date(watchedEnd).getTime() -
              new Date(watchedStart).getTime()) /
              86400000,
          ),
        )
      : 0;
  const estimatedTotal = estimatedDays * effectiveRate;
  const originalTotal = estimatedDays * baseRate;
  const hasDiscount = discount > 0 && baseRate > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          العميل
        </label>
        <select {...register("customerId")} className={inputClass}>
          <option value="">اختر العميل</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>
        {errors.customerId && (
          <p className="text-xs text-danger mt-1">
            {errors.customerId.message}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          السيارة
        </label>
        <select {...register("carId")} className={inputClass} onChange={handleCarChange}>
          <option value="">اختر السيارة</option>
          {availableCars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.brand} {car.model} ({car.plateNumber}) — {new Intl.NumberFormat("ar-DZ").format(car.dailyRate)} DZD/يوم
            </option>
          ))}
        </select>
        {errors.carId && (
          <p className="text-xs text-danger mt-1">{errors.carId.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            تاريخ البداية
          </label>
          <input
            type="date"
            {...register("startDate")}
            className={inputClass}
          />
          {errors.startDate && (
            <p className="text-xs text-danger mt-1">
              {errors.startDate.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            تاريخ النهاية
          </label>
          <input type="date" {...register("endDate")} className={inputClass} />
          {errors.endDate && (
            <p className="text-xs text-danger mt-1">{errors.endDate.message}</p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          المسافة المقطوعة الحالية للسيارة (km)
        </label>
        <input
          type="number"
          min="0"
          {...register("startMileage")}
          className={inputClass}
          placeholder="أدخل العداد الحالي"
        />
        {errors.startMileage && (
          <p className="text-xs text-danger mt-1">{errors.startMileage.message}</p>
        )}
      </div>

      {/* Price Section */}
      <div className="space-y-3 rounded-xl border border-border p-4 bg-surface/50">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/80">
            السعر اليومي (DZD)
          </label>
          {selectedCar && (
            <span className="text-xs text-muted">
              سعر السيارة: {new Intl.NumberFormat("ar-DZ").format(selectedCar.dailyRate)} DZD
            </span>
          )}
        </div>
        <input
          type="number"
          min="0"
          {...register("dailyRate")}
          className={inputClass}
          placeholder={selectedCar ? `${selectedCar.dailyRate}` : "0"}
        />

        {/* Discount Section */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">
              نسبة التخفيض (%)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              {...register("discountPercent")}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">
              سبب التخفيض
            </label>
            <input
              type="text"
              {...register("discountReason")}
              className={inputClass}
              placeholder="عميل مفضل، عرض خاص..."
            />
          </div>
        </div>

        {/* Price Summary */}
        {baseRate > 0 && (
          <div className="text-center pt-2 border-t border-border/50">
            {hasDiscount && (
              <p className="text-xs text-muted line-through">
                {new Intl.NumberFormat("ar-DZ").format(originalTotal)} DZD
              </p>
            )}
            <p className="text-lg font-bold text-primary">
              {new Intl.NumberFormat("ar-DZ").format(estimatedTotal)} DZD
            </p>
            <p className="text-xs text-muted">
              {estimatedDays} يوم ×{" "}
              {new Intl.NumberFormat("ar-DZ").format(effectiveRate)} DZD/يوم
              {hasDiscount && (
                <span className="text-success mr-1">
                  (بعد تخفيض {discount}%)
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          الوديعة (DZD)
        </label>
        <input
          type="number"
          min="0"
          {...register("depositAmount")}
          className={inputClass}
          placeholder="0"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          ملاحظات (اختياري)
        </label>
        <textarea
          {...register("notes")}
          rows={2}
          className={`${inputClass} resize-none`}
          placeholder="ملاحظات إضافية..."
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          إلغاء
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? "جاري الإنشاء..." : "إنشاء"}
        </Button>
      </div>
    </form>
  );
}
