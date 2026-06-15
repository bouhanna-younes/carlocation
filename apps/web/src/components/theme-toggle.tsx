"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light" | "system";

const themes: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "dark", label: "الوضع الداكن", icon: Moon },
  { value: "light", label: "الوضع الفاتح", icon: Sun },
  { value: "system", label: "تلقائي", icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = useCallback(
    (value: Theme) => {
      document.documentElement.classList.add("theme-transition");
      setTheme(value);
      setOpen(false);
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transition");
      }, 350);
    },
    [setTheme],
  );

  if (!mounted) {
    return <div className="w-10 h-10 rounded-xl" />;
  }

  const current = themes.find((t) => t.value === theme) ?? themes[0];
  const CurrentIcon = current.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "p-2.5 rounded-xl transition-colors duration-200",
          open
            ? "bg-surface-hover text-foreground"
            : "text-muted hover:text-foreground hover:bg-surface-hover",
        )}
        aria-label="إعدادات المظهر"
      >
        <CurrentIcon className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl bg-surface border border-border shadow-2xl py-1.5 animate-scale-in z-50">
          <div className="px-3 py-2 border-b border-border/50 mb-1">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              المظهر
            </p>
          </div>
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => select(t.value)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 text-[13px] transition-colors",
                  isActive
                    ? "text-primary bg-primary/[0.06]"
                    : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-right">{t.label}</span>
                {isActive && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
