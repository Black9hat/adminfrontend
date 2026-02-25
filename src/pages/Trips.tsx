import React, { useEffect, useState, useCallback, useRef } from "react";
import axiosInstance from "../api/axiosInstance";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TripLoc { address?: string; coordinates?: [number, number] }
interface Trip {
  _id: string;
  customerId?: { _id: string; name: string; phone: string } | null;
  assignedDriver?: { _id: string; name: string; phone: string } | null;
  status: string; type: "short" | "long" | "parcel"; vehicleType: string;
  pickup: TripLoc; drop: TripLoc;
  fare: number; finalFare?: number; discountApplied?: number; coinsUsed?: number;
  payment?: { collected?: boolean; method?: string };
  otp?: string; version?: number; retryCount?: number;
  supportRequested?: boolean; supportReason?: string;
  cancelledBy?: string; cancellationReason?: string;
  rideStartTime?: string; completedAt?: string; cancelledAt?: string; acceptedAt?: string;
  isSameDay?: boolean; returnTrip?: boolean; tripDays?: number;
  parcelDetails?: { weight?: number; senderName?: string; receiverName?: string; receiverPhone?: string };
  createdAt: string; updatedAt: string;
}
interface Customer { _id: string; name: string; phone?: string; email?: string }
type TabType = "all" | "user";

