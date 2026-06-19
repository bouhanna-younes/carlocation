"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapCar, toCarInsert, toCarUpdate, mapCarImage, type Car, type CarImage } from "@/lib/mappers";
import { useRole } from "@/hooks/use-role";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Search,
  CarFront,
  Pencil,
  Trash2,
  Download,
  X,
  Eye,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRealtime } from "@/hooks/use-realtime";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTableState } from "@/hooks/use-table-state";
import { exportToCSV } from "@/lib/export-csv";
import { SortHeader } from "@/components/shared/sort-header";
import { Pagination } from "@/components/shared/pagination";
import { SkeletonRow } from "@/components/shared/skeleton-row";
import { ErrorState } from "@/components/shared/error-state";
import {
  inputClass,
  carStatusMap,
  fuelTypeOptions,
  colorOptions,
  transmissionOptions,
} from "@/lib/constants";

const carSchema = z.object({
  brand: z.string().min(1, "الماركة مطلوبة").max(50, "الحد الأقصى 50 حرف"),
  model: z.string().min(1, "الطراز مطلوب").max(50, "الحد الأقصى 50 حرف"),
  year: z.coerce
    .number()
    .min(1990, "السنة غير صالحة")
    .max(new Date().getFullYear() + 1, "السنة غير صالحة"),
  plateNumber: z.string().min(1, "رقم اللوحة مطلوب").max(20),
  color: z.string().min(1, "اللون مطلوب"),
  dailyRate: z.coerce
    .number()
    .min(1, "السعر يجب أن يكون موجباً")
    .max(999999, "السعر مرتفع جداً"),
  fuelType: z.string().min(1, "نوع الوقود مطلوب"),
  seats: z.coerce
    .number()
    .min(1, "عدد المقاعد مطلوب")
    .max(50, "الحد الأقصى 50 مقعد"),
  transmission: z.enum(["manual", "automatic"]).optional(),
  insuranceExpiry: z.string().optional(),
  oilChangeExpiry: z.string().optional(),
  vignetteExpiry: z.string().optional(),
  inspectionExpiry: z.string().optional(),
});

type CarFormData = z.input<typeof carSchema>;

function CarForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
}: {
  defaultValues?: Partial<CarFormData>;
  onSubmit: (data: CarFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: defaultValues ?? {
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      plateNumber: "",
      color: "",
      dailyRate: 0,
      fuelType: "",
      seats: 5,
      transmission: "manual",
      insuranceExpiry: "",
      oilChangeExpiry: "",
      vignetteExpiry: "",
      inspectionExpiry: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            الماركة
          </label>
          <input
            {...register("brand")}
            className={inputClass}
            placeholder="مثال: Toyota"
          />
          {errors.brand && (
            <p className="text-xs text-danger mt-1">{errors.brand.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            الطراز
          </label>
          <input
            {...register("model")}
            className={inputClass}
            placeholder="مثال: Corolla"
          />
          {errors.model && (
            <p className="text-xs text-danger mt-1">{errors.model.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            السنة
          </label>
          <input type="number" {...register("year")} className={inputClass} />
          {errors.year && (
            <p className="text-xs text-danger mt-1">{errors.year.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            رقم اللوحة
          </label>
          <input
            {...register("plateNumber")}
            className={inputClass}
            placeholder="مثال: 12345-أ"
          />
          {errors.plateNumber && (
            <p className="text-xs text-danger mt-1">
              {errors.plateNumber.message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            اللون
          </label>
          <select {...register("color")} className={inputClass}>
            <option value="">اختر اللون</option>
            {colorOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.color && (
            <p className="text-xs text-danger mt-1">{errors.color.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            السعر اليومي (DZD)
          </label>
          <input
            type="number"
            {...register("dailyRate")}
            className={inputClass}
          />
          {errors.dailyRate && (
            <p className="text-xs text-danger mt-1">
              {errors.dailyRate.message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            نوع الوقود
          </label>
          <select {...register("fuelType")} className={inputClass}>
            <option value="">اختر النوع</option>
            {fuelTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.fuelType && (
            <p className="text-xs text-danger mt-1">
              {errors.fuelType.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            عدد المقاعد
          </label>
          <input type="number" {...register("seats")} className={inputClass} />
          {errors.seats && (
            <p className="text-xs text-danger mt-1">{errors.seats.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            نوع القير
          </label>
          <select {...register("transmission")} className={inputClass}>
            {transmissionOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* expiry dates */}
      <div className="rounded-xl border border-border p-4 bg-surface/50 space-y-3">
        <p className="text-sm font-semibold text-foreground/80">تواريخ الانتهاء</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">
              انتهاء التأمين
            </label>
            <input type="date" {...register("insuranceExpiry")} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">
              انتهاء تبديل الزيت
            </label>
            <input type="date" {...register("oilChangeExpiry")} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">
              انتهاء Vignette
            </label>
            <input type="date" {...register("vignetteExpiry")} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/70">
              الفحص التقني
            </label>
            <input type="date" {...register("inspectionExpiry")} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" loading={isLoading}>
          حفظ
        </Button>
      </div>
    </form>
  );
}

export default function FleetPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <FleetContent />
    </Suspense>
  );
}

function FleetContent() {
  const searchParams = useSearchParams();
  const { isManager } = useRole();
  const [addOpen, setAddOpen] = useState(false);
  const [editCar, setEditCar] = useState<Car | null>(null);
  const [deleteCar, setDeleteCar] = useState<Car | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [viewCar, setViewCar] = useState<Car | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const queryClient = useQueryClient();
  // Stable "now" reference computed once per mount to satisfy purity rules
  const [now15, setNow15] = useState<Date | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setNow15(new Date(Date.now() + 15 * 86400000)), 0);
    return () => window.clearTimeout(id);
  }, []);

  // Realtime updates
  useRealtime("cars");
  useRealtime("notifications");
  useRealtime("car_images");

  // Fetch images for the currently viewed car
  const { data: carImages } = useQuery<CarImage[]>({
    queryKey: ["car-images", viewCar?.id],
    queryFn: async () => {
      if (!viewCar) return [];
      const { data, error } = await supabase
        .from("car_images")
        .select("*")
        .eq("car_id", viewCar.id)
        .order("sort_order", { ascending: true })
        .returns<Parameters<typeof mapCarImage>[0][]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapCarImage);
    },
    enabled: !!viewCar,
  });

  const handleImageUpload = async (file: File) => {
    if (!viewCar || !isManager) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const fileName = `${viewCar.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("car-images")
        .upload(fileName, file);
      if (uploadErr) throw new Error(uploadErr.message);

      const url = supabase.storage.from("car-images").getPublicUrl(fileName).data.publicUrl;
      const { error: dbErr } = await supabase.from("car_images").insert({
        car_id: viewCar.id,
        url,
        sort_order: (carImages?.length ?? 0),
      } as never);
      if (dbErr) throw new Error(dbErr.message);

      queryClient.invalidateQueries({ queryKey: ["car-images", viewCar.id] });
      toast.success("تم رفع الصورة بنجاح");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل رفع الصورة");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async (imageId: string) => {
    if (!viewCar) return;
    try {
      const { error } = await supabase.from("car_images").delete().eq("id", imageId);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ["car-images", viewCar.id] });
      setGalleryIndex(0);
      toast.success("تم حذف الصورة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف");
    }
  };

  // Read edit and notification parameters from URL
  const editId = searchParams.get("edit");
  const notificationId = searchParams.get("notification");

  const {
    data: cars,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapCar);
    },
  });

  // Open edit modal if ?edit=carId is in URL
  useEffect(() => {
    if (!editId || !cars || !isManager) return;
    const carToEdit = cars.find((c) => c.id === editId);
    if (!carToEdit) return;
    // Defer the setState to avoid cascading renders flagged by React Compiler
    const id = window.setTimeout(() => {
      setEditCar(carToEdit);
      window.history.replaceState({}, "", "/fleet");
    }, 0);
    return () => window.clearTimeout(id);
  }, [editId, cars, isManager]);

  const searchFn = useCallback(
    (car: Car, search: string) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        car.brand.toLowerCase().includes(q) ||
        car.model.toLowerCase().includes(q) ||
        car.plateNumber.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || car.status === statusFilter;
      return matchesSearch && matchesStatus;
    },
    [statusFilter],
  );

  const {
    search,
    setSearch,
    sortConfig,
    toggleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
  } = useTableState(cars, searchFn, "brand", "asc");

  const filtered = useMemo(() => {
    if (!cars) return [];
    return cars
      .filter((c) => searchFn(c, search))
      .sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aVal = a[sortConfig.key as keyof Car];
        const bVal = b[sortConfig.key as keyof Car];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [cars, search, sortConfig, searchFn]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const addMutation = useMutation({
    mutationFn: async (data: CarFormData) => {
      const { error } = await supabase
        .from("cars")
        .insert(toCarInsert(data as Partial<Car>) as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["available-cars"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["recent-rentals"] });
      toast.success("تمت إضافة السيارة بنجاح");
      setAddOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CarFormData }) => {
      const { error } = await supabase
        .from("cars")
        .update(toCarUpdate(data as Partial<Car>) as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["available-cars"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      toast.success("تم تعديل السيارة بنجاح");

      // Mark linked notification as read after successful save
      if (notificationId) {
        await supabase
          .from("notifications")
          .update({ is_read: true } as never)
          .eq("id", notificationId);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }

      setEditCar(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check for active rentals
      const { data: activeRentals, count } = await supabase
        .from("rentals")
        .select("id", { count: "exact", head: true })
        .eq("car_id", id)
        .in("status", ["active", "overdue", "reserved"]);

      if ((count ?? 0) > 0) {
        throw new Error("لا يمكن حذف السيارة — هناك كراءات نشطة أو متأخرة أو محجوزة عليها");
      }

      // Check for pending/in_progress maintenance
      const { count: maintCount } = await supabase
        .from("maintenance")
        .select("id", { count: "exact", head: true })
        .eq("car_id", id)
        .in("status", ["pending", "in_progress"]);

      if ((maintCount ?? 0) > 0) {
        throw new Error("لا يمكن حذف السيارة — هناك صيانة نشطة عليها");
      }

      // Delete related records first (completed rentals, tracking, maintenance)
      await supabase.from("tracking").delete().eq("car_id", id);
      await supabase.from("rentals").delete().eq("car_id", id);
      await supabase.from("maintenance").delete().eq("car_id", id);

      // Delete the car
      const { error } = await supabase.from("cars").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["available-cars"] });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["customer-stats"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-chart"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-cars"] });
      toast.success("تم حذف السيارة بنجاح");
      setDeleteCar(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleExport = () => {
    const exportData = filtered.map((c) => ({
      brand: c.brand,
      model: c.model,
      year: c.year,
      plateNumber: c.plateNumber,
      fuelType: c.fuelType,
      dailyRate: c.dailyRate,
      status: carStatusMap[c.status]?.label ?? c.status,
    }));
    exportToCSV(
      exportData,
      [
        { key: "brand", label: "الماركة" },
        { key: "model", label: "الطراز" },
        { key: "year", label: "السنة" },
        { key: "plateNumber", label: "اللوحة" },
        { key: "fuelType", label: "الوقود" },
        { key: "dailyRate", label: "السعر/يوم" },
        { key: "status", label: "الحالة" },
      ],
      "fleet-export",
    );
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <CarFront className="w-7 h-7 text-primary" /> الأسطول
        </h1>
        <ErrorState icon={CarFront} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <CarFront className="w-7 h-7 text-primary" /> الأسطول
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="md"
            iconLeft={<Download />}
            onClick={handleExport}
            disabled={!filtered.length}
          >
            تصدير CSV
          </Button>
          {isManager && (
            <Button
              size="md"
              iconLeft={<Plus />}
              onClick={() => setAddOpen(true)}
            >
              إضافة سيارة
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "", label: "الكل" },
          { key: "available", label: "متاحة" },
          { key: "rented", label: "مؤجرة" },
          { key: "maintenance", label: "صيانة" },
          { key: "out_of_service", label: "خارج الخدمة" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === f.key
                ? "bg-primary text-white"
                : "bg-surface/50 text-muted hover:bg-surface-hover border border-border"
            }`}
          >
            {f.label}
            {f.key && cars && (
              <span className="mr-1 opacity-70">
                ({cars.filter((c) => c.status === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "الإجمالي",
            value: cars?.length ?? 0,
            color: "text-foreground",
          },
          {
            label: "متاحة",
            value: cars?.filter((c) => c.status === "available").length ?? 0,
            color: "text-emerald-400",
          },
          {
            label: "مؤجرة",
            value: cars?.filter((c) => c.status === "rented").length ?? 0,
            color: "text-blue-400",
          },
          {
            label: "صيانة",
            value: cars?.filter((c) => c.status === "maintenance").length ?? 0,
            color: "text-amber-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-xl p-3 text-center animate-fade-in"
          >
            <p className="text-xs text-muted">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="بحث بالماركة أو الطراز أو اللوحة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-input/80 border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all duration-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-sm text-muted">{totalItems} سجل</div>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={8} />
              ))}
            </tbody>
          </table>
        ) : !filtered.length ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/10 mb-4">
              <CarFront className="w-8 h-8 text-muted" />
            </div>
            <p className="text-muted text-lg">لا توجد سيارات</p>
            <p className="text-muted text-sm mt-1">أضف سيارات للبدء</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 text-right bg-surface/50">
                    <th className="p-4">
                      <SortHeader
                        label="الماركة"
                        sortKey="brand"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="الطراز"
                        sortKey="model"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="السنة"
                        sortKey="year"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      اللوحة
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      الوقود
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="السعر/يوم"
                        sortKey="dailyRate"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="الحالة"
                        sortKey="status"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((car, i) => (
                    <tr
                      key={car.id}
                      className={`border-b border-border/30 hover:bg-surface-hover/50 transition-all duration-200 ${i % 2 === 0 ? "bg-transparent" : "bg-surface/30"}`}
                    >
                      <td className="p-4 text-sm font-medium">{car.brand}</td>
                      <td className="p-4 text-sm">{car.model}</td>
                      <td className="p-4 text-sm">{car.year}</td>
                      <td className="p-4 text-sm font-mono">
                        {car.plateNumber}
                      </td>
                      <td className="p-4 text-sm">{car.fuelType}</td>
                      <td className="p-4 text-sm font-medium text-primary">
                        {new Intl.NumberFormat("ar-DZ").format(car.dailyRate)}{" "}
                        DZD
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${carStatusMap[car.status]?.colorClass ?? "bg-muted/15 text-muted border-muted/30"}`}
                        >
                          {carStatusMap[car.status]?.label ?? car.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewCar(car)}
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isManager && (
                            <>
                              <button
                                onClick={() => setEditCar(car)}
                                className="p-2 text-muted hover:text-primary transition-all duration-200 rounded-lg hover:bg-primary/10"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteCar(car)}
                                className="p-2 text-muted hover:text-danger transition-all duration-200 rounded-lg hover:bg-danger/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border/30">
              {paginated.map((car) => (
                <div key={car.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {car.brand} {car.model}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {car.year} &bull; {car.plateNumber}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${carStatusMap[car.status]?.colorClass ?? ""}`}
                    >
                      {carStatusMap[car.status]?.label ?? car.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                      {car.fuelType} &bull; {car.seats} مقاعد
                    </span>
                    <span className="font-medium text-primary">
                      {new Intl.NumberFormat("ar-DZ").format(car.dailyRate)}{" "}
                      DZD/يوم
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setViewCar(car)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-surface/50 text-foreground hover:bg-surface-hover transition-all"
                    >
                      <Eye className="w-3 h-3" /> تفاصيل
                    </button>
                    {isManager && (
                      <>
                        <button
                          onClick={() => setEditCar(car)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                        >
                          <Pencil className="w-3 h-3" /> تعديل
                        </button>
                        <button
                          onClick={() => setDeleteCar(car)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-all"
                        >
                          <Trash2 className="w-3 h-3" /> حذف
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              setPageSize={setPageSize}
            />
          </>
        )}
      </Card>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="إضافة سيارة جديدة">
        <CarForm
          onSubmit={(data) => addMutation.mutate(data)}
          onCancel={() => setAddOpen(false)}
          isLoading={addMutation.isPending}
        />
      </Modal>

      <Modal
        open={!!editCar}
        onOpenChange={(open) => {
          if (!open) setEditCar(null);
        }}
        title="تعديل السيارة"
      >
        {editCar && (
          <CarForm
            defaultValues={{
              brand: editCar.brand,
              model: editCar.model,
              year: editCar.year,
              plateNumber: editCar.plateNumber,
              color: editCar.color,
              dailyRate: editCar.dailyRate,
              fuelType: editCar.fuelType,
              seats: editCar.seats,
              transmission: editCar.transmission ?? "manual",
              insuranceExpiry: editCar.insuranceExpiry ?? "",
              oilChangeExpiry: editCar.oilChangeExpiry ?? "",
              vignetteExpiry: editCar.vignetteExpiry ?? "",
              inspectionExpiry: editCar.inspectionExpiry ?? "",
            }}
            onSubmit={(data) => editMutation.mutate({ id: editCar.id, data })}
            onCancel={() => setEditCar(null)}
            isLoading={editMutation.isPending}
          />
        )}
      </Modal>

      <Modal
        open={!!deleteCar}
        onOpenChange={(open) => {
          if (!open) setDeleteCar(null);
        }}
        title="حذف السيارة"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            هل أنت متأكد من حذف السيارة{" "}
            <strong className="text-foreground">
              {deleteCar?.brand} {deleteCar?.model}
            </strong>
            ؟
          </p>
          <p className="text-xs text-warning bg-warning/10 p-3 rounded-lg">
            سيتم حذف السيارة وجميع البيانات المرتبطة بها (كراءات مكتملة، سجلات صيانة، تتبع) بشكل نهائي.
            لن يتم الحذف إذا كانت السيارة بها كراءات نشطة أو صيانة جارية.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteCar(null)}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deleteCar) deleteMutation.mutate(deleteCar.id);
              }}
            >
              حذف
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!viewCar}
        onOpenChange={(open) => {
          if (!open) setViewCar(null);
        }}
        title="تفاصيل السيارة"
      >
        {viewCar && (
          <div className="space-y-4">
            {/* Image Gallery */}
            <div className="rounded-xl overflow-hidden border border-border bg-surface">
              {carImages && carImages.length > 0 ? (
                <div className="relative group">
                  <img
                    src={carImages[galleryIndex]?.url}
                    alt={`${viewCar.brand} ${viewCar.model}`}
                    className="w-full h-48 object-cover"
                  />
                  {carImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setGalleryIndex((i) => (i - 1 + carImages.length) % carImages.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setGalleryIndex((i) => (i + 1) % carImages.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {carImages.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setGalleryIndex(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${idx === galleryIndex ? "bg-white w-4" : "bg-white/40"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {isManager && (
                    <button
                      onClick={() => handleImageDelete(carImages[galleryIndex].id)}
                      className="absolute top-2 left-2 w-7 h-7 rounded-full bg-danger/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="حذف الصورة"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-muted">
                  <CarFront className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-xs">لا توجد صور</p>
                </div>
              )}
              {isManager && (
                <label className="flex items-center justify-center gap-2 py-2 border-t border-border cursor-pointer hover:bg-surface-hover transition-colors text-xs text-muted">
                  {uploadingImage ? (
                    <span>جاري الرفع...</span>
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4" />
                      <span>إضافة صورة</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted">الماركة:</span>{" "}
                <span className="font-medium">{viewCar.brand}</span>
              </div>
              <div>
                <span className="text-muted">الطراز:</span>{" "}
                <span className="font-medium">{viewCar.model}</span>
              </div>
              <div>
                <span className="text-muted">السنة:</span>{" "}
                <span className="font-medium">{viewCar.year}</span>
              </div>
              <div>
                <span className="text-muted">اللوحة:</span>{" "}
                <span className="font-mono">{viewCar.plateNumber}</span>
              </div>
              <div>
                <span className="text-muted">اللون:</span>{" "}
                <span className="font-medium">{viewCar.color}</span>
              </div>
              <div>
                <span className="text-muted">الوقود:</span>{" "}
                <span className="font-medium">{viewCar.fuelType}</span>
              </div>
              <div>
                <span className="text-muted">المقاعد:</span>{" "}
                <span className="font-medium">{viewCar.seats}</span>
              </div>
              <div>
                <span className="text-muted">السعر/يوم:</span>{" "}
                <span className="font-medium text-primary">
                  {new Intl.NumberFormat("ar-DZ").format(viewCar.dailyRate)} DZD
                </span>
              </div>
              <div>
                <span className="text-muted">القير:</span>{" "}
                <span className="font-medium">
                  {viewCar.transmission === "automatic" ? "أوتوماتيكي" : "يدوي"}
                </span>
              </div>
              <div>
                <span className="text-muted">انتهاء التأمين:</span>{" "}
                <span className={`font-medium ${viewCar.insuranceExpiry && now15 && new Date(viewCar.insuranceExpiry) < now15 ? "text-danger" : ""}`}>
                  {viewCar.insuranceExpiry ?? "غير محدد"}
                </span>
              </div>
              <div>
                <span className="text-muted">انتهاء تبديل الزيت:</span>{" "}
                <span className={`font-medium ${viewCar.oilChangeExpiry && now15 && new Date(viewCar.oilChangeExpiry) < now15 ? "text-danger" : ""}`}>
                  {viewCar.oilChangeExpiry ?? "غير محدد"}
                </span>
              </div>
              <div>
                <span className="text-muted">انتهاء Vignette:</span>{" "}
                <span className={`font-medium ${viewCar.vignetteExpiry && now15 && new Date(viewCar.vignetteExpiry) < now15 ? "text-danger" : ""}`}>
                  {viewCar.vignetteExpiry ?? "غير محدد"}
                </span>
              </div>
              <div>
                <span className="text-muted">الفحص التقني:</span>{" "}
                <span className={`font-medium ${viewCar.inspectionExpiry && now15 && new Date(viewCar.inspectionExpiry) < now15 ? "text-danger" : ""}`}>
                  {viewCar.inspectionExpiry ?? "غير محدد"}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setViewCar(null);
                  setEditCar(viewCar);
                }}
              >
                تعديل
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewCar(null)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
