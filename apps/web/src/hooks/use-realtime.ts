"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

/**
 * Supabase Realtime hook — subscribes to postgres_changes on a table
 * and invalidates related React Query keys automatically.
 *
 * Uses a STABLE channel name per table so that multiple components
 * subscribing to the same table share one connection (Supabase dedupes
 * channels by name within a single client).
 */
const DASHBOARD_RELATED = new Set(["cars", "rentals", "maintenance", "customers", "invoices", "notifications"]);

export function useRealtime(table: string) {
  const queryClient = useQueryClient();
  const statusRef = useRef<string>("connecting");

  useEffect(() => {
    // Stable channel name — Supabase dedupes identical channel names within a client.
    const channel = supabase
      .channel(`rt:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          queryClient.invalidateQueries({ queryKey: [table] });
          if (DASHBOARD_RELATED.has(table)) {
            queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
          }
        },
      )
      .subscribe((status: string) => {
        statusRef.current = status;
        if (status === "error" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`[realtime] channel 'rt:${table}' error`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient]);
}
