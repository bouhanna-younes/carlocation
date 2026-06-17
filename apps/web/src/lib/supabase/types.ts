export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: "manager" | "worker";
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: "manager" | "worker";
          active?: boolean;
        };
        Update: {
          name?: string;
          role?: "manager" | "worker";
          active?: boolean;
        };
      };
      cars: {
        Row: {
          id: string;
          brand: string;
          model: string;
          year: number;
          plate_number: string;
          color: string;
          daily_rate: number;
          status: "available" | "rented" | "maintenance" | "out_of_service";
          fuel_type: string;
          seats: number;
          transmission: "manual" | "automatic";
          insurance_expiry: string | null;
          oil_change_expiry: string | null;
          vignette_expiry: string | null;
          inspection_expiry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          brand: string;
          model: string;
          year: number;
          plate_number: string;
          color: string;
          daily_rate: number;
          status?: "available" | "rented" | "maintenance" | "out_of_service";
          fuel_type: string;
          seats: number;
          transmission?: "manual" | "automatic";
          insurance_expiry?: string;
          oil_change_expiry?: string;
          vignette_expiry?: string;
          inspection_expiry?: string;
        };
        Update: {
          brand?: string;
          model?: string;
          year?: number;
          plate_number?: string;
          color?: string;
          daily_rate?: number;
          status?: "available" | "rented" | "maintenance" | "out_of_service";
          fuel_type?: string;
          seats?: number;
          transmission?: "manual" | "automatic";
          insurance_expiry?: string;
          oil_change_expiry?: string;
          vignette_expiry?: string;
          inspection_expiry?: string;
        };
      };
      customers: {
        Row: {
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
        };
        Insert: {
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
        };
        Update: {
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
        };
      };
      rentals: {
        Row: {
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
          status: "active" | "completed" | "overdue" | "cancelled" | "reserved";
          notes: string | null;
          discount_percent: number | null;
          discount_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
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
          notes?: string;
          discount_percent?: number;
          discount_reason?: string;
        };
        Update: {
          return_date?: string;
          total_amount?: number;
          deposit_refunded?: boolean;
          end_mileage?: number;
          status?: "active" | "completed" | "overdue" | "cancelled" | "reserved";
          notes?: string;
        };
      };
      maintenance: {
        Row: {
          id: string;
          car_id: string;
          type: string;
          description: string;
          cost: number;
          status: "pending" | "in_progress" | "completed" | "cancelled";
          priority: "low" | "medium" | "high" | "critical";
          vendor_name: string | null;
          vendor_phone: string | null;
          mileage_at_start: number | null;
          mileage_at_completion: number | null;
          scheduled_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          car_id: string;
          type: string;
          description: string;
          cost: number;
          status?: "pending" | "in_progress" | "completed" | "cancelled";
          priority?: "low" | "medium" | "high" | "critical";
          vendor_name?: string;
          vendor_phone?: string;
          mileage_at_start?: number;
          scheduled_at?: string;
        };
        Update: {
          status?: "pending" | "in_progress" | "completed" | "cancelled";
          priority?: "low" | "medium" | "high" | "critical";
          vendor_name?: string;
          vendor_phone?: string;
          mileage_at_completion?: number;
          completed_at?: string;
        };
      };
      tracking: {
        Row: {
          id: string;
          car_id: string;
          latitude: number;
          longitude: number;
          speed: number | null;
          heading: number | null;
          timestamp: string;
        };
        Insert: {
          car_id: string;
          latitude: number;
          longitude: number;
          speed?: number;
          heading?: number;
        };
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          value?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          title: string;
          message: string;
          type: "info" | "success" | "warning";
          is_read: boolean;
          category: string;
          created_at: string;
        };
        Insert: {
          title: string;
          message: string;
          type?: "info" | "success" | "warning";
          category?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      invoices: {
        Row: {
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
          status: "pending" | "paid" | "refunded" | "cancelled";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
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
          status?: "pending" | "paid" | "refunded" | "cancelled";
          notes?: string;
        };
        Update: {
          return_date?: string;
          paid_amount?: number;
          payment_method?: string;
          status?: "pending" | "paid" | "refunded" | "cancelled";
          is_cancelled?: boolean;
          cancelled_at?: string;
          cancellation_reason?: string;
          penalty_percent?: number;
          penalty_amount?: number;
          refund_amount?: number;
          notes?: string;
        };
      };
    };
  };
}
