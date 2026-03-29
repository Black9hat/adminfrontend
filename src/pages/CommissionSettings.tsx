import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Save,
  RefreshCw,
  Zap,
  X,
  Radio,
  TrendingUp,
  Shield,
  Activity,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  getAllCommissionSettings,
  updateCommissionSetting,
  broadcastConfigToDrivers,
  type CommissionSetting,
} from "../api/commissionApi";

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS  — slate-950 base, amber accent (ride brand)
───────────────────────────────────────────────────────────── */
const C = {
  page:        "#080C14",
  card:        "#0D1220",
  row:         "#0D1220",
  rowHover:    "#111827",
  input:       "#060A10",
  inputBorder: "#1E2A3E",
  inputFocus:  "#F59E0B",
  thead:       "#080C14",
  border:      "#1A2540",
  borderMid:   "#101828",
  text:        "#F0F4FF",
  textSub:     "#7B90B8",
  textMuted:   "#2E3F5C",
  amber:       "#F59E0B",
  amberDim:    "rgba(245,158,11,0.10)",
  amberGlow:   "rgba(245,158,11,0.20)",
  green:       "#10B981",
  greenDim:    "rgba(16,185,129,0.10)",
  blue:        "#3B82F6",
  blueDim:     "rgba(59,130,246,0.10)",
  purple:      "#A78BFA",
  purpleDim:   "rgba(167,139,250,0.10)",
  danger:      "#EF4444",
};

const VEHICLES = [
  { value: "all",     label: "All Vehicles", icon: "🌐", accent: "#3B82F6" },
  { value: "bike",    label: "Bike",         icon: "🏍️", accent: "#A78BFA" },
  { value: "auto",    label: "Auto",         icon: "🛺", accent: "#F59E0B" },
  { value: "car",     label: "Car",          icon: "🚗", accent: "#3B82F6" },
  { value: "premium", label: "Premium",      icon: "🚘", accent: "#10B981" },
  { value: "xl",      label: "XL / SUV",     icon: "🚙", accent: "#EC4899" },
];
const vmeta = (v = "") =>
  VEHICLES.find((x) => x.value === v) ?? { label: v, icon: "🚗", accent: C.blue };

/* ── KPI Card ─────────────────────────────────────────────── */
const KPI: React.FC<{
  icon: React.ReactNode; label: string;
  value: string; accent: string; note?: string;
}> = ({ icon, label, value, accent, note }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 14, padding: "20px 22px",
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column", gap: 14,
  }}>
    <div style={{
      position: "absolute", top: -28, right: -28,
      width: 88, height: 88, background: accent,
      opacity: 0.07, borderRadius: "50%", filter: "blur(20px)",
      pointerEvents: "none",
    }} />
    <div style={{
      position: "absolute", left: 0, top: 20, bottom: 20,
      width: 3, background: accent, borderRadius: "0 3px 3px 0",
    }} />
    <div style={{
      width: 36, height: 36,
      background: `${accent}18`, border: `1px solid ${accent}30`,
      borderRadius: 9, display: "flex", alignItems: "center",
      justifyContent: "center", color: accent, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{
        fontSize: 26, fontWeight: 800, color: C.text,
        fontFamily: "'Syne', sans-serif",
        letterSpacing: "-0.04em", lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textSub, marginTop: 4, fontWeight: 500 }}>{label}</div>
      {note && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{note}</div>}
    </div>
  </div>
);

/* ── Number input ─────────────────────────────────────────── */
const NumInput: React.FC<{
  value: number; onChange: (v: number) => void;
  pre?: string; suf?: string; step?: number; max?: number;
}> = ({ value, onChange, pre, suf, step = 1, max }) => {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: C.input,
      border: `1px solid ${focus ? C.inputFocus : C.inputBorder}`,
      borderRadius: 8, overflow: "hidden",
      transition: "border-color .15s", height: 34,
    }}>
      {pre && (
        <span style={{
          padding: "0 9px", fontSize: 11, fontWeight: 700,
          color: C.textSub, background: C.card,
          borderRight: `1px solid ${C.inputBorder}`,
          height: "100%", display: "flex", alignItems: "center",
          userSelect: "none",
        }}>{pre}</span>
      )}
      <input
        type="number" min={0} max={max} step={step} value={value}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          flex: 1, background: "transparent", border: "none",
          outline: "none", color: C.text, fontSize: 13, fontWeight: 600,
          padding: "0 10px", height: "100%",
          textAlign: "right", fontVariantNumeric: "tabular-nums",
        }}
      />
      {suf && (
        <span style={{
          padding: "0 9px", fontSize: 11, fontWeight: 700,
          color: C.textSub, background: C.card,
          borderLeft: `1px solid ${C.inputBorder}`,
          height: "100%", display: "flex", alignItems: "center",
          userSelect: "none",
        }}>{suf}</span>
      )}
    </div>
  );
};

