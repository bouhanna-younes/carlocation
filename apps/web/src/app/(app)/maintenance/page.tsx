"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapMaintenance, mapCar, type MaintenanceRecord, type Car } from "@/lib/mappers";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SortHeader } from "@/components/shared/sort-header";
import { Pagination } from "@/components/shared/pagination";
import { SkeletonRow } from "@/components/shared/skeleton-row";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  Plus,
  Search,
  Wrench,
  CheckCircle,
  Download,
  X,
  PlayCircle,
  Ban,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTableState } from "@/hooks/use-table-state";
import {
  inputClass,
  maintenanceStatusMap,
  maintenanceTypeMap,
  priorityMap,
} from "@/lib/constants";
import { exportToCSV } from "@/lib/export-csv";

const maintenanceSchema = z.object({
  carId: z.string().min(1, "السيارة مطلوبة"),
  type: z.string().min(1, "نوع الصيانة مطلوب"),
  description: z.string().min(1, "الوصف مطلوب"),
  cost: z.coerce.number().min(0, "التكلفة يجب أن تكون موجبة"),
  scheduledAt: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  vendorName: z.string().optional().or(z.literal("")),
  vendorPhone: z.string().optional().or(z.literal("")),
});

type MaintenanceFormData = z.input<typeof maintenanceSchema>;

