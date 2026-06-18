"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { SortHeader } from "@/components/shared/sort-header";
import { Pagination } from "@/components/shared/pagination";
import { SkeletonRow } from "@/components/shared/skeleton-row";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { MapPin, Search, X, AlertCircle, RefreshCw } from "lucide-react";
import { useMemo, useCallback, useState, useEffect } from "react";
import { useTableState } from "@/hooks/use-table-state";
import { carStatusMap } from "@/lib/constants";

interface TrackingCar {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  status: string;
  lastLocation: string;
  lastUpdate: string;
}

export default function TrackingPage() {
  const {
    data: cars,
    isLoading,
    error,
    refetch,
  } = useQuery<TrackingCar[]>({
    queryKey: ["tracking-cars"],
    queryFn: async () => {
      const { data: carsData, error: carsError } = await supabase
        .from("cars")
        .select("id, brand, model, plate_number, status")
        .neq("status", "out_of_service")
        .order("brand")
        .returns<any[]>();
      if (carsError) throw new Error(carsError.message);

      const { data: trackingData } = await supabase
        .from("latest_tracking")
        .select("car_id, latitude, longitude, timestamp")
        .returns<any[]>();

      const latestByCar = new Map<string, { latitude: number; longitude: number; timestamp: string }>();
      for (const t of trackingData ?? []) {
        latestByCar.set(t.car_id, { latitude: t.latitude, longitude: t.longitude, timestamp: t.timestamp });
      }

      return (carsData ?? []).map((car) => {
        const loc = latestByCar.get(car.id);
        return {
          id: car.id,
          brand: car.brand,
          model: car.model,
          plateNumber: car.plate_number,
          status: car.status,
          lastLocation: loc ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` : "",
          lastUpdate: loc?.timestamp ?? "",
        };
      });
    },
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const carsWithStale = useMemo(() => {
    return (cars ?? []).map((car) => ({
      ...car,
      isStale: car.lastUpdate
        ? now - new Date(car.lastUpdate).getTime() > 24 * 60 * 60 * 1000
        : false,
    }));
  }, [cars, now]);

  const staleCount = carsWithStale.filter((c) => c.isStale).length;
  const activeCount = (cars?.length ?? 0) - staleCount;

  const searchFn = useCallback((car: TrackingCar, search: string) => {
    const q = search.toLowerCase();
    return (
      car.brand.toLowerCase().includes(q) ||
      car.model.toLowerCase().includes(q) ||
      car.plateNumber.toLowerCase().includes(q) ||
      !!(car.lastLocation && car.lastLocation.toLowerCase().includes(q))
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
    paginatedItems,
  } = useTableState(carsWithStale, searchFn, "brand", "asc");

  const sorted = useMemo(() => {
    if (!carsWithStale.length) return [];
    const items = carsWithStale.filter((car) => searchFn(car, search));
    if (!sortConfig.key) return items;
    return [...items].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof TrackingCar];
      const bVal = b[sortConfig.key as keyof TrackingCar];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [carsWithStale, search, sortConfig, searchFn]);

  const paginated = paginatedItems(sorted);

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <MapPin className="w-7 h-7 text-primary" /> التتبع
        </h1>
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <MapPin className="w-7 h-7 text-primary" /> التتبع
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            iconLeft={<RefreshCw className="w-4 h-4" />}
          >
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: "إجمالي السيارات",
            value: carsWithStale.length,
            color: "text-foreground",
          },
          { label: "نشطة", value: activeCount, color: "text-emerald-400" },
          {
            label: "متوقفة (>24 ساعة)",
            value: staleCount,
            color: "text-danger",
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
            placeholder="بحث بالماركة أو اللوحة أو الموقع..."
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
        <div className="text-sm text-muted">{totalItems} سيارة</div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow columns={5} key={i} />
              ))}
            </tbody>
          </table>
        ) : !sorted.length ? (
          <EmptyState
            icon={MapPin}
            title="لا توجد بيانات تتبع"
            description="ستظهر مواقع السيارات هنا"
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
                        sortKey="brand"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      اللوحة
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="الموقع"
                        sortKey="lastLocation"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                    <th className="p-4 text-sm font-medium text-muted">
                      التحديث
                    </th>
                    <th className="p-4">
                      <SortHeader
                        label="الحالة"
                        sortKey="status"
                        sortConfig={sortConfig}
                        toggleSort={toggleSort}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((car, i) => {
                    const isStale = car.isStale;
                    return (
                      <tr
                        key={car.id}
                        className={`border-b border-border/30 hover:bg-surface-hover/50 transition-all duration-200 ${isStale ? "bg-red-500/[0.04]" : i % 2 === 0 ? "bg-transparent" : "bg-surface/30"}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {isStale && (
                              <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                            )}
                            <span className="text-sm font-medium">
                              {car.brand} {car.model}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-mono">
                          {car.plateNumber}
                        </td>
                        <td className="p-4 text-sm text-muted">
                          {car.lastLocation || "—"}
                        </td>
                        <td className="p-4 text-sm text-muted">
                          {car.lastUpdate || "—"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${carStatusMap[car.status]?.colorClass ?? "bg-muted/15 text-muted border-muted/30"}`}
                          >
                            {carStatusMap[car.status]?.label ?? car.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border/30">
              {paginated.map((car) => {
                const isStale = car.isStale;
                return (
                  <div
                    key={car.id}
                    className={`p-4 space-y-3 ${isStale ? "bg-red-500/[0.04]" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {isStale && (
                          <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-semibold">
                            {car.brand} {car.model}
                          </p>
                          <p className="text-xs text-muted mt-0.5 font-mono">
                            {car.plateNumber}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${carStatusMap[car.status]?.colorClass ?? ""}`}
                      >
                        {carStatusMap[car.status]?.label ?? car.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {car.lastLocation || "—"}
                      </p>
                      <p>{car.lastUpdate || "—"}</p>
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
}
