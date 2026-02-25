import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Scatter,
} from 'recharts';
import io from 'socket.io-client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface TripEvent {
  id: string;
  type: 'requested' | 'driver_assigned' | 'ride_started' | 'completed' | 'cancelled' | 'timeout';
  timestamp: number;
  customerId: string;
  driverId?: string;
  vehicleType: string;
  fare: number;
  distance: number;
  duration: number;
  status: string;
  retryCount?: number;
}

interface DriverStatus {
  id: string;
  name: string;
  isOnline: boolean;
  isBusy: boolean;
  currentTripId?: string;
  vehicleType: string;
  location: { lat: number; lng: number };
  totalRides: number;
  earnings: number;
}

interface FareMetrics {
  vehicleType: string;
  totalFares: number;
  avgFare: number;
  minFare: number;
  maxFare: number;
  trips: number;
  revenue: number;
}

interface SystemMetrics {
  activeTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  timeoutTrips: number;
  totalRevenue: number;
  avgResponseTime: number;
  successRate: number;
  activeDrivers: number;
  busyDrivers: number;
}

interface APIMetrics {
  endpoint: string;
  calls: number;
  avgDuration: number;
  errors: number;
  lastCall: number;
}

// ============================================================================
// API SERVICE
// ============================================================================

// Simple configuration - UPDATE THESE VALUES to match your backend
const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

class DashboardAPI {
  private socket: any = null;