function MaintenanceForm({
  cars,
  onSubmit,
  onCancel,
  isLoading,
}: {
  cars: Car[];
  onSubmit: (data: MaintenanceFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      carId: "",
      type: "",
      description: "",
      cost: 0,
      scheduledAt: "",
      priority: "medium",
      vendorName: "",
      vendorPhone: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          السيارة
        </label>
        <select {...register("carId")} className={inputClass}>
          <option value="">اختر السيارة</option>
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.brand} {car.model} ({car.plateNumber})
            </option>
          ))}
        </select>
        {errors.carId && (
          <p className="text-xs text-danger mt-1">{errors.carId.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          نوع الصيانة
        </label>
        <select {...register("type")} className={inputClass}>
          <option value="">اختر النوع</option>
          <option value="oil_change">تغيير زيت</option>
          <option value="brake_service">فرامل</option>
          <option value="tire_rotation">إطارات</option>
          <option value="engine_repair">محرّك</option>
          <option value="inspection">فحص</option>
          <option value="other">أخرى</option>
        </select>
        {errors.type && (
          <p className="text-xs text-danger mt-1">{errors.type.message}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          الوصف
        </label>
        <textarea
          {...register("description")}
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="وصف تفاصيل الصيانة..."
        />
        {errors.description && (
          <p className="text-xs text-danger mt-1">
            {errors.description.message}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            التكلفة (DZD)
          </label>
          <input type="number" {...register("cost")} className={inputClass} />
          {errors.cost && (
            <p className="text-xs text-danger mt-1">{errors.cost.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            التاريخ المقرر
          </label>
          <input
            type="date"
            {...register("scheduledAt")}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            الأولوية
          </label>
          <select {...register("priority")} className={inputClass}>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="critical">حرجة</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            اسم الورشة (اختياري)
          </label>
          <input
            {...register("vendorName")}
            className={inputClass}
            placeholder="اسم الورشة أو الفني"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          هاتف الورشة (اختياري)
        </label>
        <input
          {...register("vendorPhone")}
          className={inputClass}
          placeholder="0550123456"
          dir="ltr"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={onCancel} variant="outline">
          إلغاء
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
    </form>
  );
}

export default function MaintenancePage() {
  const [addOpen, setAddOpen] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const queryClient = useQueryClient();

  const {
    data: records,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance")
        .select("*, car:cars(*)")
        .order("created_at", { ascending: false })
        .returns<any[]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapMaintenance);
    },
  });

  const { data: cars } = useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<any[]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapCar);
    },
  });

  const searchFn = useCallback(
    (r: MaintenanceRecord, search: string) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        !!(r.carBrand && r.carBrand.toLowerCase().includes(q)) ||
        !!(r.carModel && r.carModel.toLowerCase().includes(q)) ||
        r.type.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || r.status === statusFilter;
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
    paginatedItems,
  } = useTableState(records, searchFn, "scheduledAt", "desc");

  const sorted = useMemo(() => {
    if (!records) return [];
    const items = records.filter((r) => searchFn(r, search));
    if (!sortConfig.key) return items;
    return [...items].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof MaintenanceRecord];
      const bVal = b[sortConfig.key as keyof MaintenanceRecord];
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
  }, [records, search, sortConfig, searchFn]);

  const paginated = paginatedItems(sorted);

  const addMutation = useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      const { error } = await supabase.from("maintenance").insert({
        car_id: data.carId,
        type: data.type,
        description: data.description,
        cost: data.cost,
        scheduled_at: data.scheduledAt || null,
        priority: data.priority,
        vendor_name: data.vendorName || null,
        vendor_phone: data.vendorPhone || null,
      } as any);
      if (error) throw new Error(error.message);

      // Update car status to maintenance
      await (supabase
        .from("cars") as any)
        .update({ status: "maintenance" })
        .eq("id", data.carId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success("تمت إضافة سجل الصيانة بنجاح");
      setAddOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const record = records?.find((r) => r.id === id);
      const { error } = await (supabase
        .from("maintenance") as any)
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);

      // Check if car has other active maintenance
      if (record?.carId) {
        const { count: otherActive } = await supabase
          .from("maintenance")
          .select("id", { count: "exact", head: true })
          .eq("car_id", record.carId)
          .in("status", ["pending", "in_progress"])
          .neq("id", id);

        if ((otherActive ?? 0) === 0) {
          await (supabase
            .from("cars") as any)
            .update({ status: "available" })
            .eq("id", record.carId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success("تم إتمام الصيانة بنجاح");
      setConfirmComplete(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      const record = records?.find((r) => r.id === id);
      const { error } = await (supabase
        .from("maintenance") as any)
        .update({ status: "in_progress" })
        .eq("id", id);
      if (error) throw new Error(error.message);

      // Update car status to maintenance
      if (record?.carId) {
        await (supabase
          .from("cars") as any)
          .update({ status: "maintenance" })
          .eq("id", record.carId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast.success("تم بدء الصيانة");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const record = records?.find((r) => r.id === id);
      const { error } = await (supabase
        .from("maintenance") as any)
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw new Error(error.message);

      // Check if car has other active maintenance
      if (record?.carId) {
        const { count: otherActive } = await supabase
          .from("maintenance")
          .select("id", { count: "exact", head: true })
          .eq("car_id", record.carId)
          .in("status", ["pending", "in_progress"])
          .neq("id", id);

        if ((otherActive ?? 0) === 0) {
          await (supabase
            .from("cars") as any)
            .update({ status: "available" })
            .eq("id", record.carId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success("تم إلغاء الصيانة");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleExport = () => {
    const exportData = sorted.map((r) => ({
      carBrand: r.carBrand,
      carModel: r.carModel,
      type: r.type,
      description: r.description,
      cost: r.cost,
      scheduledAt: r.scheduledAt,
      status: maintenanceStatusMap[r.status]?.label ?? r.status,
    }));
    exportToCSV(
      exportData,
      [
        { key: "carBrand", label: "ماركة السيارة" },
        { key: "carModel", label: "طراز السيارة" },
        { key: "type", label: "النوع" },
        { key: "description", label: "الوصف" },
        { key: "cost", label: "التكلفة" },
        { key: "scheduledAt", label: "التاريخ" },
        { key: "status", label: "الحالة" },
      ],
      "maintenance-export",
    );
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Wrench className="w-7 h-7 text-primary" /> الصيانة
        </h1>
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Wrench className="w-7 h-7 text-primary" /> الصيانة
        </h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExport}
            disabled={!sorted.length}
            variant="outline"
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            إضافة صيانة
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "", label: "الكل" },
          { key: "pending", label: "معلّق" },
          { key: "in_progress", label: "قيد التنفيذ" },
          { key: "completed", label: "مكتمل" },
          { key: "cancelled", label: "ملغى" },
        ].map((f) => {
          const count = f.key
            ? (records?.filter((r) => r.status === f.key).length ?? 0)
            : (records?.length ?? 0);
          return (
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
              <span className="mr-1 opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="بحث بالسيارة أو النوع..."
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

      <div className="glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={6} />
              ))}
            </tbody>
          </table>
        ) : !sorted.length ? (
          <EmptyState
            icon={Wrench}
            title="لا توجد سجلات صيانة"
            description="أضف سجل صيانة للبدء"
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 text-right bg-surface/50">
                    <th className="p-4">
                      <SortHeader
                        label="السيارة"
                        sortKey="carBrand"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="النوع"
                        sortKey="type"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      الوصف
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="التكلفة"
                        sortKey="cost"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      التاريخ
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
                      إجراء
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, i) => {
                    const isOverdue =
                      r.status !== "completed" &&
                      r.scheduledAt &&
                      new Date(r.scheduledAt) < new Date();
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-border/30 hover:bg-surface-hover/50 transition-all duration-200 ${isOverdue ? "bg-red-500/[0.04]" : i % 2 === 0 ? "bg-transparent" : "bg-surface/30"}`}
                      >
                        <td className="p-4 text-sm font-medium">
                          {r.carBrand} {r.carModel}
                        </td>
                        <td className="p-4 text-sm">
                          {maintenanceTypeMap[r.type] ?? r.type}
                        </td>
                        <td className="p-4 text-sm text-muted max-w-xs truncate">
                          {r.description}
                        </td>
                        <td className="p-4 text-sm font-medium text-primary">
                          {new Intl.NumberFormat("ar-DZ").format(r.cost)} DZD
                        </td>
                        <td className="p-4 text-sm">{r.scheduledAt}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${maintenanceStatusMap[r.status]?.colorClass ?? "bg-muted/15 text-muted border-muted/30"}`}
                          >
                            {maintenanceStatusMap[r.status]?.label ?? r.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {r.status === "pending" && (
                              <Button
                                onClick={() => startMutation.mutate(r.id)}
                                disabled={startMutation.isPending}
                                variant="ghost"
                                size="sm"
                                title="بدء التنفيذ"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {(r.status === "pending" ||
                              r.status === "in_progress") && (
                              <>
                                <Button
                                  onClick={() => setConfirmComplete(r.id)}
                                  disabled={completeMutation.isPending}
                                  variant="ghost"
                                  size="sm"
                                  title="إتمام"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        "هل أنت متأكد من إلغاء هذه الصيانة؟",
                                      )
                                    )
                                      cancelMutation.mutate(r.id);
                                  }}
                                  disabled={cancelMutation.isPending}
                                  variant="ghost"
                                  size="sm"
                                  title="إلغاء"
                                >
                                  <Ban className="w-3.5 h-3.5 text-danger" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border/30">
              {paginated.map((r) => {
                const isOverdue =
                  r.status !== "completed" &&
                  r.scheduledAt &&
                  new Date(r.scheduledAt) < new Date();
                return (
                  <div
                    key={r.id}
                    className={`p-4 space-y-3 ${isOverdue ? "bg-red-500/[0.04]" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {r.carBrand} {r.carModel}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {maintenanceTypeMap[r.type] ?? r.type}{" "}
                          {r.priority && priorityMap[r.priority]
                            ? `• ${priorityMap[r.priority].label}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${maintenanceStatusMap[r.status]?.colorClass ?? ""}`}
                      >
                        {maintenanceStatusMap[r.status]?.label ?? r.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted line-clamp-2">
                      {r.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{r.scheduledAt}</span>
                      <span className="font-medium text-primary">
                        {new Intl.NumberFormat("ar-DZ").format(r.cost)} DZD
                      </span>
                    </div>
                    {(r.status === "pending" || r.status === "in_progress") && (
                      <div className="flex gap-2">
                        {r.status === "pending" && (
                          <Button
                            onClick={() => startMutation.mutate(r.id)}
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                          >
                            <PlayCircle className="w-3 h-3" /> بدء
                          </Button>
                        )}
                        <Button
                          onClick={() => setConfirmComplete(r.id)}
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                        >
                          <CheckCircle className="w-3 h-3" /> إتمام
                        </Button>
                        <Button
                          onClick={() => {
                            if (confirm("هل أنت متأكد من إلغاء هذه الصيانة؟"))
                              cancelMutation.mutate(r.id);
                          }}
                          variant="danger"
                          size="sm"
                          className="flex-1"
                        >
                          <Ban className="w-3 h-3" /> إلغاء
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Costs Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border/50 bg-surface/30">
              <span className="text-sm text-muted">إجمالي التكاليف (المكتملة)</span>
              <span className="text-sm font-bold text-primary">
                {new Intl.NumberFormat("ar-DZ").format(
                  sorted
                    .filter((r) => r.status === "completed")
                    .reduce((sum, r) => sum + r.cost, 0),
                )}{" "}
                DZD
              </span>
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
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="إضافة سجل صيانة">
        {cars && (
          <MaintenanceForm
            cars={cars}
            onSubmit={(data) => addMutation.mutate(data)}
            onCancel={() => setAddOpen(false)}
            isLoading={addMutation.isPending}
          />
        )}
      </Modal>

      <Modal
        open={!!confirmComplete}
        onOpenChange={(open) => {
          if (!open) setConfirmComplete(null);
        }}
        title="إتمام الصيانة"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            هل أنت متأكد من إتمام هذه الصيانة؟
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirmComplete(null)} variant="outline">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (confirmComplete) completeMutation.mutate(confirmComplete);
              }}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "جاري الإتمام..." : "إتمام"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
