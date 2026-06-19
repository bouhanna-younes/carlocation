"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapRental, mapCustomer, mapAvailableCar, type Rental, type Customer, type AvailableCar } from "@/lib/mappers";
import { createRentalNotification } from "@/lib/notifications";
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
  KeyRound,
  RotateCcw,
  Pencil,
  Ban,
  Download,
  X,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTableState } from "@/hooks/use-table-state";
import { inputClass, rentalStatusMap } from "@/lib/constants";
import { exportToCSV } from "@/lib/export-csv";
import { useRealtime } from "@/hooks/use-realtime";
import {
  RentalForm,
  editRentalSchema,
  cancelSchema,
  type RentalFormData,
  type EditRentalFormData,
  type CancelFormData,
} from "./rental-forms";

export default function RentalsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [returnRental, setReturnRental] = useState<Rental | null>(null);
  const [editRental, setEditRental] = useState<Rental | null>(null);
  const [cancelRental, setCancelRental] = useState<Rental | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const queryClient = useQueryClient();

  // Realtime updates
  useRealtime("rentals");
  useRealtime("cars");
  useRealtime("notifications");

  // Mark overdue rentals via server-side RPC (runs once on mount, not inside queryFn)
  useEffect(() => {
    supabase.rpc("mark_overdue_rentals").then(({ error }) => {
      if (error) console.error("mark_overdue_rentals failed:", error.message);
      else queryClient.invalidateQueries({ queryKey: ["rentals"] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    data: rentals,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["rentals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select("*, customer:customers(*), car:cars(*)")
        .order("created_at", { ascending: false })
        .returns<Parameters<typeof mapRental>[0][]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapRental);
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<Parameters<typeof mapCustomer>[0][]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapCustomer);
    },
  });

  const { data: availableCars } = useQuery({
    queryKey: ["available-cars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .returns<Parameters<typeof mapAvailableCar>[0][]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapAvailableCar);
    },
  });

  const searchFn = useCallback(
    (r: Rental, search: string) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        !!(r.customerName && r.customerName.toLowerCase().includes(q)) ||
        !!(r.carBrand && r.carBrand.toLowerCase().includes(q)) ||
        !!(r.carModel && r.carModel.toLowerCase().includes(q));
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
  } = useTableState(rentals, searchFn, "startDate", "desc");

  const sorted = useMemo(() => {
    if (!rentals) return [];
    const items = rentals.filter((r) => searchFn(r, search));
    if (!sortConfig.key) return items;
    return [...items].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Rental];
      const bVal = b[sortConfig.key as keyof Rental];
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
  }, [rentals, search, sortConfig, searchFn]);

  const paginated = paginatedItems(sorted);

  const addMutation = useMutation({
    mutationFn: async (data: RentalFormData) => {
      // Check if customer's license expires within 30 days
      const { data: custData } = await supabase
        .from("customers")
        .select("driver_license_expiry")
        .eq("id", data.customerId)
        .single();
      const customer = custData as { driver_license_expiry: string | null } | null;

      if (customer?.driver_license_expiry) {
        const expiryDate = new Date(customer.driver_license_expiry);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        if (expiryDate <= thirtyDaysFromNow) {
          throw new Error("رخصة القيادة منتهية أو ستنتهي خلال 30 يوماً — لا يمكن إنشاء التأجير");
        }
      }

      // Check for date overlap on the same car
      const { data: overlapping, count: overlapCount } = await supabase
        .from("rentals")
        .select("id", { count: "exact", head: true })
        .eq("car_id", data.carId)
        .in("status", ["active", "overdue", "reserved"])
        .lt("start_date", data.endDate)
        .gt("end_date", data.startDate);

      if ((overlapCount ?? 0) > 0) {
        throw new Error("السيارة محجوزة في هذه الفترة بالفعل");
      }

      const selectedCar = availableCars?.find((c) => c.id === data.carId);
      const dailyRate = (data.dailyRate as number) || selectedCar?.dailyRate || 0;
      const discount = (data.discountPercent as number) || 0;
      const effectiveRate = Math.round(dailyRate * (1 - discount / 100));
      const days = Math.max(
        1,
        Math.ceil(
          (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86400000,
        ),
      );
      const totalAmount = days * effectiveRate;
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("rentals").insert({
        customer_id: data.customerId,
        car_id: data.carId,
        renter_id: userData.user?.id ?? "",
        start_date: data.startDate,
        end_date: data.endDate,
        daily_rate: dailyRate,
        total_amount: totalAmount,
        deposit_amount: data.depositAmount || 0,
        start_mileage: data.startMileage ?? 0,
        notes: data.notes || null,
        discount_percent: discount || null,
        discount_reason: data.discountReason || null,
      } as never);
      if (error) throw new Error(error.message);
      await supabase
        .from("cars")
        .update({ status: "rented" } as never)
        .eq("id", data.carId);

      // Fetch car and customer names for notification
      const { data: carRow } = await supabase
        .from("cars")
        .select("brand, model")
        .eq("id", data.carId)
        .single();
      const { data: custRow } = await supabase
        .from("customers")
        .select("first_name, last_name")
        .eq("id", data.customerId)
        .single();

      const carInfo = carRow as { brand: string; model: string } | null;
      const custInfo = custRow as { first_name: string; last_name: string } | null;

      const carName = carInfo ? `${carInfo.brand} ${carInfo.model}` : "";
      const custName = custInfo
        ? `${custInfo.first_name} ${custInfo.last_name}`
        : "";

      await createRentalNotification(
        "rental_created",
        `${custName} — ${carName}`,
        `تم إنشاء كراء جديد للعميل ${custName} للسيارة ${carName}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["available-cars"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["recent-rentals"] });
      toast.success("تم إنشاء الكراء بنجاح");
      setAddOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const returnMutation = useMutation({
    mutationFn: async (id: string) => {
      const rental = rentals?.find((r) => r.id === id);
      if (!rental) throw new Error("الكراء غير موجود");

      // Calculate fractional days for accurate billing
      const now = new Date();
      const startDate = new Date(rental.startDate);
      const elapsedMs = now.getTime() - startDate.getTime();
      const elapsedDays = elapsedMs / 86400000;

      // Full days used (for billing)
      const usedDays = Math.max(1, Math.ceil(elapsedDays));
      const finalAmount = usedDays * rental.dailyRate;

      // 1. Update the rental
      const { error } = await supabase.from("rentals")
        .update({
          status: "completed",
          return_date: now.toISOString(),
          total_amount: finalAmount,
          end_mileage: null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);

      // 2. Update the invoice directly (fallback if DB trigger not deployed)
      const { error: invError } = await supabase
        .from("invoices")
        .update({
          return_date: now.toISOString(),
          total_days: usedDays,
          total_amount: finalAmount,
        } as never)
        .eq("rental_id", id);
      if (invError) {
        console.error("Invoice update failed (trigger may handle it):", invError.message);
      }

      // 3. Set car status back to available
      if (rental?.carId) {
        await supabase.from("cars")
          .update({ status: "available" } as never)
          .eq("id", rental.carId);
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["available-cars"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["recent-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-chart"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      // Create return notification
      if (returnRental?.carId) {
        const { data: carRow } = await supabase
          .from("cars")
          .select("brand, model")
          .eq("id", returnRental.carId)
          .single();
        const carData = carRow as { brand: string; model: string } | null;
        const carName = carData
          ? `${carData.brand} ${carData.model}`
          : returnRental.carBrand || "";
        await createRentalNotification(
          "rental_returned",
          carName,
          `تم إرجاع السيارة ${carName}`,
        );
      }

      toast.success("تم إرجاع السيارة بنجاح");
      setReturnRental(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const rental = rentals?.find((r) => r.id === id);
      if (!rental) throw new Error("الكراء غير موجود");

      // Calculate fractional days for accurate billing
      const now = new Date();
      const startDate = new Date(rental.startDate);
      const elapsedMs = now.getTime() - startDate.getTime();
      const elapsedDays = elapsedMs / 86400000;

      // Full days used (for billing) + 35% penalty
      const usedDays = Math.max(1, Math.ceil(elapsedDays));
      const usedAmount = usedDays * rental.dailyRate;
      const penaltyPercent = 35;
      const penaltyAmount = Math.round(usedAmount * (penaltyPercent / 100));
      const totalAmount = usedAmount + penaltyAmount;

      const notes = reason
        ? `ملغى: ${reason} | استُخدم ${usedDays} يوم | غرامة 35%: ${penaltyAmount} DZD`
        : `استُخدم ${usedDays} يوم | غرامة 35%: ${penaltyAmount} DZD`;

      // 1. Update the rental
      const { error } = await supabase.from("rentals")
        .update({
          status: "cancelled",
          total_amount: totalAmount,
          notes,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);

      // 2. Update the invoice directly (fallback if DB trigger not deployed)
      const refundAmount = Math.max(0, (rental.depositAmount ?? 0) - penaltyAmount);
      const { error: invError } = await supabase
        .from("invoices")
        .update({
          is_cancelled: true,
          cancelled_at: now.toISOString(),
          penalty_percent: penaltyPercent,
          penalty_amount: penaltyAmount,
          refund_amount: refundAmount,
          total_amount: totalAmount,
          status: "cancelled",
        } as never)
        .eq("rental_id", id);
      if (invError) {
        console.error("Invoice cancel update failed (trigger may handle it):", invError.message);
      }

      // 3. Set car status back to available
      if (rental?.carId) {
        await supabase.from("cars")
          .update({ status: "available" } as never)
          .eq("id", rental.carId);
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["available-cars"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["recent-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      // Create cancel notification
      if (cancelRental?.carId) {
        const { data: carRow } = await supabase
          .from("cars")
          .select("brand, model")
          .eq("id", cancelRental.carId)
          .single();
        const carData = carRow as { brand: string; model: string } | null;
        const carName = carData
          ? `${carData.brand} ${carData.model}`
          : cancelRental.carBrand || "";
        await createRentalNotification(
          "rental_cancelled",
          carName,
          `تم إلغاء كراء السيارة ${carName}`,
        );
      }

      toast.success("تم إلغاء الكراء بنجاح");
      setCancelRental(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      startDate?: string;
      endDate?: string;
      notes?: string;
    }) => {
      const update: Record<string, unknown> = {};
      if (data.startDate) update.start_date = data.startDate;
      if (data.endDate) update.end_date = data.endDate;
      if (data.notes !== undefined) update.notes = data.notes;
      const { error } = await supabase.from("rentals")
        .update(update)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success("تم تعديل الكراء بنجاح");
      setEditRental(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleExport = () => {
    const exportData = sorted.map((r) => ({
      customerName: r.customerName ?? "",
      carBrand: r.carBrand,
      carModel: r.carModel,
      startDate: r.startDate,
      endDate: r.endDate,
      totalAmount: r.totalAmount,
      status: rentalStatusMap[r.status]?.label ?? r.status,
    }));
    exportToCSV(
      exportData,
      [
        { key: "customerName", label: "العميل" },
        { key: "carBrand", label: "ماركة السيارة" },
        { key: "carModel", label: "طراز السيارة" },
        { key: "startDate", label: "تاريخ البداية" },
        { key: "endDate", label: "تاريخ النهاية" },
        { key: "totalAmount", label: "المبلغ" },
        { key: "status", label: "الحالة" },
      ],
      "rentals-export",
    );
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <KeyRound className="w-7 h-7 text-primary" /> الكراء
        </h1>
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <KeyRound className="w-7 h-7 text-primary" /> الكراء
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!sorted.length}
            iconLeft={<Download className="w-4 h-4" />}
          >
            تصدير CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            iconLeft={<Plus className="w-4 h-4" />}
          >
            إنشاء كراء
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "", label: "الكل" },
          { key: "active", label: "نشط" },
          { key: "overdue", label: "متأخر" },
          { key: "completed", label: "مكتمل" },
          { key: "cancelled", label: "ملغى" },
        ].map((f) => {
          const count = f.key
            ? (rentals?.filter((r) => r.status === f.key).length ?? 0)
            : (rentals?.length ?? 0);
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
            placeholder="بحث بالعميل أو السيارة..."
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
                <SkeletonRow key={i} columns={7} />
              ))}
            </tbody>
          </table>
        ) : !sorted.length ? (
          <EmptyState
            icon={KeyRound}
            title="لا توجد حجوزات"
            description="أنشئ كراء جديد للبدء"
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
                        label="العميل"
                        sortKey="customerName"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
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
                        label="من"
                        sortKey="startDate"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">إلى</th>
                    <th className="p-4 text-sm font-medium text-muted">
                      المتبقي
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="المبلغ"
                        sortKey="totalAmount"
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
                      إجراء
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`border-b border-border/30 hover:bg-surface-hover/50 transition-all duration-200 ${
                        r.status === "overdue"
                          ? "bg-red-500/[0.04]"
                          : i % 2 === 0
                            ? "bg-transparent"
                            : "bg-surface/30"
                      }`}
                    >
                      <td className="p-4 text-sm font-medium">
                        {r.customerName ?? "—"}
                      </td>
                      <td className="p-4 text-sm">
                        {r.carBrand} {r.carModel}
                      </td>
                      <td className="p-4 text-sm">
                        {new Date(r.startDate).toLocaleDateString("ar-DZ", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4 text-sm">
                        {new Date(r.endDate).toLocaleDateString("ar-DZ", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4 text-sm">
                        {r.status === "active" ? (
                          (() => {
                            const days = Math.ceil(
                              (new Date(r.endDate).getTime() - Date.now()) /
                                86400000,
                            );
                            return (
                              <span
                                className={
                                  days <= 2
                                    ? "text-warning font-medium"
                                    : "text-muted"
                                }
                              >
                                {Math.max(0, days)} يوم
                              </span>
                            );
                          })()
                        ) : r.status === "overdue" ? (
                          <span className="text-danger font-medium">متأخر</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="p-4 text-sm font-medium text-primary">
                        {new Intl.NumberFormat("ar-DZ").format(r.totalAmount)}{" "}
                        DZD
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${rentalStatusMap[r.status]?.colorClass ?? "bg-muted/15 text-muted border-muted/30"}`}
                        >
                          {rentalStatusMap[r.status]?.label ?? r.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {(r.status === "active" || r.status === "overdue") && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditRental(r)}
                              iconLeft={<Pencil className="w-3.5 h-3.5" />}
                            >
                              تعديل
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setReturnRental(r)}
                              iconLeft={<RotateCcw className="w-3.5 h-3.5" />}
                            >
                              إرجاع
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setCancelRental(r)}
                              iconLeft={<Ban className="w-3.5 h-3.5" />}
                            >
                              إلغاء
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/50 bg-surface/30">
                    <td
                      colSpan={5}
                      className="p-3 text-sm font-medium text-muted text-left"
                    >
                      الإجمالي
                    </td>
                    <td className="p-3 text-sm font-bold text-primary">
                      {new Intl.NumberFormat("ar-DZ").format(
                        sorted
                          .filter((r) => r.status !== "cancelled")
                          .reduce((sum, r) => sum + (r.totalAmount ?? 0), 0),
                      )}{" "}
                      DZD
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border/30">
              {paginated.map((r) => (
                <div
                  key={r.id}
                  className={`p-4 space-y-3 ${r.status === "overdue" ? "bg-red-500/[0.04]" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {r.customerName ?? "—"}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {r.carBrand} {r.carModel}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${rentalStatusMap[r.status]?.colorClass ?? ""}`}
                    >
                      {rentalStatusMap[r.status]?.label ?? r.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                      {new Date(r.startDate).toLocaleDateString("ar-DZ", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      -{" "}
                      {new Date(r.endDate).toLocaleDateString("ar-DZ", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="font-medium text-primary">
                      {new Intl.NumberFormat("ar-DZ").format(r.totalAmount)} DZD
                    </span>
                  </div>
                  {(r.status === "active" || r.status === "overdue") && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditRental(r)}
                        iconLeft={<Pencil className="w-3 h-3" />}
                      >
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setReturnRental(r)}
                        iconLeft={<RotateCcw className="w-3 h-3" />}
                      >
                        إرجاع
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        onClick={() => setCancelRental(r)}
                        iconLeft={<Ban className="w-3 h-3" />}
                      >
                        إلغاء
                      </Button>
                    </div>
                  )}
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
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="كراء جديد">
        {customers && availableCars ? (
          <RentalForm
            customers={customers}
            availableCars={availableCars}
            onSubmit={(data) => addMutation.mutate(data)}
            onCancel={() => setAddOpen(false)}
            isLoading={addMutation.isPending}
          />
        ) : (
          <div className="space-y-4 py-8">
            <div className="h-10 bg-surface-hover rounded-xl animate-pulse" />
            <div className="h-10 bg-surface-hover rounded-xl animate-pulse" />
            <p className="text-center text-muted text-sm">جاري التحميل...</p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!returnRental}
        onOpenChange={(open) => {
          if (!open) setReturnRental(null);
        }}
        title="إرجاع السيارة"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            هل أنت متأكد من إرجاع السيارة في كراء{" "}
            <strong className="text-foreground">
              {returnRental?.carBrand} {returnRental?.carModel}
            </strong>{" "}
            للعميل{" "}
            <strong className="text-foreground">
              {returnRental?.customerName}
            </strong>
            ؟
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReturnRental(null)}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (returnRental) returnMutation.mutate(returnRental.id);
              }}
              disabled={returnMutation.isPending}
              loading={returnMutation.isPending}
            >
              {returnMutation.isPending ? "جاري الإرجاع..." : "إرجاع"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!cancelRental}
        onOpenChange={(open) => {
          if (!open) setCancelRental(null);
        }}
        title="إلغاء الكراء"
      >
        <CancelForm
          onSubmit={(data) => {
            if (cancelRental)
              cancelMutation.mutate({
                id: cancelRental.id,
                reason: data.reason,
              });
          }}
          onCancel={() => setCancelRental(null)}
          isLoading={cancelMutation.isPending}
        />
      </Modal>

      <Modal
        open={!!editRental}
        onOpenChange={(open) => {
          if (!open) setEditRental(null);
        }}
        title="تعديل الكراء"
      >
        {editRental && (
          <EditRentalForm
            rental={editRental}
            onSubmit={(data) =>
              editMutation.mutate({ id: editRental.id, ...data })
            }
            onCancel={() => setEditRental(null)}
            isLoading={editMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

function CancelForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: CancelFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<CancelFormData>({
    resolver: zodResolver(cancelSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted">
        هل أنت متأكد من إلغاء هذا الكراء؟ لا يمكن التراجع عن هذا الإجراء.
      </p>
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          سبب الإلغاء (اختياري)
        </label>
        <input
          type="text"
          {...register("reason")}
          placeholder="أدخل سبب الإلغاء..."
          className={inputClass}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          إلغاء
        </Button>
        <Button
          type="submit"
          variant="danger"
          size="sm"
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
        </Button>
      </div>
    </form>
  );
}

function EditRentalForm({
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
      notes: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          {isLoading ? "جاري الحفظ..." : "حفظ التعديلات"}
        </Button>
      </div>
    </form>
  );
}
