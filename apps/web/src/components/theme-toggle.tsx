"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "dark" | "light" | "system";

const themes: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "dark", label: "الوضع الداكن", icon: Moon },
  { value: "light", label: "الوضع الفاتح", icon: Sun },
  { value: "system", label: "تلقائي", icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer to avoid cascading renders flagged by React Compiler
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10 rounded-xl" aria-hidden="true" />;
  }

  const current = themes.find((t) => t.value === theme) ?? themes[0];
  const CurrentIcon = current.icon;

  const select = (value: Theme) => {
    document.documentElement.classList.add("theme-transition");
    setTheme(value);
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 350);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="إعدادات المظهر"
          className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <CurrentIcon className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>المظهر</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => {
          const Icon = t.icon;
          const isActive = theme === t.value;
          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => select(t.value)}
              className={cn(isActive && "text-primary")}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{t.label}</span>
              {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
