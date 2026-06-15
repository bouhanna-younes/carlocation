import type { Database } from "@/lib/supabase/types";

type Tables = Database["public"]["Tables"];

// =====================================================
// CAR MAPPING
// =====================================================
type SupabaseCar = Tables["cars"]["Row"];

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  dailyRate: number;
  status: "available" | "rented" | "maintenance" | "out_of_service";
  mileage: number;
  fuelType: string;
  seats: number;
  image?: string;
  vin?: string;
  transmission?: "manual" | "automatic";
  category?: "economy" | "sedan" | "suv" | "luxury" | "van" | "truck";
  createdAt: string;
  updatedAt: string;
}

export function mapCar(row: SupabaseCar): Car {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    plateNumber: row.plate_number,
    color: row.color,
    dailyRate: row.daily_rate,
    status: row.status,
    mileage: row.mileage,
    fuelType: row.fuel_type,
    seats: row.seats,
    image: row.image ?? undefined,
    vin: row.vin ?? undefined,
    transmission: row.transmission,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCarInsert(data: Partial<Car>): Tables["cars"]["Insert"] {
  return {
    brand: data.brand!,
    model: data.model!,
    year: data.year!,
    plate_number: data.plateNumber!,
    color: data.color!,
    daily_rate: data.dailyRate!,
    status: data.status as Tables["cars"]["Insert"]["status"],
    mileage: data.mileage ?? 0,
    fuel_type: data.fuelType!,
    seats: data.seats!,
    image: data.image,
    vin: data.vin,
    transmission: data.transmission as Tables["cars"]["Insert"]["transmission"],
    category: data.category as Tables["cars"]["Insert"]["category"],
  };
}

export function toCarUpdate(data: Partial<Car>): Tables["cars"]["Update"] {
  const update: Tables["cars"]["Update"] = {};
  if (data.brand !== undefined) update.brand = data.brand;
  if (data.model !== undefined) update.model = data.model;
  if (data.year !== undefined) update.year = data.year;
  if (data.plateNumber !== undefined) update.plate_number = data.plateNumber;
  if (data.color !== undefined) update.color = data.color;
  if (data.dailyRate !== undefined) update.daily_rate = data.dailyRate;
  if (data.status !== undefined)
    update.status = data.status as Tables["cars"]["Update"]["status"];
  if (data.mileage !== undefined) update.mileage = data.mileage;
  if (data.fuelType !== undefined) update.fuel_type = data.fuelType;
  if (data.seats !== undefined) update.seats = data.seats;
  if (data.image !== undefined) update.image = data.image;
  if (data.vin !== undefined) update.vin = data.vin;
  if (data.transmission !== undefined)
    update.transmission =
      data.transmission as Tables["cars"]["Update"]["transmission"];
  if (data.category !== undefined)
    update.category = data.category as Tables["cars"]["Update"]["category"];
  return update;
}

// =====================================================
// CUSTOMER MAPPING
// =====================================================
type SupabaseCustomer = Tables["customers"]["Row"];

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  idNumber?: string;
  address?: string;
  driverLicenseNumber?: string;
  driverLicenseExpiry?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  blacklisted?: boolean;
  blacklistReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function mapCustomer(row: SupabaseCustomer): Customer {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email ?? undefined,
    idNumber: row.id_number ?? undefined,
    address: row.address ?? undefined,
    driverLicenseNumber: row.driver_license_number ?? undefined,
    driverLicenseExpiry: row.driver_license_expiry ?? undefined,
    dateOfBirth: row.date_of_birth ?? undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    notes: row.notes ?? undefined,
    blacklisted: row.blacklisted,
    blacklistReason: row.blacklist_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCustomerInsert(
  data: Partial<Customer>,
): Tables["customers"]["Insert"] {
  return {
    first_name: data.firstName!,
    last_name: data.lastName!,
    phone: data.phone!,
    email: data.email,
    address: data.address,
    id_number: data.idNumber,
    driver_license_number: data.driverLicenseNumber,
    driver_license_expiry: data.driverLicenseExpiry,
    date_of_birth: data.dateOfBirth,
    emergency_contact_name: data.emergencyContactName,
    emergency_contact_phone: data.emergencyContactPhone,
    notes: data.notes,
    blacklisted: data.blacklisted,
    blacklist_reason: data.blacklistReason,
  };
}

export function toCustomerUpdate(
  data: Partial<Customer>,
): Tables["customers"]["Update"] {
  const update: Tables["customers"]["Update"] = {};
  if (data.firstName !== undefined) update.first_name = data.firstName;
  if (data.lastName !== undefined) update.last_name = data.lastName;
  if (data.phone !== undefined) update.phone = data.phone;
  if (data.email !== undefined) update.email = data.email;
  if (data.address !== undefined) update.address = data.address;
  if (data.idNumber !== undefined) update.id_number = data.idNumber;
  if (data.driverLicenseNumber !== undefined)
    update.driver_license_number = data.driverLicenseNumber;
  if (data.driverLicenseExpiry !== undefined)
    update.driver_license_expiry = data.driverLicenseExpiry;
  if (data.dateOfBirth !== undefined) update.date_of_birth = data.dateOfBirth;
  if (data.emergencyContactName !== undefined)
    update.emergency_contact_name = data.emergencyContactName;
  if (data.emergencyContactPhone !== undefined)
    update.emergency_contact_phone = data.emergencyContactPhone;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.blacklisted !== undefined) update.blacklisted = data.blacklisted;
  if (data.blacklistReason !== undefined)
    update.blacklist_reason = data.blacklistReason;
  return update;
}

// =====================================================
// RENTAL MAPPING
// =====================================================
type SupabaseRental = Tables["rentals"]["Row"];

export interface Rental {
  id: string;
  customerId: string;
  carId: string;
  renterId: string;
  startDate: string;
  endDate: string;
  returnDate?: string;
  dailyRate: number;
  totalAmount: number;
  depositAmount?: number;
  depositPaid?: boolean;
  depositRefunded?: boolean;
  startMileage?: number;
  endMileage?: number;
  status: "active" | "completed" | "overdue" | "cancelled" | "reserved";
  notes?: string;
  discountPercent?: number;
  discountReason?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  car?: Car;
  customerName?: string;
  carBrand?: string;
  carModel?: string;
}

export function mapRental(
  row: SupabaseRental & { customer?: SupabaseCustomer; car?: SupabaseCar },
): Rental {
  return {
    id: row.id,
    customerId: row.customer_id,
    carId: row.car_id,
    renterId: row.renter_id,
    startDate: row.start_date,
    endDate: row.end_date,
    returnDate: row.return_date ?? undefined,
    dailyRate: row.daily_rate,
    totalAmount: row.total_amount ?? 0,
    depositAmount: row.deposit_amount ?? undefined,
    depositPaid: row.deposit_paid,
    depositRefunded: row.deposit_refunded,
    startMileage: row.start_mileage ?? undefined,
    endMileage: row.end_mileage ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    discountPercent: row.discount_percent ?? undefined,
    discountReason: row.discount_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: row.customer ? mapCustomer(row.customer) : undefined,
    car: row.car ? mapCar(row.car) : undefined,
    customerName: row.customer
      ? `${row.customer.first_name} ${row.customer.last_name}`
      : undefined,
    carBrand: row.car?.brand,
    carModel: row.car?.model,
  };
}

// =====================================================
// MAINTENANCE MAPPING
// =====================================================
type SupabaseMaintenance = Tables["maintenance"]["Row"];

export interface MaintenanceRecord {
  id: string;
  carId: string;
  type: string;
  description: string;
  cost: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high" | "critical";
  vendorName?: string;
  vendorPhone?: string;
  mileageAtStart?: number;
  mileageAtCompletion?: number;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  car?: Car;
  carBrand?: string;
  carModel?: string;
}

export function mapMaintenance(
  row: SupabaseMaintenance & { car?: SupabaseCar },
): MaintenanceRecord {
  return {
    id: row.id,
    carId: row.car_id,
    type: row.type,
    description: row.description,
    cost: row.cost,
    status: row.status,
    priority: row.priority,
    vendorName: row.vendor_name ?? undefined,
    vendorPhone: row.vendor_phone ?? undefined,
    mileageAtStart: row.mileage_at_start ?? undefined,
    mileageAtCompletion: row.mileage_at_completion ?? undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    car: row.car ? mapCar(row.car) : undefined,
    carBrand: row.car?.brand,
    carModel: row.car?.model,
  };
}

// =====================================================
// NOTIFICATION MAPPING
// =====================================================
type SupabaseNotification = Tables["notifications"]["Row"];

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function mapNotification(row: SupabaseNotification): Notification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

// =====================================================
// AVAILABLE CAR (for rental form)
// =====================================================
export interface AvailableCar {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  dailyRate: number;
}

export function mapAvailableCar(row: SupabaseCar): AvailableCar {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    plateNumber: row.plate_number,
    dailyRate: row.daily_rate,
  };
}
