"use client";

import Link from "next/link";
import {
  Search,
  Bell,
  Menu,
  LogOut,
  Settings as SettingsIcon,
  CheckCheck,
  BellRing,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useNotifications } from "@/hooks/use-notifications";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRealtime } from "@/hooks/use-realtime";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { user, logout } = useAuth();
  const { collapsed, toggleMobile } = useSidebar();
  const searchRef = useRef<HTMLInputElement>(null);

  // Single source of truth for notifications (shared with sidebar via React Query cache)
  useRealtime("notifications");
  const { recentNotifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Ctrl+K shortcut to focus search
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

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "success": return "bg-success/15 text-success";
      case "warning": return "bg-warning/15 text-warning";
      case "error": return "bg-danger/15 text-danger";
      default: return "bg-info/15 text-info";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "success": return "نجاح";
      case "warning": return "تنبيه";
      case "error": return "خطأ";
      default: return "معلومة";
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
          type="button"
          onClick={toggleMobile}
          aria-label="فتح القائمة"
          className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors lg:hidden shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" aria-hidden="true" />
          <label htmlFor="topbar-search" className="sr-only">بحث</label>
          <input
            id="topbar-search"
            ref={searchRef}
            type="text"
            placeholder="بحث..."
            aria-keyshortcuts="Control+K"
            className="w-full bg-surface/50 border border-border/50 rounded-xl pr-10 pl-4 py-2 text-sm text-foreground placeholder:text-muted/40 hover:border-border-light focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
          <kbd className="absolute left-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 text-[10px] text-muted/40 bg-surface-hover/50 rounded px-1.5 py-0.5 border border-border/30 font-mono" aria-hidden="true">
            Ctrl K
          </kbd>
        </div>

        <button
          type="button"
          onClick={() => searchRef.current?.focus()}
          aria-label="بحث"
          className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors sm:hidden shrink-0"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Notifications dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`التنبيهات${unreadCount > 0 ? ` (${unreadCount} غير مقروءة)` : ""}`}
              className="relative p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 left-1 min-w-[16px] h-[16px] flex items-center justify-center bg-danger text-white text-[9px] font-bold rounded-full px-1 animate-pulse-ring">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[340px] sm:w-[380px] p-0">
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
                  type="button"
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
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
                      type="button"
                      key={notification.id}
                      onClick={() => {
                        if (!notification.isRead) markAsRead.mutate(notification.id);
                      }}
                      className={cn(
                        "flex items-start gap-3 w-full px-4 py-3 text-right hover:bg-surface-hover/50 transition-colors",
                        !notification.isRead && "bg-primary/[0.03]",
                      )}
                    >
                      <div className={cn("mt-0.5 w-2 h-2 rounded-full shrink-0", !notification.isRead ? "bg-primary" : "bg-border")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={cn("text-[13px] font-medium truncate", !notification.isRead ? "text-foreground" : "text-muted")}>
                            {notification.title}
                          </p>
                          <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0", getTypeStyle(notification.type))}>
                            {getTypeLabel(notification.type)}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted/70 line-clamp-2 leading-relaxed">{notification.message}</p>
                        <p className="text-[10px] text-muted/40 mt-1">{timeAgo(notification.createdAt)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border/50 px-2 py-2">
              <Link
                href="/notifications"
                className="flex items-center justify-center w-full py-2 text-[13px] font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors"
              >
                عرض جميع الإشعارات
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        <div className="w-px h-6 sm:h-7 bg-border/40 mx-0.5 sm:mx-1" aria-hidden="true" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="قائمة المستخدم"
              className="flex items-center gap-2 py-1.5 px-1.5 sm:px-2 rounded-xl hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/15 border border-border/50 flex items-center justify-center">
                <span className="text-[11px] sm:text-xs font-bold text-primary">
                  {user?.name?.charAt(0) || "م"}
                </span>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-[13px] font-medium leading-tight">{user?.name || "المستخدم"}</p>
                <p className="text-[10px] text-muted leading-tight">
                  {user?.role === "manager" ? "مدير" : "عامل"}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium text-foreground">{user?.name || "المستخدم"}</p>
              <p className="text-xs text-muted mt-0.5" dir="ltr">{user?.email || ""}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-3 w-full">
                <SettingsIcon className="w-4 h-4" />
                الإعدادات
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
