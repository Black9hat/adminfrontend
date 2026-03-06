import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import type { Trip, Driver, Customer, FareRate, Payment, Complaint, Review, PromoCode, DashboardStats } from "../types";

const tok = async (): Promise<string> => {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    if (auth?.currentUser) {
      const idToken = await auth.currentUser.getIdToken(true);
      console.log('✅ Using Firebase ID token');
      return idToken;
    }
  } catch (err) {
    console.debug('⚠️ Firebase not available:', err);
  }

  const adminToken = (import.meta as any).env?.VITE_ADMIN_TOKEN;
  if (adminToken) {
    console.log('✅ Using admin token');
    return adminToken;
  }

  const stored = localStorage.getItem("adminToken");
  if (stored) {
    console.log('⚠️ Using stored token');
    return stored;
  }

  console.warn('❌ No token available');
  return '';
};

const hdrs = async () => {
  const token = await tok();
  const adminToken = (import.meta as any).env?.VITE_ADMIN_TOKEN;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (adminToken && token === adminToken) {
    headers['x-admin-token'] = token;
  }

  return headers;
};

export function useApi<T>(url: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoad] = useState(true);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    setLoad(true);
    setError("");
    try {
      const headers = await hdrs();
      const r = await axiosInstance.get(url, { headers });
      setData(r.data);
    } catch (e: any) {
      const msg = e.response?.data?.message ?? "Failed to load";
      
      if (e.response?.status === 401) {
        setError("Session expired — please login again");
        localStorage.removeItem("adminToken");
      } else if (e.response?.status === 403) {
        setError("Access denied — insufficient permissions");
      } else if (e.response?.status === 404) {
        setError("Route not found");
      } else {
        setError(msg);
      }
      
      console.error(`API Error [${e.response?.status}]:`, msg);
    } finally {
      setLoad(false);
    }
  }, [url, ...deps]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useTrips() {
  const { data, loading, error, refetch } =
    useApi<{ trips: Trip[] }>("/admin/trips");
  return { trips: data?.trips ?? [], loading, error, refetch };
}

export function useTrip(id: string) {
  const { data, loading, error, refetch } =
    useApi<{ trip: Trip; customer: Customer; driver: Driver }>(
      id ? "/admin/trip/" + id : "",
      [id]
    );
  return {
    trip: data?.trip,
    customer: data?.customer,
    driver: data?.driver,
    loading,
    error,
    refetch,
  };
}

export function useDrivers() {
  const { data, loading, error, refetch } =
    useApi<{ drivers: Driver[] }>("/admin/drivers");
  return { drivers: data?.drivers ?? [], loading, error, refetch };
}

export function useCustomers() {
  const { data, loading, error, refetch } =
    useApi<{ customers: Customer[] }>("/admin/customers");
  return { customers: data?.customers ?? [], loading, error, refetch };
}

export function useFareRates() {
  const { data, loading, error, refetch } =
    useApi<{ rates: FareRate[] }>("/admin/fare/rates");
  return { rates: data?.rates ?? [], loading, error, refetch };
}

export function useDashboardStats() {
  const { data, loading, error, refetch } =
    useApi<{ stats: DashboardStats }>("/admin/stats");
  return { stats: data?.stats ?? null, loading, error, refetch };
}

export interface Txn {
  _id?: string;
  type: "credit" | "debit" | "commission" | "commission_payment";
  amount: number;
  description: string;
  status: "completed" | "pending" | "paid" | "failed";
  tripId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  paymentMethod?: string;
  verifiedAt?: string;
  paidAt?: string;
  createdAt: string;
}

export interface WalletData {
  totalEarnings: number;
  totalCommission: number;
  paidCommission: number;
  pendingAmount: number;
  availableBalance: number;
  transactions: Txn[];
  lastUpdated?: string;
}

export function useWallet() {
  const { data, loading, error, refetch } =
    useApi<{
      success: boolean;
      wallets: Array<{
        _id: string;
        driverId?: string;
        wallet?: WalletData;
        [key: string]: any;
      }>;
      message?: string;
    }>("/wallet/admin/wallets");

  const walletData = (data?.wallets ?? []).reduce((acc, item) => {
    const id = (item._id || item.driverId || "").toString();
    if (!id) return acc;
    const w = item.wallet || item;
    acc[id] = {
      totalEarnings: w.totalEarnings ?? 0,
      totalCommission: w.totalCommission ?? 0,
      paidCommission: w.paidCommission ?? 0,
      pendingAmount: w.pendingAmount ?? 0,
      availableBalance: w.availableBalance ?? 0,
      transactions: w.transactions ?? [],
      lastUpdated: w.lastUpdated,
    };
    return acc;
  }, {} as Record<string, WalletData>);

  return { walletData, loading, error, refetch };
}

export function useMutation() {
  const [loading, setLoad] = useState(false);
  const [error, setError] = useState("");

  const mutate = useCallback(
    async (
      method: "get" | "post" | "put" | "patch" | "delete",
      url: string,
      body?: unknown
    ): Promise<{ data: any; ok: boolean }> => {
      setLoad(true);
      setError("");
      try {
        const headers = await hdrs();
        const r = await (axiosInstance as any)[method](url, body, { headers });
        return { data: r.data, ok: true };
      } catch (e: any) {
        const msg = e.response?.data?.message ?? "Action failed";
        setError(msg);
        return { data: null, ok: false };
      } finally {
        setLoad(false);
      }
    },
    []
  );

  return { mutate, loading, error };
}

export function usePayments() {
  const { trips, loading, error, refetch } = useTrips();
  const payments = trips
    .filter((t) => t.payment?.razorpayPaymentId || t.status === "completed")
    .map((t) => ({
      _id: t.payment?.razorpayPaymentId ?? t._id,
      tripId: t._id,
      customerId: t.customerId?._id,
      customerName: t.customerId?.name,
      customerPhone: t.customerId?.phone,
      amount: t.finalFare ?? t.fare ?? 0,
      method: t.payment?.method ?? "cash",
      status: t.payment?.collected
        ? "success"
        : t.status === "completed"
        ? "pending"
        : "failed",
      razorpayPaymentId: t.payment?.razorpayPaymentId,
      razorpayOrderId: t.payment?.razorpayOrderId,
      createdAt: t.createdAt,
    }));
  return { payments, loading, error, refetch };
}

export type {
  Trip,
  Driver,
  Customer,
  FareRate,
  Payment,
  Complaint,
  Review,
  PromoCode,
  DashboardStats,
};
