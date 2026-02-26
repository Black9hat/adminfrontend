import React, { useMemo, useState } from "react";
import { RefreshCw, Download } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { useTrips, useDrivers, useCustomers } from "../hooks";
import type { Trip, Driver, Customer, FareRate, Payment, Complaint, Review, PromoCode, DashboardStats } from "../hooks";
import {
  Btn, Card, Spinner, PageError, PageHeader, StatCard, SectionLabel,
  Sel, C,
} from "../components/ui";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a78bfa"];

const ago = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d; };
const inRange = (s: string, f: Date, t: Date) => { const d = new Date(s); return d >= f && d <= t; };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "10px 14px", fontSize: "0.8rem" }}>
      <div style={{ color: C.muted, marginBottom: 6, fontFamily: "monospace" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function AnalyticsDashboard() {
  const { trips, loading, error, refetch } = useTrips();
  const { drivers } = useDrivers();
  const { customers } = useCustomers();
  const [range, setRange] = useState<"7d"|"14d"|"30d">("14d");

  const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;

  const today    = new Date(); today.setHours(23, 59, 59, 999);
  const todayStart = ago(0);
  const weekStart  = ago(6);

  const todayTrips     = useMemo(() => trips.filter(t => inRange(t.createdAt, todayStart, today)), [trips]);
  const completedToday = useMemo(() => todayTrips.filter(t => t.status === "completed"), [todayTrips]);
  const cancelledToday = useMemo(() => todayTrips.filter(t => t.status === "cancelled"), [todayTrips]);
  const activeRides    = useMemo(() => trips.filter(t => ["requested","driver_assigned","driver_at_pickup","ride_started"].includes(t.status)), [trips]);

  const revenueToday  = completedToday.reduce((s, t) => s + (t.finalFare ?? t.fare ?? 0), 0);
  const cancelRate    = todayTrips.length > 0 ? (cancelledToday.length / todayTrips.length * 100) : 0;
  const supportCount  = trips.filter(t => t.supportRequested).length;
  const onlineDrivers = useMemo(() => drivers.filter(d => d.isOnline), [drivers]);

  // Daily chart data
  const chartData = useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const day = ago(days - 1 - i);
      const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
      const dayTrips = trips.filter(t => inRange(t.createdAt, day, dayEnd));
      const completed = dayTrips.filter(t => t.status === "completed");
      return {
        date: day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        Rides:     dayTrips.length,
        Completed: completed.length,
        Cancelled: dayTrips.filter(t => t.status === "cancelled").length,
        Revenue:   Math.round(completed.reduce((s, t) => s + (t.finalFare ?? t.fare ?? 0), 0)),
      };
    });
  }, [trips, days]);

  // Vehicle breakdown pie
  const vehicleData = useMemo(() => {
    const map: Record<string, number> = {};
    trips.filter(t => t.status === "completed").forEach(t => {
      const vt = t.vehicleType ?? "unknown";
      map[vt] = (map[vt] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [trips]);

  // Trip type breakdown
  const typeData = useMemo(() => {
    const short  = trips.filter(t => t.type === "short").length;
    const long_  = trips.filter(t => t.type === "long").length;
    const parcel = trips.filter(t => t.type === "parcel").length;
    return [{ name: "City Ride", value: short }, { name: "Long Route", value: long_ }, { name: "Parcel", value: parcel }];
  }, [trips]);

  // Top drivers by trips
  const topDrivers = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    trips.filter(t => t.status === "completed" && t.assignedDriver).forEach(t => {
      const id = t.assignedDriver!._id;
      if (!map[id]) map[id] = { name: t.assignedDriver!.name, count: 0, revenue: 0 };
      map[id].count++;
      map[id].revenue += t.finalFare ?? t.fare ?? 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [trips]);

  // Weekly stats for comparison bar
  const weekData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = ago(6 - i); const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
      const dt = trips.filter(t => inRange(t.createdAt, day, dayEnd));
      return { date: day.toLocaleDateString("en-IN", { weekday: "short" }), Revenue: Math.round(dt.filter(t => t.status === "completed").reduce((s, t) => s + (t.finalFare ?? t.fare ?? 0), 0)) };
    });
  }, [trips]);

  if (loading) return <Spinner label="Loading analytics…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader title="Analytics Dashboard" icon="📊"
        sub={"Live metrics · " + trips.length + " total trips in database"}
        actions={<>
          <Sel value={range} onChange={v => setRange(v as any)} options={[{ value: "7d", label: "7 days" }, { value: "14d", label: "14 days" }, { value: "30d", label: "30 days" }]} />
          <Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>
        </>}
      />

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: "0.875rem", marginBottom: "1.75rem" }}>
        <StatCard label="Rides Today"      value={todayTrips.length}                                       icon="🚘" color={C.primary} />
        <StatCard label="Completed Today"  value={completedToday.length}                                   icon="✅" color={C.green}  />
        <StatCard label="Revenue Today"    value={"₹" + Math.round(revenueToday).toLocaleString("en-IN")} icon="💰" color={C.amber}  />
        <StatCard label="Cancel Rate"      value={cancelRate.toFixed(1) + "%"}                             icon="❌" color={C.red}    />
        <StatCard label="Active Rides"     value={activeRides.length}                                      icon="🔴" color={C.red}    sub="right now" />
        <StatCard label="Online Drivers"   value={onlineDrivers.length}                                    icon="🟢" color={C.green}  />
        <StatCard label="Active Users"     value={customers.length}                                        icon="👥" color={C.cyan}   />
        <StatCard label="Open Complaints"  value={supportCount}                                            icon="🆘" color={C.red}    />
      </div>

      {/* Daily rides + revenue chart */}
      <SectionLabel>📈 Daily Rides & Revenue — last {days} days</SectionLabel>
      <Card style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} />
            <YAxis yAxisId="left"  tick={{ fill: C.muted, fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: C.muted, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "0.78rem", color: C.muted }} />
            <Bar yAxisId="left"  dataKey="Completed" fill={C.green}   radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left"  dataKey="Cancelled" fill={C.red}     radius={[4, 4, 0, 0]} opacity={0.7} />
            <Bar yAxisId="right" dataKey="Revenue"   fill={C.amber}   radius={[4, 4, 0, 0]} opacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Revenue trend line */}
      <SectionLabel>💰 Revenue Trend</SectionLabel>
      <Card style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="Revenue" stroke={C.amber} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Pie charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
        {/* Vehicle mix */}
        <Card style={{ padding: "1.25rem" }}>
          <SectionLabel>🚗 Rides by Vehicle</SectionLabel>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={vehicleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => name + " " + ((percent ?? 0) * 100).toFixed(0) + "%"}>
                {vehicleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        {/* Trip type mix */}
        <Card style={{ padding: "1.25rem" }}>
          <SectionLabel>🗺️ Trip Type Split</SectionLabel>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({ name, percent }) => name + " " + ((percent ?? 0) * 100).toFixed(0) + "%"}>
                {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top drivers */}
      <SectionLabel>🏆 Top Drivers by Completed Trips</SectionLabel>
      <Card style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topDrivers} layout="vertical" barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis type="number" tick={{ fill: C.muted, fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 11 }} width={120} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill={C.cyan} radius={[0, 4, 4, 0]} name="Trips" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* This week revenue */}
      <SectionLabel>📅 This Week — Daily Revenue</SectionLabel>
      <Card style={{ padding: "1.25rem" }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Revenue" radius={[6, 6, 0, 0]}>
              {weekData.map((_, i) => <Cell key={i} fill={i === weekData.length - 1 ? C.primary : C.amber} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}