// ─── Config ───────────────────────────────────────────────────────────────────
const S: Record<string, { label: string; dot: string; pill: string }> = {
  requested: { label: "Requested", dot: "bg-amber-400", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  driver_assigned: { label: "Driver Assigned", dot: "bg-blue-400", pill: "bg-blue-50 text-blue-700 border-blue-200" },
  driver_at_pickup: { label: "At Pickup", dot: "bg-indigo-400", pill: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  ride_started: { label: "Ride Started", dot: "bg-violet-400", pill: "bg-violet-50 text-violet-700 border-violet-200" },
  completed: { label: "Completed", dot: "bg-emerald-400", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", dot: "bg-red-400", pill: "bg-red-50 text-red-700 border-red-200" },
  timeout: { label: "Timeout", dot: "bg-gray-400", pill: "bg-gray-50 text-gray-600 border-gray-200" },
};
const T: Record<string, { label: string; icon: string; bg: string }> = {
  short: { label: "City Ride", icon: "🏙️", bg: "bg-blue-50 text-blue-600" },
  long: { label: "Long Route", icon: "🛣️", bg: "bg-purple-50 text-purple-600" },
  parcel: { label: "Parcel", icon: "📦", bg: "bg-orange-50 text-orange-600" },
};
const tok = () => localStorage.getItem("adminToken") || "";

// ─── Animated Number ──────────────────────────────────────────────────────────
const Num: React.FC<{ val: number; prefix?: string; dur?: number }> = ({ val, prefix = "", dur = 900 }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0; const total = Math.ceil(dur / 16);
    const t = setInterval(() => {
      frame++;
      setN(Math.round((frame / total) * val));
      if (frame >= total) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [val, dur]);
  return <span>{prefix}{n.toLocaleString("en-IN")}</span>;
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const Badge: React.FC<{ s: string }> = ({ s }) => {
  const c = S[s] || { label: s, dot: "bg-gray-400", pill: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />{c.label}
    </span>
  );
};

// ─── TripDetailModal ──────────────────────────────────────────────────────────
const Modal: React.FC<{ trip: Trip; onClose: () => void; onAction: (t: "complete" | "cancel") => void }> = ({ trip, onClose, onAction }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 250); };
  const pu = trip.pickup; const dr = trip.drop;
  const pLat = pu?.coordinates?.[1]; const pLng = pu?.coordinates?.[0];
  const dLat = dr?.coordinates?.[1]; const dLng = dr?.coordinates?.[0];
  const tc = T[trip.type] || { label: trip.type, icon: "🚗", bg: "" };
  const fare = trip.finalFare ?? trip.fare ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: visible ? "rgba(15,23,42,0.7)" : "transparent", backdropFilter: visible ? "blur(6px)" : "none", transition: "all .25s ease" }}
      onClick={close}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[88vh] overflow-y-auto"
        style={{ transform: visible ? "translateY(0) scale(1)" : "translateY(40px) scale(.95)", opacity: visible ? 1 : 0, transition: "all .3s cubic-bezier(.34,1.56,.64,1)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* top gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-3xl" />

        {/* header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-200">
              {tc.icon}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-mono tracking-wider">#{trip._id.slice(-8).toUpperCase()}</p>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">{tc.label}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge s={trip.status} />
            <button onClick={close} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Fare card */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-400 mb-1">Total Fare</p>
              <p className="text-xl font-black text-slate-800">₹{fare.toFixed(2)}</p>
              {trip.discountApplied ? <p className="text-[10px] text-emerald-600 mt-0.5">-₹{trip.discountApplied} off</p> : null}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Vehicle</p>
              <p className="text-sm font-semibold text-slate-700 capitalize">{trip.vehicleType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Payment</p>
              <p className={`text-sm font-semibold ${trip.payment?.collected ? "text-emerald-600" : "text-amber-500"}`}>
                {trip.payment?.collected ? "✅ Collected" : "⏳ Pending"}
              </p>
            </div>
          </div>

          {/* Route */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Route</p>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow shadow-emerald-200" />
                <div className="w-px h-8 bg-gradient-to-b from-emerald-300 to-red-300 my-1" />
                <div className="w-3 h-3 rounded-full bg-red-400 shadow shadow-red-200" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div><p className="text-[10px] text-slate-400 uppercase">Pickup</p><p className="text-sm font-semibold text-slate-800 truncate">{pu?.address || (pLat ? `${pLat.toFixed(5)}, ${pLng?.toFixed(5)}` : "—")}</p></div>
                <div><p className="text-[10px] text-slate-400 uppercase">Drop</p><p className="text-sm font-semibold text-slate-800 truncate">{dr?.address || (dLat ? `${dLat.toFixed(5)}, ${dLng?.toFixed(5)}` : "—")}</p></div>
              </div>
            </div>
            {pLat && dLat && (
              <a href={`https://www.google.com/maps/dir/?api=1&origin=${pLat},${pLng}&destination=${dLat},${dLng}`} target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                📍 Open in Google Maps →
              </a>
            )}
          </div>

          {/* People */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Customer", person: trip.customerId, color: "from-purple-500 to-pink-500" },
              { label: "Driver", person: trip.assignedDriver, color: "from-blue-500 to-cyan-500" },
            ].map(({ label, person, color }) => (
              <div key={label} className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                {person ? (
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {person.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{person.name}</p>
                      <p className="text-xs text-slate-400">{person.phone}</p>
                    </div>
                  </div>
                ) : <p className="text-xs text-slate-300 italic">Not assigned</p>}
              </div>
            ))}
          </div>

          {/* Meta grid */}
          <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <p className="text-slate-400">Version <span className="text-slate-700 font-semibold float-right">v{trip.version ?? 0}</span></p>
            <p className="text-slate-400">Retries <span className="text-slate-700 font-semibold float-right">{trip.retryCount ?? 0}</span></p>
            {trip.otp && <p className="text-slate-400">OTP <span className="font-mono font-bold text-indigo-600 float-right">{trip.otp}</span></p>}
            {(trip.coinsUsed ?? 0) > 0 && <p className="text-slate-400">Coins <span className="text-amber-500 font-bold float-right">🪙 {trip.coinsUsed}</span></p>}
            {trip.supportRequested && <div className="col-span-2 flex items-center gap-2 bg-red-50 text-red-600 rounded-xl px-3 py-2"><span>🆘</span><span>{trip.supportReason || "Support requested"}</span></div>}
          </div>

          {/* Timeline */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Timeline</p>
            <div className="space-y-1.5 text-xs">
              {[
                { label: "Created", val: trip.createdAt, color: "text-slate-500" },
                { label: "Accepted", val: trip.acceptedAt, color: "text-blue-500" },
                { label: "Started", val: trip.rideStartTime, color: "text-violet-500" },
                { label: "Completed", val: trip.completedAt, color: "text-emerald-600" },
                { label: "Cancelled", val: trip.cancelledAt, color: "text-red-500" },
              ].filter(x => x.val).map(x => (
                <div key={x.label} className="flex justify-between">
                  <span className={x.color}>{x.label}</span>
                  <span className="text-slate-500">{new Date(x.val!).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>

          {trip.type === "parcel" && trip.parcelDetails && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2">📦 Parcel Info</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {(Object.entries(trip.parcelDetails) as [string, any][]).filter(([, v]) => v).map(([k, v]) => (
                  <p key={k} className="text-slate-600"><span className="text-slate-400 capitalize">{k}: </span>{v}</p>
                ))}
              </div>
            </div>
          )}

          {trip.status === "cancelled" && (trip.cancellationReason || trip.cancelledBy) && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Cancellation</p>
              {trip.cancellationReason && <p className="text-red-600">Reason: {trip.cancellationReason}</p>}
              {trip.cancelledBy && <p className="text-red-500 text-xs mt-1">By: {trip.cancelledBy}</p>}
            </div>
          )}
        </div>

        {trip.status !== "completed" && trip.status !== "cancelled" && (
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={() => onAction("complete")} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all">✅ Mark Completed</button>
            <button onClick={() => onAction("cancel")} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-bold shadow-lg shadow-red-200 hover:shadow-red-300 hover:-translate-y-0.5 transition-all">❌ Cancel Trip</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Trip Table Row ───────────────────────────────────────────────────────────
const Row: React.FC<{ trip: Trip; idx: number; onClick: () => void; showCustomer: boolean }> = ({ trip, idx, onClick, showCustomer }) => {
  const tc = T[trip.type] || { label: trip.type, icon: "🚗", bg: "bg-gray-50 text-gray-600" };
  const fare = trip.finalFare ?? trip.fare ?? 0;
  return (
    <tr
      className="group cursor-pointer border-b border-slate-50 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-200"
      style={{ animationDelay: `${idx * 30}ms` }}
      onClick={onClick}
    >
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          {trip.supportRequested && <span className="text-red-400 text-xs animate-bounce">🆘</span>}
          <span className="font-mono text-xs text-slate-400 group-hover:text-indigo-500 transition-colors">#{trip._id.slice(-8).toUpperCase()}</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${tc.bg}`}>{tc.icon} {tc.label}</span>
      </td>
      {showCustomer && (
        <td className="px-4 py-3.5">
          {trip.customerId ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {trip.customerId.name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 leading-none">{trip.customerId.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{trip.customerId.phone}</p>
              </div>
            </div>
          ) : <span className="text-xs text-slate-300">—</span>}
        </td>
      )}
      <td className="px-4 py-3.5">
        {trip.assignedDriver ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {trip.assignedDriver.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 leading-none">{trip.assignedDriver.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{trip.assignedDriver.phone}</p>
            </div>
          </div>
        ) : <span className="text-xs text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3.5 max-w-[200px]">
        <p className="text-xs text-slate-600 truncate"><span className="text-emerald-500">●</span> {trip.pickup?.address || "—"}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5"><span className="text-red-400">●</span> {trip.drop?.address || "—"}</p>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <p className="font-bold text-slate-800">₹{fare.toFixed(0)}</p>
        <p className={`text-xs mt-0.5 ${trip.payment?.collected ? "text-emerald-500" : "text-amber-400"}`}>
          {trip.payment?.collected ? "● Paid" : "○ Unpaid"}
        </p>
      </td>
      <td className="px-4 py-3.5"><Badge s={trip.status} /></td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <p className="text-xs text-slate-600">{new Date(trip.createdAt).toLocaleDateString("en-IN")}</p>
        <p className="text-xs text-slate-400 mt-0.5">{new Date(trip.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
      </td>
      <td className="px-4 py-3.5">
        <span className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
          View →
        </span>
      </td>
    </tr>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TripsPage() {
  const [tab, setTab] = useState<TabType>("all");
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState<Trip | null>(null);
  const [actLoading, setActLoading] = useState(false);
  // all trips filters
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all");
  const [type, setType] = useState("all"); const [sort, setSort] = useState<"newest" | "oldest" | "fh" | "fl">("newest");
  const [page, setPage] = useState(1); const PER = 20;
  // user trips
  const [custs, setCusts] = useState<Customer[]>([]);
  const [uSearch, setUSearch] = useState(""); const [uDrop, setUDrop] = useState(false);
  const [selUser, setSelUser] = useState<Customer | null>(null);
  const [uStatus, setUStatus] = useState("all");
  const dropRef = useRef<HTMLDivElement>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const r = await axiosInstance.get("/admin/trips", { headers: { Authorization: `Bearer ${tok()}`, "ngrok-skip-browser-warning": "true" } });
      setAllTrips(r.data.trips || []);
    } catch (e: any) { setErr(e.response?.data?.message || "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  const fetchCusts = useCallback(async () => {
    try {
      const r = await axiosInstance.get("/admin/customers", { headers: { Authorization: `Bearer ${tok()}`, "ngrok-skip-browser-warning": "true" } });
      setCusts(r.data.customers || []);
    } catch { }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useEffect(() => { if (tab === "user" && !custs.length) fetchCusts(); }, [tab, custs.length, fetchCusts]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setUDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const doAction = async (t: "complete" | "cancel") => {
    if (!modal) return; setActLoading(true);
    try {
      await axiosInstance.put(`/admin/trip/${modal._id}/${t === "complete" ? "complete" : "cancel"}`, {}, { headers: { Authorization: `Bearer ${tok()}` } });
      setModal(null); fetchTrips();
    } catch (e: any) { alert(e.response?.data?.message || "Error"); }
    finally { setActLoading(false); }
  };

  // Filter/sort
  const filtered = allTrips.filter(t => {
    if (status !== "all" && t.status !== status) return false;
    if (type !== "all" && t.type !== type) return false;
    if (q) {
      const ql = q.toLowerCase();
      return [t._id, t.customerId?.name, t.customerId?.phone, t.assignedDriver?.name, t.assignedDriver?.phone, t.pickup?.address, t.drop?.address, t.vehicleType].some(v => v?.toLowerCase().includes(ql));
    }
    return true;
  }).sort((a, b) => {
    if (sort === "oldest") return +new Date(a.createdAt) - +new Date(b.createdAt);
    if (sort === "fh") return (b.finalFare ?? b.fare ?? 0) - (a.finalFare ?? a.fare ?? 0);
    if (sort === "fl") return (a.finalFare ?? a.fare ?? 0) - (b.finalFare ?? b.fare ?? 0);
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });
  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);

  const userTrips = selUser ? allTrips.filter(t => t.customerId?._id === selUser._id && (uStatus === "all" || t.status === uStatus)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) : [];
  const suggestions = uSearch.length > 0 ? custs.filter(c => [c.name, c.phone, c.email].some(v => v?.toLowerCase().includes(uSearch.toLowerCase()))).slice(0, 7) : [];

  const stats = {
    total: allTrips.length,
    active: allTrips.filter(t => ["requested", "driver_assigned", "driver_at_pickup", "ride_started"].includes(t.status)).length,
    done: allTrips.filter(t => t.status === "completed").length,
    cancelled: allTrips.filter(t => t.status === "cancelled").length,
    rev: allTrips.filter(t => t.status === "completed").reduce((s, t) => s + (t.finalFare ?? t.fare ?? 0), 0),
  };
  const uStats = selUser ? {
    total: userTrips.length === 0 ? allTrips.filter(t => t.customerId?._id === selUser._id).length : (uStatus === "all" ? allTrips.filter(t => t.customerId?._id === selUser._id).length : userTrips.length),
    done: allTrips.filter(t => t.customerId?._id === selUser._id && t.status === "completed").length,
    cancelled: allTrips.filter(t => t.customerId?._id === selUser._id && t.status === "cancelled").length,
    rev: allTrips.filter(t => t.customerId?._id === selUser._id && t.status === "completed").reduce((s, t) => s + (t.finalFare ?? t.fare ?? 0), 0),
  } : null;

  const TH: React.FC<{ sc: boolean }> = ({ sc }) => (
    <thead>
      <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-100">
        {["Trip ID", "Type", ...(sc ? ["Customer"] : []), "Driver", "Route", "Fare", "Status", "Date", ""].map(h => (
          <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
        ))}
      </tr>
    </thead>
  );

  const sel = `px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-600 hover:border-indigo-300 transition-colors cursor-pointer`;

  return (
    <>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes shimmer { from { background-position:-200% 0; } to { background-position:200% 0; } }
        .anim-row { animation: slideUp .35s ease both; }
        .anim-card { animation: fadeIn .4s ease both; }
      `}</style>

      <div className="min-h-full bg-slate-50 p-6 lg:p-8 anim-card">
        {/* ── Header ── */}
        <div className="mb-7 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Trips</span>
              <span className="text-slate-800"> Review</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Live data from MongoDB · {allTrips.length.toLocaleString()} records</p>
          </div>
          <button onClick={fetchTrips} disabled={loading}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all disabled:opacity-60">
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? "Syncing…" : "Refresh"}
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-7">
          {[
            { label: "Total", val: stats.total, icon: "🗂️", g: "from-slate-600 to-slate-800", sh: "shadow-slate-200" },
            { label: "Active", val: stats.active, icon: "🚗", g: "from-blue-500 to-indigo-600", sh: "shadow-blue-200" },
            { label: "Completed", val: stats.done, icon: "✅", g: "from-emerald-500 to-teal-600", sh: "shadow-emerald-200" },
            { label: "Cancelled", val: stats.cancelled, icon: "❌", g: "from-red-500 to-rose-600", sh: "shadow-red-200" },
            { label: "Revenue", val: Math.round(stats.rev), icon: "💰", g: "from-violet-500 to-purple-600", sh: "shadow-violet-200", prefix: "₹" },
          ].map((s, i) => (
            <div key={i} className={`anim-card bg-white rounded-2xl p-4 border border-slate-100 shadow-md ${s.sh} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.g} flex items-center justify-center text-[18px] shadow-lg shrink-0`}>{s.icon}</div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                <p className="font-black text-slate-800 text-sm truncate">
                  <Num val={s.val} prefix={s.prefix} dur={800 + i * 100} />
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 mb-6 w-fit flex gap-1">
          {([
            { key: "all", label: "All Trips", icon: "🗂️", count: allTrips.length },
            { key: "user", label: "User Trips", icon: "👤", count: selUser ? allTrips.filter(t => t.customerId?._id === selUser._id).length : null },
          ] as const).map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key as TabType)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${tab === tb.key ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
              {tb.icon} {tb.label}
              {tb.count !== null && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${tab === tb.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{tb.count}</span>
              )}
              {tab === tb.key && <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" style={{ animationDuration: "3s" }} />}
            </button>
          ))}
        </div>

        {/* ══ ALL TRIPS ══ */}
        {tab === "all" && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-52">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="Search by name, phone, ID, address…" value={q}
                  onChange={e => { setQ(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-slate-400 transition-all" />
                {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">✕</button>}
              </div>
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={sel}>
                <option value="all">All Status</option>
                {Object.entries(S).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className={sel}>
                <option value="all">All Types</option>
                <option value="short">🏙️ City</option>
                <option value="long">🛣️ Long</option>
                <option value="parcel">📦 Parcel</option>
              </select>
              <select value={sort} onChange={e => setSort(e.target.value as any)} className={sel}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="fh">Fare ↓</option>
                <option value="fl">Fare ↑</option>
              </select>
              <span className="text-xs text-slate-400 font-medium ml-auto">{filtered.length} results</span>
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl px-5 py-3.5 mb-5 flex items-center gap-3 text-sm">
                ⚠️ {err} <button onClick={fetchTrips} className="ml-auto underline font-semibold">Retry</button>
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-20 flex flex-col items-center gap-5">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                  <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-slate-400 text-sm font-medium animate-pulse">Loading trips from database…</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <TH sc />
                    <tbody>
                      {paged.length === 0 ? (
                        <tr><td colSpan={9} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl animate-bounce">🗂️</div>
                            <p className="text-slate-500 font-semibold">No trips match your filters</p>
                            <button onClick={() => { setQ(""); setStatus("all"); setType("all"); }} className="text-indigo-500 text-sm underline">Clear filters</button>
                          </div>
                        </td></tr>
                      ) : paged.map((t, i) => <Row key={t._id} trip={t} idx={i} onClick={() => setModal(t)} showCustomer />)}
                    </tbody>
                  </table>
                </div>
                {pages > 1 && (
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-400 font-medium">{(page - 1) * PER + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length}</p>
                    <div className="flex gap-1.5">
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-colors">←</button>
                      {Array.from({ length: Math.min(7, pages) }, (_, i) => {
                        const pg = page <= 4 ? i + 1 : page + i - 3; if (pg < 1 || pg > pages) return null;
                        return <button key={pg} onClick={() => setPage(pg)} className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${pg === page ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200" : "border border-slate-200 text-slate-600 hover:bg-white"}`}>{pg}</button>;
                      })}
                      <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 transition-colors">→</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══ USER TRIPS ══ */}
        {tab === "user" && (
          <div className="space-y-5 anim-card">
            {/* Search card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-base font-black text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm">👤</span>
                <span>Search Customer</span>
              </h2>
              <div ref={dropRef} className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="Type name, phone or email…" value={uSearch}
                  onChange={e => { setUSearch(e.target.value); setUDrop(true); }}
                  onFocus={() => setUDrop(true)}
                  className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-0 focus:border-indigo-400 placeholder-slate-400 transition-colors font-medium" />
                {uSearch && <button onClick={() => { setUSearch(""); setSelUser(null); setUDrop(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">✕</button>}

                {uDrop && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200 z-30 overflow-hidden">
                    {suggestions.map((c, i) => (
                      <button key={c._id} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left group"
                        style={{ animationDelay: `${i * 40}ms` }}
                        onClick={() => { setSelUser(c); setUSearch(c.name); setUDrop(false); setUStatus("all"); }}>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shrink-0 shadow-md shadow-indigo-200">
                          {c.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{c.name}</p>
                          <p className="text-xs text-slate-400 truncate">{c.phone || c.email || c._id.slice(-10)}</p>
                        </div>
                        <span className="ml-auto text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected user */}
              {selUser && uStats && (
                <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl flex items-center gap-4 flex-wrap anim-card">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-200 shrink-0">
                    {selUser.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-base">{selUser.name}</p>
                    <p className="text-xs text-slate-500">{selUser.phone || selUser.email || "No contact"}</p>
                  </div>
                  <div className="flex gap-4 text-center flex-wrap">
                    {[
                      { label: "Trips", val: uStats.total, color: "text-slate-800" },
                      { label: "Completed", val: uStats.done, color: "text-emerald-600" },
                      { label: "Cancelled", val: uStats.cancelled, color: "text-red-500" },
                      { label: "Spent", val: `₹${Math.round(uStats.rev).toLocaleString("en-IN")}`, color: "text-violet-600", raw: true },
                    ].map(s => (
                      <div key={s.label}>
                        <p className={`text-xl font-black ${s.color}`}>{s.raw ? s.val : <Num val={s.val as number} dur={600} />}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setSelUser(null); setUSearch(""); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors">✕</button>
                </div>
              )}
            </div>

            {!selUser ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-5 text-4xl animate-bounce" style={{ animationDuration: "2s" }}>👤</div>
                <h3 className="text-lg font-black text-slate-700 mb-2">Search for a Customer</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">Type a name, phone, or email above to view their full trip history.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden anim-card">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap bg-gradient-to-r from-slate-50 to-white">
                  <div>
                    <p className="font-black text-slate-800">Trip History — <span className="text-indigo-600">{selUser.name}</span></p>
                    <p className="text-xs text-slate-400 mt-0.5">{userTrips.length} trips shown</p>
                  </div>
                  <select value={uStatus} onChange={e => setUStatus(e.target.value)} className={sel}>
                    <option value="all">All Status</option>
                    {Object.entries(S).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                {userTrips.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-4">🗺️</div>
                    <p className="text-slate-500 font-semibold">No trips found</p>
                    {uStatus !== "all" && <button onClick={() => setUStatus("all")} className="mt-2 text-indigo-500 text-sm underline">Show all</button>}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <TH sc={false} />
                      <tbody>
                        {userTrips.map((t, i) => <Row key={t._id} trip={t} idx={i} onClick={() => setModal(t)} showCustomer={false} />)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && <Modal trip={modal} onClose={() => setModal(null)} onAction={doAction} />}

      {/* Action spinner */}
      {actLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-700 font-bold">Processing…</p>
          </div>
        </div>
      )}
    </>
  );
}
