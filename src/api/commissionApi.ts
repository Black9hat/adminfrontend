import axiosInstance from './axiosInstance';

export interface CommissionSetting {
  _id?: string;
  vehicleType: string;
  city: string;
  commissionPercent: number;
  platformFeeFlat: number;
  platformFeePercent: number;
  perRideIncentive: number;
  perRideCoins: number;
  isActive: boolean;
  updatedByAdmin?: string;
  changeNote?: string;
  updatedAt?: string;
}

const API_BASE = '/admin/commission';

/**
 * Fetch all commission settings
 */
export const getAllCommissionSettings = async () => {
  try {
    const response = await axiosInstance.get(`${API_BASE}/settings`);
    return {
      success: true,
      data: response.data.data || [],
      message: response.data.message,
    };
  } catch (error) {
    console.error('❌ Error fetching commission settings:', error);
    return {
      success: false,
      data: [],
      error: (error as any)?.response?.data?.message || 'Failed to fetch settings',
    };
  }
};

/**
 * Update commission settings for a specific vehicle type
 */
export const updateCommissionSetting = async (
  vehicleType: string,
  updates: Partial<CommissionSetting>
) => {
  try {
    const response = await axiosInstance.put(
      `${API_BASE}/settings/${vehicleType}`,
      {
        vehicleType,
        ...updates,
      }
    );
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error(`❌ Error updating ${vehicleType} commission:`, error);
    return {
      success: false,
      error: (error as any)?.response?.data?.message || 'Failed to update setting',
    };
  }
};

/**
 * Broadcast current config to all online drivers
 */
export const broadcastConfigToDrivers = async () => {
  try {
    const response = await axiosInstance.post(`${API_BASE}/broadcast`);
    return {
      success: true,
      message: response.data.message,
    };
  } catch (error) {
    console.error('❌ Error broadcasting config:', error);
    return {
      success: false,
      error: (error as any)?.response?.data?.message || 'Failed to broadcast',
    };
  }
};

/**
 * Get global incentive settings
 */
export const getIncentiveSettings = async () => {
  try {
    const response = await axiosInstance.get(`${API_BASE}/incentives`);
    return {
      success: true,
      data: response.data.data || {},
      message: response.data.message,
    };
  } catch (error) {
    console.error('❌ Error fetching incentive settings:', error);
    return {
      success: false,
      error: (error as any)?.response?.data?.message || 'Failed to fetch incentives',
    };
  }
};

/**
 * Update global incentive settings (applies to all vehicle types)
 */
export const updateIncentiveSettings = async (
  perRideIncentive: number,
  perRideCoins: number
) => {
  try {
    const response = await axiosInstance.put(`${API_BASE}/incentives`, {
      perRideIncentive,
      perRideCoins,
    });
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('❌ Error updating incentive settings:', error);
    return {
      success: false,
      error: (error as any)?.response?.data?.message || 'Failed to update incentives',
    };
  }
};
