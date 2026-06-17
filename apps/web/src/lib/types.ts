export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  dailyRate: number;
  status: "available" | "rented" | "maintenance" | "out_of_service";
  fuelType: string;
  seats: number;
  transmission?: "manual" | "automatic";
  insuranceExpiry?: string;
  oilChangeExpiry?: string;
  vignetteExpiry?: string;
  inspectionExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

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
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  car?: Car;
  customerName?: string;
  carBrand?: string;
  carModel?: string;
}

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
  scheduledAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  car?: Car;
  carBrand?: string;
  carModel?: string;
}

export interface TrackingCar {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  status: string;
  lastLocation: string;
  lastUpdate: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "manager" | "worker";
}

export interface AvailableCar {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  dailyRate: number;
}
