import React, { useState } from "react";
import { Loader2, AlertCircle, Search, X } from "lucide-react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
export const C = {
  bg:      "#0b0c10",
  surface: "#13151a",
  border:  "#1e2128",
  border2: "#2d3748",
  text:    "#e8eaf0",
  muted:   "#6b7280",
  primary: "#6366f1",
  green:   "#22c55e",
  amber:   "#f59e0b",
  red:     "#ef4444",
  cyan:    "#06b6d4",
  purple:  "#a78bfa",
};

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  requested:        { label: "Requested",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  driver_assigned:  { label: "Assigned",     color: "#06b6d4", bg: "rgba(6,182,212,0.12)"  },
  driver_at_pickup: { label: "At Pickup",    color: "#818cf8", bg: "rgba(129,140,248,0.12)"},
  ride_started:     { label: "In Progress",  color: "#a78bfa", bg: "rgba(167,139,250,0.12)"},
  completed:        { label: "Completed",    color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  cancelled:        { label: "Cancelled",    color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  timeout:          { label: "Timeout",      color: "#6b7280", bg: "rgba(107,114,128,0.12)"},
  pending:          { label: "Pending",      color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  resolved:         { label: "Resolved",     color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  in_review:        { label: "In Review",    color: "#06b6d4", bg: "rgba(6,182,212,0.12)"  },
  dismissed:        { label: "Dismissed",    color: "#6b7280", bg: "rgba(107,114,128,0.12)"},
  success:          { label: "Success",      color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  failed:           { label: "Failed",       color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  refunded:         { label: "Refunded",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)"},
  active:           { label: "Active",       color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  blocked:          { label: "Blocked",      color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  suspended:        { label: "Suspended",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  online:           { label: "Online",       color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  offline:          { label: "Offline",      color: "#6b7280", bg: "rgba(107,114,128,0.12)"},
};

// ─── Badge ────────────────────────────────────────────────────────────────────
export const Badge: React.FC<{ status: string; label?: string }> = ({ status, label }) => {
  const m = STATUS_META[status] ?? { label: status, color: C.muted, bg: "rgba(107,114,128,0.1)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      fontSize: "0.7rem", fontWeight: 700, fontFamily: "monospace",
      color: m.color, background: m.bg, border: "1px solid " + m.color + "33",
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
      {label ?? m.label}
    </span>
  );
};

// ─── Button ───────────────────────────────────────────────────────────────────
interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary"|"danger"|"ghost"|"success"|"warning";
  size?: "sm"|"md"|"lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}
export const Btn: React.FC<BtnProps> = ({ children, onClick, variant="primary", size="md", disabled, loading, icon }) => {
  const colors = {
    primary: { bg: C.primary, border: C.primary, text: "#fff" },
    danger:  { bg: C.red,     border: C.red,     text: "#fff" },
    success: { bg: C.green,   border: C.green,   text: "#fff" },
    warning: { bg: C.amber,   border: C.amber,   text: "#000" },
    ghost:   { bg: "transparent", border: C.border, text: C.text },
  };
  const sizes = { sm: "6px 12px", md: "8px 18px", lg: "11px 24px" };
  const { bg, border, text } = colors[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: sizes[size], borderRadius: 10,
        background: (disabled || loading) ? "#1e2128" : bg,
        border: "1px solid " + ((disabled || loading) ? C.border : border),
        color: (disabled || loading) ? C.muted : text,
        fontSize: size === "sm" ? "0.72rem" : "0.85rem",
        fontWeight: 700, cursor: (disabled || loading) ? "not-allowed" : "pointer",
        transition: "opacity 0.15s",
        opacity: (disabled || loading) ? 0.6 : 1,
      }}
    >
      {loading ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : icon}
      {children}
    </button>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ children, style, className }) => (
  <div className={className} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, ...style }}>
    {children}
  </div>
);

// ─── StatCard ─────────────────────────────────────────────────────────────────
export const StatCard: React.FC<{
  label: string; value: string|number; icon: string;
  color?: string; sub?: string; trend?: number;
}> = ({ label, value, icon, color = C.primary, sub, trend }) => (
  <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "1.1rem 1.25rem", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ fontSize: "0.68rem", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>{label}</div>
      <span style={{ fontSize: "1.2rem" }}>{icon}</span>
    </div>
    <div style={{ fontSize: "1.85rem", fontWeight: 800, color, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: 5 }}>{sub}</div>}
    {trend !== undefined && (
      <div style={{ fontSize: "0.68rem", color: trend >= 0 ? C.green : C.red, marginTop: 4, fontFamily: "monospace" }}>
        {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}% vs yesterday
      </div>
    )}
  </div>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ label?: string }> = ({ label = "Loading…" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem", gap: 14 }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <Loader2 size={32} color={C.primary} style={{ animation: "spin 0.8s linear infinite" }} />
    <p style={{ color: C.muted, fontFamily: "monospace", fontSize: "0.82rem" }}>{label}</p>
  </div>
);

// ─── PageError ────────────────────────────────────────────────────────────────
export const PageError: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem", gap: 14 }}>
    <AlertCircle size={32} color={C.red} />
    <p style={{ color: C.red, fontSize: "0.9rem" }}>{message}</p>
    {onRetry && <Btn variant="ghost" onClick={onRetry}>Retry</Btn>}
  </div>
);

// ─── EmptyState ───────────────────────────────────────────────────────────────
export const Empty: React.FC<{ icon?: string; title: string; sub?: string }> = ({ icon = "📭", title, sub }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 10, color: C.muted }}>
    <div style={{ fontSize: "2.5rem" }}>{icon}</div>
    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: C.text }}>{title}</div>
    {sub && <div style={{ fontSize: "0.78rem" }}>{sub}</div>}
  </div>
);

// ─── SearchBar ────────────────────────────────────────────────────────────────
export const SearchBar: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder = "Search…" }) => (
  <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
    <Search size={14} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "9px 36px", background: "#0e1015",
        border: "1px solid " + C.border, borderRadius: 10, color: C.text,
        fontSize: "0.85rem", outline: "none", boxSizing: "border-box",
      }}
    />
    {value && (
      <button onClick={() => onChange("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted }}>
        <X size={14} />
      </button>
    )}
  </div>
);

// ─── Select ───────────────────────────────────────────────────────────────────
export const Sel: React.FC<{
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
}> = ({ value, onChange, options, style }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      padding: "9px 12px", background: "#0e1015", border: "1px solid " + C.border,
      borderRadius: 10, color: C.text, fontSize: "0.82rem", outline: "none", cursor: "pointer",
      ...style,
    }}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// ─── Table ────────────────────────────────────────────────────────────────────
