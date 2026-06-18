"use client";

import { useEffect, useId, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

const DASHBOARD_RELATED = new Set([
  "cars",
  "rentals",
  "maintenance",
  "customers",
  "invoices",
  "notifications",
]);

let channelCounter = 0;

export function useRealtime(table: string) {
  const queryClient = useQueryClient();
  const statusRef = useRef<string>("connecting");
  const reactId = useId();

  useEffect(() => {
    const channelName = `rt:${table}:${reactId}:${channelCounter++}`;

    const channel = supabase
      .channel(channelName)
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
        if (
          status === "error" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          console.error(`[realtime] channel '${channelName}' error`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient, reactId]);
}