/* ── Value pill ───────────────────────────────────────────── */
const Pill: React.FC<{ pre?: string; val: number | string; suf?: string; color: string }> =
  ({ pre = "", val, suf = "", color }) => (
    <span style={{
      display: "inline-flex", alignItems: "center",
      background: `${color}12`, border: `1px solid ${color}28`,
      color, borderRadius: 7, padding: "3px 10px",
      fontSize: 13, fontWeight: 700,
      fontVariantNumeric: "tabular-nums",
      letterSpacing: "-0.01em",
    }}>
      {pre}{val}{suf}
    </span>
  );

/* ── Main component ───────────────────────────────────────── */
const CommissionSettings: React.FC = () => {
  const [settings, setSettings]         = useState<CommissionSetting[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastOk, setBroadcastOk]   = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [form, setForm]                 = useState<Partial<CommissionSetting>>({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getAllCommissionSettings();
      if (r.success) setSettings(r.data);
      else toast.error(r.error || "Failed to load");
    } catch { toast.error("Server error"); }
    finally { setLoading(false); }
  };

  const setField = (k: keyof CommissionSetting, v: string | number | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!editingId || !form.vehicleType) return;
    if ((form.commissionPercent ?? 0) > 100 || (form.platformFeePercent ?? 0) > 100) {
      toast.error("Percentage values must be ≤ 100"); return;
    }
    try {
      setSaving(editingId);
      const r = await updateCommissionSetting(form.vehicleType, form);
      if (r.success) {
        toast.success(`${form.vehicleType} saved`);
        load(); setEditingId(null); setForm({});
      } else toast.error(r.error || "Save failed");
    } catch { toast.error("Server error"); }
    finally { setSaving(null); }
  };

  const broadcast = async () => {
    setBroadcasting(true);
    try {
      const r = await broadcastConfigToDrivers();
      if (r.success) {
        setBroadcastOk(true);
        toast.success(r.message);
        setTimeout(() => setBroadcastOk(false), 4500);
      } else toast.error(r.error || "Broadcast failed");
    } catch { toast.error("Server error"); }
    finally { setBroadcasting(false); }
  };

  const avgComm = settings.length
    ? (settings.reduce((s, x) => s + (x.commissionPercent || 0), 0) / settings.length).toFixed(1)
    : "—";
  const totalInc = settings.reduce((s, x) => s + (x.perRideIncentive || 0), 0);

  /* Loading */
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 34, height: 34,
          border: `2px solid ${C.border}`, borderTopColor: C.amber,
          borderRadius: "50%", animation: "spin .7s linear infinite",
          margin: "0 auto 14px",
        }} />
        <p style={{ color: C.textSub, fontSize: 13, fontWeight: 500, margin: 0 }}>
          Loading commission settings…
        </p>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", background: C.page,
      padding: "32px 28px",
      fontFamily: "'DM Sans', sans-serif", color: C.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        .cs-tr:hover td   { background: ${C.rowHover} !important; }
        .cs-tr td         { transition: background .12s; }
        .cs-btn:hover     { opacity: .82 !important; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar       { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      `}</style>

      <div style={{ maxWidth: 1360, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <nav style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12, color: C.textSub, marginBottom: 30, fontWeight: 500,
        }}>
          <span>Admin</span>
          <ChevronRight size={11} color={C.textMuted} />
          <span>Configuration</span>
          <ChevronRight size={11} color={C.textMuted} />
          <span style={{ color: C.text }}>Commission &amp; Incentives</span>
        </nav>

        {/* Page header */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: 16, marginBottom: 32,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 7 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: C.amber, boxShadow: `0 0 10px ${C.amber}`,
              }} />
              <h1 style={{
                fontFamily: "'Syne', sans-serif", fontSize: 27, fontWeight: 800,
                color: C.text, margin: 0, letterSpacing: "-0.04em",
              }}>
                Commission &amp; Incentives
              </h1>
            </div>
            <p style={{ color: C.textSub, margin: 0, fontSize: 14, fontWeight: 400, paddingLeft: 21 }}>
              Manage per-vehicle commission rates, platform fees, and driver incentive structures.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <button
              className="cs-btn"
              onClick={load}
              style={{
                height: 38, padding: "0 16px",
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 10, color: C.textSub,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                fontSize: 13, fontWeight: 600, transition: "opacity .15s",
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>

            <button
              className="cs-btn"
              onClick={broadcast}
              disabled={broadcasting}
              style={{
                height: 38, padding: "0 20px",
                background: broadcastOk ? C.green : C.amber,
                border: "none", borderRadius: 10, color: "#000",
                cursor: broadcasting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 13, fontWeight: 800,
                opacity: broadcasting ? 0.65 : 1,
                transition: "background .35s, opacity .2s",
                boxShadow: broadcastOk
                  ? `0 0 22px ${C.green}50`
                  : `0 0 18px ${C.amber}35`,
              }}
            >
              {broadcasting ? (
                <>
                  <div style={{
                    width: 12, height: 12,
                    border: "2px solid rgba(0,0,0,.25)", borderTopColor: "#000",
                    borderRadius: "50%", animation: "spin .6s linear infinite",
                  }} />
                  Broadcasting…
                </>
              ) : broadcastOk ? (
                <><CheckCircle2 size={14} /> Broadcasted!</>
              ) : (
                <><Radio size={14} /> Broadcast to Drivers</>
              )}
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(195px,1fr))",
          gap: 13, marginBottom: 28,
        }}>
          <KPI icon={<Activity size={15} />}   label="Avg Commission Rate"    value={`${avgComm}%`}           accent={C.amber}  note="Across all vehicle types" />
          <KPI icon={<Shield size={15} />}     label="Profiles Configured"    value={String(settings.length)} accent={C.blue}   note="Active vehicle classes" />
          <KPI icon={<Zap size={15} />}        label="Total Incentive / Ride" value={`₹${totalInc}`}          accent={C.green}  note="Sum across vehicle types" />
          <KPI icon={<TrendingUp size={15} />} label="Broadcast Status"       value="Live"                    accent={C.purple} note="Socket.io + FCM active" />
        </div>

        {/* Table card */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 16, overflow: "hidden",
          animation: "fadeUp .35s ease",
        }}>
          {/* Card header bar */}
          <div style={{
            padding: "15px 22px", borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: C.page,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 14, fontWeight: 700, color: C.text,
              }}>
                Vehicle Rate Matrix
              </span>
              <span style={{
                background: C.amberDim, border: `1px solid ${C.amberGlow}`,
                color: C.amber, fontSize: 11, fontWeight: 700,
                borderRadius: 20, padding: "2px 9px",
              }}>
                {settings.length} profiles
              </span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              fontSize: 12, color: C.textSub, fontWeight: 500,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: C.green, display: "inline-block",
                animation: "pulse 2.2s infinite",
              }} />
              Live — changes propagate instantly
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.thead }}>
                  {["Vehicle Type", "Commission %", "Platform Fee (₹)", "Platform Fee %", "Per-Ride Incentive", "Per-Ride Coins", "Actions"]
                    .map((h, i) => (
                      <th key={h} style={{
                        padding: "11px 20px",
                        textAlign: i === 0 ? "left" : i === 6 ? "center" : "right",
                        fontSize: 10.5, fontWeight: 700,
                        color: C.textSub,
                        letterSpacing: "0.07em", textTransform: "uppercase",
                        borderBottom: `1px solid ${C.border}`,
                        whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {settings.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{
                      padding: "52px 24px", textAlign: "center",
                      color: C.textSub, fontSize: 14,
                    }}>
                      No commission profiles found.
                    </td>
                  </tr>
                ) : settings.map((s) => {
                  const meta    = vmeta(s.vehicleType);
                  const editing = editingId === s._id;
                  const isSaving = saving === s._id;

                  return (
                    <tr key={s._id} className="cs-tr" style={{ borderBottom: `1px solid ${C.borderMid}` }}>

                      {/* Vehicle */}
                      <td style={{ padding: "13px 20px" }}>
                        {editing ? (
                          <select
                            value={form.vehicleType || ""}
                            onChange={(e) => setField("vehicleType", e.target.value)}
                            style={{
                              background: C.input, border: `1px solid ${C.inputBorder}`,
                              borderRadius: 8, color: C.text,
                              padding: "7px 10px", fontSize: 13, fontWeight: 600,
                              outline: "none", cursor: "pointer",
                            }}
                          >
                            {VEHICLES.map((v) => (
                              <option key={v.value} value={v.value}>{v.icon} {v.label}</option>
                            ))}
                          </select>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                            <div style={{
                              width: 36, height: 36,
                              background: `${meta.accent}13`,
                              border: `1px solid ${meta.accent}28`,
                              borderRadius: 9,
                              display: "flex", alignItems: "center",
                              justifyContent: "center",
                              fontSize: 17, flexShrink: 0,
                            }}>
                              {meta.icon}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text, lineHeight: 1.2 }}>
                                {meta.label}
                              </div>
                              <div style={{
                                fontSize: 10.5, color: C.textMuted,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em", fontWeight: 600, marginTop: 2,
                              }}>
                                {s.vehicleType}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Commission % */}
                      <td style={{ padding: "13px 20px", textAlign: "right" }}>
                        {editing
                          ? <NumInput value={form.commissionPercent ?? 0} onChange={(v) => setField("commissionPercent", v)} suf="%" max={100} />
                          : <Pill val={s.commissionPercent} suf="%" color={C.amber} />}
                      </td>

                      {/* Platform fee flat */}
                      <td style={{ padding: "13px 20px", textAlign: "right" }}>
                        {editing
                          ? <NumInput value={form.platformFeeFlat ?? 0} onChange={(v) => setField("platformFeeFlat", v)} pre="₹" step={0.5} />
                          : <Pill pre="₹" val={s.platformFeeFlat} color={C.blue} />}
                      </td>

                      {/* Platform fee % */}
                      <td style={{ padding: "13px 20px", textAlign: "right" }}>
                        {editing
                          ? <NumInput value={form.platformFeePercent ?? 0} onChange={(v) => setField("platformFeePercent", v)} suf="%" step={0.5} max={100} />
                          : <Pill val={s.platformFeePercent} suf="%" color={C.blue} />}
                      </td>

                      {/* Per-ride incentive */}
                      <td style={{ padding: "13px 20px", textAlign: "right" }}>
                        {editing
                          ? <NumInput value={form.perRideIncentive ?? 0} onChange={(v) => setField("perRideIncentive", v)} pre="₹" step={0.5} />
                          : <Pill pre="₹" val={s.perRideIncentive} color={C.green} />}
                      </td>

                      {/* Per-ride coins */}
                      <td style={{ padding: "13px 20px", textAlign: "right" }}>
                        {editing
                          ? <NumInput value={(form as any).perRideCoins ?? 0} onChange={(v) => setField("perRideCoins" as any, v)} step={1} />
                          : <Pill val={(s as any).perRideCoins ?? 0} color={C.purple} />}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "13px 20px", textAlign: "center" }}>
                        {editing ? (
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <button
                              className="cs-btn"
                              onClick={save}
                              disabled={isSaving}
                              style={{
                                height: 32, padding: "0 14px",
                                background: isSaving ? C.textMuted : C.green,
                                border: "none", borderRadius: 8,
                                color: "#fff",
                                cursor: isSaving ? "not-allowed" : "pointer",
                                fontSize: 12, fontWeight: 700,
                                display: "flex", alignItems: "center", gap: 6,
                                boxShadow: isSaving ? "none" : `0 0 14px ${C.green}35`,
                                transition: "background .15s, opacity .15s",
                              }}
                            >
                              {isSaving ? (
                                <div style={{
                                  width: 10, height: 10,
                                  border: "2px solid rgba(255,255,255,.3)",
                                  borderTopColor: "#fff", borderRadius: "50%",
                                  animation: "spin .6s linear infinite",
                                }} />
                              ) : <Save size={12} />}
                              {isSaving ? "Saving…" : "Save"}
                            </button>
                            <button
                              className="cs-btn"
                              onClick={() => { setEditingId(null); setForm({}); }}
                              style={{
                                height: 32, width: 32, padding: 0,
                                background: C.card, border: `1px solid ${C.border}`,
                                borderRadius: 8, color: C.textSub,
                                cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "opacity .15s",
                              }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="cs-btn"
                            onClick={() => { setEditingId(s._id || null); setForm({ ...s }); }}
                            style={{
                              height: 32, padding: "0 16px",
                              background: C.amberDim,
                              border: `1px solid ${C.amberGlow}`,
                              borderRadius: 8, color: C.amber,
                              cursor: "pointer", fontSize: 12, fontWeight: 700,
                              display: "inline-flex", alignItems: "center", gap: 6,
                              transition: "opacity .15s",
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 18, padding: "14px 20px",
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, display: "flex", alignItems: "center", gap: 13,
        }}>
          <div style={{
            width: 34, height: 34, flexShrink: 0,
            background: `${C.amber}12`, border: `1px solid ${C.amber}28`,
            borderRadius: 9, display: "flex",
            alignItems: "center", justifyContent: "center", color: C.amber,
          }}>
            <AlertTriangle size={15} />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
            <span style={{ color: C.text, fontWeight: 600 }}>Real-time propagation — </span>
            Saved changes are pushed immediately to online drivers via Socket.io.
            Drivers offline at save-time receive their updated config via FCM on next session start.
          </p>
        </div>

      </div>
    </div>
  );
};

export default CommissionSettings;