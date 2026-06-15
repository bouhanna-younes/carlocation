"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/layout/sidebar-context";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main
        className={cn(
          "pt-14 sm:pt-16 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "mr-0",
          collapsed ? "lg:mr-[72px]" : "lg:mr-64",
        )}
      >
        <div className="max-w-[1400px] p-3 sm:p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- Next.js hydration pattern
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-border rounded-full" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-muted text-sm">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppShell>{children}</AppShell>
    </SidebarProvider>
  );
}
