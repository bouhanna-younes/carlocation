import type {
  CarStatus,
  Transmission,
  RentalStatus,
  MaintenanceStatus,
  Priority,
  NotificationType,
  InvoiceStatus,
  Json,
  CarRow,
  CustomerRow,
  RentalRow,
  MaintenanceRow,
  NotificationRow,
  InvoiceRow,
} from "@/lib/supabase/database.types";

type CarInsert = {
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
};
type CarUpdate = Partial<CarInsert>;

type CustomerInsert = {
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
type CustomerUpdate = Partial<CustomerInsert>;

type RentalInsert = {
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
};
type RentalUpdate = Partial<{
  return_date: string;
  total_amount: number;
  deposit_refunded: boolean;
  end_mileage: number;
  status: RentalStatus;
  notes: string;
  start_mileage: number;
  deposit_amount: number;
  deposit_paid: boolean;
  discount_percent: number;
  discount_reason: string;
  end_date: string;
}>;

type MaintenanceInsert = {
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
};
type MaintenanceUpdate = Partial<MaintenanceInsert> & {
  mileage_at_completion?: number;
  completed_at?: string;
};

type NotificationInsert = {
  title: string;
  message: string;
  type?: NotificationType;
  category?: string;
  metadata?: Json;
  recipient_id?: string;
  is_read?: boolean;
};

type InvoiceUpdate = Partial<{
  return_date: string;
  paid_amount: number;
  payment_method: string;
  status: InvoiceStatus;
  is_cancelled: boolean;
  cancelled_at: string;
  cancellation_reason: string;
  penalty_percent: number;
  penalty_amount: number;
  refund_amount: number;
  total_days: number;
  total_amount: number;
  notes: string;
}>;

// =====================================================
// CAR
// =====================================================
type SupabaseCar = CarRow;

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  dailyRate: number;
  status: CarStatus;
  fuelType: string;
  seats: number;
  transmission: Transmission;
  insuranceExpiry?: string;
  oilChangeExpiry?: string;
  vignetteExpiry?: string;
  inspectionExpiry?: string;
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
    fuelType: row.fuel_type,
    seats: row.seats,
    transmission: row.transmission,
    insuranceExpiry: row.insurance_expiry ?? undefined,
    oilChangeExpiry: row.oil_change_expiry ?? undefined,
    vignetteExpiry: row.vignette_expiry ?? undefined,
    inspectionExpiry: row.inspection_expiry ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCarInsert(data: Partial<Car>): CarInsert {
  return {
    brand: data.brand!,
    model: data.model!,
    year: data.year!,
    plate_number: data.plateNumber!,
    color: data.color!,
    daily_rate: data.dailyRate!,
    status: data.status,
    fuel_type: data.fuelType!,
    seats: data.seats!,
    transmission: data.transmission,
    insurance_expiry: data.insuranceExpiry,
    oil_change_expiry: data.oilChangeExpiry,
    vignette_expiry: data.vignetteExpiry,
    inspection_expiry: data.inspectionExpiry,
  };
}

export function toCarUpdate(data: Partial<Car>): CarUpdate {
  const update: CarUpdate = {};
  if (data.brand !== undefined) update.brand = data.brand;
  if (data.model !== undefined) update.model = data.model;
  if (data.year !== undefined) update.year = data.year;
  if (data.plateNumber !== undefined) update.plate_number = data.plateNumber;
  if (data.color !== undefined) update.color = data.color;
  if (data.dailyRate !== undefined) update.daily_rate = data.dailyRate;
  if (data.status !== undefined) update.status = data.status;
  if (data.fuelType !== undefined) update.fuel_type = data.fuelType;
  if (data.seats !== undefined) update.seats = data.seats;
  if (data.transmission !== undefined) update.transmission = data.transmission;
  if (data.insuranceExpiry !== undefined) update.insurance_expiry = data.insuranceExpiry;
  if (data.oilChangeExpiry !== undefined) update.oil_change_expiry = data.oilChangeExpiry;
  if (data.vignetteExpiry !== undefined) update.vignette_expiry = data.vignetteExpiry;
  if (data.inspectionExpiry !== undefined) update.inspection_expiry = data.inspectionExpiry;
  return update;
}

// =====================================================
// CUSTOMER
// =====================================================
type SupabaseCustomer = CustomerRow;

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

export function toCustomerInsert(data: Partial<Customer>): CustomerInsert {
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

export function toCustomerUpdate(data: Partial<Customer>): CustomerUpdate {
  const update: CustomerUpdate = {};
  if (data.firstName !== undefined) update.first_name = data.firstName;
  if (data.lastName !== undefined) update.last_name = data.lastName;
  if (data.phone !== undefined) update.phone = data.phone;
  if (data.email !== undefined) update.email = data.email;
  if (data.address !== undefined) update.address = data.address;
  if (data.idNumber !== undefined) update.id_number = data.idNumber;
  if (data.driverLicenseNumber !== undefined) update.driver_license_number = data.driverLicenseNumber;
  if (data.driverLicenseExpiry !== undefined) update.driver_license_expiry = data.driverLicenseExpiry;
  if (data.dateOfBirth !== undefined) update.date_of_birth = data.dateOfBirth;
  if (data.emergencyContactName !== undefined) update.emergency_contact_name = data.emergencyContactName;
  if (data.emergencyContactPhone !== undefined) update.emergency_contact_phone = data.emergencyContactPhone;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.blacklisted !== undefined) update.blacklisted = data.blacklisted;
  if (data.blacklistReason !== undefined) update.blacklist_reason = data.blacklistReason;
  return update;
}

// =====================================================
// RENTAL
// =====================================================
type SupabaseRental = RentalRow;

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
  status: RentalStatus;
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

type RentalRowWithJoins = SupabaseRental & { customer?: SupabaseCustomer; car?: SupabaseCar };

export function mapRental(row: RentalRowWithJoins): Rental {
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
    customerName: row.customer ? `${row.customer.first_name} ${row.customer.last_name}` : undefined,
    carBrand: row.car?.brand,
    carModel: row.car?.model,
  };
}

