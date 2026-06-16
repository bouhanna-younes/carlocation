"use client";

import { useAuth } from "./use-auth";

export function useRole() {
  const { user } = useAuth();
  return {
    isManager: user?.role === "manager",
    isWorker: user?.role === "worker",
    role: user?.role,
  };
}
