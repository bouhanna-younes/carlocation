import { supabase } from "./client";
import type {
  CarRow,
  CustomerRow,
  RentalRow,
  MaintenanceRow,
  NotificationRow,
  SettingsRow,
} from "./database.types";

/** Tables that have a `created_at` column (used for default ordering). */
const TABLES_WITH_CREATED_AT = new Set([
  "profiles", "cars", "customers", "rentals", "maintenance",
  "settings", "notifications", "invoices",
]);

/** Escape special PostgREST ilike pattern characters. */
function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface TableHelpers<Row, Insert, Update> {
  getAll(options?: QueryOptions): Promise<{ data: Row[]; count: number }>;
  getById(id: string): Promise<Row | null>;
  create(item: Insert): Promise<Row>;
  update(id: string, updates: Update): Promise<Row>;
  remove(id: string): Promise<void>;
  search(query: string, columns: string[]): Promise<Row[]>;
}

function buildHelpers<Row, Insert, Update>(table: string): TableHelpers<Row, Insert, Update> {
  return {
    async getAll(options?: QueryOptions) {
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 100;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      let query = supabase.from(table).select("*", { count: "exact" }).range(from, to);
      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options?.ascending ?? false });
      } else if (TABLES_WITH_CREATED_AT.has(table)) {
        query = query.order("created_at", { ascending: false });
      }
      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      return { data: (data ?? []) as unknown as Row[], count: count ?? 0 };
    },
    async getById(id: string) {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
      if (error) throw new Error(error.message);
      return data as unknown as Row;
    },
    async create(item: Insert) {
      const { data, error } = await supabase.from(table).insert(item as never).select().single();
      if (error) throw new Error(error.message);
      return data as unknown as Row;
    },
    async update(id: string, updates: Update) {
      const { data, error } = await supabase.from(table).update(updates as never).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as unknown as Row;
    },
    async remove(id: string) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    async search(query: string, columns: string[]) {
      const escaped = escapeIlike(query);
      const orParts = columns.map((col) => `${col}.ilike.%${escaped}%`);
      const { data, error } = await supabase.from(table).select("*").or(orParts.join(","));
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Row[];
    },
  };
}

export const carsApi = buildHelpers<CarRow, never, never>("cars");
export const customersApi = buildHelpers<CustomerRow, never, never>("customers");
export const rentalsApi = buildHelpers<RentalRow, never, never>("rentals");
export const maintenanceApi = buildHelpers<MaintenanceRow, never, never>("maintenance");
export const notificationsApi = buildHelpers<NotificationRow, never, never>("notifications");
export const settingsApi = buildHelpers<SettingsRow, never, never>("settings");
