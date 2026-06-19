"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { TrendingUp, Car, Users, Wrench, ShieldAlert } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "@/components/shared/chart-wrapper";
import { useRole } from "@/hooks/use-role";

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface TopCar {
  id: string;
  brand: string;
  model: string;
  rentalCount: number;
  revenue: number;
}

interface TopCustomer {
  id: string;
  name: string;
  rentalCount: number;
  totalSpent: number;
}

interface MaintenanceCost {
  month: string;
  cost: number;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

function ChartSkeleton() {
  return <div className="h-72 bg-surface-hover/50 rounded-xl animate-pulse" />;
}

export default function ReportsPage() {
  const { isManager } = useRole();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const {
    data: monthlyRevenue,
    isLoading: loadingRevenue,
  } = useQuery<MonthlyRevenue[]>({
    queryKey: ["reports-monthly-revenue", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("monthly_revenue", { p_year: selectedYear });
      if (!error && data) {
        return (((data as unknown) as Array<{ month_label: string; revenue: number }>).map((r) => ({
          month: r.month_label,
          revenue: r.revenue ?? 0,
        })));
      }
      // Fallback: client-side aggregation from completed rentals
      const yearStart = new Date(selectedYear, 0, 1).toISOString();
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();
      const { data: rentals, error: rErr } = await supabase
        .from("rentals")
        .select("total_amount, return_date")
        .eq("status", "completed")
        .gte("return_date", yearStart)
        .lte("return_date", yearEnd)
        .returns<{ total_amount: number | null; return_date: string | null }[]>();
      if (rErr) return [];
      const monthNames = ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      return monthNames.map((month, i) => {
        const mStart = new Date(selectedYear, i, 1);
        const mEnd = new Date(selectedYear, i + 1, 0);
        const revenue = (rentals ?? [])
          .filter((r) => {
            if (!r.return_date) return false;
            const d = new Date(r.return_date);
            return d >= mStart && d <= mEnd;
          })
          .reduce((s, r) => s + (r.total_amount ?? 0), 0);
        return { month, revenue };
      });
    },
  });

  const {
    data: topCars,
    isLoading: loadingCars,
  } = useQuery<TopCar[]>({
    queryKey: ["reports-top-cars"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("top_cars", { p_limit: 5 });
      if (!error && data) {
        return ((data as Array<{
          car_id: string;
          brand: string;
          model: string;
          plate_number: string;
          total_revenue: number;
          rentals_count: number;
        }>).map((r) => ({
          id: r.car_id,
          brand: r.brand,
          model: r.model,
          rentalCount: r.rentals_count ?? 0,
          revenue: r.total_revenue ?? 0,
        })));
      }
      // Fallback: client-side aggregation
      const { data: rentals, error: rErr } = await supabase
        .from("rentals")
        .select("car_id, total_amount, car:cars(brand, model)")
        .returns<{ car_id: string; total_amount: number | null; car: { brand: string; model: string } | null }[]>();
      if (rErr) return [];
      const map = new Map<string, { brand: string; model: string; rentalCount: number; revenue: number }>();
      for (const r of rentals ?? []) {
        const car = Array.isArray(r.car) ? r.car[0] : r.car;
        const existing = map.get(r.car_id) ?? { brand: car?.brand ?? "", model: car?.model ?? "", rentalCount: 0, revenue: 0 };
        existing.rentalCount++;
        existing.revenue += r.total_amount ?? 0;
        map.set(r.car_id, existing);
      }
      return Array.from(map.entries())
        .map(([id, v]) => ({ id, brand: v.brand, model: v.model, rentalCount: v.rentalCount, revenue: v.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });

  const {
    data: topCustomers,
    isLoading: loadingCustomers,
  } = useQuery<TopCustomer[]>({
    queryKey: ["reports-top-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("top_customers", { p_limit: 10 });
      if (!error && data) {
        return ((data as Array<{
          customer_id: string;
          first_name: string;
          last_name: string;
          total_spent: number;
          rentals_count: number;
        }>).map((r) => ({
          id: r.customer_id,
          name: `${r.first_name} ${r.last_name}`,
          rentalCount: r.rentals_count ?? 0,
          totalSpent: r.total_spent ?? 0,
        })));
      }
      // Fallback: client-side aggregation
      const { data: rentals, error: rErr } = await supabase
        .from("rentals")
        .select("customer_id, total_amount, customer:customers(first_name, last_name)")
        .returns<{ customer_id: string; total_amount: number | null; customer: { first_name: string; last_name: string } | null }[]>();
      if (rErr) return [];
      const map = new Map<string, { name: string; rentalCount: number; totalSpent: number }>();
      for (const r of rentals ?? []) {
        const cust = Array.isArray(r.customer) ? r.customer[0] : r.customer;
        const existing = map.get(r.customer_id) ?? { name: `${cust?.first_name ?? ""} ${cust?.last_name ?? ""}`, rentalCount: 0, totalSpent: 0 };
        existing.rentalCount++;
        existing.totalSpent += r.total_amount ?? 0;
        map.set(r.customer_id, existing);
      }
      return Array.from(map.entries())
        .map(([id, v]) => ({ id, name: v.name, rentalCount: v.rentalCount, totalSpent: v.totalSpent }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);
    },
  });

  const { data: maintenanceCosts, isLoading: loadingMaintenance } = useQuery<
    MaintenanceCost[]
  >({
    queryKey: ["reports-maintenance-costs", selectedYear],
    queryFn: async () => {
      const yearStart = new Date(selectedYear, 0, 1).toISOString();
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();
      const { data, error } = await supabase
        .from("maintenance")
        .select("cost, completed_at, created_at")
        .eq("status", "completed")
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd)
        .returns<{ cost: number; completed_at: string | null; created_at: string }[]>();
      if (error) throw new Error(error.message);
      const monthNames = ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      const months: MaintenanceCost[] = [];
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(selectedYear, m, 1);
        const mEnd = new Date(selectedYear, m + 1, 0);
        const cost = (data ?? [])
          .filter((r) => {
            const d = new Date(r.completed_at ?? r.created_at);
            return d >= mStart && d <= mEnd;
          })
          .reduce((sum, r) => sum + r.cost, 0);
        months.push({ month: monthNames[m], cost });
      }
      return months;
    },
  });

  // Accurate KPI counts (not derived from top-N lists)
  const { data: reportKpis } = useQuery({
    queryKey: ["reports-kpis", selectedYear],
    queryFn: async () => {
      const yearStart = new Date(selectedYear, 0, 1).toISOString();
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();
      const [rentalsRes, customersRes] = await Promise.all([
        supabase
          .from("rentals")
          .select("*", { head: true, count: "exact" })
          .gte("created_at", yearStart)
          .lte("created_at", yearEnd),
        supabase
          .from("customers")
          .select("*", { head: true, count: "exact" }),
      ]);
      return {
        totalRentals: rentalsRes.count ?? 0,
        uniqueCustomers: customersRes.count ?? 0,
      };
    },
  });

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

  const totalRevenue =
    monthlyRevenue?.reduce((sum, m) => sum + m.revenue, 0) ?? 0;
  const totalRentals = reportKpis?.totalRentals ?? 0;
  const uniqueCustomerCount = reportKpis?.uniqueCustomers ?? 0;
  const avgRevenuePerCustomer =
    uniqueCustomerCount > 0
      ? Math.round(totalRevenue / uniqueCustomerCount)
      : 0;
  const totalMaintenanceCost =
    maintenanceCosts?.reduce((sum, m) => sum + m.cost, 0) ?? 0;
  const netProfit = totalRevenue - totalMaintenanceCost;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-primary" /> التقارير
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear((y) => y - 1)}
            className="p-2 rounded-lg hover:bg-surface-hover text-muted"
          >
            ←
          </button>
          <span className="text-sm font-medium px-3">{selectedYear}</span>
          <button
            onClick={() => setSelectedYear((y) => y + 1)}
            className="p-2 rounded-lg hover:bg-surface-hover text-muted"
          >
            →
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "إجمالي الإيراد",
            value: `${new Intl.NumberFormat("ar-DZ").format(totalRevenue)} DZD`,
            color: "text-primary",
          },
          {
            label: "إجمالي الكراء",
            value: totalRentals.toString(),
            color: "text-secondary",
          },
          {
            label: "عدد العملاء",
            value: uniqueCustomerCount.toString(),
            color: "text-warning",
          },
          {
            label: "متوسط الإيراد/عميل",
            value: `${new Intl.NumberFormat("ar-DZ").format(avgRevenuePerCustomer)} DZD`,
            color: "text-info",
          },
          {
            label: "صافي الربح",
            value: `${new Intl.NumberFormat("ar-DZ").format(netProfit)} DZD`,
            color: netProfit >= 0 ? "text-emerald-400" : "text-red-400",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="glass card-gradient rounded-2xl p-4 hover-lift"
          >
            <p className="text-xs text-muted mb-1">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="glass card-gradient rounded-2xl p-6 hover-lift">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10 glow-primary">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">الإيراد الشهري</h2>
          </div>
          {loadingRevenue ? (
            <ChartSkeleton />
          ) : !monthlyRevenue?.length ? (
            <div className="text-center py-12">
              <TrendingUp className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-muted">لا توجد بيانات</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--color-muted)"
                  fontSize={12}
                />
                <YAxis stroke="var(--color-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                    color: "var(--color-foreground)",
                  }}
                  formatter={(value: number) => [
                    new Intl.NumberFormat("ar-DZ").format(Number(value)) +
                      " DZD",
                    "الإيراد",
                  ]}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Maintenance Costs Chart */}
        <div className="glass card-gradient rounded-2xl p-6 hover-lift">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-warning/10">
              <Wrench className="w-5 h-5 text-warning" />
            </div>
            <h2 className="text-lg font-semibold">تكاليف الصيانة</h2>
          </div>
          {loadingMaintenance ? (
            <ChartSkeleton />
          ) : !maintenanceCosts?.length ? (
            <div className="text-center py-12">
              <Wrench className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-muted">لا توجد بيانات</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={maintenanceCosts}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--color-muted)"
                  fontSize={12}
                />
                <YAxis stroke="var(--color-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                    color: "var(--color-foreground)",
                  }}
                  formatter={(value: number) => [
                    new Intl.NumberFormat("ar-DZ").format(Number(value)) +
                      " DZD",
                    "التكلفة",
                  ]}
                />
                <Bar dataKey="cost" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Cars Chart */}
      <div className="glass card-gradient rounded-2xl p-6 hover-lift">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-secondary/10 glow-secondary">
            <Car className="w-5 h-5 text-secondary" />
          </div>
          <h2 className="text-lg font-semibold">أفضل السيارات</h2>
        </div>
        {loadingCars ? (
          <ChartSkeleton />
        ) : !topCars?.length ? (
          <div className="text-center py-12">
            <Car className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
            <p className="text-muted">لا توجد بيانات</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topCars}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="revenue"
                nameKey="brand"
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {topCars.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  color: "var(--color-foreground)",
                }}
                formatter={(value: number) => [
                  new Intl.NumberFormat("ar-DZ").format(Number(value)) + " DZD",
                  "الإيراد",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Customers Table */}
      <div className="glass card-gradient rounded-2xl p-6 hover-lift">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-warning/10">
            <Users className="w-5 h-5 text-warning" />
          </div>
          <h2 className="text-lg font-semibold">أفضل العملاء</h2>
        </div>
        {loadingCustomers ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-surface-hover/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : !topCustomers?.length ? (
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
            <p className="text-muted">لا توجد بيانات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-right bg-surface/50">
                  <th className="p-3 text-sm font-medium text-muted">#</th>
                  <th className="p-3 text-sm font-medium text-muted">العميل</th>
                  <th className="p-3 text-sm font-medium text-muted">
                    عدد الكراء
                  </th>
                  <th className="p-3 text-sm font-medium text-muted">
                    إجمالي المصروف
                  </th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-border/30 hover:bg-surface-hover/50 transition-all duration-200 ${i % 2 === 0 ? "bg-transparent" : "bg-surface/30"}`}
                  >
                    <td className="p-3 text-sm text-muted">{i + 1}</td>
                    <td className="p-3 text-sm font-medium">{c.name}</td>
                    <td className="p-3 text-sm">{c.rentalCount}</td>
                    <td className="p-3 text-sm font-medium text-primary">
                      {new Intl.NumberFormat("ar-DZ").format(c.totalSpent)} DZD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
