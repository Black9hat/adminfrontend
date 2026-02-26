//types/index.ts
export interface Trip {
  _id: string;
  status: "requested"|"driver_assigned"|"driver_at_pickup"|"ride_started"|"completed"|"cancelled"|"timeout";
  type: "short"|"long"|"parcel";
  vehicleType: string;
  fare: number;
  finalFare?: number;
  discountApplied?: number;
  coinsUsed?: number;
  payment?: { collected?: boolean; method?: string; transactionId?: string; razorpayPaymentId?: string; razorpayOrderId?: string };
  pickup: { address?: string; coordinates?: [number, number] };
  drop: { address?: string; coordinates?: [number, number] };
  customerId?: { _id: string; name: string; phone: string } | null;
  assignedDriver?: { _id: string; name: string; phone: string } | null;
  otp?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  supportRequested?: boolean;
  supportReason?: string;
  rideStartTime?: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  parcelDetails?: { weight?: number; senderName?: string; receiverName?: string; receiverPhone?: string };
}

export interface Driver {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  rating?: number;
  totalTrips?: number;
  isOnline?: boolean;
  isBlocked?: boolean;
  isSuspended?: boolean;
  profilePhoto?: string;
  currentLocation?: { coordinates: [number, number] };
  earnings?: number;
  strikes?: number;
  deviceId?: string;
  createdAt?: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  isBlocked?: boolean;
  totalTrips?: number;
  createdAt?: string;
  lastLogin?: string;
}

export interface FareRate {
  _id: string;
  vehicleType: string;
  category?: string;
  city?: string;
  state?: string;
  baseFare: number;
  perKm: number;
  perMin?: number;
  minFare?: number;
  manualSurge?: number;
  peakMultiplier?: number;
  nightMultiplier?: number;
  platformFeePercent?: number;
  gstPercent?: number;
  perRideIncentive?: number;
  perRideCoins?: number;
  isActive?: boolean;
}

export interface Payment {
  _id: string;
  tripId: string;
  customerId?: string;
  amount: number;
  method: "upi"|"cash"|"wallet";
  status: "success"|"failed"|"pending"|"refunded";
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  failureReason?: string;
  refundId?: string;
  refundAmount?: number;
  createdAt: string;
}

export interface Complaint {
  _id: string;
  tripId?: string;
  reportedBy: "customer"|"driver";
  userId: string;
  userName?: string;
  category: string;
  description: string;
  status: "pending"|"in_review"|"resolved"|"dismissed";
  priority: "low"|"medium"|"high"|"emergency";
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface Review {
  _id: string;
  tripId: string;
  reviewerId: string;
  reviewerName?: string;
  reviewerType: "customer"|"driver";
  targetId: string;
  rating: number;
  comment?: string;
  isFlagged?: boolean;
  createdAt: string;
}

export interface PromoCode {
  _id: string;
  code: string;
  discountType: "percent"|"flat";
  discountValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount?: number;
  isActive?: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface DashboardStats {
  ridesToday: number;
  revenueToday: number;
  activeDrivers: number;
  activeRides: number;
  activeUsers: number;
  cancelledToday: number;
  cancelRate: number;
  complaintCount: number;
  completedToday: number;
  ridesTotal: number;
  revenueTotal: number;
}