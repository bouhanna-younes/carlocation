"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useRef, useCallback } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { useNotifications } from "@/hooks/use-notifications";
import type { Json } from "@/lib/supabase/database.types";
import {
  LayoutDashboard,
  Car,
  Users,
  KeyRound,
  MapPin,
  BarChart3,
  Wrench,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  managerOnly?: boolean;
  showBadge?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard }] },
  {
    label: "الإدارة",
    items: [
      { href: "/fleet", label: "السيارات", icon: Car },
      { href: "/customers", label: "العملاء", icon: Users },
      { href: "/rentals", label: "الكراء", icon: KeyRound },
      { href: "/tracking", label: "التتبع", icon: MapPin },
      { href: "/maintenance", label: "الصيانة", icon: Wrench },
    ],
  },
  {
    label: "المزيد",
    items: [
      { href: "/invoices", label: "الفواتير", icon: FileText, managerOnly: true },
      { href: "/reports", label: "التقارير", icon: BarChart3, managerOnly: true },
      { href: "/notifications", label: "الإشعارات", icon: Bell, showBadge: true },
      { href: "/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { collapsed, mobileOpen, setMobileOpen, toggleCollapsed } = useSidebar();
  const isManager = user?.role === "manager";

  // Realtime updates for notifications (single subscription shared via useRealtime dedup)
  useRealtime("notifications");

  // Unified notifications hook (replaces the duplicated query in sidebar + topbar)
  const { unreadCount } = useNotifications();

  // Fetch platform name from settings
  const { data: settings } = useQuery<{ name?: string }>({
    queryKey: ["settings", "platform-info"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "platform_info")
        .single<{ value: Json }>();
      const v = data?.value;
      return { name: v && typeof v === "object" ? (v as Record<string, unknown>).name as string : undefined };
    },
  });
  const platformName = settings?.name || "CarLocation";

  // Touch swipe (mobile)
  const sidebarRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.innerWidth >= 1024) return;
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isSwiping.current || window.innerWidth >= 1024) return;
      touchCurrentX.current = e.touches[0].clientX;
      const diff = touchStartX.current - touchCurrentX.current;
      if (sidebarRef.current) {
        if (mobileOpen && diff > 0) {
          sidebarRef.current.style.transform = `translateX(${Math.max(-280, -diff)}px)`;
        } else if (!mobileOpen && diff < 0) {
          sidebarRef.current.style.transform = `translateX(${280 - Math.min(280, Math.abs(diff))}px)`;
        }
      }
    },
    [mobileOpen],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current || window.innerWidth >= 1024) return;
    isSwiping.current = false;
    const diff = touchStartX.current - touchCurrentX.current;
    if (sidebarRef.current) sidebarRef.current.style.transform = "";
    if (mobileOpen && diff > 80) setMobileOpen(false);
    else if (!mobileOpen && diff < -80) setMobileOpen(true);
    touchStartX.current = 0;
    touchCurrentX.current = 0;
  }, [mobileOpen, setMobileOpen]);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || window.innerWidth >= 1024) return;
    sidebar.addEventListener("touchstart", handleTouchStart, { passive: true });
    sidebar.addEventListener("touchmove", handleTouchMove, { passive: true });
    sidebar.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      sidebar.removeEventListener("touchstart", handleTouchStart);
      sidebar.removeEventListener("touchmove", handleTouchMove);
      sidebar.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Lock body scroll when mobile sidebar open + close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        aria-label="القائمة الجانبية"
        className={cn(
          "fixed right-0 top-0 z-50 h-screen flex flex-col",
          "bg-surface border-l border-border/40",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "translate-x-full",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          "w-[280px] max-w-[85vw]",
        )}
      >
        {/* Brand + collapse */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-border/30 shrink-0",
            collapsed ? "justify-center px-2" : "px-4 justify-between",
          )}
        >
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-2-2.1-3.4C13.1 5.5 11.7 5 10.5 5H5.6c-.8 0-1.6.4-2 1.1L2 9.3C1.4 10 1 10.9 1 11.8V16c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <path d="M9 17h6" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                </div>
                <span className="text-[15px] font-bold tracking-tight gradient-text">
                  {platformName}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="طي القائمة"
                className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors hidden lg:flex"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="توسيع القائمة"
              className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors hidden lg:flex"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق القائمة"
            className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors lg:hidden"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          {navGroups.map((group, gi) => {
            const visibleItems = group.items.filter((item) => !item.managerOnly || isManager);
            if (visibleItems.length === 0) return null;
            return (
              <div key={gi} className={cn(gi > 0 && "mt-3")}>
                {group.label && !collapsed && (
                  <div className="px-4 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted/40">
                    {group.label}
                  </div>
                )}
                <div className="px-2 space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center rounded-xl transition-all duration-200 relative group",
                          collapsed ? "justify-center p-2.5 mx-auto w-11 h-11" : "gap-3 px-3 py-2.5",
                          isActive
                            ? "bg-primary/[0.08] text-primary"
                            : "text-muted hover:bg-surface-hover/50 hover:text-foreground",
                        )}
                      >
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-l-full" aria-hidden="true" />
                        )}
                        <item.icon
                          className={cn(
                            "w-[18px] h-[18px] shrink-0",
                            isActive ? "text-primary" : "text-muted group-hover:text-foreground/70",
                          )}
                        />
                        {!collapsed && (
                          <>
                            <span className="text-[13px] font-medium flex-1 truncate">{item.label}</span>
                            {item.showBadge && unreadCount > 0 && (
                              <span
                                role="status"
                                aria-label={`${unreadCount} إشعارات غير مقروءة`}
                                className="min-w-[18px] h-[18px] flex items-center justify-center bg-danger text-white text-[10px] font-bold rounded-full px-1"
                              >
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </>
                        )}
                        {collapsed && item.showBadge && unreadCount > 0 && (
                          <span className="absolute top-0.5 left-0.5 w-2 h-2 bg-danger rounded-full border-2 border-surface" aria-hidden="true" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-border/30 shrink-0", collapsed ? "p-2 flex flex-col items-center" : "p-3")}>
          {!collapsed && user && (
            <div className="mb-3 px-2">
              <p className="text-[13px] font-medium truncate">{user.name}</p>
              <p className="text-[11px] text-muted mt-0.5 truncate">{user.email}</p>
              <div
                className={cn(
                  "inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium",
                  user.role === "manager"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-secondary/10 text-secondary border border-secondary/20",
                )}
              >
                {user.role === "manager" ? "مدير" : "عامل"}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            aria-label="تسجيل الخروج"
            className={cn(
              "flex items-center gap-2 rounded-xl text-[13px] text-muted hover:bg-danger/10 hover:text-danger transition-colors",
              collapsed ? "justify-center p-2.5 w-11 h-11" : "w-full px-3 py-2.5",
            )}
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!collapsed && "تسجيل الخروج"}
          </button>
        </div>
      </aside>
    </>
  );
}
