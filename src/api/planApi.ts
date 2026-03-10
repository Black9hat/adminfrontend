import axiosInstance from './axiosInstance';

// ─── DTO types ───────────────────���────────────────────────────────────────────

export interface CreatePlanDto {
  planName: string;
  planType: 'basic' | 'standard' | 'premium';
  description: string;
  planPrice: number;
  durationDays: number;
  commissionRate: number;
  bonusMultiplier: number;
  noCommission: boolean;
  isTimeBasedPlan: boolean;
  planStartTime?: string;
  planEndTime?: string;
  benefits: string[];
  isActive: boolean;
  planActivationDate?: string;
  planExpiryDate?: string;
}

export interface RevenueStats {
  totalRevenue: number;
  totalPurchases: number;
  activePlansCount: number;
  mostPopularPlan: { planName: string; totalPurchases: number } | null;
}

// ─── API layer ────────────────────────────────────────────────────────────────

export const planApi = {
  // Admin Plan CRUD
  getPlans: (params?: { planType?: string; isActive?: string }) =>
    axiosInstance.get('/admin/plans', { params }),

  createPlan: (data: CreatePlanDto) =>
    axiosInstance.post('/admin/plans', data),

  getPlanById: (planId: string) =>
    axiosInstance.get(`/admin/plans/${planId}`),

  updatePlan: (planId: string, data: Partial<CreatePlanDto>) =>
    axiosInstance.put(`/admin/plans/${planId}`, data),

  deletePlan: (planId: string) =>
    axiosInstance.delete(`/admin/plans/${planId}`),

  togglePlan: (planId: string) =>
    axiosInstance.patch(`/admin/plans/${planId}/toggle`),

  // Stats & Analytics
  getRevenueStats: () =>
    axiosInstance.get('/admin/plans/stats/revenue'),

  getAnalytics: () =>
    axiosInstance.get('/admin/plans/analytics'),

  // Purchase History
  getPurchaseHistory: (planId: string) =>
    axiosInstance.get(`/admin/plans/${planId}/purchases`),

  // Driver Plan Management (Admin)
  getDriversWithPlans: () =>
    axiosInstance.get('/admin/plans/drivers'),

  deactivateDriverPlan: (driverPlanId: string) =>
    axiosInstance.post(`/admin/driver-plans/${driverPlanId}/deactivate`),
};