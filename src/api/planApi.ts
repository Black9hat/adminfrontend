import axiosInstance from './axiosInstance';

export interface CreatePlanDto {
  planName: string;
  planType: 'basic' | 'standard' | 'premium';
  description: string;
  planPrice: number;
  durationDays: number;
  commissionRate: number;
  noCommission: boolean;
  perRideIncentive: number;
  platformFeeFlat: number;
  platformFeePercent: number;
  benefits: string[];
  monthlyFee: number;
  isTimeBasedPlan: boolean;
  planStartTime: string;
  planEndTime: string;
  planActivationDate: string | null;
  planExpiryDate: string | null;
  isActive: boolean;
}
export interface RevenueStats {
  totalRevenue: number;
  totalPurchases: number;
  activePlansCount: number;
  mostPopularPlan: { planName: string; totalPurchases: number } | null;
}

export const planApi = {
  getPlans: (params?: Record<string, string>) =>
    axiosInstance.get('/admin/plans', { params }),

  createPlan: (data: CreatePlanDto) =>
    axiosInstance.post('/admin/plans', data),

  updatePlan: (planId: string, data: Partial<CreatePlanDto>) =>
    axiosInstance.put(`/admin/plans/${planId}`, data),

  deletePlan: (planId: string) =>
    axiosInstance.delete(`/admin/plans/${planId}`),

  togglePlan: (planId: string) =>
    axiosInstance.patch(`/admin/plans/${planId}/toggle`),

  getAnalytics: () =>
    axiosInstance.get('/admin/plans/analytics'),

  getRevenueStats: () =>
    axiosInstance.get('/admin/plans/stats/revenue'),

  getPurchaseHistory: (planId: string) =>
    axiosInstance.get(`/admin/plans/${planId}/purchases`),

  getDriversWithPlans: () =>
    axiosInstance.get('/admin/drivers/plans'),

  assignPlanToDriver: (driverId: string, data: Record<string, unknown>) =>
    axiosInstance.post(`/admin/drivers/${driverId}/assign-plan`, data),

  deactivateDriverPlan: (driverId: string, driverPlanId: string) =>
    axiosInstance.post(`/admin/drivers/${driverId}/plans/${driverPlanId}/deactivate`),
};