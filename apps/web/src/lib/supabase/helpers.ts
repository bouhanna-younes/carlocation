import { supabase } from "./client";

// =====================================================
// GENERIC TABLE HELPERS
// =====================================================
export function createTableHelpers(table: string) {
  return {
    getAll: async (options?: {
      page?: number;
      limit?: number;
      orderBy?: string;
      ascending?: boolean;
    }): Promise<{ data: unknown[]; count: number }> => {
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 100;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from(table)
        .select("*", { count: "exact" })
        .range(from, to);

      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.ascending ?? false,
        });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      return { data: data ?? [], count: count ?? 0 };
    },

    getById: async (id: string): Promise<unknown> => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    create: async (item: Record<string, unknown>): Promise<unknown> => {
      const { data, error } = await supabase
        .from(table)
        .insert(item as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    update: async (
      id: string,
      updates: Record<string, unknown>,
    ): Promise<unknown> => {
      const { data, error } = await (supabase
        .from(table) as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    remove: async (id: string): Promise<void> => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    search: async (query: string, columns: string[]): Promise<unknown[]> => {
      let q = supabase.from(table).select("*");
      const orParts = columns.map((col) => `${col}.ilike.%${query}%`);
      q = q.or(orParts.join(","));
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  };
}

// =====================================================
// PRE-BUILT TABLE HELPERS
// =====================================================
export const carsApi = createTableHelpers("cars");
export const customersApi = createTableHelpers("customers");
export const rentalsApi = createTableHelpers("rentals");
export const maintenanceApi = createTableHelpers("maintenance");
export const notificationsApi = createTableHelpers("notifications");
export const settingsApi = createTableHelpers("settings");
export const trackingApi = createTableHelpers("tracking");
