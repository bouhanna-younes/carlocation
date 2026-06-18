"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";

export function useRole() {
  const { user, isLoading } = useAuth();
  return useMemo(
    () => ({
      isManager: user?.role === "manager",
      isWorker: user?.role === "worker",
      role: user?.role ?? null,
      isLoading,
    }),
    [user, isLoading],
  );
}