export const Table: React.FC<{
  headers: string[];
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}> = ({ headers, children, emptyMessage = "No data found", isEmpty }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#0e1015", borderBottom: "1px solid " + C.border }}>
          {headers.map(h => (
            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.62rem", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, whiteSpace: "nowrap" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isEmpty
          ? <tr><td colSpan={headers.length}><Empty title={emptyMessage} /></td></tr>
          : children}
      </tbody>
    </table>
  </div>
);

// ─── TableRow ─────────────────────────────────────────────────────────────────
export const TR: React.FC<{ children: React.ReactNode; onClick?: () => void; highlight?: boolean }> = ({ children, onClick, highlight }) => (
  <tr
    onClick={onClick}
    style={{
      borderBottom: "1px solid " + C.border,
      background: highlight ? "rgba(99,102,241,0.05)" : "transparent",
      cursor: onClick ? "pointer" : "default",
      transition: "background 0.12s",
    }}
    onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = highlight ? "rgba(99,102,241,0.05)" : "transparent"; }}
  >
    {children}
  </tr>
);

// ─── TableCell ────────────────────────────────────────────────────────────────
export const TD: React.FC<{ children: React.ReactNode; mono?: boolean; muted?: boolean; style?: React.CSSProperties }> = ({ children, mono, muted, style }) => (
  <td style={{ padding: "11px 14px", fontSize: "0.82rem", fontFamily: mono ? "monospace" : undefined, color: muted ? C.muted : C.text, verticalAlign: "middle", ...style }}>
    {children}
  </td>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
export const Modal: React.FC<{
  open: boolean; onClose: () => void;
  title: string; children: React.ReactNode;
  width?: number;
}> = ({ open, onClose, title, children, width = 560 }) => {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 18, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid " + C.border }}>
          <h3 style={{ fontWeight: 800, fontSize: "1rem", color: C.text, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "1.25rem" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── PageHeader ───────────────────────────────────────────────────────────────
export const PageHeader: React.FC<{
  title: string; sub?: string; icon?: string; actions?: React.ReactNode;
}> = ({ title, sub, icon, actions }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: "1.75rem" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {icon && <span style={{ fontSize: "1.8rem" }}>{icon}</span>}
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.03em" }}>{title}</h1>
        {sub && <p style={{ color: C.muted, fontSize: "0.82rem", marginTop: 3 }}>{sub}</p>}
      </div>
    </div>
    {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
  </div>
);

// ─── Section divider ──────────────────────────────────────────────────────────
export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.875rem", marginTop: "1.5rem" }}>
    <span style={{ fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.18em", color: C.muted, textTransform: "uppercase" }}>{children}</span>
    <div style={{ flex: 1, height: 1, background: C.border }} />
  </div>
);

// ─── InfoRow ─────────────────────────────────────────────────────────────────
export const InfoRow: React.FC<{ label: string; value: React.ReactNode; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid " + C.border }}>
    <span style={{ fontSize: "0.78rem", color: C.muted }}>{label}</span>
    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: color ?? C.text, fontFamily: "monospace" }}>{value}</span>
  </div>
);

// ─── Timeline ─────────────────────────────────────────────────────────────────
export const Timeline: React.FC<{ events: { label: string; time?: string; color?: string; done: boolean }[] }> = ({ events }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
    {events.map((e, i) => (
      <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: e.done ? (e.color ?? C.green) : C.border, border: "2px solid " + (e.done ? (e.color ?? C.green) : C.border), marginTop: 3 }} />
          {i < events.length - 1 && <div style={{ width: 2, height: 32, background: e.done ? C.border : C.border, marginTop: 2 }} />}
        </div>
        <div style={{ paddingBottom: i < events.length - 1 ? 20 : 0 }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: e.done ? C.text : C.muted }}>{e.label}</div>
          {e.time && <div style={{ fontSize: "0.7rem", fontFamily: "monospace", color: C.muted, marginTop: 2 }}>{new Date(e.time).toLocaleString("en-IN")}</div>}
        </div>
      </div>
    ))}
  </div>
);

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
export const ConfirmDialog: React.FC<{
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; confirmLabel?: string; danger?: boolean; loading?: boolean;
}> = ({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger, loading }) => (
  <Modal open={open} onClose={onClose} title={title} width={400}>
    <p style={{ color: C.muted, fontSize: "0.88rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>{message}</p>
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Btn>
    </div>
  </Modal>
);

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input: React.FC<{
  label?: string; value: string|number; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}> = ({ label, value, onChange, type = "text", placeholder, disabled }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && <label style={{ fontSize: "0.68rem", color: C.muted, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</label>}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ padding: "9px 12px", background: "#0e1015", border: "1px solid " + C.border, borderRadius: 10, color: C.text, fontSize: "0.88rem", outline: "none", opacity: disabled ? 0.5 : 1 }}
    />
  </div>
);

// ─── Tabs ─────────────────────────────────────────────────────────────────────
// Accepts { key } OR { value } so STATUS_OPTS / TYPE_OPTS arrays work directly
// without renaming — whichever field is present is used as the identifier.
export const Tabs: React.FC<{
  tabs: ({ key: string; label: string; count?: number } | { value: string; label: string; count?: number })[];
  active: string;
  onChange: (id: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 4, padding: 4, background: C.surface, borderRadius: 12, border: "1px solid " + C.border, width: "fit-content", flexWrap: "wrap" }}>
    {tabs.map(t => {
      const id = "key" in t ? t.key : t.value;
      return (
        <button key={id} onClick={() => onChange(id)} style={{
          padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem",
          background: active === id ? C.primary : "transparent",
          color: active === id ? "#fff" : C.muted,
          transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {t.label}
          {t.count !== undefined && (
            <span style={{ background: active === id ? "rgba(255,255,255,0.2)" : C.border, borderRadius: 20, padding: "0px 7px", fontSize: "0.65rem" }}>
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// ─── Map placeholder (Google Maps placeholder until API key provided) ─────────
export const MapPlaceholder: React.FC<{ label?: string; height?: number }> = ({ label = "Google Maps — Provide VITE_GOOGLE_MAPS_KEY", height = 400 }) => (
  <div style={{
    height, background: "#0e1015", border: "1px solid " + C.border, borderRadius: 14,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10
  }}>
    <span style={{ fontSize: "2rem" }}>🗺️</span>
    <span style={{ color: C.muted, fontSize: "0.82rem", fontFamily: "monospace" }}>{label}</span>
  </div>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
export const Pagination: React.FC<{
  page: number; pages: number; total: number; perPage: number;
  onChange: (p: number) => void;
}> = ({ page, pages, total, perPage, onChange }) => {
  if (pages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid " + C.border }}>
      <span style={{ fontSize: "0.72rem", color: C.muted, fontFamily: "monospace" }}>{from}–{to} of {total}</span>
      <div style={{ display: "flex", gap: 4 }}>
        <button disabled={page === 1} onClick={() => onChange(page - 1)} style={{ padding: "5px 12px", background: "transparent", border: "1px solid " + C.border, borderRadius: 8, color: page === 1 ? C.muted : C.text, cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "0.8rem" }}>←</button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          const p = page <= 3 ? i + 1 : page + i - 2;
          if (p < 1 || p > pages) return null;
          return (
            <button key={p} onClick={() => onChange(p)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + (p === page ? C.primary : C.border), background: p === page ? C.primary : "transparent", color: p === page ? "#fff" : C.text, fontSize: "0.8rem", cursor: "pointer", fontWeight: 700 }}>{p}</button>
          );
        })}
        <button disabled={page === pages} onClick={() => onChange(page + 1)} style={{ padding: "5px 12px", background: "transparent", border: "1px solid " + C.border, borderRadius: 8, color: page === pages ? C.muted : C.text, cursor: page === pages ? "not-allowed" : "pointer", fontSize: "0.8rem" }}>→</button>
      </div>
    </div>
  );
};