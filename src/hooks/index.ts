import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import type { Trip, Driver, Customer, FareRate, Payment, Complaint, Review, PromoCode, DashboardStats } from "../types";
const tok = () => localStorage.getItem("adminToken") || "";
const hdrs = () => ({ Authorization: "Bearer " + tok(), "ngrok-skip-browser-warning": "true" });

// ─── Generic fetch hook ───────────────────────────────────────────────────────
export function useApi<T>(url: string, deps: unknown[] = []) {
  const [data, setData]     = useState<T | null>(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState("");

  const fetch = useCallback(async () => {
    setLoad(true); setError("");
    try {
      const r = await axiosInstance.get(url, { headers: hdrs() });
      setData(r.data);
    } catch (e: any) { setError(e.response?.data?.message ?? "Failed to load"); }
    finally { setLoad(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

// ─── Trips ────────────────────────────────────────────────────────────────────
export function useTrips() {
  const { data, loading, error, refetch } =
    useApi<{ trips: Trip[] }>("/admin/trips");

  return { trips: data?.trips ?? [], loading, error, refetch };
}

// ─── Single trip ──────────────────────────────────────────────────────────────
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

// ─── Drivers ─────────────────────────────────────────────────────────────────
export function useDrivers() {
  const { data, loading, error, refetch } =
    useApi<{ drivers: Driver[] }>("/admin/drivers");

  return { drivers: data?.drivers ?? [], loading, error, refetch };
}

// ─── Customers ───────────────────────────────────────────────────────────────
export function useCustomers() {
  const { data, loading, error, refetch } =
    useApi<{ customers: Customer[] }>("/admin/customers");

  return { customers: data?.customers ?? [], loading, error, refetch };
}

// ─── Fare Rates ───────────────────────────────────────────────────────────────
export function useFareRates() {
  const { data, loading, error, refetch } =
    useApi<{ rates: FareRate[] }>("/admin/fare/rates");

  return { rates: data?.rates ?? [], loading, error, refetch };
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────
export function useDashboardStats() {
  const { data, loading, error, refetch } =
    useApi<{ stats: DashboardStats }>("/admin/stats");

  return { stats: data?.stats ?? null, loading, error, refetch };
}
// ─── Mutation helper ──────────────────────────────────────────────────────────
export function useMutation() {
  const [loading, setLoad] = useState(false);
  const [error, setError]  = useState("");

  const mutate = useCallback(async (
    method: "get"|"post"|"put"|"patch"|"delete",
    url: string,
    body?: unknown
  ): Promise<{ data: any; ok: boolean }> => {
    setLoad(true); setError("");
    try {
      const r = await (axiosInstance as any)[method](url, body, { headers: hdrs() });
      return { data: r.data, ok: true };
    } catch (e: any) {
      const msg = e.response?.data?.message ?? "Action failed";
      setError(msg);
      return { data: null, ok: false };
    } finally { setLoad(false); }
  }, []);

  return { mutate, loading, error };
}

// ─── Payments hook (from trips data) ─────────────────────────────────────────
export function usePayments() {
  const { trips, loading, error, refetch } = useTrips();
  const payments = trips
    .filter(t => t.payment?.razorpayPaymentId || t.status === "completed")
    .map(t => ({
      _id: t.payment?.razorpayPaymentId ?? t._id,
      tripId: t._id,
      customerId: t.customerId?._id,
      customerName: t.customerId?.name,
      customerPhone: t.customerId?.phone,
      amount: t.finalFare ?? t.fare ?? 0,
      method: t.payment?.method ?? "cash",
      status: t.payment?.collected ? "success" : t.status === "completed" ? "pending" : "failed",
      razorpayPaymentId: t.payment?.razorpayPaymentId,
      razorpayOrderId: t.payment?.razorpayOrderId,
      createdAt: t.createdAt,
    }));
  return { payments, loading, error, refetch };
}

// ─── Re-export types for convenience ───────────────────────────────────────────
export type { Trip, Driver, Customer, FareRate, Payment, Complaint, Review, PromoCode, DashboardStats };