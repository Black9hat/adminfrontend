import React, { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Car, Users, CreditCard, Map, Shield, Package,
  Star, Monitor, UserCog, Zap, Search, Scale, DollarSign,
  ChevronDown, ChevronRight, LogOut, Menu, TrendingUp,
  Activity, CircleDot,
} from "lucide-react";
import { C } from "../components/ui";

const NAV = [
  {
    key:"overview", label:"Overview",
    items:[
      { path:"/analytics",  label:"Dashboard",  icon:<LayoutDashboard size={14}/> },
      { path:"/money-flow", label:"Money Flow",  icon:<TrendingUp size={14}/> },
    ],
  },
  {
    key:"ops", label:"Operations",
    items:[
      { path:"/rides",   label:"Rides",    icon:<Car size={14}/> },
      { path:"/drivers", label:"Drivers",  icon:<UserCog size={14}/> },
      { path:"/parcels", label:"Parcels",  icon:<Package size={14}/> },
      { path:"/gps",     label:"GPS Live", icon:<Map size={14}/> },
    ],
  },
  {
    key:"people", label:"People",
    items:[
      { path:"/customers", label:"Customers", icon:<Users size={14}/> },
      { path:"/ratings",   label:"Ratings",   icon:<Star size={14}/> },
    ],
  },
  {
    key:"finance", label:"Finance",
    items:[
      { path:"/payments",        label:"Payments",   icon:<CreditCard size={14}/> },
      { path:"/fare-management", label:"Fare Rates",  icon:<Zap size={14}/> },
      { path:"/fare-pricing",    label:"Promos",      icon:<DollarSign size={14}/> },
    ],
  },
  {
    key:"trust", label:"Safety & Trust",
    items:[
      { path:"/safety", label:"Complaints",  icon:<Shield size={14}/> },
      { path:"/fraud",  label:"Fraud",       icon:<Search size={14}/> },
    ],
  },
  {
    key:"system", label:"System",
    items:[
      { path:"/tech",  label:"Tech Monitor", icon:<Monitor size={14}/> },
      { path:"/legal", label:"Legal",         icon:<Scale size={14}/> },
    ],
  },
];

const SIDEBAR_W  = 210;
const COLLAPSED_W = 50;

export default function AdminLayout() {
  const location = useLocation();
  const navigate  = useNavigate();
  const [open, setOpen] = useState<Record<string,boolean>>(
    Object.fromEntries(NAV.map(g=>[g.key,true]))
  );
  const [col, setCol] = useState(false);

  return (
    <div style={{display:"flex", height:"100vh", overflow:"hidden", background:C.bg, fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes liveDot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.5} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border3};border-radius:3px}
        input,select{color-scheme:dark;font-family:'Inter',sans-serif}
        input::placeholder{color:${C.muted}}

        /* Button */
        .pr-btn{transition:all .13s ease;user-select:none}
        .pr-btn:hover:not(:disabled){filter:brightness(1.12);transform:translateY(-1px)}
        .pr-btn:active:not(:disabled){transform:translateY(0);filter:brightness(.96)}
        /* Table row */
        .pr-row{transition:background .08s;cursor:pointer}
        .pr-row:hover{background:${C.surface3}!important}
        /* Card hover */
        .pr-card{transition:border-color .2s,box-shadow .2s}
        .pr-card:hover{border-color:${C.border3}!important;box-shadow:0 4px 24px rgba(0,0,0,.35)}
        /* Tab */
        .pr-tab{transition:all .13s ease}
        .pr-tab:hover:not(.pr-tab-active){color:${C.text2}!important;background:${C.surface3}!important}
        /* Input focus */
        .pr-input:focus{border-color:${C.primary}!important;outline:none}
        .pr-select:focus{border-color:${C.primary}!important;outline:none}

        /* Nav link */
        .nav-lnk{display:block;text-decoration:none;margin:1px 5px}
        .nav-lnk .nav-in{
          display:flex;align-items:center;gap:9px;
          padding:7px 9px;border-radius:7px;
          border-left:2px solid transparent;
          transition:all .12s ease;
        }
        .nav-lnk:hover .nav-in{background:${C.surface3}}
        .nav-lnk.active .nav-in{
          background:${C.primaryDim};
          border-left-color:${C.primary};
        }
        .nav-lnk.active .nav-ico{color:${C.primary}!important}
        .nav-lnk.active .nav-txt{color:${C.primary}!important;font-weight:700!important}

        .grp-btn{
          width:100%;padding:4px 14px;background:none;border:none;
          cursor:pointer;display:flex;align-items:center;justify-content:space-between;
          gap:6px;margin-top:8px;transition:background .1s;border-radius:6px;
        }
        .grp-btn:hover{background:${C.surface2}}
      `}</style>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside style={{
        width: col ? COLLAPSED_W : SIDEBAR_W,
        flexShrink:0,
        background:C.surface,
        borderRight:"1px solid "+C.border,
        display:"flex", flexDirection:"column",
        overflow:"hidden",
        transition:"width 0.2s cubic-bezier(.4,0,.2,1)",
        zIndex:40,
      }}>

        {/* Logo bar */}
        <div style={{
          height:54,
          display:"flex", alignItems:"center",
          justifyContent: col ? "center" : "space-between",
          padding: col ? "0" : "0 10px 0 14px",
          borderBottom:"1px solid "+C.border, flexShrink:0,
          gap:8,
        }}>
          {!col && (
            <div style={{display:"flex", alignItems:"center", gap:9, minWidth:0}}>
              <div style={{
                width:30, height:30, borderRadius:8,
                background:C.primaryDim, border:"1px solid "+C.primaryBrd,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"1rem", flexShrink:0,
              }}>🚘</div>
              <div>
                <div style={{fontWeight:800, fontSize:"0.92rem", color:C.text, letterSpacing:"-0.02em"}}>GoIndia</div>
                <div style={{
                  fontSize:"0.54rem", color:C.muted,
                  fontFamily:"'JetBrains Mono',monospace",
                  letterSpacing:"0.12em", textTransform:"uppercase",
                }}>Admin Center</div>
              </div>
            </div>
          )}
          {col && <span style={{fontSize:"1.1rem"}}>🚘</span>}
          <button
            onClick={()=>setCol(v=>!v)}
            style={{
              background:"none", border:"none", cursor:"pointer",
              color:C.muted, padding:5, borderRadius:6,
              display:"flex", alignItems:"center", flexShrink:0,
              transition:"color .12s",
            }}
          >
            <Menu size={15}/>
          </button>
        </div>

        {/* Live indicator */}
        {!col && (
          <div style={{
            margin:"8px 12px 2px",
            padding:"6px 10px",
            background:C.greenDim,
            border:"1px solid "+C.green+"22",
            borderRadius:7,
            display:"flex", alignItems:"center", gap:7,
          }}>
            <span style={{
              width:6, height:6, borderRadius:"50%", background:C.green,
              animation:"liveDot 1.6s ease-in-out infinite", flexShrink:0,
              boxShadow:"0 0 5px "+C.green,
            }}/>
            <span style={{fontSize:"0.7rem", color:C.green, fontWeight:600}}>System Live</span>
          </div>
        )}

        {/* Nav */}
        <nav style={{flex:1, overflowY:"auto", overflowX:"hidden", padding:"6px 0 8px"}}>
          {NAV.map(group=>(
            <div key={group.key}>
              {!col && (
                <button
                  className="grp-btn"
                  onClick={()=>setOpen(v=>({...v,[group.key]:!v[group.key]}))}
                >
                  <span style={{
                    fontSize:"0.59rem", color:C.muted,
                    fontFamily:"'JetBrains Mono',monospace",
                    letterSpacing:"0.12em", textTransform:"uppercase",
                  }}>{group.label}</span>
                  <span style={{color:C.muted, display:"flex"}}>
                    {open[group.key] ? <ChevronDown size={9}/> : <ChevronRight size={9}/>}
                  </span>
                </button>
              )}

              {(open[group.key]||col) && group.items.map(item=>{
                const isActive = location.pathname===item.path
                  || (item.path!=="/" && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={"nav-lnk"+(isActive?" active":"")}
                    title={col?item.label:undefined}
                  >
                    <div className="nav-in" style={{
                      justifyContent: col?"center":"flex-start",
                      padding: col?"8px 0":"7px 9px",
                      gap: col?0:9,
                    }}>
                      <span className="nav-ico" style={{
                        color: isActive ? C.primary : C.muted,
                        display:"flex", flexShrink:0,
                        transition:"color .12s",
                      }}>{item.icon}</span>
                      {!col && (
                        <span className="nav-txt" style={{
                          fontSize:"0.83rem",
                          fontWeight: isActive?600:500,
                          color: isActive?C.primary:C.text2,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                          transition:"color .12s",
                        }}>{item.label}</span>
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{padding:"6px 5px 8px", borderTop:"1px solid "+C.border, flexShrink:0}}>
          <button
            onClick={()=>{localStorage.removeItem("adminToken");navigate("/login");}}
            style={{
              width:"100%", background:"none", border:"none", cursor:"pointer",
              display:"flex", alignItems:"center",
              justifyContent: col?"center":"flex-start",
              gap:9, padding: col?"8px 0":"7px 9px",
              color:C.muted, fontSize:"0.83rem",
              fontFamily:"'Inter',sans-serif", borderRadius:7,
              transition:"all .12s",
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=C.red;(e.currentTarget as HTMLElement).style.background=C.redDim;}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=C.muted;(e.currentTarget as HTMLElement).style.background="none";}}
          >
            <LogOut size={14}/>
            {!col && "Log out"}
          </button>
        </div>
      </aside>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main style={{flex:1, minWidth:0, overflow:"auto", background:C.bg}}>
        <Outlet/>
      </main>
    </div>
  );
}