export function toRentalInsert(data: Partial<Rental>): RentalInsert {
  return {
    customer_id: data.customerId!,
    car_id: data.carId!,
    renter_id: data.renterId!,
    start_date: data.startDate!,
    end_date: data.endDate!,
    daily_rate: data.dailyRate!,
    total_amount: data.totalAmount,
    deposit_amount: data.depositAmount,
    deposit_paid: data.depositPaid,
    start_mileage: data.startMileage,
    status: data.status,
    notes: data.notes,
    discount_percent: data.discountPercent,
    discount_reason: data.discountReason,
  };
}

export function toRentalUpdate(data: Partial<Rental>): RentalUpdate {
  const update: RentalUpdate = {};
  if (data.returnDate !== undefined) update.return_date = data.returnDate;
  if (data.totalAmount !== undefined) update.total_amount = data.totalAmount;
  if (data.depositRefunded !== undefined) update.deposit_refunded = data.depositRefunded;
  if (data.endMileage !== undefined) update.end_mileage = data.endMileage;
  if (data.status !== undefined) update.status = data.status;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.startMileage !== undefined) update.start_mileage = data.startMileage;
  if (data.depositAmount !== undefined) update.deposit_amount = data.depositAmount;
  if (data.depositPaid !== undefined) update.deposit_paid = data.depositPaid;
  if (data.discountPercent !== undefined) update.discount_percent = data.discountPercent;
  if (data.discountReason !== undefined) update.discount_reason = data.discountReason;
  if (data.endDate !== undefined) update.end_date = data.endDate;
  return update;
}

// =====================================================
// MAINTENANCE
// =====================================================
type SupabaseMaintenance = MaintenanceRow;

