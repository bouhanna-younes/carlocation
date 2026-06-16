"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapCustomer, toCustomerInsert, toCustomerUpdate, type Customer } from "@/lib/mappers";
import { useRole } from "@/hooks/use-role";
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
  Users,
  Pencil,
  Trash2,
  Download,
  X,
  Eye,
  AlertTriangle,
  RotateCcw,
  Ban,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTableState } from "@/hooks/use-table-state";
import { inputClass } from "@/lib/constants";
import { exportToCSV } from "@/lib/export-csv";

const customerSchema = z.object({
  firstName: z
    .string()
    .min(2, "الاسم الأول يجب أن يكون على الأقل 2 أحرف")
    .max(50, "الحد الأقصى 50 حرف"),
  lastName: z
    .string()
    .min(2, "اسم العائلة يجب أن يكون على الأقل 2 أحرف")
    .max(50, "الحد الأقصى 50 حرف"),
  email: z
    .string()
    .email("البريد الإلكتروني غير صالح")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(1, "رقم الهاتف مطلوب")
    .regex(
      /^(0[5-7]\d{8}|(\+213)[5-7]\d{8})$/,
      "رقم الهاتف يجب أن يكون جزائري (05/06/07 أو +213)",
    ),
  idNumber: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  driverLicenseNumber: z.string().optional().or(z.literal("")),
  driverLicenseExpiry: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  emergencyContactName: z.string().optional().or(z.literal("")),
  emergencyContactPhone: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type CustomerFormData = z.input<typeof customerSchema>;

function CustomerForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
}: {
  defaultValues?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues ?? {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      idNumber: "",
      address: "",
      driverLicenseNumber: "",
      driverLicenseExpiry: "",
      dateOfBirth: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            الاسم الأول
          </label>
          <input
            {...register("firstName")}
            className={inputClass}
            placeholder="مثال: أحمد"
          />
          {errors.firstName && (
            <p className="text-xs text-danger mt-1">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            اسم العائلة
          </label>
          <input
            {...register("lastName")}
            className={inputClass}
            placeholder="مثال: بن علي"
          />
          {errors.lastName && (
            <p className="text-xs text-danger mt-1">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            رقم الهاتف
          </label>
          <input
            {...register("phone")}
            className={inputClass}
            placeholder="مثال: 0550123456"
            dir="ltr"
          />
          {errors.phone && (
            <p className="text-xs text-danger mt-1">{errors.phone.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            البريد الإلكتروني (اختياري)
          </label>
          <input
            type="email"
            {...register("email")}
            className={inputClass}
            placeholder="مثال: ahmed@example.com"
          />
          {errors.email && (
            <p className="text-xs text-danger mt-1">{errors.email.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            رقم الهوية (اختياري)
          </label>
          <input
            {...register("idNumber")}
            className={inputClass}
            placeholder="مثال: 123456789"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            تاريخ الميلاد (اختياري)
          </label>
          <input
            type="date"
            {...register("dateOfBirth")}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            رخصة القيادة (اختياري)
          </label>
          <input
            {...register("driverLicenseNumber")}
            className={inputClass}
            placeholder="رقم الرخصة"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            انتهاء الرخصة (اختياري)
          </label>
          <input
            type="date"
            {...register("driverLicenseExpiry")}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          العنوان (اختياري)
        </label>
        <input
          {...register("address")}
          className={inputClass}
          placeholder="مثال: الجزائر العاصمة"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            اسم جهة الاتصال (اختياري)
          </label>
          <input
            {...register("emergencyContactName")}
            className={inputClass}
            placeholder="اسم شخص للطوارئ"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground/80">
            هاتف الطوارئ (اختياري)
          </label>
          <input
            {...register("emergencyContactPhone")}
            className={inputClass}
            placeholder="0550123456"
            dir="ltr"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">
          ملاحظات (اختياري)
        </label>
        <textarea
          {...register("notes")}
          rows={2}
          className={`${inputClass} resize-none`}
          placeholder="ملاحظات داخلية عن العميل..."
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={onCancel} variant="outline">
          إلغاء
        </Button>
        <Button type="submit" loading={isLoading}>
          {isLoading ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
    </form>
  );
}

export default function CustomersPage() {
  const { isManager } = useRole();
  const [addOpen, setAddOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [disableCustomer, setDisableCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const queryClient = useQueryClient();

  const {
    data: customers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapCustomer);
    },
  });

  const { data: customerStats } = useQuery({
    queryKey: ["customer-stats"],
    queryFn: async () => {
      if (!customers) return {};
      const stats: Record<string, { rentalCount: number; totalSpent: number }> = {};
      for (const c of customers) {
        const { count } = await supabase
          .from("rentals")
          .select("*", { count: "exact", head: true })
          .eq("customer_id", c.id)
          .in("status", ["active", "completed", "overdue"]);
        const { data: spent } = await supabase
          .from("rentals")
          .select("total_amount")
          .eq("customer_id", c.id)
          .eq("status", "completed")
          .returns<{ total_amount: number | null }[]>();
        const totalSpent = (spent ?? []).reduce(
          (sum, r) => sum + (r.total_amount ?? 0),
          0,
        );
        stats[c.id] = { rentalCount: count ?? 0, totalSpent };
      }
      return stats;
    },
    enabled: !!customers?.length,
  });

  const searchFn = useCallback((c: Customer, search: string) => {
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      !!(c.email && c.email.toLowerCase().includes(q)) ||
      c.phone.includes(search)
    );
  }, []);

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
  } = useTableState(customers, searchFn, "firstName", "asc");

  const sorted = useMemo(() => {
    if (!customers) return [];
    const items = customers.filter((c) => searchFn(c, search));
    if (!sortConfig.key) return items;
    return [...items].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Customer];
      const bVal = b[sortConfig.key as keyof Customer];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [customers, search, sortConfig, searchFn]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const addMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const { error } = await supabase
        .from("customers")
        .insert(toCustomerInsert(data as Partial<Customer>) as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("تمت إضافة العميل بنجاح");
      setAddOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormData }) => {
      const { error } = await supabase
        .from("customers")
        .update(toCustomerUpdate(data as Partial<Customer>) as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("تم تعديل العميل بنجاح");
      setEditCustomer(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disableMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customers")
        .update({ blacklisted: true, blacklist_reason: "تم التعطيل يدوياً" } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("تم تعطيل العميل بنجاح");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check for active rentals
      const { count } = await supabase
        .from("rentals")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", id)
        .in("status", ["active", "overdue", "reserved"]);

      if ((count ?? 0) > 0) {
        throw new Error("لا يمكن حذف العميل — لديه كراءات نشطة");
      }

      // Delete all completed/cancelled rentals for this customer
      await supabase.from("rentals").delete().eq("customer_id", id);

      // Delete the customer
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success("تم حذف العميل بنجاح");
      setDeleteCustomer(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reEnableMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customers")
        .update({ blacklisted: false, blacklist_reason: null } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("تم إعادة تنشيط العميل بنجاح");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleExport = () => {
    const exportData = sorted.map((c) => ({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email ?? "",
      phone: c.phone,
      idNumber: c.idNumber,
    }));
    exportToCSV(
      exportData,
      [
        { key: "firstName", label: "الاسم الأول" },
        { key: "lastName", label: "اسم العائلة" },
        { key: "email", label: "البريد الإلكتروني" },
        { key: "phone", label: "رقم الهاتف" },
        { key: "idNumber", label: "رقم الهوية" },
      ],
      "customers-export",
    );
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" /> العملاء
        </h1>
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" /> العملاء
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
          {isManager && (
            <Button onClick={() => setAddOpen(true)} variant="primary">
              <Plus className="w-4 h-4" />
              إضافة عميل
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد أو الهاتف..."
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
                <SkeletonRow key={i} columns={8} />
              ))}
            </tbody>
          </table>
        ) : !sorted.length ? (
          <EmptyState
            icon={Users}
            title="لا يوجد عملاء"
            description="أضف عملاء للبدء"
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
                        label="الاسم"
                        sortKey="firstName"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="البريد"
                        sortKey="email"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="الهاتف"
                        sortKey="phone"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      رقم الهوية
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      الكراءات
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      إجمالي المصروف
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c, i) => (
                    <tr
                      key={c.id}
                      className={`border-b border-border/30 hover:bg-surface-hover/50 transition-all duration-200 ${i % 2 === 0 ? "bg-transparent" : "bg-surface/30"}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                            {c.firstName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {c.firstName} {c.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{c.email ?? "—"}</td>
                      <td className="p-4 text-sm" dir="ltr">
                        {c.phone}
                      </td>
                      <td className="p-4 text-sm font-mono">
                        {c.idNumber ?? "—"}
                      </td>
                      <td className="p-4 text-sm text-center">
                        {customerStats?.[c.id]?.rentalCount ?? 0}
                      </td>
                      <td className="p-4 text-sm font-medium text-primary">
                        {new Intl.NumberFormat("ar-DZ").format(
                          customerStats?.[c.id]?.totalSpent ?? 0,
                        )}{" "}
                        DZD
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => setViewCustomer(c)}
                            variant="ghost"
                            size="icon"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isManager && (
                            <>
                              <Button
                                onClick={() => setEditCustomer(c)}
                                variant="ghost"
                                size="icon"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {c.blacklisted ? (
                                <Button
                                  onClick={() => reEnableMutation.mutate(c.id)}
                                  variant="ghost"
                                  size="icon"
                                  title="إعادة التنشيط"
                                >
                                  <RotateCcw className="w-4 h-4 text-success" />
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => setDisableCustomer(c)}
                                    variant="ghost"
                                    size="icon"
                                    title="تعطيل العميل"
                                  >
                                    <Ban className="w-4 h-4 text-warning" />
                                  </Button>
                                  <Button
                                    onClick={() => setDeleteCustomer(c)}
                                    variant="ghost"
                                    size="icon"
                                    title="حذف العميل"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
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
              {paginated.map((c) => (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {c.firstName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {c.idNumber}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-muted">
                    <p dir="ltr" className="text-left">
                      {c.phone}
                    </p>
                    <p className="truncate">{c.email ?? ""}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">
                      الكراءات:{" "}
                      <span className="font-medium text-foreground">
                        {customerStats?.[c.id]?.rentalCount ?? 0}
                      </span>
                    </span>
                    <span className="font-medium text-primary">
                      {new Intl.NumberFormat("ar-DZ").format(
                        customerStats?.[c.id]?.totalSpent ?? 0,
                      )}{" "}
                      DZD
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={() => setViewCustomer(c)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3" /> عرض
                    </Button>
                    <Button
                      onClick={() => setEditCustomer(c)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Pencil className="w-3 h-3" /> تعديل
                    </Button>
                    <Button
                      onClick={() => setDeleteCustomer(c)}
                      variant="danger"
                      size="sm"
                      className="flex-1"
                    >
                      <Trash2 className="w-3 h-3" /> حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>

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

      <Modal open={addOpen} onOpenChange={setAddOpen} title="إضافة عميل جديد">
        <CustomerForm
          onSubmit={(data) => addMutation.mutate(data)}
          onCancel={() => setAddOpen(false)}
          isLoading={addMutation.isPending}
        />
      </Modal>

      <Modal
        open={!!editCustomer}
        onOpenChange={(open) => {
          if (!open) setEditCustomer(null);
        }}
        title="تعديل العميل"
      >
        {editCustomer && (
          <CustomerForm
            defaultValues={{
              firstName: editCustomer.firstName,
              lastName: editCustomer.lastName,
              email: editCustomer.email ?? "",
              phone: editCustomer.phone,
              idNumber: editCustomer.idNumber ?? "",
              address: editCustomer.address ?? "",
              driverLicenseNumber: editCustomer.driverLicenseNumber ?? "",
              driverLicenseExpiry: editCustomer.driverLicenseExpiry ?? "",
              dateOfBirth: editCustomer.dateOfBirth ?? "",
              emergencyContactName: editCustomer.emergencyContactName ?? "",
              emergencyContactPhone: editCustomer.emergencyContactPhone ?? "",
              notes: editCustomer.notes ?? "",
            }}
            onSubmit={(data) =>
              editMutation.mutate({ id: editCustomer.id, data })
            }
            onCancel={() => setEditCustomer(null)}
            isLoading={editMutation.isPending}
          />
        )}
      </Modal>

      <Modal
        open={!!deleteCustomer}
        onOpenChange={(open) => {
          if (!open) setDeleteCustomer(null);
        }}
        title="حذف العميل"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            هل أنت متأكد من حذف العميل{" "}
            <strong className="text-foreground">
              {deleteCustomer?.firstName} {deleteCustomer?.lastName}
            </strong>
            ؟
          </p>
          <p className="text-xs text-danger bg-danger/10 p-3 rounded-lg">
            سيتم حذف العميل وجميع بياناته بشكل نهائي. لن يتم الحذف إذا كان لدى العميل كراءات نشطة.
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDeleteCustomer(null)} variant="outline">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (deleteCustomer) deleteMutation.mutate(deleteCustomer.id);
              }}
              disabled={deleteMutation.isPending}
              variant="danger"
            >
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!disableCustomer}
        onOpenChange={(open) => {
          if (!open) setDisableCustomer(null);
        }}
        title="تعطيل العميل"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            هل أنت متأكد من تعطيل العميل{" "}
            <strong className="text-foreground">
              {disableCustomer?.firstName} {disableCustomer?.lastName}
            </strong>
            ؟
          </p>
          <p className="text-xs text-warning bg-warning/10 p-3 rounded-lg">
            سيتم تعطيل العميل ولن يتمكن من إنشاء كراءات جديدة حتى يتم إعادة تنشيطه.
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDisableCustomer(null)} variant="outline">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (disableCustomer) disableMutation.mutate(disableCustomer.id);
                setDisableCustomer(null);
              }}
              disabled={disableMutation.isPending}
              variant="warning"
            >
              {disableMutation.isPending ? "جاري التعطيل..." : "تعطيل"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!viewCustomer}
        onOpenChange={(open) => {
          if (!open) setViewCustomer(null);
        }}
        title="تفاصيل العميل"
      >
        {viewCustomer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted">الاسم:</span>{" "}
                <span className="font-medium">
                  {viewCustomer.firstName} {viewCustomer.lastName}
                </span>
              </div>
              <div>
                <span className="text-muted">الهاتف:</span>{" "}
                <span className="font-mono">{viewCustomer.phone}</span>
              </div>
              {viewCustomer.email && (
                <div>
                  <span className="text-muted">البريد:</span>{" "}
                  <span className="font-medium">{viewCustomer.email}</span>
                </div>
              )}
              {viewCustomer.idNumber && (
                <div>
                  <span className="text-muted">رقم الهوية:</span>{" "}
                  <span className="font-mono">{viewCustomer.idNumber}</span>
                </div>
              )}
              {viewCustomer.dateOfBirth && (
                <div>
                  <span className="text-muted">تاريخ الميلاد:</span>{" "}
                  <span className="font-medium">
                    {viewCustomer.dateOfBirth}
                  </span>
                </div>
              )}
              {viewCustomer.driverLicenseNumber && (
                <div>
                  <span className="text-muted">رخصة القيادة:</span>{" "}
                  <span className="font-mono">
                    {viewCustomer.driverLicenseNumber}
                  </span>
                </div>
              )}
              {viewCustomer.driverLicenseExpiry && (
                <div>
                  <span className="text-muted">انتهاء الرخصة:</span>{" "}
                  <span
                    className={`font-medium ${new Date(viewCustomer.driverLicenseExpiry) < new Date() ? "text-danger" : ""}`}
                  >
                    {viewCustomer.driverLicenseExpiry}
                  </span>
                </div>
              )}
              {viewCustomer.address && (
                <div className="col-span-2">
                  <span className="text-muted">العنوان:</span>{" "}
                  <span className="font-medium">{viewCustomer.address}</span>
                </div>
              )}
              {viewCustomer.emergencyContactName && (
                <div>
                  <span className="text-muted">جهة اتصال:</span>{" "}
                  <span className="font-medium">
                    {viewCustomer.emergencyContactName}
                  </span>
                </div>
              )}
              {viewCustomer.emergencyContactPhone && (
                <div>
                  <span className="text-muted">هاتف الطوارئ:</span>{" "}
                  <span className="font-mono">
                    {viewCustomer.emergencyContactPhone}
                  </span>
                </div>
              )}
              {viewCustomer.notes && (
                <div className="col-span-2">
                  <span className="text-muted">ملاحظات:</span>{" "}
                  <span className="font-medium">{viewCustomer.notes}</span>
                </div>
              )}
              {viewCustomer.blacklisted && (
                <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm font-medium">
                    محظور: {viewCustomer.blacklistReason ?? "سبب غير محدد"}
                  </span>
                </div>
              )}
            </div>
            <div className="glass rounded-xl p-4">
              <h4 className="text-sm font-semibold mb-3">الإحصائيات</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {customerStats?.[viewCustomer.id]?.rentalCount ?? 0}
                  </p>
                  <p className="text-xs text-muted">كراء</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary">
                    {new Intl.NumberFormat("ar-DZ").format(
                      customerStats?.[viewCustomer.id]?.totalSpent ?? 0,
                    )}{" "}
                    DZD
                  </p>
                  <p className="text-xs text-muted">إجمالي المصروف</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setViewCustomer(null);
                  setEditCustomer(viewCustomer);
                }}
              >
                تعديل
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewCustomer(null)}
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
