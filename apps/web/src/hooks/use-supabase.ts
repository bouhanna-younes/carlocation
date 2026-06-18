"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

/** Tables that have a `created_at` column (used for default ordering). */
const TABLES_WITH_CREATED_AT = [
  "profiles", "cars", "customers", "rentals", "maintenance",
  "settings", "notifications", "invoices",
];

export interface SupabaseQueryOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, unknown>;
  select?: string;
  enabled?: boolean;
  staleTime?: number;
}

/** Stable query-key serialization (prevents refetch storms from inline option objects). */
function serializeQueryKey(table: string, options?: SupabaseQueryOptions) {
  return [table, JSON.stringify(options ?? {})];
}

export function useSupabaseQuery<T = unknown[]>(
  table: string,
  options?: SupabaseQueryOptions,
) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 100;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return useQuery({
    queryKey: serializeQueryKey(table, options),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
    queryFn: async () => {
      let query = supabase
        .from(table)
        .select(options?.select ?? "*", { count: "exact" })
        .range(from, to);

      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options?.ascending ?? false });
      } else if (TABLES_WITH_CREATED_AT.includes(table)) {
        query = query.order("created_at", { ascending: false });
      }

      if (options?.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (value !== undefined && value !== null && value !== "") {
            query = query.eq(key, value);
          }
        }
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return {
        data: (data ?? []) as T,
        count: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      };
    },
  });
}

export function useSupabaseInsert(table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from(table)
        .insert(item as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
    },
  });
}

export function useSupabaseUpdate(table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from(table)
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
    },
  });
}

export function useSupabaseDelete(table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
    },
  });
}
