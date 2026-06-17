"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { checkExpiryDates } from "@/lib/notifications";
import {
  Car,
  KeyRound,
  Users,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wrench,
  DollarSign,
  ActivityIcon as ActivityIconLucide,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "@/components/shared/chart-wrapper";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDZD, timeAgo, statusMap } from "@/lib/utils";

interface DashboardKPIs {
  totalCars: number;
  activeRentals: number;
  totalCustomers: number;
  monthlyRevenue: number;
  availableCars: number;
  rentedCars: number;
  maintenanceCars: number;
  overdueRentals: number;
  monthlyRevenueChange: number;
  activeMaintenance: number;
  occupancyRate: number;
  totalRevenueYTD: number;
}

interface RevenueData {
  month: string;
  revenue: number;
}

interface RecentRental {
  id: string;
  customer: { firstName: string; lastName: string; phone?: string };
  car: { brand: string; model: string };
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: string;
}

interface ActivityItem {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

interface UpcomingReturn {
  id: string;
  customer: { firstName: string; lastName: string };
  car: { brand: string; model: string };
  endDate: string;
}

interface PendingMaintenance {
  id: string;
  car: { brand: string; model: string };
  type: string;
  scheduledAt: string;
  cost: number;
}

/* ─── Skeleton ─── */
function KPISkeleton() {
  return (
    <div className="rounded-2xl bg-surface border border-border p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-20 bg-surface-hover rounded" />
        <div className="h-10 w-10 bg-surface-hover rounded-xl" />
      </div>
      <div className="h-8 w-16 bg-surface-hover rounded mb-2" />
      <div className="h-2.5 w-24 bg-surface-hover rounded" />
    </div>
  );
}

/* ─── Activity Icon ─── */
function ActivityIcon({ type }: { type: string }) {
  const icons: Record<
    string,
    { icon: typeof Bell; color: string; bg: string }
  > = {
    RENTAL_CREATED: {
      icon: KeyRound,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    RENTAL_COMPLETED: {
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    RENTAL_CANCELLED: {
      icon: XCircle,
      color: "text-danger",
      bg: "bg-danger/10",
    },
    MAINTENANCE_DUE: {
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    CAR_ADDED: { icon: Car, color: "text-primary", bg: "bg-primary/10" },
  };
  const config = icons[type] || {
    icon: Bell,
    color: "text-muted",
    bg: "bg-muted/10",
  };
  const Icon = config.icon;
  return (
    <div
      className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}
    >
      <Icon className={`w-4 h-4 ${config.color}`} />
    </div>
  );
}

/* ─── Chart Tooltip ─── */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 bg-surface border border-border shadow-2xl">
      <p className="text-[11px] text-muted mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {formatDZD(payload[0].value)}
      </p>
    </div>
  );
}

/* ─── Error State ─── */
function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted">
      <AlertCircle className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm font-medium">
        {message || "حدث خطأ أثناء تحميل البيانات"}
      </p>
      <p className="text-xs text-muted/60 mt-1">تأكد من تشغيل الخادم</p>
    </div>
  );
}

