"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapNotification, type Notification } from "@/lib/mappers";
import { ErrorState } from "@/components/shared/error-state";
import {
  Bell,
  Check,
  BellOff,
  CheckCheck,
  Trash2,
  Info,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { timeAgo } from "@/lib/utils";

type FilterType = "all" | "unread" | "read";

const typeIconMap: Record<
  string,
  { icon: typeof Bell; color: string; bg: string }
> = {
  info: { icon: Bell, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  success: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border/50 animate-pulse">
      <div className="h-10 w-10 bg-surface-hover rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-surface-hover rounded" />
        <div className="h-3 w-64 bg-surface-hover rounded" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const {
    data: notifications,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<any[]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapNotification);
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("notifications") as any)
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("تم تحديد الإشعار كمقروء");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("تم حذف الإشعار");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase
        .from("notifications") as any)
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("تم تحديد جميع الإشعارات كمقروءة");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const filtered = useMemo(() => {
    if (!notifications) return [];
    let result = notifications;
    if (filter === "unread") result = result.filter((n) => !n.isRead);
    if (filter === "read") result = result.filter((n) => n.isRead);
    if (typeFilter !== "all")
      result = result.filter((n) => n.type === typeFilter);
    return result;
  }, [notifications, filter, typeFilter]);

  const filterCounts = useMemo(() => {
    if (!notifications) return { all: 0, unread: 0, read: 0 };
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      read: notifications.filter((n) => n.isRead).length,
    };
  }, [notifications]);

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Bell className="w-7 h-7 text-primary" /> الإشعارات
        </h1>
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Bell className="w-7 h-7 text-primary" /> الإشعارات
          {unreadCount > 0 && (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl transition-all duration-200 disabled:opacity-50 hover-lift"
          >
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {(["all", "unread", "read"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === f
                ? "bg-primary text-white"
                : "bg-surface/50 text-muted hover:bg-surface-hover border border-border"
            }`}
          >
            {f === "all" ? "الكل" : f === "unread" ? "غير مقروء" : "مقروء"}
            <span className="mr-1.5 text-xs opacity-70">
              ({filterCounts[f]})
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all", label: "الكل", icon: Bell },
          { key: "info", label: "معلومات", icon: Info },
          { key: "success", label: "نجاح", icon: CheckCircle },
          { key: "warning", label: "تحذير", icon: AlertTriangle },
        ].map((f) => {
          const Icon = f.icon;
          const count =
            f.key === "all"
              ? (notifications?.length ?? 0)
              : (notifications?.filter((n) => n.type === f.key).length ?? 0);
          return (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === f.key
                  ? "bg-primary text-white"
                  : "bg-surface/50 text-muted hover:bg-surface-hover border border-border"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
              <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/10 mb-4">
              <BellOff className="w-8 h-8 text-muted" />
            </div>
            <p className="text-muted text-lg">
              {filter === "all"
                ? "لا توجد إشعارات"
                : filter === "unread"
                  ? "لا توجد إشعارات غير مقروءة"
                  : "لا توجد إشعارات مقروءة"}
            </p>
            <p className="text-muted text-sm mt-1">
              {filter === "all"
                ? "ستظهر الإشعارات الجديدة هنا"
                : "جرب تصفية أخرى"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((n) => {
              const typeConfig = typeIconMap[n.type] || typeIconMap.info;
              const TypeIcon = typeConfig.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate(n.id);
                  }}
                  className={`flex items-start gap-4 p-4 transition-all duration-200 cursor-pointer ${
                    n.isRead
                      ? "opacity-60"
                      : "bg-emerald-500/[0.04] border-r-2 border-r-primary"
                  } hover:bg-surface-hover/30`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${n.isRead ? "bg-muted/10" : typeConfig.bg}`}
                  >
                    <TypeIcon
                      className={`w-4 h-4 ${n.isRead ? "text-muted" : typeConfig.color}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${n.isRead ? "font-normal" : "font-semibold"}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-sm text-muted mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted/60 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead.mutate(n.id);
                        }}
                        disabled={markRead.isPending}
                        className="flex items-center gap-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50"
                        title="تحديد كمقروء"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification.mutate(n.id);
                      }}
                      disabled={deleteNotification.isPending}
                      className="flex items-center gap-1 text-xs bg-danger/10 hover:bg-danger/20 text-danger px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50"
                      title="حذف"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