export interface MaintenanceRecord {
  id: string;
  carId: string;
  type: string;
  description: string;
  cost: number;
  status: MaintenanceStatus;
  priority: Priority;
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

export function toMaintenanceInsert(data: Partial<MaintenanceRecord>): MaintenanceInsert {
  return {
    car_id: data.carId!,
    type: data.type!,
    description: data.description!,
    cost: data.cost!,
    status: data.status,
    priority: data.priority,
    vendor_name: data.vendorName,
    vendor_phone: data.vendorPhone,
    mileage_at_start: data.mileageAtStart,
    scheduled_at: data.scheduledAt,
  };
}

export function toMaintenanceUpdate(data: Partial<MaintenanceRecord>): MaintenanceUpdate {
  const update: MaintenanceUpdate = {};
  if (data.type !== undefined) update.type = data.type;
  if (data.description !== undefined) update.description = data.description;
  if (data.cost !== undefined) update.cost = data.cost;
  if (data.status !== undefined) update.status = data.status;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.vendorName !== undefined) update.vendor_name = data.vendorName;
  if (data.vendorPhone !== undefined) update.vendor_phone = data.vendorPhone;
  if (data.mileageAtStart !== undefined) update.mileage_at_start = data.mileageAtStart;
  if (data.mileageAtCompletion !== undefined) update.mileage_at_completion = data.mileageAtCompletion;
  if (data.scheduledAt !== undefined) update.scheduled_at = data.scheduledAt;
  if (data.completedAt !== undefined) update.completed_at = data.completedAt;
  return update;
}

// =====================================================
// NOTIFICATION
// =====================================================
type SupabaseNotification = NotificationRow;

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  category: string;
  metadata?: Json;
  recipientId?: string | null;
  createdAt: string;
}

export function mapNotification(row: SupabaseNotification): Notification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read,
    category: row.category ?? "general",
    metadata: row.metadata ?? undefined,
    recipientId: row.recipient_id,
    createdAt: row.created_at,
  };
}

export function toNotificationInsert(data: Partial<Notification>): NotificationInsert {
  return {
    title: data.title!,
    message: data.message!,
    type: data.type,
    category: data.category,
    metadata: data.metadata,
    recipient_id: data.recipientId ?? undefined,
    is_read: data.isRead,
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

// =====================================================
// INVOICE
// =====================================================
type SupabaseInvoice = InvoiceRow;

export interface Invoice {
  id: string;
  rentalId: string;
  customerId: string;
  carId: string;
  invoiceNumber: string;
  invoiceDate: string;
  startDate: string;
  endDate: string;
  returnDate?: string;
  dailyRate: number;
  totalDays: number;
  totalAmount: number;
  depositAmount: number;
  isCancelled: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  penaltyPercent: number;
  penaltyAmount: number;
  refundAmount: number;
  paidAmount: number;
  paymentMethod?: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  car?: Car;
}

export function mapInvoice(
  row: SupabaseInvoice & { customer?: SupabaseCustomer; car?: SupabaseCar },
): Invoice {
  return {
    id: row.id,
    rentalId: row.rental_id,
    customerId: row.customer_id,
    carId: row.car_id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    startDate: row.start_date,
    endDate: row.end_date,
    returnDate: row.return_date ?? undefined,
    dailyRate: row.daily_rate,
    totalDays: row.total_days,
    totalAmount: row.total_amount,
    depositAmount: row.deposit_amount,
    isCancelled: row.is_cancelled,
    cancelledAt: row.cancelled_at ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    penaltyPercent: row.penalty_percent,
    penaltyAmount: row.penalty_amount,
    refundAmount: row.refund_amount,
    paidAmount: row.paid_amount,
    paymentMethod: row.payment_method ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: row.customer ? mapCustomer(row.customer) : undefined,
    car: row.car ? mapCar(row.car) : undefined,
  };
}

export function toInvoiceUpdate(data: Partial<Invoice>): InvoiceUpdate {
  const update: InvoiceUpdate = {};
  if (data.returnDate !== undefined) update.return_date = data.returnDate;
  if (data.paidAmount !== undefined) update.paid_amount = data.paidAmount;
  if (data.paymentMethod !== undefined) update.payment_method = data.paymentMethod;
  if (data.status !== undefined) update.status = data.status;
  if (data.isCancelled !== undefined) update.is_cancelled = data.isCancelled;
  if (data.cancelledAt !== undefined) update.cancelled_at = data.cancelledAt;
  if (data.cancellationReason !== undefined) update.cancellation_reason = data.cancellationReason;
  if (data.penaltyPercent !== undefined) update.penalty_percent = data.penaltyPercent;
  if (data.penaltyAmount !== undefined) update.penalty_amount = data.penaltyAmount;
  if (data.refundAmount !== undefined) update.refund_amount = data.refundAmount;
  if (data.totalDays !== undefined) update.total_days = data.totalDays;
  if (data.totalAmount !== undefined) update.total_amount = data.totalAmount;
  if (data.notes !== undefined) update.notes = data.notes;
  return update;
}