/* ═══════════════ MAIN ═══════════════ */
export default function DashboardPage() {
  // Check expiry dates on dashboard load
  const { data: expiryCount } = useQuery({
    queryKey: ["expiry-check"],
    queryFn: checkExpiryDates,
    refetchInterval: 3600000, // Check every hour
  });

  const {
    data: kpis,
    isLoading,
    error: kpisError,
  } = useQuery<DashboardKPIs>({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const [carsRes, rentalsRes, customersRes, maintenanceRes] = await Promise.all([
        supabase.from("cars").select("status").returns<{ status: string }[]>(),
        supabase.from("rentals").select("status, total_amount, start_date, end_date, return_date").returns<{ status: string; total_amount: number | null; start_date: string; end_date: string; return_date: string | null }[]>(),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("maintenance").select("status").in("status", ["pending", "in_progress"]).returns<{ status: string }[]>(),
      ]);
      if (carsRes.error) throw new Error(carsRes.error.message);
      if (rentalsRes.error) throw new Error(rentalsRes.error.message);
      if (customersRes.error) throw new Error(customersRes.error.message);
      if (maintenanceRes.error) throw new Error(maintenanceRes.error.message);

      const cars = carsRes.data ?? [];
      const rentals = rentalsRes.data ?? [];
      const totalCars = cars.length;
      const availableCars = cars.filter((c) => c.status === "available").length;
      const rentedCars = cars.filter((c) => c.status === "rented").length;
      const maintenanceCars = cars.filter((c) => c.status === "maintenance").length;
      const activeRentals = rentals.filter((r) => r.status === "active").length;
      const overdueRentals = rentals.filter((r) => r.status === "overdue").length;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      const thisMonthRevenue = rentals
        .filter((r) => r.status === "completed" && r.return_date && r.return_date >= monthStart)
        .reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
      const lastMonthRevenue = rentals
        .filter((r) => r.status === "completed" && r.return_date && r.return_date >= lastMonthStart && r.return_date <= lastMonthEnd)
        .reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
      const monthlyRevenueChange = lastMonthRevenue > 0
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
      const totalRevenueYTD = rentals
        .filter((r) => r.status === "completed" && r.return_date && r.return_date >= yearStart)
        .reduce((sum, r) => sum + (r.total_amount ?? 0), 0);

      return {
        totalCars,
        activeRentals,
        totalCustomers: customersRes.count ?? 0,
        monthlyRevenue: thisMonthRevenue,
        availableCars,
        rentedCars,
        maintenanceCars,
        overdueRentals,
        monthlyRevenueChange,
        activeMaintenance: (maintenanceRes.data ?? []).length,
        occupancyRate: totalCars > 0 ? Math.round((rentedCars / totalCars) * 100) : 0,
        totalRevenueYTD,
      };
    },
  });

  const { data: revenueChart } = useQuery<RevenueData[]>({
    queryKey: ["revenue-chart"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("rentals")
        .select("total_amount, return_date")
        .eq("status", "completed")
        .order("return_date", { ascending: false })
        .returns<{ total_amount: number | null; return_date: string | null }[]>();
      if (error) throw new Error(error.message);

      const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      const now = new Date();
      const months: RevenueData[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const revenue = (rows ?? [])
          .filter((r) => {
            if (!r.return_date) return false;
            const rd = new Date(r.return_date);
            return rd >= d && rd <= monthEnd;
          })
          .reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
        months.push({ month: monthNames[d.getMonth()], revenue });
      }
      return months;
    },
  });

  const { data: recentRentals } = useQuery<RecentRental[]>({
    queryKey: ["recent-rentals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select("*, customer:customers(first_name, last_name, phone), car:cars(brand, model)")
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<any[]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => {
        const cust = Array.isArray(r.customer) ? r.customer[0] : r.customer;
        const car = Array.isArray(r.car) ? r.car[0] : r.car;
        return {
          id: r.id,
          customer: {
            firstName: cust?.first_name ?? "",
            lastName: cust?.last_name ?? "",
            phone: cust?.phone ?? undefined,
          },
          car: { brand: car?.brand ?? "", model: car?.model ?? "" },
          startDate: r.start_date,
          endDate: r.end_date,
          totalAmount: r.total_amount ?? 0,
          status: r.status,
        };
      });
    },
  });

  const { data: activities } = useQuery<ActivityItem[]>({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6)
        .returns<any[]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        createdAt: n.created_at,
      }));
    },
  });

  const { data: upcomingReturns } = useQuery<UpcomingReturn[]>({
    queryKey: ["upcoming-returns"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const weekLater = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("rentals")
        .select("id, end_date, customer:customers(first_name, last_name), car:cars(brand, model)")
        .eq("status", "active")
        .lte("end_date", weekLater)
        .gte("end_date", now)
        .returns<any[]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => {
        const cust = Array.isArray(r.customer) ? r.customer[0] : r.customer;
        const car = Array.isArray(r.car) ? r.car[0] : r.car;
        return {
          id: r.id,
          customer: {
            firstName: cust?.first_name ?? "",
            lastName: cust?.last_name ?? "",
          },
          car: { brand: car?.brand ?? "", model: car?.model ?? "" },
          endDate: r.end_date,
        };
      });
    },
  });

  const { data: pendingMaintenance } = useQuery<PendingMaintenance[]>({
    queryKey: ["pending-maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance")
        .select("id, type, scheduled_at, cost, car:cars(brand, model)")
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<any[]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map((m) => {
        const car = Array.isArray(m.car) ? m.car[0] : m.car;
        return {
          id: m.id,
          car: { brand: car?.brand ?? "", model: car?.model ?? "" },
          type: m.type,
          scheduledAt: m.scheduled_at ?? "",
          cost: m.cost,
        };
      });
    },
  });

  /* ─── KPI definitions ─── */
  const kpiCards = [
    {
      title: "السيارات المتاحة",
      value: kpis?.availableCars ?? 0,
      total: kpis?.totalCars ?? 0,
      icon: Car,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      link: "/fleet",
    },
    {
      title: "الكراء النشط",
      value: kpis?.activeRentals ?? 0,
      total: undefined,
      icon: KeyRound,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
      link: "/rentals",
    },
    {
      title: "إجمالي العملاء",
      value: kpis?.totalCustomers ?? 0,
      total: undefined,
      icon: Users,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      link: "/customers",
    },
    {
      title: "الإيراد الشهري",
      value: kpis?.monthlyRevenue ?? 0,
      total: undefined,
      icon: DollarSign,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
      link: undefined,
      isCurrency: true,
      change: kpis?.monthlyRevenueChange,
    },
    {
      title: "الكراءات المتأخرة",
      value: kpis?.overdueRentals ?? 0,
      total: undefined,
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      link: "/rentals",
      isWarning: true,
    },
    {
      title: "الصيانة المعلّقة",
      value: kpis?.activeMaintenance ?? 0,
      total: undefined,
      icon: Wrench,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      link: "/maintenance",
    },
  ];

  const fleetData = [
    { name: "متاحة", value: kpis?.availableCars ?? 0, color: "#22c55e" },
    { name: "مؤجرة", value: kpis?.rentedCars ?? 0, color: "#a78bfa" },
    { name: "صيانة", value: kpis?.maintenanceCars ?? 0, color: "#f59e0b" },
    {
      name: "خارج الخدمة",
      value:
        (kpis?.totalCars ?? 0) -
        (kpis?.availableCars ?? 0) -
        (kpis?.rentedCars ?? 0) -
        (kpis?.maintenanceCars ?? 0),
      color: "#ef4444",
    },
  ].filter((d) => d.value > 0);

  const quickActions = [
    {
      label: "إضافة سيارة",
      href: "/fleet",
      icon: Car,
      color: "hover:border-emerald-500/40",
    },
    {
      label: "كراء جديد",
      href: "/rentals",
      icon: KeyRound,
      color: "hover:border-violet-500/40",
    },
    {
      label: "إضافة عميل",
      href: "/customers",
      icon: Users,
      color: "hover:border-amber-500/40",
    },
    {
      label: "إنشاء تقرير",
      href: "/reports",
      icon: BarChart3,
      color: "hover:border-cyan-500/40",
    },
  ];

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const upcomingWithDays = useMemo(() => {
    return (upcomingReturns ?? []).map((r) => ({
      ...r,
      daysRemaining: Math.max(
        0,
        Math.ceil((new Date(r.endDate).getTime() - now) / 86400000),
      ),
    }));
  }, [upcomingReturns, now]);

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 bg-surface rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-56 bg-surface rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <KPISkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-2xl bg-surface border border-border p-6 h-80 animate-pulse" />
          <div className="rounded-2xl bg-surface border border-border p-6 h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  /* ─── Error ─── */
  if (kpisError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-sm text-muted mt-1">نظرة عامة على أداء الأسطول</p>
        </div>
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-sm text-muted mt-1">نظرة عامة على أداء الأسطول</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted hidden sm:block">
            {new Date().toLocaleDateString("ar-DZ", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi, i) => {
          const card = (
            <div
              key={kpi.title}
              className={`rounded-2xl bg-surface border border-border p-5 hover-lift animate-fade-in group cursor-pointer transition-all duration-200 hover:border-border-light ${kpi.isWarning && kpi.value > 0 ? "border-red-500/30" : ""}`}
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] text-muted font-medium">
                  {kpi.title}
                </span>
                <div
                  className={`w-10 h-10 rounded-xl ${kpi.bg} border ${kpi.border} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}
                >
                  <kpi.icon className={`w-[18px] h-[18px] ${kpi.color}`} />
                </div>
              </div>
              <div className="text-[28px] font-bold tracking-tight animate-count-up leading-none">
                {kpi.isCurrency ? formatDZD(kpi.value) : kpi.value}
              </div>
              {kpi.change !== undefined && (
                <div
                  className={`mt-1 flex items-center gap-1 text-xs ${kpi.change >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {kpi.change >= 0 ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(kpi.change)}%</span>
                  <span className="text-muted">عن الشهر السابق</span>
                </div>
              )}
              {kpi.total !== undefined && (
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{
                        width: `${kpi.total > 0 ? (kpi.value / kpi.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-muted">من {kpi.total}</span>
                </div>
              )}
              {kpi.total === undefined && kpi.change === undefined && (
                <div className="mt-2.5 flex items-center gap-1.5">
                  <ActivityIconLucide className="w-3 h-3 text-muted" />
                  <span className="text-[11px] text-muted">هذا الشهر</span>
                </div>
              )}
            </div>
          );

          return kpi.link ? (
            <Link key={kpi.title} href={kpi.link} className="block">
              {card}
            </Link>
          ) : (
            card
          );
        })}
      </div>

      {/* ─── Upcoming Returns Alert ─── */}
      {upcomingWithDays.length > 0 && (
        <div
          className="glass rounded-2xl p-5 border-r-4 border-r-warning animate-fade-in"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="text-sm font-semibold">كراءات تنتهي قريباً</h3>
          </div>
          <div className="space-y-2">
            {upcomingWithDays.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {r.customer.firstName} {r.customer.lastName} — {r.car.brand}{" "}
                  {r.car.model}
                </span>
                <span className="text-warning font-medium">
                  {r.daysRemaining} يوم
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div
          className="lg:col-span-2 rounded-2xl bg-surface border border-border p-6 animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold">الإيرادات الشهرية</h3>
              <p className="text-xs text-muted mt-0.5">آخر 6 أشهر</p>
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-primary">
                {formatDZD(
                  revenueChart?.reduce((s, m) => s + m.revenue, 0) ?? 0,
                )}
              </p>
              <p className="text-xs text-muted">إجمالي 6 أشهر</p>
            </div>
          </div>
          {revenueChart && revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={revenueChart}
                margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  dx={-8}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{
                    stroke: "var(--color-primary-glow)",
                    strokeWidth: 1,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#22c55e",
                    stroke: "var(--color-background)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-muted">
              <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">لا توجد بيانات إيرادات</p>
            </div>
          )}
        </div>

        {/* Fleet Distribution */}
        <div
          className="rounded-2xl bg-surface border border-border p-6 animate-fade-in"
          style={{ animationDelay: "375ms" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold">توزيع الأسطول</h3>
              <p className="text-xs text-muted mt-0.5">حسب الحالة</p>
            </div>
          </div>
          {fleetData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={fleetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    dataKey="value"
                    strokeWidth={0}
                    paddingAngle={3}
                  >
                    {fleetData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) => {
                      if (!active || !payload?.length) return null;
                      const total = fleetData.reduce((s, d) => s + d.value, 0);
                      const pct =
                        total > 0
                          ? (
                              ((payload[0].value as number) / total) *
                              100
                            ).toFixed(1)
                          : "0";
                      return (
                        <div className="rounded-lg px-3 py-2 bg-surface border border-border shadow-xl text-xs">
                          <span className="text-foreground font-medium">
                            {payload[0].name}: {payload[0].value} ({pct}%)
                          </span>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-3">
                {fleetData.map((d) => {
                  const total = fleetData.reduce((s, x) => s + x.value, 0);
                  const pct =
                    total > 0 ? ((d.value / total) * 100).toFixed(0) : "0";
                  return (
                    <div key={d.name} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-xs text-muted">{d.name}</span>
                      <span className="text-xs font-semibold text-foreground">
                        {d.value}
                      </span>
                      <span className="text-[10px] text-muted/60">
                        ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted">
              <Car className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">لا توجد بيانات</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div
        className="flex flex-wrap gap-3 animate-fade-in"
        style={{ animationDelay: "400ms" }}
      >
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl bg-surface border border-border text-sm font-medium text-foreground hover:bg-surface-hover ${action.color} transition-all duration-200 hover-lift`}
          >
            <action.icon className="w-4 h-4 text-muted" />
            {action.label}
          </Link>
        ))}
      </div>

      {/* ─── Bottom Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-5">
        {/* Recent Rentals - 3 cols */}
        <div
          className="lg:col-span-3 rounded-2xl bg-surface border border-border animate-fade-in"
          style={{ animationDelay: "450ms" }}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h3 className="text-base font-semibold">آخر الحجوزات</h3>
              <p className="text-xs text-muted mt-0.5">آخر 5 كراءات</p>
            </div>
            <Link
              href="/rentals"
              className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-6 pb-6">
            {recentRentals && recentRentals.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-muted uppercase tracking-wider">
                      <th className="text-right pb-3 font-medium px-2">
                        العميل
                      </th>
                      <th className="text-right pb-3 font-medium px-2">
                        الهاتف
                      </th>
                      <th className="text-right pb-3 font-medium px-2">
                        السيارة
                      </th>
                      <th className="text-right pb-3 font-medium px-2">
                        المبلغ
                      </th>
                      <th className="text-right pb-3 font-medium px-2">
                        التواريخ
                      </th>
                      <th className="text-right pb-3 font-medium px-2">
                        الحالة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {recentRentals.slice(0, 5).map((r) => {
                      const st = statusMap[r.status.toLowerCase()] || {
                        label: r.status,
                        variant: "muted" as const,
                      };
                      const isOverdue =
                        r.status.toLowerCase() === "active" &&
                        new Date(r.endDate) < new Date();
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-surface-hover/30 transition-colors ${isOverdue ? "bg-red-500/5" : ""}`}
                        >
                          <td className="py-3 px-2 font-medium">
                            {r.customer.firstName} {r.customer.lastName}
                          </td>
                          <td className="py-3 px-2 text-muted text-xs">
                            {r.customer.phone ?? "—"}
                          </td>
                          <td className="py-3 px-2 text-muted">
                            {r.car.brand} {r.car.model}
                          </td>
                          <td className="py-3 px-2 font-semibold text-primary">
                            {formatDZD(r.totalAmount ?? 0)}
                          </td>
                          <td className="py-3 px-2 text-xs text-muted">
                            {new Date(r.startDate).toLocaleDateString("ar-DZ", {
                              month: "short",
                              day: "numeric",
                            })}
                            {" — "}
                            {new Date(r.endDate).toLocaleDateString("ar-DZ", {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={st.variant}>{st.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10">
                <KeyRound className="w-10 h-10 text-muted mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted">لا توجد كراءات حالياً</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed - 1 col */}
        <div
          className="lg:col-span-1 rounded-2xl bg-surface border border-border animate-fade-in"
          style={{ animationDelay: "500ms" }}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h3 className="text-base font-semibold">النشاط الأخير</h3>
              <p className="text-xs text-muted mt-0.5">آخر الأحداث</p>
            </div>
            <Link
              href="/notifications"
              className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-6 pb-6">
            {activities && activities.length > 0 ? (
              <div className="space-y-2">
                {activities.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-hover/30 transition-colors cursor-default"
                  >
                    <ActivityIcon type={a.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-tight">
                        {a.title}
                      </p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {a.message}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted/60 whitespace-nowrap mt-0.5">
                      {timeAgo(a.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Bell className="w-10 h-10 text-muted mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted">لا توجد أنشطة حالياً</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Maintenance - 2 cols */}
        <div
          className="lg:col-span-2 rounded-2xl bg-surface border border-border animate-fade-in"
          style={{ animationDelay: "550ms" }}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h3 className="text-base font-semibold">الصيانة المعلّقة</h3>
              <p className="text-xs text-muted mt-0.5">آخر طلبات الصيانة</p>
            </div>
            <Link
              href="/maintenance"
              className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-6 pb-6">
            {pendingMaintenance && pendingMaintenance.length > 0 ? (
              <div className="space-y-2">
                {pendingMaintenance.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium">
                        {m.car.brand} {m.car.model}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {m.type} —{" "}
                        {m.scheduledAt
                          ? new Date(m.scheduledAt).toLocaleDateString("ar-DZ")
                          : "غير محدد"}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      {formatDZD(m.cost)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Wrench className="w-10 h-10 text-muted mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted">لا توجد صيانة معلّقة</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
