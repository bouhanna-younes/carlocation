"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapInvoice, type Invoice } from "@/lib/mappers";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SortHeader } from "@/components/shared/sort-header";
import { Pagination } from "@/components/shared/pagination";
import { SkeletonRow } from "@/components/shared/skeleton-row";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  FileText,
  Search,
  Download,
  Eye,
  Printer,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useTableState } from "@/hooks/use-table-state";
import { inputClass } from "@/lib/constants";
import { exportToCSV } from "@/lib/export-csv";
import { useRealtime } from "@/hooks/use-realtime";
import { useRole } from "@/hooks/use-role";

const statusMap: Record<string, { label: string; colorClass: string }> = {
  pending: { label: "معلقة", colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  paid: { label: "مدفوعة", colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  refunded: { label: "مسترجعة", colorClass: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  cancelled: { label: "ملغاة", colorClass: "bg-red-500/15 text-red-400 border-red-500/30" },
};

function InvoicePrintView({ invoice }: { invoice: Invoice }) {
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="text-center border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-primary">CarLocation</h1>
        <p className="text-sm text-muted">فاتورة تأجير سيارة</p>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted">رقم الفاتورة:</span>
          <span className="font-medium mr-2">{invoice.invoiceNumber}</span>
        </div>
        <div>
          <span className="text-muted">التاريخ:</span>
          <span className="font-medium mr-2">
            {new Date(invoice.invoiceDate).toLocaleDateString("ar-DZ")}
          </span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">بيانات العميل</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted">الاسم:</span>
            <span className="font-medium mr-2">
              {invoice.customer?.firstName} {invoice.customer?.lastName}
            </span>
          </div>
          <div>
            <span className="text-muted">الهاتف:</span>
            <span className="font-mono mr-2">{invoice.customer?.phone}</span>
          </div>
        </div>
      </div>

      {/* Car Info */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">بيانات السيارة</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted">السيارة:</span>
            <span className="font-medium mr-2">
              {invoice.car?.brand} {invoice.car?.model}
            </span>
          </div>
          <div>
            <span className="text-muted">اللوحة:</span>
            <span className="font-mono mr-2">{invoice.car?.plateNumber}</span>
          </div>
        </div>
      </div>

      {/* Rental Details */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">تفاصيل التأجير</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">تاريخ البداية:</span>
            <span>{new Date(invoice.startDate).toLocaleDateString("ar-DZ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">تاريخ النهاية:</span>
            <span>{new Date(invoice.endDate).toLocaleDateString("ar-DZ")}</span>
          </div>
          {invoice.returnDate && (
            <div className="flex justify-between">
              <span className="text-muted">تاريخ الإرجاع:</span>
              <span>{new Date(invoice.returnDate).toLocaleDateString("ar-DZ")}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">السعر اليومي:</span>
            <span>{new Intl.NumberFormat("ar-DZ").format(invoice.dailyRate)} DZD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">عدد الأيام:</span>
            <span>{invoice.totalDays} يوم</span>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="rounded-xl border border-border p-4 bg-surface/50">
        <h3 className="text-sm font-semibold mb-3">الملخص المالي</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">المبلغ الإجمالي:</span>
            <span className="font-medium">{new Intl.NumberFormat("ar-DZ").format(invoice.totalAmount)} DZD</span>
          </div>
          {invoice.depositAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">الوديعة:</span>
              <span>{new Intl.NumberFormat("ar-DZ").format(invoice.depositAmount)} DZD</span>
            </div>
          )}
          {invoice.isCancelled && (
            <>
              <div className="flex justify-between text-danger">
                <span>غرامة الإلغاء ({invoice.penaltyPercent}%):</span>
                <span>{new Intl.NumberFormat("ar-DZ").format(invoice.penaltyAmount)} DZD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">صافي الإرجاع:</span>
                <span className="font-medium">{new Intl.NumberFormat("ar-DZ").format(invoice.refundAmount)} DZD</span>
              </div>
            </>
          )}
          <div className="flex justify-between border-t border-border pt-2 mt-2">
            <span className="font-semibold">المبلغ المدفوع:</span>
            <span className="font-bold text-primary text-lg">
              {new Intl.NumberFormat("ar-DZ").format(invoice.paidAmount)} DZD
            </span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="text-center pt-4 border-t border-border">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusMap[invoice.status]?.colorClass}`}>
          {invoice.status === "paid" && <CheckCircle className="w-4 h-4 ml-1" />}
          {invoice.status === "cancelled" && <XCircle className="w-4 h-4 ml-1" />}
          {statusMap[invoice.status]?.label}
        </span>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const { isManager } = useRole();
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const queryClient = useQueryClient();

  // Realtime updates
  useRealtime("invoices");
  useRealtime("notifications");

  const {
    data: invoices,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customer:customers(*), car:cars(*)")
        .order("created_at", { ascending: false })
        .returns<Parameters<typeof mapInvoice>[0][]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapInvoice);
    },
  });

  const searchFn = useCallback(
    (inv: Invoice, search: string) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        !!(inv.customer && `${inv.customer.firstName} ${inv.customer.lastName}`.toLowerCase().includes(q)) ||
        !!(inv.car && `${inv.car.brand} ${inv.car.model}`.toLowerCase().includes(q));
      const matchesStatus = !statusFilter || inv.status === statusFilter;
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
  } = useTableState(invoices, searchFn, "createdAt", "desc");

  const sorted = useMemo(() => {
    if (!invoices) return [];
    const items = invoices.filter((inv) => searchFn(inv, search));
    if (!sortConfig.key) return items;
    return [...items].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Invoice];
      const bVal = b[sortConfig.key as keyof Invoice];
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
  }, [invoices, search, sortConfig, searchFn]);

  const paginated = paginatedItems(sorted);

  // Summary stats
  const totalRevenue = invoices?.filter((i) => i.status === "paid").reduce((s, i) => s + i.paidAmount, 0) ?? 0;
  const totalRefunded = invoices?.filter((i) => i.status === "refunded").reduce((s, i) => s + i.refundAmount, 0) ?? 0;
  const totalPenalties = invoices?.reduce((s, i) => s + i.penaltyAmount, 0) ?? 0;

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="p-4 rounded-2xl bg-danger/10 mb-4">
          <ShieldAlert className="w-12 h-12 text-danger" />
        </div>
        <h2 className="text-xl font-bold mb-2">غير مصرح به</h2>
        <p className="text-muted text-sm">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
      </div>
    );
  }

  const handleExport = () => {
    const exportData = sorted.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer ? `${inv.customer.firstName} ${inv.customer.lastName}` : "",
      carName: inv.car ? `${inv.car.brand} ${inv.car.model}` : "",
      startDate: inv.startDate,
      endDate: inv.endDate,
      totalDays: inv.totalDays,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      status: statusMap[inv.status]?.label ?? inv.status,
    }));
    exportToCSV(
      exportData,
      [
        { key: "invoiceNumber", label: "رقم الفاتورة" },
        { key: "customerName", label: "العميل" },
        { key: "carName", label: "السيارة" },
        { key: "startDate", label: "تاريخ البداية" },
        { key: "endDate", label: "تاريخ النهاية" },
        { key: "totalDays", label: "عدد الأيام" },
        { key: "totalAmount", label: "المبلغ الإجمالي" },
        { key: "paidAmount", label: "المبلغ المدفوع" },
        { key: "status", label: "الحالة" },
      ],
      "invoices-export",
    );
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary" /> الفواتير
        </h1>
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary" /> الفواتير
        </h1>
        <Button onClick={handleExport} disabled={!sorted.length} variant="outline">
          <Download className="w-4 h-4" />
          تصدير CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border p-4 bg-surface/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-sm text-muted">إجمالي الإيرادات</span>
          </div>
          <p className="text-xl font-bold text-success">
            {new Intl.NumberFormat("ar-DZ").format(totalRevenue)} DZD
          </p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-surface/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-danger" />
            <span className="text-sm text-muted">إجمالي الاسترجاعات</span>
          </div>
          <p className="text-xl font-bold text-danger">
            {new Intl.NumberFormat("ar-DZ").format(totalRefunded)} DZD
          </p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-surface/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-warning" />
            <span className="text-sm text-muted">إجمالي الغرامات</span>
          </div>
          <p className="text-xl font-bold text-warning">
            {new Intl.NumberFormat("ar-DZ").format(totalPenalties)} DZD
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة أو العميل أو السيارة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-input/80 border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all duration-200"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "", label: "الكل" },
            { key: "pending", label: "معلقة" },
            { key: "paid", label: "مدفوعة" },
            { key: "refunded", label: "مسترجعة" },
            { key: "cancelled", label: "ملغاة" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s.key
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-surface/50 text-muted border border-border hover:bg-surface-hover"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={FileText} title="لا توجد فواتير" description="ستظهر الفواتير هنا عند إنشاء التأجيرات" />
      ) : (
        <>
          <div className="glass rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right p-4 font-medium text-muted">
                      <SortHeader label="رقم الفاتورة" sortKey="invoiceNumber" sortConfig={sortConfig} toggleSort={toggleSort} />
                    </th>
                    <th className="text-right p-4 font-medium text-muted">
                      <SortHeader label="العميل" sortKey="customerName" sortConfig={sortConfig} toggleSort={toggleSort} />
                    </th>
                    <th className="text-right p-4 font-medium text-muted">السيارة</th>
                    <th className="text-right p-4 font-medium text-muted">الأيام</th>
                    <th className="text-right p-4 font-medium text-muted">المبلغ</th>
                    <th className="text-right p-4 font-medium text-muted">الحالة</th>
                    <th className="text-center p-4 font-medium text-muted">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-surface-hover/30 transition-colors">
                      <td className="p-4 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="p-4">{inv.customer?.firstName} {inv.customer?.lastName}</td>
                      <td className="p-4 text-muted">{inv.car?.brand} {inv.car?.model}</td>
                      <td className="p-4 text-center">{inv.totalDays}</td>
                      <td className="p-4 font-medium text-primary">
                        {new Intl.NumberFormat("ar-DZ").format(inv.totalAmount)} DZD
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusMap[inv.status]?.colorClass}`}>
                          {statusMap[inv.status]?.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                            title="عرض"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setViewInvoice(inv);
                              setTimeout(() => window.print(), 100);
                            }}
                            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                            title="طباعة"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* View Invoice Modal */}
      <Modal
        open={!!viewInvoice}
        onOpenChange={(open) => {
          if (!open) setViewInvoice(null);
        }}
        title={`فاتورة ${viewInvoice?.invoiceNumber ?? ""}`}
      >
        {viewInvoice && <InvoicePrintView invoice={viewInvoice} />}
      </Modal>
    </div>
  );
}