  connect(onEvent: (event: any) => void) {
    console.log('🔌 Connecting to Socket.IO server:', SOCKET_URL);
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ Socket.IO disconnected:', reason);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('🔥 Socket.IO connection error:', error);
    });

    // Trip events
    this.socket.on('tripCreated', (data: any) => {
      console.log('🆕 Trip Created:', data);
      onEvent({ type: 'tripCreated', ...data });
    });

    this.socket.on('tripAccepted', (data: any) => {
      console.log('✅ Trip Accepted:', data);
      onEvent({ type: 'tripAccepted', ...data });
    });

    this.socket.on('tripStarted', (data: any) => {
      console.log('🚗 Trip Started:', data);
      onEvent({ type: 'tripStarted', ...data });
    });

    this.socket.on('tripCompleted', (data: any) => {
      console.log('🏁 Trip Completed:', data);
      onEvent({ type: 'tripCompleted', ...data });
    });

    this.socket.on('tripCancelled', (data: any) => {
      console.log('🚫 Trip Cancelled:', data);
      onEvent({ type: 'tripCancelled', ...data });
    });

    this.socket.on('driverLocationUpdate', (data: any) => {
      console.log('📍 Driver Location:', data);
      onEvent({ type: 'driverLocationUpdate', ...data });
    });

    this.socket.on('tripTimeout', (data: any) => {
      console.log('⏱️ Trip Timeout:', data);
      onEvent({ type: 'tripTimeout', ...data });
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting Socket.IO');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  async getTrips(params?: { status?: string; limit?: number }) {
    try {
      // First try admin endpoint, fallback to trip endpoint
      let url = `${API_BASE}/admin/trips`;
      const query = new URLSearchParams();
      
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.status) query.append('status', params.status);
      
      const queryString = query.toString();
      if (queryString) url += `?${queryString}`;

      console.log('📡 Fetching trips from:', url);
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('✅ Raw trips response:', data);
      console.log('📊 Number of trips:', data.trips?.length || 0);
      
      // Log first trip for debugging
      if (data.trips && data.trips.length > 0) {
        console.log('🔍 Sample trip:', data.trips[0]);
      }
      
      return data;
    } catch (err) {
      console.error('❌ Error fetching trips:', err);
      console.log('⚠️ Using mock data instead');
      // Return mock data for development
      return { trips: this.getMockTrips() };
    }
  }

  async getDrivers() {
    try {
      const url = `${API_BASE}/trip/debug/all-drivers`;
      console.log('📡 Fetching drivers from:', url);
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('✅ Raw drivers response:', data);
      console.log('📊 Number of drivers:', data.drivers?.length || 0);
      
      // Log first driver for debugging
      if (data.drivers && data.drivers.length > 0) {
        console.log('🔍 Sample driver:', data.drivers[0]);
      }
      
      return data;
    } catch (err) {
      console.error('❌ Error fetching drivers:', err);
      console.log('⚠️ Using mock data instead');
      return { drivers: this.getMockDrivers(), stats: {} };
    }
  }

  async getFareRates() {
    try {
      const url = `${API_BASE}/admin/fare-rates`;
      console.log('📡 Fetching fare rates from:', url);
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('✅ Fare rates fetched:', data);
      return data;
    } catch (err) {
      console.error('❌ Error fetching fare rates:', err);
      return { rates: [] };
    }
  }

  async getSystemStats() {
    try {
      const url = `${API_BASE}/admin/stats`;
      console.log('📡 Fetching system stats from:', url);
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('✅ System stats fetched:', data);
      return data;
    } catch (err) {
      console.error('❌ Error fetching system stats:', err);
      return null;
    }
  }

  // Mock data generators for development/fallback
  private getMockTrips() {
    const statuses = ['requested', 'driver_assigned', 'ride_started', 'completed', 'cancelled', 'timeout'];
    const vehicles = ['bike', 'auto', 'car', 'premium', 'xl'];
    
    return Array.from({ length: 50 }, (_, i) => ({
      _id: `trip-${i}`,
      customerId: `customer-${i}`,
      assignedDriver: i % 3 === 0 ? null : `driver-${i % 10}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      vehicleType: vehicles[Math.floor(Math.random() * vehicles.length)],
      fare: Math.random() * 500 + 50,
      distance: Math.random() * 20 + 1,
      duration: Math.random() * 60 + 5,
      retryCount: Math.floor(Math.random() * 3),
      createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      pickup: {
        coordinates: [78.4867 + Math.random() * 0.1, 17.3850 + Math.random() * 0.1],
        address: 'Pickup Location ' + i,
      },
      drop: {
        coordinates: [78.4867 + Math.random() * 0.1, 17.3850 + Math.random() * 0.1],
        address: 'Drop Location ' + i,
      },
    }));
  }

  private getMockDrivers() {
    const vehicles = ['bike', 'auto', 'car', 'premium', 'xl'];
    
    return Array.from({ length: 20 }, (_, i) => ({
      id: `driver-${i}`,
      name: `Driver ${i + 1}`,
      phone: `9${Math.floor(Math.random() * 1000000000)}`,
      vehicleType: vehicles[Math.floor(Math.random() * vehicles.length)],
      isOnline: Math.random() > 0.3,
      isBusy: Math.random() > 0.6,
      currentTripId: Math.random() > 0.7 ? `trip-${i}` : null,
      totalRidesCompleted: Math.floor(Math.random() * 100),
      totalIncentiveEarned: Math.floor(Math.random() * 5000),
    }));
  }
}

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const PulsingDot: React.FC<{ color: string; size?: number }> = ({ color, size = 8 }) => (
  <div style={{ position: 'relative', width: size, height: size }}>
    <style>{`
      @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      @keyframes pulse-dot {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
    `}</style>
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: color,
        animation: 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: color,
        animation: 'pulse-dot 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
  </div>
);

const AnimatedCounter: React.FC<{ value: number; duration?: number; prefix?: string; suffix?: string }> = ({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};

const WaveformVisualizer: React.FC<{ active: boolean; color: string }> = ({ active, color }) => {
  return (
    <div style={{ display: 'flex', gap: '3px', height: '40px', alignItems: 'center' }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            height: active ? `${20 + Math.random() * 30}px` : '4px',
            background: color,
            borderRadius: '2px',
            transition: 'all 0.3s ease',
            animation: active ? `wave 0.8s ease-in-out infinite ${i * 0.05}s` : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(1); opacity: 0.5; }
          50% { transform: scaleY(1.5); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

const ShortTripAdminDashboard: React.FC = () => {
  const [trips, setTrips] = useState<TripEvent[]>([]);
  const [drivers, setDrivers] = useState<DriverStatus[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
    timeoutTrips: 0,
    totalRevenue: 0,
    avgResponseTime: 0,
    successRate: 0,
    activeDrivers: 0,
    busyDrivers: 0,
  });
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'trips' | 'drivers' | 'analytics'>('overview');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const api = useRef(new DashboardAPI());

  // Real-time connection
  useEffect(() => {
    const handleEvent = (event: any) => {
      console.log('📡 Real-time event:', event);
      setRealtimeEvents((prev) => [{ ...event, timestamp: Date.now() }, ...prev.slice(0, 49)]);
      setLastUpdate(new Date());
      setConnectionStatus('connected');
      
      // Update trips when events occur
      if (event.type && event.type.includes('trip')) {
        setTimeout(() => fetchTrips(), 500);
      }
    };

    try {
      api.current.connect(handleEvent);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Failed to connect:', err);
      setConnectionStatus('disconnected');
    }

    return () => {
      api.current.disconnect();
    };
  }, []);

  // Fetch data periodically
  const fetchTrips = async () => {
    try {
      console.log('🔄 Fetching trips...');
      const data = await api.current.getTrips({ limit: 100 });
      
      if (data.trips && Array.isArray(data.trips)) {
        const mappedTrips: TripEvent[] = data.trips.map((t: any) => {
          // Handle populated customer and driver fields
          const customerId = typeof t.customerId === 'object' ? t.customerId?._id : t.customerId;
          const driverId = typeof t.assignedDriver === 'object' ? t.assignedDriver?._id : t.assignedDriver;
          
          return {
            id: t._id,
            type: t.status,
            timestamp: new Date(t.createdAt).getTime(),
            customerId: customerId || 'unknown',
            driverId: driverId || undefined,
            vehicleType: t.vehicleType || 'bike',
            fare: parseFloat(t.fare) || 0,
            distance: parseFloat(t.distance) || 0,
            duration: parseFloat(t.duration) || 0,
            status: t.status,
            retryCount: parseInt(t.retryCount) || 0,
          };
        });
        setTrips(mappedTrips);
        setLastUpdate(new Date());
        console.log(`✅ Updated trips: ${mappedTrips.length} trips loaded`);
      }
    } catch (err) {
      console.error('❌ Failed to fetch trips:', err);
    }
  };

  const fetchDrivers = async () => {
    try {
      console.log('🔄 Fetching drivers...');
      const data = await api.current.getDrivers();
      
      if (data.drivers && Array.isArray(data.drivers)) {
        const mappedDrivers: DriverStatus[] = data.drivers.map((d: any) => ({
          id: d.id || d._id,
          name: d.name || 'Unknown Driver',
          isOnline: Boolean(d.isOnline),
          isBusy: Boolean(d.isBusy),
          currentTripId: d.currentTripId || undefined,
          vehicleType: d.vehicleType || 'bike',
          location: { lat: 0, lng: 0 },
          totalRides: parseInt(d.totalRidesCompleted) || 0,
          earnings: parseFloat(d.totalIncentiveEarned) || 0,
        }));
        setDrivers(mappedDrivers);
        setLastUpdate(new Date());
        console.log(`✅ Updated drivers: ${mappedDrivers.length} drivers loaded`);
      }
    } catch (err) {
      console.error('❌ Failed to fetch drivers:', err);
    }
  };

  useEffect(() => {
    // Initial fetch
    console.log('🚀 Initial data fetch...');
    fetchTrips();
    fetchDrivers();

    // Set up polling interval
    const interval = setInterval(() => {
      console.log('🔄 Polling data...');
      fetchTrips();
      fetchDrivers();
    }, 5000); // Poll every 5 seconds

    return () => {
      console.log('🛑 Stopping data polling');
      clearInterval(interval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute metrics
  useEffect(() => {
    const now = Date.now();
    const last24h = trips.filter((t) => now - t.timestamp < 24 * 60 * 60 * 1000);

    const completed = last24h.filter((t) => t.type === 'completed').length;
    const cancelled = last24h.filter((t) => t.type === 'cancelled').length;
    const timeout = last24h.filter((t) => t.type === 'timeout').length;
    const total = completed + cancelled + timeout;

    setMetrics({
      activeTrips: trips.filter((t) => ['requested', 'driver_assigned', 'ride_started'].includes(t.type)).length,
      completedTrips: completed,
      cancelledTrips: cancelled,
      timeoutTrips: timeout,
      totalRevenue: last24h.reduce((sum, t) => sum + (t.fare || 0), 0),
      avgResponseTime: Math.random() * 1000 + 500, // Mock
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      activeDrivers: drivers.filter((d) => d.isOnline).length,
      busyDrivers: drivers.filter((d) => d.isBusy).length,
    });
  }, [trips, drivers]);

  // Chart data
  const tripTimeline = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date().getHours() - (23 - i);
      const hourTrips = trips.filter((t) => {
        const tripHour = new Date(t.timestamp).getHours();
        return tripHour === (hour >= 0 ? hour : 24 + hour);
      });

      return {
        hour: hour >= 0 ? hour : 24 + hour,
        total: hourTrips.length,
        completed: hourTrips.filter((t) => t.type === 'completed').length,
        cancelled: hourTrips.filter((t) => t.type === 'cancelled').length,
        timeout: hourTrips.filter((t) => t.type === 'timeout').length,
      };
    });
    return hours;
  }, [trips]);

  const vehicleBreakdown = useMemo(() => {
    const vehicles = ['bike', 'auto', 'car', 'premium', 'xl'];
    return vehicles.map((v) => {
      const vehicleTrips = trips.filter((t) => t.vehicleType === v);
      return {
        vehicle: v.toUpperCase(),
        trips: vehicleTrips.length,
        revenue: vehicleTrips.reduce((sum, t) => sum + t.fare, 0),
        avgFare: vehicleTrips.length > 0 ? vehicleTrips.reduce((sum, t) => sum + t.fare, 0) / vehicleTrips.length : 0,
      };
    });
  }, [trips]);

  const statusDistribution = useMemo(() => {
    const statuses = ['requested', 'driver_assigned', 'ride_started', 'completed', 'cancelled', 'timeout'];
    return statuses.map((s) => ({
      name: s.replace('_', ' ').toUpperCase(),
      value: trips.filter((t) => t.type === s).length,
    }));
  }, [trips]);

  const driverPerformance = useMemo(() => {
    return drivers
      .sort((a, b) => b.totalRides - a.totalRides)
      .slice(0, 10)
      .map((d) => ({
        name: d.name,
        rides: d.totalRides,
        earnings: d.earnings,
        status: d.isOnline ? (d.isBusy ? 'busy' : 'available') : 'offline',
      }));
  }, [drivers]);

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 25%, #16213e 50%, #0f3460 75%, #0a0a0a 100%)',
      color: '#e8e8f0',
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      padding: '2rem',
      position: 'relative' as const,
      overflow: 'hidden',
    },
    gridPattern: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `
        linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px',
      animation: 'gridScroll 20s linear infinite',
      pointerEvents: 'none' as const,
    },
    floatingOrbs: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none' as const,
      overflow: 'hidden',
    },
    orb: (size: number, delay: number, duration: number, left: string, color: string) => ({
      position: 'absolute' as const,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${color}, transparent)`,
      filter: 'blur(40px)',
      opacity: 0.3,
      left,
      animation: `float ${duration}s ease-in-out infinite ${delay}s`,
    }),
    header: {
      position: 'relative' as const,
      zIndex: 10,
      marginBottom: '3rem',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
      fontWeight: 900,
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      marginBottom: '0.5rem',
      letterSpacing: '-0.03em',
      animation: 'titleGlow 3s ease-in-out infinite alternate',
      textTransform: 'uppercase' as const,
    },
    subtitle: {
      fontSize: '1.25rem',
      color: '#9ca3af',
      fontWeight: 400,
      letterSpacing: '0.15em',
    },
    liveIndicator: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1.5rem',
      background: 'rgba(16, 185, 129, 0.1)',
      border: '2px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '30px',
      fontSize: '0.95rem',
      fontWeight: 700,
      marginTop: '1.5rem',
      boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
    },
    metricsGrid: {
      position: 'relative' as const,
      zIndex: 10,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem',
      marginBottom: '3rem',
    },
    metricCard: (gradient: string) => ({
      background: 'rgba(15, 15, 35, 0.7)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: '20px',
      padding: '2rem',
      position: 'relative' as const,
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    }),
    metricGlow: (gradient: string) => ({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: gradient,
      transform: 'scaleX(0)',
      transformOrigin: 'left',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    }),
    metricIcon: {
      fontSize: '3rem',
      marginBottom: '1rem',
      filter: 'drop-shadow(0 4px 10px rgba(59, 130, 246, 0.4))',
    },
    metricLabel: {
      fontSize: '0.85rem',
      color: '#9ca3af',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.15em',
      marginBottom: '0.75rem',
      fontWeight: 600,
    },
    metricValue: {
      fontSize: '3rem',
      fontWeight: 900,
      background: 'linear-gradient(135deg, #ffffff, #d1d5db)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      lineHeight: 1.2,
    },
    metricChange: (positive: boolean) => ({
      fontSize: '0.9rem',
      color: positive ? '#10b981' : '#ef4444',
      marginTop: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
    }),
    tabs: {
      position: 'relative' as const,
      zIndex: 10,
      display: 'flex',
      gap: '1rem',
      marginBottom: '2rem',
      padding: '0.5rem',
      background: 'rgba(15, 15, 35, 0.5)',
      backdropFilter: 'blur(10px)',
      borderRadius: '15px',
      border: '1px solid rgba(59, 130, 246, 0.2)',
    },
    tab: (active: boolean) => ({
      flex: 1,
      padding: '1rem 2rem',
      background: active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
      color: active ? '#ffffff' : '#9ca3af',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    }),
    chartsGrid: {
      position: 'relative' as const,
      zIndex: 10,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
      gap: '2rem',
    },
    chartCard: {
      background: 'rgba(15, 15, 35, 0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(59, 130, 246, 0.15)',
      borderRadius: '24px',
      padding: '2rem',
      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)',
    },
    chartTitle: {
      fontSize: '1.5rem',
      fontWeight: 800,
      marginBottom: '2rem',
      color: '#e8e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    },
    eventsFeed: {
      maxHeight: '600px',
      overflowY: 'auto' as const,
      padding: '1rem',
      background: 'rgba(10, 10, 25, 0.4)',
      borderRadius: '12px',
    },
    eventItem: {
      padding: '1rem',
      marginBottom: '0.75rem',
      background: 'rgba(59, 130, 246, 0.05)',
      border: '1px solid rgba(59, 130, 246, 0.15)',
      borderRadius: '12px',
      transition: 'all 0.3s ease',
      animation: 'slideIn 0.5s ease-out',
    },
  };

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.gridPattern} />
      <div style={styles.floatingOrbs}>
        <div style={styles.orb(300, 0, 15, '10%', 'rgba(59, 130, 246, 0.3)')} />
        <div style={styles.orb(200, 2, 20, '80%', 'rgba(139, 92, 246, 0.3)')} />
        <div style={styles.orb(250, 4, 18, '50%', 'rgba(236, 72, 153, 0.3)')} />
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes gridScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(60px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-50px) rotate(5deg); }
        }
        @keyframes titleGlow {
          0% { filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.4)); }
          100% { filter: drop-shadow(0 0 40px rgba(139, 92, 246, 0.6)); }
        }
        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .metric-card:hover .metric-glow {
          transform: scaleX(1);
        }
        .metric-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 48px rgba(59, 130, 246, 0.4);
        }
        .tab:hover {
          background: rgba(59, 130, 246, 0.2);
        }
        .event-item:hover {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.3);
        }
        ::-webkit-scrollbar {
          width: 10px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 15, 35, 0.5);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 10px;
        }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>ShortTrip Command Center</h1>
        <p style={styles.subtitle}>Real-Time Operations Dashboard</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{
            ...styles.liveIndicator,
            background: connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: connectionStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
          }}>
            <PulsingDot color={connectionStatus === 'connected' ? '#10b981' : '#ef4444'} size={12} />
            <span>{connectionStatus === 'connected' ? 'CONNECTED' : connectionStatus === 'connecting' ? 'CONNECTING...' : 'DISCONNECTED'}</span>
          </span>
          <span style={{
            ...styles.liveIndicator,
            background: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 0.3)',
          }}>
            <span>📊 {realtimeEvents.length} events</span>
          </span>
          <span style={{
            ...styles.liveIndicator,
            background: 'rgba(139, 92, 246, 0.1)',
            borderColor: 'rgba(139, 92, 246, 0.3)',
          }}>
            <span>🔄 Updated: {lastUpdate.toLocaleTimeString()}</span>
          </span>
        </div>
      </header>

      {/* Key Metrics */}
      <div style={styles.metricsGrid}>
        <div className="metric-card" style={styles.metricCard('linear-gradient(90deg, #3b82f6, #8b5cf6)')}>
          <div className="metric-glow" style={styles.metricGlow('linear-gradient(90deg, #3b82f6, #8b5cf6)')} />
          <div style={styles.metricIcon}>🚗</div>
          <div style={styles.metricLabel}>Active Trips</div>
          <div style={styles.metricValue}>
            <AnimatedCounter value={metrics.activeTrips} />
          </div>
          <div style={styles.metricChange(true)}>
            <span>↗</span> Live tracking
          </div>
        </div>

        <div className="metric-card" style={styles.metricCard('linear-gradient(90deg, #10b981, #3b82f6)')}>
          <div className="metric-glow" style={styles.metricGlow('linear-gradient(90deg, #10b981, #3b82f6)')} />
          <div style={styles.metricIcon}>✅</div>
          <div style={styles.metricLabel}>Completed (24h)</div>
          <div style={styles.metricValue}>
            <AnimatedCounter value={metrics.completedTrips} />
          </div>
          <div style={styles.metricChange(true)}>
            <span>↗</span> {metrics.successRate}% success rate
          </div>
        </div>

        <div className="metric-card" style={styles.metricCard('linear-gradient(90deg, #f59e0b, #ef4444)')}>
          <div className="metric-glow" style={styles.metricGlow('linear-gradient(90deg, #f59e0b, #ef4444)')} />
          <div style={styles.metricIcon}>💰</div>
          <div style={styles.metricLabel}>Revenue (24h)</div>
          <div style={styles.metricValue}>
            <AnimatedCounter value={Math.round(metrics.totalRevenue)} prefix="₹" />
          </div>
          <div style={styles.metricChange(true)}>
            <span>↗</span> Platform earnings
          </div>
        </div>

        <div className="metric-card" style={styles.metricCard('linear-gradient(90deg, #8b5cf6, #ec4899)')}>
          <div className="metric-glow" style={styles.metricGlow('linear-gradient(90deg, #8b5cf6, #ec4899)')} />
          <div style={styles.metricIcon}>👨‍✈️</div>
          <div style={styles.metricLabel}>Active Drivers</div>
          <div style={styles.metricValue}>
            <AnimatedCounter value={metrics.activeDrivers} />
          </div>
          <div style={styles.metricChange(false)}>
            <span>•</span> {metrics.busyDrivers} busy
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['overview', 'trips', 'drivers', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            style={styles.tab(selectedTab === tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Based on Tab */}
      {selectedTab === 'overview' && (
        <div style={styles.chartsGrid}>
          {/* Trip Timeline */}
          <div style={{ ...styles.chartCard, gridColumn: '1 / -1' }}>
            <h2 style={styles.chartTitle}>
              📊 Trip Activity (24 Hours)
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={tripTimeline}>
                <defs>
                  <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="cancelledGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.1)" />
                <XAxis dataKey="hour" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 15, 35, 0.95)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    color: '#e8e8f0',
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Legend wrapperStyle={{ color: '#e8e8f0' }} />
                <Area
                  type="monotone"
                  dataKey="completed"
                  fill="url(#completedGrad)"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Completed"
                />
                <Area
                  type="monotone"
                  dataKey="cancelled"
                  fill="url(#cancelledGrad)"
                  stroke="#ef4444"
                  strokeWidth={3}
                  name="Cancelled"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Total Requests"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Vehicle Breakdown */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>
              🚙 Vehicle Performance
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vehicleBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.1)" />
                <XAxis dataKey="vehicle" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 15, 35, 0.95)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    color: '#e8e8f0',
                  }}
                />
                <Legend />
                <Bar dataKey="trips" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Trips" />
                <Bar dataKey="avgFare" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Avg Fare (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>
              📈 Trip Status Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                  animationDuration={800}
                >
                  {statusDistribution.map((entry, index) => {
                    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 15, 35, 0.95)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    color: '#e8e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Real-time Events Feed */}
          <div style={{ ...styles.chartCard, gridColumn: '1 / -1' }}>
            <h2 style={styles.chartTitle}>
              🔴 Live Event Stream
              <WaveformVisualizer active={realtimeEvents.length > 0} color="#10b981" />
            </h2>
            <div style={styles.eventsFeed}>
              {realtimeEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  Waiting for events...
                </div>
              ) : (
                realtimeEvents.map((event, i) => (
                  <div key={i} className="event-item" style={styles.eventItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#3b82f6' }}>{event.type || 'Unknown Event'}</strong>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                          {JSON.stringify(event).substring(0, 100)}...
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'drivers' && (
        <div style={styles.chartsGrid}>
          <div style={{ ...styles.chartCard, gridColumn: '1 / -1' }}>
            <h2 style={styles.chartTitle}>
              👨‍✈️ Top Driver Performance
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={driverPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.1)" />
                <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 15, 35, 0.95)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    color: '#e8e8f0',
                  }}
                />
                <Legend />
                <Bar dataKey="rides" fill="#3b82f6" radius={[0, 8, 8, 0]} name="Total Rides" />
                <Bar dataKey="earnings" fill="#10b981" radius={[0, 8, 8, 0]} name="Earnings (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortTripAdminDashboard;