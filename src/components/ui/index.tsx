import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Search, X, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS  — professional ops dashboard palette
// Inspired by: Swiggy Ops Center, Rapido Admin, Zomato Command
// ─────────────────────────────────────────────────────────────────────────────
export const C = {
  // Base layers
  bg:       "#0a0b0f",
  surface:  "#0f1117",
  surface2: "#141820",
  surface3: "#191e28",
  panel:    "#1c2130",

  // Borders (subtle depth)
  border:   "#1f2535",
  border2:  "#28324a",
  border3:  "#333f58",

  // Text
  text:     "#eef0f6",
  text2:    "#9aa3b8",
  muted:    "#525e7a",

  // Brand accent — electric blue (neutral, professional)
  primary:    "#3b82f6",
  primaryDim: "rgba(59,130,246,0.10)",
  primaryBrd: "rgba(59,130,246,0.22)",

  // Semantic
  green:     "#10b981",  greenDim:  "rgba(16,185,129,0.10)",
  amber:     "#f59e0b",  amberDim:  "rgba(245,158,11,0.10)",
  red:       "#ef4444",  redDim:    "rgba(239,68,68,0.10)",
  purple:    "#8b5cf6",  purpleDim: "rgba(139,92,246,0.10)",
  cyan:      "#06b6d4",  cyanDim:   "rgba(6,182,212,0.10)",
  orange:    "#f97316",  orangeDim: "rgba(249,115,22,0.10)",
};

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES — injected once into <head>
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: ${C.bg};
    color: ${C.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Keyframes */
  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.45} }
  @keyframes liveDot  { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.6} }

  /* Scrollbar */
  ::-webkit-scrollbar       { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:${C.border3}; border-radius:3px; }
  ::-webkit-scrollbar-thumb:hover { background:${C.muted}; }

  input, select, textarea {
    font-family:'Inter',sans-serif;
    color-scheme:dark;
  }
  input::placeholder, textarea::placeholder { color:${C.muted}; }

  /* Utility interaction classes */
  .pr-btn { transition: all 0.13s ease; user-select:none; }
  .pr-btn:hover:not(:disabled) { filter:brightness(1.12); transform:translateY(-1px); }
  .pr-btn:active:not(:disabled){ transform:translateY(0px); filter:brightness(0.96); }

  .pr-row { transition: background 0.08s; cursor:pointer; }
  .pr-row:hover { background:${C.surface3} !important; }

  .pr-card { transition: border-color 0.2s, box-shadow 0.2s; }
  .pr-card:hover { border-color:${C.border3} !important; box-shadow:0 4px 24px rgba(0,0,0,0.35); }

  .pr-tab { transition: all 0.13s ease; }
  .pr-tab:hover:not(.pr-tab-active) { color:${C.text2} !important; background:${C.surface3} !important; }

  .pr-input:focus { border-color:${C.primary} !important; outline:none; }
  .pr-select:focus { border-color:${C.primary} !important; outline:none; }
`;

let _cssReady = false;
function ensureCSS() {
  if (_cssReady || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = CSS;
  document.head.appendChild(el);
  _cssReady = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS META
// ─────────────────────────────────────────────────────────────────────────────
export const STATUS_META: Record<string, { label:string; color:string; bg:string }> = {
  requested:        { label:"Requested",   color:C.amber,   bg:C.amberDim  },
  driver_assigned:  { label:"Assigned",    color:C.cyan,    bg:C.cyanDim   },
  driver_at_pickup: { label:"At Pickup",   color:C.purple,  bg:C.purpleDim },
  ride_started:     { label:"En Route",    color:C.primary, bg:C.primaryDim},
  completed:        { label:"Completed",   color:C.green,   bg:C.greenDim  },
  cancelled:        { label:"Cancelled",   color:C.red,     bg:C.redDim    },
  timeout:          { label:"Timeout",     color:C.muted,   bg:"rgba(82,94,122,0.10)" },
  pending:          { label:"Pending",     color:C.amber,   bg:C.amberDim  },
  resolved:         { label:"Resolved",    color:C.green,   bg:C.greenDim  },
  in_review:        { label:"In Review",   color:C.cyan,    bg:C.cyanDim   },
  dismissed:        { label:"Dismissed",   color:C.muted,   bg:"rgba(82,94,122,0.10)" },
  success:          { label:"Success",     color:C.green,   bg:C.greenDim  },
  failed:           { label:"Failed",      color:C.red,     bg:C.redDim    },
  refunded:         { label:"Refunded",    color:C.purple,  bg:C.purpleDim },
  active:           { label:"Active",      color:C.green,   bg:C.greenDim  },
  blocked:          { label:"Blocked",     color:C.red,     bg:C.redDim    },
  suspended:        { label:"Suspended",   color:C.amber,   bg:C.amberDim  },
  online:           { label:"Online",      color:C.green,   bg:C.greenDim  },
  offline:          { label:"Offline",     color:C.muted,   bg:"rgba(82,94,122,0.10)" },
};

// ─────────────────────────────────────────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────────────────────────────────────────
export const Badge: React.FC<{ status:string; label?:string }> = ({ status, label }) => {
  ensureCSS();
  const m = STATUS_META[status] ?? { label:status, color:C.muted, bg:"rgba(82,94,122,0.10)" };
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"2px 8px 2px 6px", borderRadius:5,
      fontSize:"0.69rem", fontWeight:600,
      fontFamily:"'JetBrains Mono','Consolas',monospace",
      color:m.color, background:m.bg,
      border:"1px solid "+m.color+"28",
      whiteSpace:"nowrap", letterSpacing:"0.01em",
    }}>
      <span style={{
        width:5, height:5, borderRadius:"50%", flexShrink:0,
        background:m.color, boxShadow:"0 0 5px "+m.color+"80",
      }}/>
      {label ?? m.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────────────────────────────────────────
const BTN_STYLES = {
  primary: { bg:C.primary, border:C.primary, text:"#fff" },
  danger:  { bg:C.red,     border:C.red,     text:"#fff" },
  success: { bg:C.green,   border:C.green,   text:"#fff" },
  warning: { bg:C.amber,   border:C.amber,   text:"#0a0b0f" },
  ghost:   { bg:"transparent", border:C.border2, text:C.text2 },
  outline: { bg:"transparent", border:C.primary, text:C.primary },
};
const BTN_SIZES = {
  xs:{ pad:"3px 9px",   fs:"0.7rem",  h:26, r:5 },
  sm:{ pad:"5px 12px",  fs:"0.76rem", h:30, r:6 },
  md:{ pad:"7px 15px",  fs:"0.84rem", h:34, r:7 },
  lg:{ pad:"10px 20px", fs:"0.9rem",  h:40, r:8 },
};
export const Btn: React.FC<{
  children:React.ReactNode; onClick?:()=>void;
  variant?:"primary"|"danger"|"ghost"|"success"|"warning"|"outline";
  size?:"xs"|"sm"|"md"|"lg"; disabled?:boolean; loading?:boolean;
  icon?:React.ReactNode; full?:boolean;
}> = ({ children, onClick, variant="primary", size="md", disabled, loading, icon, full }) => {
  ensureCSS();
  const s = BTN_STYLES[variant]; const sz = BTN_SIZES[size];
  const dis = disabled||loading;
  return (
    <button className="pr-btn" onClick={onClick} disabled={dis} style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center", gap:5,
      padding:sz.pad, borderRadius:sz.r, height:sz.h,
      background: dis ? C.surface3 : s.bg,
      border:"1px solid "+(dis ? C.border : s.border),
      color: dis ? C.muted : s.text,
      fontSize:sz.fs, fontWeight:600,
      fontFamily:"'Inter',sans-serif",
      cursor: dis ? "not-allowed" : "pointer",
      opacity: dis ? 0.55 : 1,
      width: full ? "100%" : "auto",
      whiteSpace:"nowrap", letterSpacing:"0.01em", flexShrink:0,
    }}>
      {loading
        ? <Loader2 size={12} style={{animation:"spin 0.7s linear infinite",flexShrink:0}}/>
        : icon && <span style={{display:"flex",flexShrink:0}}>{icon}</span>}
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────────────────────────────────────
export const Card: React.FC<{
  children:React.ReactNode; style?:React.CSSProperties;
  className?:string; hover?:boolean; pad?:boolean;
}> = ({ children, style, className, hover, pad }) => {
  ensureCSS();
  return (
    <div className={[className, hover?"pr-card":""].filter(Boolean).join(" ")} style={{
      background:C.surface, border:"1px solid "+C.border, borderRadius:10,
      ...(pad?{padding:"1.125rem"}:{}), ...style,
    }}>
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD  — the hero component, Swiggy-ops style
// ─────────────────────────────────────────────────────────────────────────────
export const StatCard: React.FC<{
  label:string; value:string|number; icon:string;
  color?:string; sub?:string; trend?:number; dim?:string;
}> = ({ label, value, icon, color=C.primary, sub, trend, dim }) => {
  ensureCSS();
  const bg = dim ?? color+"18";
  return (
    <div className="pr-card" style={{
      background:C.surface, border:"1px solid "+C.border,
      borderRadius:10, padding:"1rem 1.1rem",
      position:"relative", overflow:"hidden", cursor:"default",
    }}>
      {/* Left accent bar */}
      <div style={{
        position:"absolute", top:0, left:0, bottom:0,
        width:3, background:color, borderRadius:"10px 0 0 10px",
      }}/>

      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", paddingLeft:8}}>
        <div style={{flex:1, minWidth:0}}>
          <div style={{
            fontSize:"0.62rem", fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:"0.1em", textTransform:"uppercase",
            color:C.muted, marginBottom:8, fontWeight:500,
          }}>{label}</div>
          <div style={{
            fontSize:"1.8rem", fontWeight:800, color:C.text,
            letterSpacing:"-0.04em", lineHeight:1,
            fontFamily:"'Inter',sans-serif",
          }}>{value}</div>
          {sub && <div style={{fontSize:"0.69rem", color:C.muted, marginTop:5}}>{sub}</div>}
          {trend!==undefined && (
            <div style={{
              display:"inline-flex", alignItems:"center", gap:2,
              marginTop:5, fontSize:"0.69rem", fontWeight:600,
              color: trend>=0 ? C.green : C.red,
            }}>
              {trend>=0 ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
              {Math.abs(trend).toFixed(1)}% vs yesterday
            </div>
          )}
        </div>
        {/* Icon badge */}
        <div style={{
          width:38, height:38, borderRadius:9, background:bg,
          border:"1px solid "+color+"22",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"1.1rem", flexShrink:0, marginLeft:8,
        }}>{icon}</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LIVE DOT  — animated green pulse for live metrics
// ─────────────────────────────────────────────────────────────────────────────
export const LiveDot: React.FC<{ color?:string }> = ({ color=C.green }) => (
  <span style={{
    display:"inline-block", width:7, height:7, borderRadius:"50%",
    background:color, boxShadow:"0 0 0 0 "+color,
    animation:"liveDot 1.6s ease-in-out infinite",
  }}/>
);

// ─────────────────────────────────────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ label?:string }> = ({ label="Loading…" }) => {
  ensureCSS();
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", minHeight:320, gap:14,
    }}>
      <div style={{
        width:36, height:36, borderRadius:"50%",
        border:"2.5px solid "+C.border2,
        borderTopColor:C.primary,
        animation:"spin 0.65s linear infinite",
      }}/>
      <span style={{
        color:C.muted, fontFamily:"'JetBrains Mono',monospace",
        fontSize:"0.75rem", letterSpacing:"0.06em",
      }}>{label}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE ERROR
// ─────────────────────────────────────────────────────────────────────────────
export const PageError: React.FC<{ message:string; onRetry?:()=>void }> = ({ message, onRetry }) => {
  ensureCSS();
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", minHeight:320, gap:14,
    }}>
      <div style={{
        width:46, height:46, borderRadius:12, background:C.redDim,
        display:"flex", alignItems:"center", justifyContent:"center",
        border:"1px solid "+C.red+"22",
      }}>
        <AlertCircle size={20} color={C.red}/>
      </div>
      <p style={{color:C.text2, fontSize:"0.87rem", textAlign:"center", maxWidth:300, lineHeight:1.5}}>{message}</p>
      {onRetry && <Btn variant="ghost" icon={<RefreshCw size={13}/>} onClick={onRetry}>Try again</Btn>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
export const Empty: React.FC<{ icon?:string; title:string; sub?:string }> = ({
  icon="📭", title, sub,
}) => {
  ensureCSS();
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"3.5rem 2rem", gap:10,
    }}>
      <span style={{fontSize:"2rem", opacity:0.4}}>{icon}</span>
      <span style={{fontWeight:600, fontSize:"0.88rem", color:C.text2}}>{title}</span>
      {sub && <span style={{fontSize:"0.76rem", color:C.muted, textAlign:"center", maxWidth:260}}>{sub}</span>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH BAR
// ─────────────────────────────────────────────────────────────────────────────
export const SearchBar: React.FC<{
  value:string; onChange:(v:string)=>void; placeholder?:string;
}> = ({ value, onChange, placeholder="Search…" }) => {
  ensureCSS();
  return (
    <div style={{position:"relative", flex:1, minWidth:200}}>
      <Search size={13} color={C.muted} style={{
        position:"absolute", left:11, top:"50%",
        transform:"translateY(-50%)", pointerEvents:"none",
      }}/>
      <input
        className="pr-input"
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:"100%", padding:"0 34px", height:34,
          background:C.surface2, border:"1px solid "+C.border,
          borderRadius:7, color:C.text, fontSize:"0.83rem",
          fontFamily:"'Inter',sans-serif", transition:"border-color 0.15s",
        }}
      />
      {value && (
        <button onClick={()=>onChange("")} style={{
          position:"absolute", right:9, top:"50%",
          transform:"translateY(-50%)", background:"none",
          border:"none", cursor:"pointer", color:C.muted,
          display:"flex", alignItems:"center", padding:2, borderRadius:4,
        }}>
          <X size={12}/>
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SELECT
// ─────────────────────────────────────────────────────────────────────────────
export const Sel: React.FC<{
  value:string; onChange:(v:string)=>void;
  options:{value:string;label:string}[];
  style?:React.CSSProperties; label?:string;
}> = ({ value, onChange, options, style, label }) => {
  ensureCSS();
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label && <label style={{
        fontSize:"0.61rem", color:C.muted,
        fontFamily:"'JetBrains Mono',monospace",
        letterSpacing:"0.1em", textTransform:"uppercase",
      }}>{label}</label>}
      <select
        className="pr-select"
        value={value}
        onChange={e=>onChange(e.target.value)}
        style={{
          height:34, padding:"0 10px",
          background:C.surface2, border:"1px solid "+C.border,
          borderRadius:7, color:C.text, fontSize:"0.83rem",
          fontFamily:"'Inter',sans-serif", cursor:"pointer",
          transition:"border-color 0.15s", ...style,
        }}
      >
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────────
export const Input: React.FC<{
  label?:string; value:string|number; onChange:(v:string)=>void;
  type?:string; placeholder?:string; disabled?:boolean;
}> = ({ label, value, onChange, type="text", placeholder, disabled }) => {
  ensureCSS();
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label && <label style={{
        fontSize:"0.61rem", color:C.muted,
        fontFamily:"'JetBrains Mono',monospace",
        letterSpacing:"0.1em", textTransform:"uppercase",
      }}>{label}</label>}
      <input
        className="pr-input"
        type={type} value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        style={{
          height:36, padding:"0 11px",
          background: disabled ? C.surface : C.surface2,
          border:"1px solid "+C.border, borderRadius:7,
          color:C.text, fontSize:"0.87rem",
          fontFamily:"'Inter',sans-serif",
          transition:"border-color 0.15s",
          opacity: disabled ? 0.5 : 1,
        }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TABS  — accepts both {key} and {value} shapes
// ─────────────────────────────────────────────────────────────────────────────
export const Tabs: React.FC<{
  tabs:({key:string;label:string;count?:number}|{value:string;label:string;count?:number})[];
  active:string; onChange:(id:string)=>void;
}> = ({ tabs, active, onChange }) => {
  ensureCSS();
  return (
    <div style={{
      display:"flex", gap:1, padding:3,
      background:C.surface2, borderRadius:8,
      border:"1px solid "+C.border,
      width:"fit-content", flexWrap:"wrap",
    }}>
      {tabs.map(t=>{
        const id="key" in t ? t.key : t.value;
        const on=active===id;
        return (
          <button key={id} className={"pr-tab"+(on?" pr-tab-active":"")}
            onClick={()=>onChange(id)}
            style={{
              padding:"5px 13px", height:30, borderRadius:6,
              border:"none", cursor:"pointer", transition:"all 0.13s ease",
              fontWeight: on?700:500, fontSize:"0.8rem",
              fontFamily:"'Inter',sans-serif",
              background: on ? C.surface : "transparent",
              color: on ? C.text : C.muted,
              boxShadow: on ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              display:"flex", alignItems:"center", gap:6,
              letterSpacing:"0.01em", whiteSpace:"nowrap",
            }}
          >
            {t.label}
            {t.count!==undefined && (
              <span style={{
                background: on ? C.primary+"22" : C.border,
                color: on ? C.primary : C.muted,
                borderRadius:4, padding:"0 5px",
                fontSize:"0.62rem", lineHeight:"16px",
                fontFamily:"'JetBrains Mono',monospace", fontWeight:700,
              }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TABLE
// ─────────────────────────────────────────────────────────────────────────────
export const Table: React.FC<{
  headers:string[]; children:React.ReactNode;
  emptyMessage?:string; isEmpty?:boolean;
}> = ({ headers, children, emptyMessage="No data", isEmpty }) => {
  ensureCSS();
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%", borderCollapse:"collapse", tableLayout:"auto"}}>
        <thead>
          <tr style={{background:C.surface2}}>
            {headers.map(h=>(
              <th key={h} style={{
                padding:"9px 14px",
                textAlign:"left", whiteSpace:"nowrap",
                fontSize:"0.61rem",
                fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:"0.1em", textTransform:"uppercase",
                color:C.muted, fontWeight:500,
                borderBottom:"1px solid "+C.border,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty
            ? <tr><td colSpan={headers.length}><Empty title={emptyMessage}/></td></tr>
            : children}
        </tbody>
      </table>
    </div>
  );
};

export const TR: React.FC<{
  children:React.ReactNode; onClick?:()=>void; highlight?:boolean;
}> = ({ children, onClick, highlight }) => {
  ensureCSS();
  return (
    <tr className={onClick?"pr-row":undefined} onClick={onClick} style={{
      borderBottom:"1px solid "+C.border,
      background: highlight ? C.primaryDim : "transparent",
      animation:"fadeUp 0.12s ease both",
    }}>
      {children}
    </tr>
  );
};

export const TD: React.FC<{
  children:React.ReactNode; mono?:boolean; muted?:boolean;
  style?:React.CSSProperties;
}> = ({ children, mono, muted, style }) => (
  <td style={{
    padding:"10px 14px", verticalAlign:"middle",
    fontSize: mono ? "0.79rem" : "0.84rem",
    fontFamily: mono ? "'JetBrains Mono',monospace" : "'Inter',sans-serif",
    color: muted ? C.muted : C.text,
    ...style,
  }}>
    {children}
  </td>
);

// ─────────────────────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const Modal: React.FC<{
  open:boolean; onClose:()=>void;
  title:string; children:React.ReactNode; width?:number;
}> = ({ open, onClose, title, children, width=560 }) => {
  ensureCSS();
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:16, background:"rgba(0,0,0,0.72)",
      backdropFilter:"blur(5px)", WebkitBackdropFilter:"blur(5px)",
      animation:"fadeIn 0.15s ease",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.panel, border:"1px solid "+C.border2,
        borderRadius:12, width:"100%", maxWidth:width,
        maxHeight:"90vh", overflow:"auto",
        boxShadow:"0 20px 70px rgba(0,0,0,0.6)",
        animation:"fadeUp 0.18s ease",
      }}>
        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0.875rem 1.125rem",
          borderBottom:"1px solid "+C.border,
          background:C.surface2,
          borderRadius:"12px 12px 0 0",
          position:"sticky", top:0, zIndex:1,
        }}>
          <span style={{fontWeight:700, fontSize:"0.92rem", color:C.text}}>{title}</span>
          <button onClick={onClose} style={{
            background:C.surface3, border:"1px solid "+C.border,
            borderRadius:6, width:27, height:27,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", color:C.muted, flexShrink:0,
            transition:"all 0.12s",
          }}>
            <X size={13}/>
          </button>
        </div>
        <div style={{padding:"1.125rem"}}>{children}</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM DIALOG
// ─────────────────────────────────────────────────────────────────────────────
export const ConfirmDialog: React.FC<{
  open:boolean; onClose:()=>void; onConfirm:()=>void;
  title:string; message:string; confirmLabel?:string;
  danger?:boolean; loading?:boolean;
}> = ({ open, onClose, onConfirm, title, message, confirmLabel="Confirm", danger, loading }) => (
  <Modal open={open} onClose={onClose} title={title} width={400}>
    <p style={{
      color:C.text2, fontSize:"0.87rem", lineHeight:1.6,
      marginBottom:"1.125rem",
    }}>{message}</p>
    <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant={danger?"danger":"primary"} onClick={onConfirm} loading={loading}>
        {confirmLabel}
      </Btn>
    </div>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────────────────────────────────────
export const PageHeader: React.FC<{
  title:string; sub?:string; icon?:string;
  actions?:React.ReactNode; breadcrumb?:string;
}> = ({ title, sub, icon, actions, breadcrumb }) => {
  ensureCSS();
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      flexWrap:"wrap", gap:12, marginBottom:"1.5rem",
    }}>
      <div style={{display:"flex", alignItems:"center", gap:11}}>
        {icon && (
          <div style={{
            width:40, height:40, borderRadius:10,
            background:C.primaryDim, border:"1px solid "+C.primaryBrd,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"1.2rem", flexShrink:0,
          }}>{icon}</div>
        )}
        <div>
          {breadcrumb && (
            <div style={{
              fontSize:"0.6rem", color:C.muted,
              fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3,
            }}>{breadcrumb}</div>
          )}
          <h1 style={{
            fontSize:"1.35rem", fontWeight:800, color:C.text,
            margin:0, letterSpacing:"-0.025em",
          }}>{title}</h1>
          {sub && <p style={{color:C.muted, fontSize:"0.77rem", marginTop:2}}>{sub}</p>}
        </div>
      </div>
      {actions && (
        <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>{actions}</div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION LABEL
// ─────────────────────────────────────────────────────────────────────────────
export const SectionLabel: React.FC<{ children:React.ReactNode }> = ({ children }) => {
  ensureCSS();
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:9,
      marginBottom:"0.7rem", marginTop:"1.125rem",
    }}>
      <span style={{
        fontFamily:"'JetBrains Mono',monospace",
        fontSize:"0.59rem", letterSpacing:"0.14em",
        color:C.muted, textTransform:"uppercase", whiteSpace:"nowrap",
      }}>{children}</span>
      <div style={{flex:1, height:1, background:C.border}}/>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INFO ROW
// ─────────────────────────────────────────────────────────────────────────────
export const InfoRow: React.FC<{
  label:string; value:React.ReactNode; color?:string;
}> = ({ label, value, color }) => (
  <div style={{
    display:"flex", justifyContent:"space-between", alignItems:"flex-start",
    padding:"7px 0", borderBottom:"1px solid "+C.border, gap:12,
  }}>
    <span style={{fontSize:"0.77rem", color:C.muted, flexShrink:0}}>{label}</span>
    <span style={{
      fontSize:"0.8rem", fontWeight:600,
      color: color ?? C.text,
      fontFamily:"'JetBrains Mono',monospace",
      textAlign:"right", wordBreak:"break-word", maxWidth:"65%",
    }}>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE
// ─────────────────────────────────────────────────────────────────────────────
export const Timeline: React.FC<{
  events:{label:string; time?:string; color?:string; done:boolean}[];
}> = ({ events }) => {
  ensureCSS();
  return (
    <div style={{display:"flex", flexDirection:"column"}}>
      {events.map((e,i)=>(
        <div key={i} style={{display:"flex", gap:11, alignItems:"flex-start"}}>
          <div style={{
            display:"flex", flexDirection:"column",
            alignItems:"center", flexShrink:0, paddingTop:3,
          }}>
            <div style={{
              width:9, height:9, borderRadius:"50%",
              background: e.done ? (e.color??C.green) : C.border2,
              boxShadow: e.done ? "0 0 6px "+(e.color??C.green)+"60" : "none",
              transition:"all 0.2s",
            }}/>
            {i<events.length-1 && (
              <div style={{
                width:1, height:28, marginTop:3,
                background: e.done
                  ? "linear-gradient(to bottom,"+(e.color??C.green)+"50,"+C.border+")"
                  : C.border,
              }}/>
            )}
          </div>
          <div style={{paddingBottom: i<events.length-1 ? 14 : 0}}>
            <div style={{
              fontSize:"0.81rem",
              fontWeight: e.done ? 600 : 400,
              color: e.done ? C.text : C.muted,
            }}>{e.label}</div>
            {e.time && (
              <div style={{
                fontSize:"0.67rem", color:C.muted, marginTop:2,
                fontFamily:"'JetBrains Mono',monospace",
              }}>{new Date(e.time).toLocaleString("en-IN")}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAP PLACEHOLDER
// ─────────────────────────────────────────────────────────────────────────────
export const MapPlaceholder: React.FC<{ label?:string; height?:number }> = ({
  label="Add VITE_GOOGLE_MAPS_KEY to .env to enable maps",
  height=400,
}) => {
  ensureCSS();
  return (
    <div style={{
      height, background:C.surface2, border:"1px solid "+C.border,
      borderRadius:9, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:10,
    }}>
      <div style={{
        width:42, height:42, borderRadius:10, background:C.border,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem",
      }}>🗺️</div>
      <span style={{
        color:C.muted, fontSize:"0.73rem",
        fontFamily:"'JetBrains Mono',monospace",
        textAlign:"center", maxWidth:280,
      }}>{label}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────
export const Pagination: React.FC<{
  page:number; pages:number; total:number; perPage:number;
  onChange:(p:number)=>void;
}> = ({ page, pages, total, perPage, onChange }) => {
  ensureCSS();
  if (pages<=1) return null;
  const from = (page-1)*perPage+1;
  const to   = Math.min(page*perPage, total);
  const nums: number[] = [];
  const s=Math.max(1,page-2), e=Math.min(pages,s+4);
  for (let i=s;i<=e;i++) nums.push(i);
  const btnBase:React.CSSProperties = {
    height:28, minWidth:28, padding:"0 8px", borderRadius:6,
    border:"1px solid "+C.border, background:"transparent",
    color:C.text2, fontSize:"0.77rem", cursor:"pointer",
    fontFamily:"'JetBrains Mono',monospace",
    display:"flex", alignItems:"center", justifyContent:"center",
    transition:"all 0.13s",
  };
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"10px 14px", borderTop:"1px solid "+C.border,
      background:C.surface2, borderRadius:"0 0 9px 9px",
    }}>
      <span style={{fontSize:"0.7rem", color:C.muted, fontFamily:"'JetBrains Mono',monospace"}}>
        {from}–{to} of {total}
      </span>
      <div style={{display:"flex", gap:3}}>
        <button style={{...btnBase, opacity:page===1?0.4:1, cursor:page===1?"not-allowed":"pointer"}}
          disabled={page===1} onClick={()=>onChange(page-1)}>←</button>
        {nums.map(p=>(
          <button key={p} onClick={()=>onChange(p)} style={{
            ...btnBase,
            background: p===page ? C.primary : "transparent",
            border: "1px solid "+(p===page ? C.primary : C.border),
            color: p===page ? "#fff" : C.text2,
            fontWeight: p===page ? 700 : 400,
          }}>{p}</button>
        ))}
        <button style={{...btnBase, opacity:page===pages?0.4:1, cursor:page===pages?"not-allowed":"pointer"}}
          disabled={page===pages} onClick={()=>onChange(page+1)}>→</button>
      </div>
    </div>
  );
};