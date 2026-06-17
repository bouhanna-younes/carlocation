"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

/**
 * Supabase Realtime hook — subscribes to postgres_changes on a table
 * and invalidates related React Query keys automatically.
 */
export function useRealtime(table: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-rt-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          // Invalidate the table query
          queryClient.invalidateQueries({ queryKey: [table] });

          // Invalidate dashboard queries for related tables
          if (["cars", "rentals", "maintenance", "customers"].includes(table)) {
            queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
            queryClient.invalidateQueries({ queryKey: ["revenue-chart"] });
            queryClient.invalidateQueries({ queryKey: ["recent-rentals"] });
            queryClient.invalidateQueries({ queryKey: ["upcoming-returns"] });
            queryClient.invalidateQueries({ queryKey: ["pending-maintenance"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient]);
}
