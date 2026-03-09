import React, { useState, useMemo, useEffect, type MouseEvent } from "react";
import type { ReactNode, JSX } from "react";
import {
  RefreshCw,
  Plus,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  Crown,
  Shield,
  Star,
  X,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { useDriversWithPlans, usePlanTemplates } from "../hooks/index";
import { toast } from "react-toastify";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanType = "basic" | "standard" | "premium";

interface PlanTemplate {
  _id: string;
  planName: string;
  planType: PlanType;
  commissionRate: number;
  bonusMultiplier: number;
  noCommission: boolean;
  monthlyFee: number;
  description: string;
  benefits: string[];
}

interface DriverPlan {
  id: string;
  planName: string;
  planType: PlanType;
  commissionRate: number;
  bonusMultiplier: number;
  noCommission: boolean;
  monthlyFee: number;
  description: string;
  benefits: string[];
  isActive: boolean;
  activatedDate?: string;
  expiryDate?: string;
  createdBy?: string;
}

interface DriverWithPlan {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  isDriver?: boolean;
  isOnline?: boolean;
  isBlocked?: boolean;
  vehicleType?: string;
  currentPlan?: DriverPlan;
  planHistory?: DriverPlan[];
  totalEarnings?: number;
  planEarnings?: number;
  [key: string]: unknown;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PER = 15;

const PLAN_TYPES: Array<{ value: PlanType; label: string; icon: ReactNode }> = [
  { value: "basic",    label: "Basic",    icon: <Shield size={11} /> },
  { value: "standard", label: "Standard", icon: <Star   size={11} /> },
  { value: "premium",  label: "Premium",  icon: <Crown  size={11} /> },
];

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all",      label: "All Plans"  },
  { value: "active",   label: "Active"     },
  { value: "inactive", label: "Inactive"   },
  { value: "expired",  label: "Expired"    },
];

const EMPTY_PLAN: DriverPlan = {
  id: "",
  planName: "",
  planType: "basic",
  commissionRate: 20,
  bonusMultiplier: 1.0,
  noCommission: false,
  monthlyFee: 0,
  description: "",
  benefits: [],
  isActive: false,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  .pm {
    font-family: 'DM Sans', sans-serif;
    padding: 36px 40px 60px;
    background: #08080f;
    min-height: 100vh;
    color: #e4e2f0;
  }

  .pm-hdr {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 44px;
  }
  .pm-title {
    font-family: 'Syne', sans-serif;
    font-size: 2rem;
    font-weight: 800;
    margin: 0 0 5px;
    letter-spacing: -0.03em;
    background: linear-gradient(130deg, #fff 30%, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .pm-sub {
    margin: 0;
    color: #5c5a72;
    font-size: 0.875rem;
    font-weight: 300;
  }

  .pm-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    padding: 11px 20px;
    border: none;
    border-radius: 11px;
    background: linear-gradient(135deg, #6d28d9, #9333ea);
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 0 0 1px rgba(167,139,250,.25), 0 8px 20px rgba(109,40,217,.4);
    transition: transform .18s, box-shadow .18s;
  }
  .pm-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 0 1px rgba(167,139,250,.4), 0 12px 28px rgba(109,40,217,.5);
  }

  .pm-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
    margin-bottom: 32px;
  }
  .pm-stat {
    position: relative;
    overflow: hidden;
    border-radius: 14px;
    background: #100f1a;
    border: 1px solid #1c1c2e;
    padding: 20px 22px;
    transition: border-color .2s, transform .2s;
  }
  .pm-stat:hover {
    border-color: #2a2a40;
    transform: translateY(-2px);
  }
  .pm-stat-glow {
    position: absolute;
    top: -16px;
    right: -16px;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    filter: blur(28px);
    opacity: .3;
    pointer-events: none;
  }
  .pm-stat-ico {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }
  .pm-stat-val {
    font-family: 'Syne', sans-serif;
    font-size: 1.7rem;
    font-weight: 700;
    margin: 0 0 3px;
    color: #ede9ff;
  }
  .pm-stat-lbl {
    font-size: 0.72rem;
    color: #5c5a72;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .pm-filters {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    align-items: center;
  }
  .pm-search-wrap {
    position: relative;
    flex: 1;
    min-width: 210px;
  }
  .pm-search-ico {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: #38364e;
    pointer-events: none;
    display: flex;
  }
  .pm-search {
    width: 100%;
    padding: 10px 14px 10px 40px;
    box-sizing: border-box;
    background: #100f1a;
    border: 1px solid #1c1c2e;
    border-radius: 10px;
    color: #e4e2f0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    outline: none;
    transition: border-color .18s;
  }
  .pm-search::placeholder { color: #38364e; }
  .pm-search:focus { border-color: #6d28d9; }
  .pm-select {
    padding: 10px 14px;
    background: #100f1a;
    border: 1px solid #1c1c2e;
    border-radius: 10px;
    color: #e4e2f0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    outline: none;
    cursor: pointer;
    min-width: 140px;
    transition: border-color .18s;
  }
  .pm-select:focus { border-color: #6d28d9; }
  .pm-btn-sec {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    background: #100f1a;
    border: 1px solid #1c1c2e;
    border-radius: 10px;
    color: #8b88a8;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color .18s, color .18s;
  }
  .pm-btn-sec:hover { border-color: #6d28d9; color: #c4b5fd; }

  .pm-table-card {
    background: #100f1a;
    border: 1px solid #1c1c2e;
    border-radius: 18px;
    overflow: hidden;
  }
  .pm-table {
    width: 100%;
    border-collapse: collapse;
  }
  .pm-table thead th {
    padding: 13px 18px;
    text-align: left;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #413e58;
    border-bottom: 1px solid #181826;
    font-family: 'DM Sans', sans-serif;
  }
  .pm-table tbody tr {
    border-bottom: 1px solid #131321;
    transition: background .12s;
  }
  .pm-table tbody tr:last-child { border-bottom: none; }
  .pm-table tbody tr:hover { background: #12111e; }
  .pm-table td {
    padding: 15px 18px;
    vertical-align: middle;
  }

  .pm-driver-name { font-weight: 500; font-size: 0.875rem; color: #e4e2f0; margin-bottom: 2px; }
  .pm-driver-phone { font-size: 0.775rem; color: #413e58; }
  .pm-comm-val { font-weight: 600; font-size: 0.9rem; color: #ede9ff; }
  .pm-muted { color: #2a2840; font-size: 0.85rem; }
  .pm-no-plan { color: #2a2840; font-size: 0.83rem; font-style: italic; }
  .pm-exp-date  { font-size: 0.8rem; color: #5c5a72; }
  .pm-exp-warn  { font-size: 0.8rem; color: #f59e0b; }
  .pm-exp-crit  { font-size: 0.8rem; color: #ef4444; }

  .pm-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 0.73rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }
  .pm-badge-premium  { background: rgba(167,139,250,.1);  color: #c4b5fd; border: 1px solid rgba(167,139,250,.2); }
  .pm-badge-standard { background: rgba(251,191,36,.08);  color: #fbbf24; border: 1px solid rgba(251,191,36,.18); }
  .pm-badge-basic    { background: rgba(100,116,139,.1);  color: #94a3b8; border: 1px solid rgba(100,116,139,.2); }
  .pm-badge-active   { background: rgba(52,211,153,.08);  color: #34d399; border: 1px solid rgba(52,211,153,.18); }
  .pm-badge-inactive { background: rgba(75,75,100,.1);    color: #5c5a72; border: 1px solid rgba(75,75,100,.2);   }
  .pm-badge-bonus    { background: rgba(16,185,129,.08);  color: #10b981; border: 1px solid rgba(16,185,129,.18); }
  .pm-badge-nocomm   { background: rgba(52,211,153,.08);  color: #34d399; border: 1px solid rgba(52,211,153,.18); }

  .pm-actions { display: flex; gap: 5px; }
  .pm-action-btn {
    width: 30px;
    height: 30px;
    border-radius: 7px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #1c1c2e;
    background: transparent;
    color: #5c5a72;
    transition: all .15s;
  }
  .pm-action-btn:hover { background: #1a1928; border-color: #6d28d9; color: #c4b5fd; }
  .pm-action-btn-danger:hover { background: rgba(239,68,68,.07); border-color: rgba(239,68,68,.3); color: #f87171; }

  .pm-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    margin-top: 26px;
  }
  .pm-page-btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid #1c1c2e;
    background: transparent;
    color: #5c5a72;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all .14s;
  }
  .pm-page-btn:hover:not(:disabled) { border-color: #6d28d9; color: #c4b5fd; }
  .pm-page-btn.active { background: #6d28d9; border-color: #6d28d9; color: #fff; }
  .pm-page-btn:disabled { opacity: .3; cursor: not-allowed; }
  .pm-page-dots { color: #38364e; font-size: 0.8rem; padding: 0 2px; }

  .pm-loading { display: flex; align-items: center; justify-content: center; min-height: 360px; }
  .pm-spinner {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid #1c1c2e;
    border-top-color: #6d28d9;
    animation: pm-spin .65s linear infinite;
  }
  @keyframes pm-spin { to { transform: rotate(360deg); } }

  .pm-empty { text-align: center; padding: 56px 24px; color: #38364e; }
  .pm-empty-emoji { font-size: 2.2rem; opacity: .35; margin-bottom: 10px; }
  .pm-empty-txt   { font-size: 0.875rem; }

  .pm-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0,0,0,.72);
    backdrop-filter: blur(7px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: pm-fadeIn .15s ease;
  }
  @keyframes pm-fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .pm-modal {
    background: #0d0c18;
    border: 1px solid #1c1c2e;
    border-radius: 18px;
    width: 100%;
    max-width: 510px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 28px 56px rgba(0,0,0,.75), 0 0 0 1px rgba(109,40,217,.1);
    animation: pm-slideUp .18s ease;
    scrollbar-width: thin;
    scrollbar-color: #1c1c2e transparent;
  }
  @keyframes pm-slideUp {
    from { transform: translateY(10px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .pm-modal-hdr {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 26px 26px 18px;
    border-bottom: 1px solid #181826;
    position: sticky;
    top: 0;
    background: #0d0c18;
    z-index: 1;
  }
  .pm-modal-title {
    font-family: 'Syne', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #ede9ff;
    margin: 0 0 3px;
    letter-spacing: -0.02em;
  }
  .pm-modal-sub { font-size: 0.8rem; color: #413e58; margin: 0; }
  .pm-close-btn {
    width: 30px;
    height: 30px;
    border-radius: 7px;
    cursor: pointer;
    border: 1px solid #1c1c2e;
    background: transparent;
    color: #413e58;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all .14s;
  }
  .pm-close-btn:hover { background: #181826; color: #e4e2f0; }

  .pm-modal-body { padding: 22px 26px 26px; }

  .pm-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: #090913;
    border: 1px solid #171726;
    border-radius: 11px;
    padding: 14px;
    margin-bottom: 22px;
  }
  .pm-info-lbl {
    font-size: 0.68rem;
    color: #413e58;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
  }
  .pm-info-val { font-size: 0.875rem; color: #c4b5fd; font-weight: 500; }

  .pm-section-lbl {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 14px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #38364e;
  }
  .pm-section-lbl::after { content: ''; flex: 1; height: 1px; background: #181826; }

  .pm-field { margin-bottom: 13px; }
  .pm-label { display: block; margin-bottom: 5px; font-size: 0.78rem; font-weight: 500; color: #6e6b88; }
  .pm-input,
  .pm-textarea,
  .pm-field-select {
    width: 100%;
    padding: 10px 13px;
    box-sizing: border-box;
    background: #090913;
    border: 1px solid #181826;
    border-radius: 9px;
    color: #e4e2f0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    outline: none;
    transition: border-color .18s, box-shadow .18s;
  }
  .pm-input:focus,
  .pm-textarea:focus,
  .pm-field-select:focus {
    border-color: #6d28d9;
    box-shadow: 0 0 0 3px rgba(109,40,217,.1);
  }
  .pm-input::placeholder,
  .pm-textarea::placeholder { color: #2a2840; }
  .pm-textarea { resize: vertical; min-height: 86px; line-height: 1.55; }
  .pm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .pm-checkbox-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px 13px;
    background: #090913;
    border: 1px solid #181826;
    border-radius: 9px;
    cursor: pointer;
    transition: border-color .18s;
    margin-bottom: 13px;
    user-select: none;
  }
  .pm-checkbox-row:hover { border-color: #6d28d9; }
  .pm-checkbox-row input[type="checkbox"] {
    accent-color: #6d28d9;
    width: 14px;
    height: 14px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .pm-checkbox-row span { font-size: 0.875rem; color: #9490b0; }

  .pm-modal-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid #131321;
  }
  .pm-btn-cancel {
    padding: 9px 18px;
    background: transparent;
    border: 1px solid #1c1c2e;
    border-radius: 9px;
    color: #5c5a72;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    transition: all .14s;
  }
  .pm-btn-cancel:hover { border-color: #2a2840; color: #9490b0; }
  .pm-btn-save {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 22px;
    background: linear-gradient(135deg, #6d28d9, #9333ea);
    border: none;
    border-radius: 9px;
    color: #fff;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 4px 14px rgba(109,40,217,.35);
    transition: transform .15s, box-shadow .15s;
  }
  .pm-btn-save:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(109,40,217,.45);
  }
  .pm-btn-save:disabled { opacity: .45; cursor: not-allowed; transform: none; }
  .pm-btn-spinner {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    animation: pm-spin .65s linear infinite;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

import axiosInstance from "../api/axiosInstance";

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toLowerCase() as "get"|"post"|"put"|"delete";
  const body = options.body ? JSON.parse(options.body as string) : undefined;
  const r = method === "get"
    ? await axiosInstance.get(url)
    : await (axiosInstance as any)[method](url, body);
  return r.data as T;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  glowColor: string;
  iconBg: string;
  iconColor: string;
}

function StatCard({ icon, label, value, glowColor, iconBg, iconColor }: StatCardProps): JSX.Element {
  return (
    <div className="pm-stat">
      <div className="pm-stat-glow" style={{ background: glowColor }} />
      <div className="pm-stat-ico" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="pm-stat-val">{value}</div>
      <div className="pm-stat-lbl">{label}</div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: DriverPlan }): JSX.Element {
  const entry = PLAN_TYPES.find((p) => p.value === plan.planType);
  const modifier =
    plan.planType === "premium"
      ? "pm-badge-premium"
      : plan.planType === "standard"
      ? "pm-badge-standard"
      : "pm-badge-basic";

  return (
    <span className={`pm-badge ${modifier}`}>
      {entry?.icon} {plan.planName}
    </span>
  );
}

function ExpiryCell({ date }: { date?: string }): JSX.Element {
  if (date === undefined || date === "") {
    return <span className="pm-muted">—</span>;
  }
  const d = daysUntil(date);
  const fmt = new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (d < 0)  return <span className="pm-exp-crit">Expired</span>;
  if (d <= 3) return <span className="pm-exp-crit">&#x26A0; {fmt}</span>;
  if (d <= 7) return <span className="pm-exp-warn">&#x23F3; {fmt}</span>;
  return <span className="pm-exp-date">{fmt}</span>;
}

// ─── PlanForm ─────────────────────────────────────────────────────────────────

interface PlanFormProps {
  plan: DriverPlan;
  setPlan: (p: DriverPlan) => void;
  benefits: string;
  setBenefits: (s: string) => void;
  isCreate?: boolean;
}

function PlanForm({ plan, setPlan, benefits, setBenefits, isCreate }: PlanFormProps): JSX.Element {
  function set<K extends keyof DriverPlan>(k: K, v: DriverPlan[K]): void {
    setPlan({ ...plan, [k]: v });
  }

  return (
    <>
      <div className="pm-field">
        <label className="pm-label">Plan Name</label>
        <input
          className="pm-input"
          type="text"
          value={plan.planName}
          onChange={(e) => set("planName", e.target.value)}
          placeholder="e.g., Gold Accelerator"
        />
      </div>

      {isCreate === true && (
        <div className="pm-field">
          <label className="pm-label">Plan Type</label>
          <select
            className="pm-field-select"
            value={plan.planType}
            onChange={(e) => set("planType", e.target.value as PlanType)}
          >
            {PLAN_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="pm-grid2">
        <div className="pm-field">
          <label className="pm-label">Commission Rate (%)</label>
          <input
            className="pm-input"
            type="number"
            min={0}
            max={100}
            value={plan.commissionRate}
            onChange={(e) => set("commissionRate", parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="pm-field">
          <label className="pm-label">Bonus Multiplier</label>
          <input
            className="pm-input"
            type="number"
            min={1}
            step={0.1}
            value={plan.bonusMultiplier}
            onChange={(e) => set("bonusMultiplier", parseFloat(e.target.value) || 1)}
          />
        </div>
      </div>

      <div
        className="pm-checkbox-row"
        onClick={() => set("noCommission", !plan.noCommission)}
      >
        <input
          type="checkbox"
          checked={plan.noCommission}
          onChange={(e) => set("noCommission", e.target.checked)}
          onClick={(e: MouseEvent<HTMLInputElement>) => e.stopPropagation()}
        />
        <span>Zero Commission — driver keeps 100% of fare</span>
      </div>

      <div className="pm-field">
        <label className="pm-label">Monthly Fee (₹)</label>
        <input
          className="pm-input"
          type="number"
          min={0}
          value={plan.monthlyFee}
          onChange={(e) => set("monthlyFee", parseFloat(e.target.value) || 0)}
        />
      </div>

      {isCreate === true && (
        <div className="pm-field">
          <label className="pm-label">Description</label>
          <textarea
            className="pm-textarea"
            rows={2}
            value={plan.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short plan summary..."
          />
        </div>
      )}

      <div className="pm-field">
        <label className="pm-label">Benefits — one per line</label>
        <textarea
          className="pm-textarea"
          rows={4}
          value={benefits}
          onChange={(e) => setBenefits(e.target.value)}
          placeholder={"Priority dispatch\nBonus on peak hours\n24/7 dedicated support"}
        />
      </div>
    </>
  );
}

// ─── ModalShell ───────────────────────────────────────────────────────────────

interface ModalShellProps {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
  children: ReactNode;
}

function ModalShell({
  title,
  subtitle,
  onClose,
  onSave,
  saving,
  saveLabel,
  children,
}: ModalShellProps): JSX.Element {
  const handleOverlay = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="pm-overlay" onClick={handleOverlay}>
      <div className="pm-modal">
        <div className="pm-modal-hdr">
          <div>
            <div className="pm-modal-title">{title}</div>
            <p className="pm-modal-sub">{subtitle}</p>
          </div>
          <button className="pm-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="pm-modal-body">
          {children}

          <div className="pm-modal-footer">
            <button className="pm-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="pm-btn-save" onClick={onSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="pm-btn-spinner" />
                  Saving&#8230;
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  {saveLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  total: number;
  onChange: (p: number) => void;
}

function PaginationBar({ page, total, onChange }: PaginationProps): JSX.Element | null {
  if (total <= 1) return null;

  const allPages = Array.from({ length: total }, (_, i) => i + 1);
  const visible = allPages.filter(
    (n) => n === 1 || n === total || Math.abs(n - page) <= 1
  );

  const items: Array<number | "dots"> = [];
  visible.forEach((n, i) => {
    if (i > 0 && n - visible[i - 1] > 1) {
      items.push("dots");
    }
    items.push(n);
  });

  return (
    <div className="pm-pagination">
      <button
        className="pm-page-btn"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        &#8249;
      </button>

      {items.map((n, i) => {
        if (n === "dots") {
          return <span key={`d${i}`} className="pm-page-dots">&#8230;</span>;
        }
        return (
          <button
            key={n}
            className={`pm-page-btn${n === page ? " active" : ""}`}
            onClick={() => onChange(n as number)}
          >
            {n}
          </button>
        );
      })}

      <button
        className="pm-page-btn"
        disabled={page === total}
        onClick={() => onChange(page + 1)}
      >
        &#8250;
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PlanManagement(): JSX.Element {
  const [statusF, setStatusF]                 = useState<string>("all");
  const [q, setQ]                             = useState<string>("");
  const [page, setPage]                       = useState<number>(1);
  const [selectedDriver, setSelectedDriver]   = useState<DriverWithPlan | null>(null);
  const [showEditModal, setShowEditModal]     = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingPlan, setEditingPlan]         = useState<DriverPlan>(EMPTY_PLAN);
  const [benefitsInput, setBenefitsInput]     = useState<string>("");
  const [acting, setActing]                   = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { drivers, loading, refetch: fetchData } = useDriversWithPlans(statusF, page);
  const { planTemplates } = usePlanTemplates();

  // ── API mutation calls ────────────────────────────────────────────────────

  async function handleSavePlan(): Promise<void> {
    if (editingPlan.planName.trim() === "") {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      setActing(true);

      const benefits = benefitsInput.split("\n").map((b) => b.trim()).filter(Boolean);

      // ─────────────────────────────────────────────────────────────────────
      // FIX: route selection
      //
      //  selectedDriver !== null  &&  editingPlan.id !== ""
      //    → updating an existing DriverPlan record
      //    → PUT /api/admin/drivers/:driverId/plans/:driverPlanId
      //
      //  selectedDriver !== null  &&  editingPlan.id === ""
      //    → assigning a brand-new plan to a driver
      //    → POST /api/admin/drivers/:driverId/assign-plan   ← was broken before
      //
      //  selectedDriver === null
      //    → creating a new Plan template
      //    → POST /api/admin/plans
      // ─────────────────────────────────────────────────────────────────────

      if (selectedDriver !== null && editingPlan.id !== "") {
        // ── Update existing driver plan ──────────────────────────────────
        await apiFetch(
          `/api/admin/drivers/${selectedDriver._id}/plans/${editingPlan.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              ...editingPlan,
              benefits,
            }),
          }
        );
        toast.success("Plan updated successfully");

      } else if (selectedDriver !== null && editingPlan.id === "") {
        // ── Assign plan template to driver ───────────────────────────────────
        if (!selectedTemplateId) {
          toast.error("Please select a plan template to assign");
          setActing(false);
          return;
        }
        await apiFetch(
          `/api/admin/drivers/${selectedDriver._id}/assign-plan`,
          {
            method: "POST",
            body: JSON.stringify({
              planId: selectedTemplateId,
              expiryDays: 30,
            }),
          }
        );
        toast.success("Plan assigned to driver successfully");

      } else {
        // ── Create new plan template ─────────────────────────────────────
        await apiFetch("/api/admin/plans", {
          method: "POST",
          body: JSON.stringify({
            ...editingPlan,
            benefits,
          }),
        });
        toast.success("Plan created successfully");
      }

      setShowEditModal(false);
      setShowCreateModal(false);
      void fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setActing(false);
    }
  }

  async function handleAssignPlan(planId: string): Promise<void> {
    if (selectedDriver === null) return;
    try {
      setActing(true);
      await apiFetch(
        `/api/admin/drivers/${selectedDriver._id}/assign-plan`,
        {
          method: "POST",
          body: JSON.stringify({ planId, expiryDays: 30 }),
        }
      );
      toast.success("Plan assigned to driver");
      void fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to assign plan");
    } finally {
      setActing(false);
    }
  }

  async function handleDeactivatePlan(driverId: string, planId: string): Promise<void> {
    if (!window.confirm("Deactivate this plan?")) return;
    try {
      setActing(true);
      await apiFetch(
        `/api/admin/drivers/${driverId}/plans/${planId}/deactivate`,
        { method: "POST" }
      );
      toast.success("Plan deactivated");
      void fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to deactivate plan");
    } finally {
      setActing(false);
    }
  }

  async function handleDeletePlan(planId: string): Promise<void> {
    if (!window.confirm("Delete this plan template?")) return;
    try {
      setActing(true);
      await apiFetch(`/api/admin/plans/${planId}`, { method: "DELETE" });
      toast.success("Plan template deleted");
      void fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to delete plan");
    } finally {
      setActing(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const driversWithActivePlan = drivers.filter(
    (d) => d.currentPlan?.isActive === true
  );

  const expiringSoon = drivers.filter((d) => {
    if (d.currentPlan?.expiryDate === undefined) return false;
    const days = daysUntil(d.currentPlan.expiryDate);
    return days >= 0 && days <= 7;
  });

  const avgCommission =
    drivers.length > 0
      ? (
          drivers.reduce(
            (sum: number, d: DriverWithPlan) => sum + (d.currentPlan?.commissionRate ?? 20),
            0
          ) / drivers.length
        ).toFixed(1)
      : "0.0";

  const filtered = useMemo<DriverWithPlan[]>(() => {
    const lq = q.toLowerCase();
    return drivers.filter((d) => {
      const matchSearch =
        (d.name?.toLowerCase().includes(lq) ?? false) ||
        (d.phone?.includes(lq) ?? false) ||
        (d.email?.toLowerCase().includes(lq) ?? false);

      if (!matchSearch) return false;
      if (statusF === "all") return true;

      const isPlanActive = d.currentPlan?.isActive ?? false;
      const isExpired =
        d.currentPlan?.expiryDate !== undefined
          ? new Date(d.currentPlan.expiryDate) < new Date()
          : false;

      if (statusF === "active")   return isPlanActive && !isExpired;
      if (statusF === "inactive") return !isPlanActive;
      if (statusF === "expired")  return isExpired;
      return true;
    });
  }, [drivers, q, statusF]);

  const totalPages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{STYLES}</style>

      <div className="pm">

        {/* Header */}
        <div className="pm-hdr">
          <div>
            <h1 className="pm-title">Plan Management</h1>
            <p className="pm-sub">Commission structures · Driver tiers · Incentive plans</p>
          </div>
          <button
            className="pm-btn-primary"
            onClick={() => {
              setSelectedDriver(null);
              setEditingPlan(EMPTY_PLAN);
              setBenefitsInput("");
              setShowCreateModal(true);
            }}
          >
            <Plus size={15} /> New Plan Template
          </button>
        </div>

        {/* Stats */}
        <div className="pm-stats">
          <StatCard
            icon={<Users size={16} />}
            label="Total Drivers"
            value={drivers.length}
            glowColor="#6d28d9"
            iconBg="rgba(109,40,217,.12)"
            iconColor="#a78bfa"
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Active Plans"
            value={driversWithActivePlan.length}
            glowColor="#10b981"
            iconBg="rgba(16,185,129,.12)"
            iconColor="#34d399"
          />
          <StatCard
            icon={<AlertTriangle size={16} />}
            label="Expiring in 7 Days"
            value={expiringSoon.length}
            glowColor="#f59e0b"
            iconBg="rgba(245,158,11,.12)"
            iconColor="#fbbf24"
          />
          <StatCard
            icon={<DollarSign size={16} />}
            label="Avg Commission"
            value={`${avgCommission}%`}
            glowColor="#3b82f6"
            iconBg="rgba(59,130,246,.12)"
            iconColor="#60a5fa"
          />
        </div>

        {/* Filters */}
        <div className="pm-filters">
          <div className="pm-search-wrap">
            <span className="pm-search-ico">
              <Users size={14} />
            </span>
            <input
              className="pm-search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, phone, or email..."
            />
          </div>

          <select
            className="pm-select"
            value={statusF}
            onChange={(e) => {
              setStatusF(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <button className="pm-btn-sec" onClick={() => void fetchData()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="pm-loading">
            <div className="pm-spinner" />
          </div>
        ) : (
          <div className="pm-table-card">
            <table className="pm-table">
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>Driver</th>
                  <th style={{ width: "16%" }}>Current Plan</th>
                  <th style={{ width: "12%" }}>Commission</th>
                  <th style={{ width: "11%" }}>Bonus</th>
                  <th style={{ width: "11%" }}>Status</th>
                  <th style={{ width: "13%" }}>Expires</th>
                  <th style={{ width: "17%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="pm-empty">
                        <div className="pm-empty-emoji">&#x1FA90;</div>
                        <div className="pm-empty-txt">No drivers match your filters</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((driver) => (
                    <tr key={driver._id}>
                      <td>
                        <div className="pm-driver-name">{driver.name}</div>
                        <div className="pm-driver-phone">{driver.phone}</div>
                      </td>

                      <td>
                        {driver.currentPlan !== undefined ? (
                          <PlanBadge plan={driver.currentPlan} />
                        ) : (
                          <span className="pm-no-plan">No Plan</span>
                        )}
                      </td>

                      <td>
                        {driver.currentPlan?.noCommission === true ? (
                          <span className="pm-badge pm-badge-nocomm">0%</span>
                        ) : (
                          <span className="pm-comm-val">
                            {driver.currentPlan?.commissionRate ?? 20}%
                          </span>
                        )}
                      </td>

                      <td>
                        {driver.currentPlan !== undefined &&
                        driver.currentPlan.bonusMultiplier > 1 ? (
                          <span className="pm-badge pm-badge-bonus">
                            <ArrowUpRight size={10} />
                            +{((driver.currentPlan.bonusMultiplier - 1) * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="pm-muted">&#8212;</span>
                        )}
                      </td>

                      <td>
                        {driver.currentPlan?.isActive === true ? (
                          <span className="pm-badge pm-badge-active">
                            <CheckCircle size={10} /> Active
                          </span>
                        ) : (
                          <span className="pm-badge pm-badge-inactive">
                            <XCircle size={10} /> Inactive
                          </span>
                        )}
                      </td>

                      <td>
                        <ExpiryCell date={driver.currentPlan?.expiryDate} />
                      </td>

                      <td>
                        <div className="pm-actions">
                          <button
                            className="pm-action-btn"
                            title="Edit plan"
                            onClick={() => {
                              setSelectedDriver(driver);
                              setEditingPlan(driver.currentPlan ?? EMPTY_PLAN);
                              setBenefitsInput(
                                (driver.currentPlan?.benefits ?? []).join("\n")
                              );
                              setSelectedTemplateId("");
                              setShowEditModal(true);
                            }}
                          >
                            <Edit size={12} />
                          </button>

                          {driver.currentPlan?.isActive === true && (
                            <button
                              className="pm-action-btn pm-action-btn-danger"
                              title="Deactivate plan"
                              onClick={() =>
                                void handleDeactivatePlan(
                                  driver._id,
                                  driver.currentPlan!.id
                                )
                              }
                            >
                              <XCircle size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <PaginationBar page={page} total={totalPages} onChange={setPage} />

        {/* Edit Modal */}
        {showEditModal && selectedDriver !== null && (
          <ModalShell
            title="Edit Plan"
            subtitle={selectedDriver.name ?? ""}
            onClose={() => setShowEditModal(false)}
            onSave={() => void handleSavePlan()}
            saving={acting}
            saveLabel="Update Plan"
          >
            {selectedDriver.currentPlan !== undefined && (
              <>
                <p className="pm-section-lbl">Current Plan Details</p>
                <div className="pm-info-grid">
                  <div>
                    <div className="pm-info-lbl">Plan Name</div>
                    <div className="pm-info-val">{selectedDriver.currentPlan.planName}</div>
                  </div>
                  <div>
                    <div className="pm-info-lbl">Commission</div>
                    <div className="pm-info-val">{selectedDriver.currentPlan.commissionRate}%</div>
                  </div>
                  <div>
                    <div className="pm-info-lbl">Bonus Multiplier</div>
                    <div className="pm-info-val">{selectedDriver.currentPlan.bonusMultiplier}&#215;</div>
                  </div>
                  <div>
                    <div className="pm-info-lbl">Monthly Fee</div>
                    <div className="pm-info-val">&#8377;{selectedDriver.currentPlan.monthlyFee}</div>
                  </div>
                  {selectedDriver.currentPlan.activatedDate !== undefined && (
                    <div>
                      <div className="pm-info-lbl">Activated</div>
                      <div className="pm-info-val">
                        {new Date(selectedDriver.currentPlan.activatedDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  {selectedDriver.currentPlan.expiryDate !== undefined && (
                    <div>
                      <div className="pm-info-lbl">Expires</div>
                      <div className="pm-info-val">
                        {new Date(selectedDriver.currentPlan.expiryDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Template selector — shown only when driver has NO plan yet */}
            {selectedDriver.currentPlan === undefined && (
              <div className="pm-field" style={{ marginBottom: "1rem" }}>
                <label className="pm-label">Assign Plan Template</label>
                <select
                  className="pm-field-select"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">— Select a plan —</option>
                  {planTemplates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.planName} ({t.planType}) — {t.noCommission ? "0%" : `${t.commissionRate}%`} commission
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p className="pm-section-lbl">Modify Plan</p>
            <PlanForm
              plan={editingPlan}
              setPlan={setEditingPlan}
              benefits={benefitsInput}
              setBenefits={setBenefitsInput}
            />
          </ModalShell>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <ModalShell
            title="New Plan Template"
            subtitle="Define commission structure and benefits"
            onClose={() => setShowCreateModal(false)}
            onSave={() => void handleSavePlan()}
            saving={acting}
            saveLabel="Create Plan"
          >
            <PlanForm
              plan={editingPlan}
              setPlan={setEditingPlan}
              benefits={benefitsInput}
              setBenefits={setBenefitsInput}
              isCreate
            />
          </ModalShell>
        )}

      </div>
    </>
  );
}