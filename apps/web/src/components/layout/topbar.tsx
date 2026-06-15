"use client";

import Link from "next/link";
import {
  Search,
  Bell,
  Menu,
  LogOut,
  Settings,
  ChevronDown,
  CheckCheck,
  BellRing,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Notification } from "@/lib/mappers";

export function Topbar() {
  const { user, logout } = useAuth();
  const { collapsed, toggleMobile } = useSidebar();
  const searchRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as Notification[];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true } as never)
        .eq("is_read", false);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const recentNotifications = notifications?.slice(0, 8) ?? [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return "bg-success/15 text-success";
      case "warning":
        return "bg-warning/15 text-warning";
      case "danger":
        return "bg-danger/15 text-danger";
      default:
        return "bg-info/15 text-info";
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 z-30 h-14 sm:h-16 bg-background/80 backdrop-blur-xl border-b border-border/40",
        "flex items-center justify-between px-3 sm:px-4 lg:px-6 transition-all duration-300 ease-in-out",
        "left-0",
        collapsed ? "lg:right-[72px]" : "lg:right-64",
        "right-0",
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <button
          onClick={toggleMobile}
          aria-label="فتح القائمة"
          className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors lg:hidden shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
          <input
            ref={searchRef}
            type="text"
            placeholder="بحث..."
            className="w-full bg-surface/50 border border-border/50 rounded-xl pr-10 pl-4 py-2 text-sm text-foreground placeholder:text-muted/40 hover:border-border-light focus:border-primary/40 transition-all duration-200"
          />
          <kbd className="absolute left-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 text-[10px] text-muted/40 bg-surface-hover/50 rounded px-1.5 py-0.5 border border-border/30 font-mono">
            Ctrl K
          </kbd>
        </div>

        <button
          onClick={() => searchRef.current?.focus()}
          aria-label="بحث"
          className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors sm:hidden shrink-0"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setUserMenuOpen(false);
            }}
            aria-label={`التنبيهات${unreadCount > 0 ? ` (${unreadCount} غير مقروءة)` : ""}`}
            className="relative p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 left-1 min-w-[16px] h-[16px] flex items-center justify-center bg-danger text-white text-[9px] font-bold rounded-full px-1 animate-pulse-ring">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-[340px] sm:w-[380px] rounded-2xl bg-surface border border-border shadow-2xl animate-scale-in z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">الإشعارات</h3>
                  {unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 flex items-center justify-center bg-primary/15 text-primary text-[10px] font-bold rounded-full px-1.5">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary-hover transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted">
                    <Bell className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">لا توجد إشعارات</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {recentNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => {
                          if (!notification.isRead) {
                            markAsReadMutation.mutate(notification.id);
                          }
                        }}
                        className={cn(
                          "flex items-start gap-3 w-full px-4 py-3 text-right hover:bg-surface-hover/50 transition-colors",
                          !notification.isRead && "bg-primary/[0.03]",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 w-2 h-2 rounded-full shrink-0",
                            !notification.isRead ? "bg-primary" : "bg-border",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p
                              className={cn(
                                "text-[13px] font-medium truncate",
                                !notification.isRead
                                  ? "text-foreground"
                                  : "text-muted",
                              )}
                            >
                              {notification.title}
                            </p>
                            <span
                              className={cn(
                                "text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                                getTypeIcon(notification.type),
                              )}
                            >
                              {notification.type === "success"
                                ? "نجاح"
                                : notification.type === "warning"
                                  ? "تنبيه"
                                  : notification.type === "danger"
                                    ? "خطأ"
                                    : "معلومة"}
                            </span>
                          </div>
                          <p className="text-[12px] text-muted/70 line-clamp-2 leading-relaxed">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted/40 mt-1">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 px-2 py-2">
                <Link
                  href="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center justify-center w-full py-2 text-[13px] font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors"
                >
                  عرض جميع الإشعارات
                </Link>
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />

        <div className="w-px h-6 sm:h-7 bg-border/40 mx-0.5 sm:mx-1" />

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setDropdownOpen(false);
            }}
            aria-label="قائمة المستخدم"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-2 py-1.5 px-1.5 sm:px-2 rounded-xl hover:bg-surface-hover transition-colors"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-border/50 flex items-center justify-center">
              <span className="text-[11px] sm:text-xs font-bold text-primary">
                {user?.name?.charAt(0) || "م"}
              </span>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-[13px] font-medium leading-tight">
                {user?.name || "المدير"}
              </p>
              <p className="text-[10px] text-muted leading-tight">
                {user?.role === "manager" ? "مدير" : "عامل"}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted hidden md:block transition-transform duration-200",
                userMenuOpen && "rotate-180",
              )}
            />
          </button>

          {userMenuOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-surface border border-border shadow-2xl py-2 animate-scale-in z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50">
                <p className="text-sm font-medium">{user?.name || "المدير"}</p>
                <p className="text-xs text-muted mt-0.5" dir="ltr">
                  {user?.email || ""}
                </p>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  الإعدادات
                </Link>
              </div>

              <div className="border-t border-border/50 pt-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
