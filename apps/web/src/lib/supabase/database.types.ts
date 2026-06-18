/**
 * Supabase Database Types
 *
 * IMPORTANT: These types are maintained in sync with the migration files.
 * To regenerate from a live database:
 *   npx supabase gen types --lang=typescript --project-id <project-id> > src/lib/supabase/database.types.ts
 *
 * Reflects schema after migration 007 (comprehensive security & integrity fixes).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CarStatus = "available" | "rented" | "maintenance" | "out_of_service";
export type Transmission = "manual" | "automatic";
export type RentalStatus = "active" | "completed" | "overdue" | "cancelled" | "reserved";
export type MaintenanceStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type Priority = "low" | "medium" | "high" | "critical";
export type NotificationType = "info" | "success" | "warning" | "error";
export type InvoiceStatus = "pending" | "paid" | "refunded" | "cancelled";
export type UserRole = "manager" | "worker";

interface TableDefinition<Row, Insert, Update> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: GenericRelationship[];
}

interface ViewDefinition<Row> {
  Row: Row;
  Relationships: GenericRelationship[];
}

interface GenericRelationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<{
        id: string;
        email: string;
        name: string;
        role: UserRole;
        active: boolean;
        created_at: string;
        updated_at: string;
      }, {
        id: string;
        email: string;
        name: string;
        role?: UserRole;
        active?: boolean;
      }, {
        name?: string;
        role?: UserRole;
        active?: boolean;
      }>;
      cars: TableDefinition<{
        id: string;
        brand: string;
        model: string;
        year: number;
        plate_number: string;
        color: string;
        daily_rate: number;
        status: CarStatus;
        fuel_type: string;
        seats: number;
        transmission: Transmission;
        insurance_expiry: string | null;
        oil_change_expiry: string | null;
        vignette_expiry: string | null;
        inspection_expiry: string | null;
        created_at: string;
        updated_at: string;
      }, {
        brand: string;
        model: string;
        year: number;
        plate_number: string;
        color: string;
        daily_rate: number;
        status?: CarStatus;
        fuel_type: string;
        seats: number;
        transmission?: Transmission;
        insurance_expiry?: string;
        oil_change_expiry?: string;
        vignette_expiry?: string;
        inspection_expiry?: string;
      }, {
        brand?: string;
        model?: string;
        year?: number;
        plate_number?: string;
        color?: string;
        daily_rate?: number;
        status?: CarStatus;
        fuel_type?: string;
        seats?: number;
        transmission?: Transmission;
        insurance_expiry?: string;
        oil_change_expiry?: string;
        vignette_expiry?: string;
        inspection_expiry?: string;
      }>;
      customers: TableDefinition<{
        id: string;
        first_name: string;
        last_name: string;
        phone: string;
        email: string | null;
        address: string | null;
        id_number: string | null;
        driver_license_number: string | null;
        driver_license_expiry: string | null;
        date_of_birth: string | null;
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
        notes: string | null;
        blacklisted: boolean;
        blacklist_reason: string | null;
        created_at: string;
        updated_at: string;
      }, {
        first_name: string;
        last_name: string;
        phone: string;
        email?: string;
        address?: string;
        id_number?: string;
        driver_license_number?: string;
        driver_license_expiry?: string;
        date_of_birth?: string;
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
        notes?: string;
        blacklisted?: boolean;
        blacklist_reason?: string;
      }, {
        first_name?: string;
        last_name?: string;
        phone?: string;
        email?: string;
        address?: string;
        id_number?: string;
        driver_license_number?: string;
        driver_license_expiry?: string;
        date_of_birth?: string;
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
        notes?: string;
        blacklisted?: boolean;
        blacklist_reason?: string;
      }>;
      rentals: TableDefinition<{
        id: string;
        customer_id: string;
        car_id: string;
        renter_id: string;
        start_date: string;
        end_date: string;
        return_date: string | null;
        daily_rate: number;
        total_amount: number | null;
        deposit_amount: number | null;
        deposit_paid: boolean;
        deposit_refunded: boolean;
        start_mileage: number | null;
        end_mileage: number | null;
        status: RentalStatus;
        notes: string | null;
        discount_percent: number | null;
        discount_reason: string | null;
        created_at: string;
        updated_at: string;
      }, {
        customer_id: string;
        car_id: string;
        renter_id: string;
        start_date: string;
        end_date: string;
        daily_rate: number;
        total_amount?: number;
        deposit_amount?: number;
        deposit_paid?: boolean;
        start_mileage?: number;
        status?: RentalStatus;
        notes?: string;
        discount_percent?: number;
        discount_reason?: string;
      }, {
        return_date?: string;
        total_amount?: number;
        deposit_refunded?: boolean;
        end_mileage?: number;
        status?: RentalStatus;
        notes?: string;
        start_mileage?: number;
        deposit_amount?: number;
        deposit_paid?: boolean;
        discount_percent?: number;
        discount_reason?: string;
        end_date?: string;
      }>;
      maintenance: TableDefinition<{
        id: string;
        car_id: string;
        type: string;
        description: string;
        cost: number;
        status: MaintenanceStatus;
        priority: Priority;
        vendor_name: string | null;
        vendor_phone: string | null;
        mileage_at_start: number | null;
        mileage_at_completion: number | null;
        scheduled_at: string | null;
        completed_at: string | null;
        created_at: string;
        updated_at: string;
      }, {
        car_id: string;
        type: string;
        description: string;
        cost: number;
        status?: MaintenanceStatus;
        priority?: Priority;
        vendor_name?: string;
        vendor_phone?: string;
        mileage_at_start?: number;
        scheduled_at?: string;
      }, {
        type?: string;
        description?: string;
        cost?: number;
        status?: MaintenanceStatus;
        priority?: Priority;
        vendor_name?: string;
        vendor_phone?: string;
        mileage_at_start?: number;
        mileage_at_completion?: number;
        scheduled_at?: string;
        completed_at?: string;
      }>;
      tracking: TableDefinition<{
        id: string;
        car_id: string;
        latitude: number;
        longitude: number;
        speed: number | null;
        heading: number | null;
        timestamp: string;
      }, {
        car_id: string;
        latitude: number;
        longitude: number;
        speed?: number;
        heading?: number;
        timestamp?: string;
      }, Record<string, never>>;
      settings: TableDefinition<{
        id: string;
        key: string;
        value: Json;
        created_at: string;
        updated_at: string;
      }, {
        key: string;
        value: Json;
      }, {
        value?: Json;
      }>;
      notifications: TableDefinition<{
        id: string;
        title: string;
        message: string;
        type: NotificationType;
        is_read: boolean;
        category: string;
        metadata: Json | null;
        recipient_id: string | null;
        created_at: string;
      }, {
        title: string;
        message: string;
        type?: NotificationType;
        category?: string;
        metadata?: Json;
        recipient_id?: string;
        is_read?: boolean;
      }, {
        is_read?: boolean;
        title?: string;
        message?: string;
      }>;
      invoices: TableDefinition<{
        id: string;
        rental_id: string;
        customer_id: string;
        car_id: string;
        invoice_number: string;
        invoice_date: string;
        start_date: string;
        end_date: string;
        return_date: string | null;
        daily_rate: number;
        total_days: number;
        total_amount: number;
        deposit_amount: number;
        is_cancelled: boolean;
        cancelled_at: string | null;
        cancellation_reason: string | null;
        penalty_percent: number;
        penalty_amount: number;
        refund_amount: number;
        paid_amount: number;
        payment_method: string | null;
        status: InvoiceStatus;
        notes: string | null;
        created_at: string;
        updated_at: string;
      }, {
        rental_id: string;
        customer_id: string;
        car_id: string;
        invoice_number: string;
        start_date: string;
        end_date: string;
        daily_rate: number;
        total_days: number;
        total_amount: number;
        deposit_amount?: number;
        status?: InvoiceStatus;
        notes?: string;
      }, {
        return_date?: string;
        paid_amount?: number;
        payment_method?: string;
        status?: InvoiceStatus;
        is_cancelled?: boolean;
        cancelled_at?: string;
        cancellation_reason?: string;
        penalty_percent?: number;
        penalty_amount?: number;
        refund_amount?: number;
        total_days?: number;
        total_amount?: number;
        notes?: string;
      }>;
    };
    Views: {
      latest_tracking: ViewDefinition<{
        id: string;
        car_id: string;
        latitude: number;
        longitude: number;
        speed: number | null;
        heading: number | null;
        timestamp: string;
      }>;
    };
    Functions: {
      mark_overdue_rentals: {
        Args: Record<string, never>;
        Returns: number;
      };
      check_and_create_expiry_notifications: {
        Args: Record<string, never>;
        Returns: number;
      };
      dashboard_kpis: {
        Args: Record<string, never>;
        Returns: Json;
      };
      monthly_revenue: {
        Args: { p_year?: number };
        Returns: {
          month_index: number;
          month_label: string;
          revenue: number;
          count: number;
        }[];
      };
      top_cars: {
        Args: { p_limit?: number };
        Returns: {
          car_id: string;
          brand: string;
          model: string;
          plate_number: string;
          total_revenue: number;
          rentals_count: number;
        }[];
      };
      top_customers: {
        Args: { p_limit?: number };
        Returns: {
          customer_id: string;
          first_name: string;
          last_name: string;
          total_spent: number;
          rentals_count: number;
        }[];
      };
      customer_stats: {
        Args: Record<string, never>;
        Returns: {
          customer_id: string;
          total_rentals: number;
          active_rentals: number;
          completed_rentals: number;
          total_spent: number;
          outstanding: number;
        }[];
      };
    };
  };
}

// Convenience aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CarRow = Database["public"]["Tables"]["cars"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type RentalRow = Database["public"]["Tables"]["rentals"]["Row"];
export type MaintenanceRow = Database["public"]["Tables"]["maintenance"]["Row"];
export type TrackingRow = Database["public"]["Tables"]["tracking"]["Row"];
export type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
