import React, { useEffect, useState, useMemo, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import { RefreshCw, Download } from "lucide-react";

interface Trip {
  _id: string; status: string; type: "short"|"long"|"parcel"; vehicleType: string;
  fare: number; finalFare?: number; payment?: { collected?: boolean; method?: string };
  createdAt: string; customerId?: { name: string; phone: string }|null;
  assignedDriver?: { name: string; phone: string }|null;
}
interface FareRate {
  _id: string; vehicleType: string; baseFare: number; perKm: number;
  perMin?: number; minFare?: number; manualSurge?: number;
  peakMultiplier?: number; nightMultiplier?: number;
  platformFeePercent?: number; gstPercent?: number; perRideIncentive?: number;
}

const tok  = () => localStorage.getItem("adminToken") || "";
const hdrs = { Authorization: `Bearer ${tok()}`, "ngrok-skip-browser-warning": "true" };
const inr  = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const pct  = (n: number) => `${Math.round(n * 10) / 10}%`;
const tf   = (t: Trip)   => t.finalFare ?? t.fare ?? 0;
const ago  = (n: number) => { const d = new Date(); d.setDate(d.getDate()-n); d.setHours(0,0,0,0); return d; };
const inRng= (s: string, f: Date, t: Date) => { const d=new Date(s); return d>=f&&d<=t; };
const VI: Record<string,string> = { bike:"🏍️", auto:"🛺", car:"🚗", premium:"🚙", xl:"🚐" };
const PC: Record<string,{bg:string;fg:string}> = {
  bike:{bg:"rgba(245,158,11,0.15)",fg:"#f59e0b"}, auto:{bg:"rgba(6,182,212,0.15)",fg:"#06b6d4"},
  car:{bg:"rgba(99,102,241,0.15)",fg:"#818cf8"},  premium:{bg:"rgba(168,85,247,0.15)",fg:"#c084fc"},
  xl:{bg:"rgba(34,197,94,0.15)",fg:"#4ade80"},
};

const Count: React.FC<{val:number;prefix?:string;dur?:number}> = ({val,prefix="",dur=900}) => {
  const [n,setN] = useState(0);
  useEffect(()=>{ let f=0; const total=Math.ceil(dur/16);
    const t=setInterval(()=>{ f++; setN(Math.round((f/total)*val)); if(f>=total)clearInterval(t); },16);
    return ()=>clearInterval(t);
  },[val,dur]);
  return <>{prefix}{n.toLocaleString("en-IN")}</>;
};

const Sec: React.FC<{children:React.ReactNode;right?:React.ReactNode}> = ({children,right}) => (
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"1rem"}}>
    <span style={{fontFamily:"monospace",fontSize:"0.72rem",letterSpacing:"0.18em",color:"#6b7280",textTransform:"uppercase" as const}}>{children}</span>
    <div style={{flex:1,height:1,background:"#1e2128"}}/>
    {right}
  </div>
);
const Li: React.FC<{label:string;val:string;vc?:string;bold?:boolean;top?:boolean}> = ({label,val,vc="#6b7280",bold,top}) => (
  <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1e2128",borderTop:top?"1px solid #2d3748":undefined,marginTop:top?8:undefined}}>
    <span style={{color:bold?"#e8eaf0":"#6b7280",fontWeight:bold?700:400,fontSize:"0.83rem"}}>{label}</span>
    <span style={{fontFamily:"monospace",fontWeight:700,color:vc,fontSize:bold?"0.95rem":"0.83rem"}}>{val}</span>
  </div>
);
const Bar: React.FC<{val:number;max:number;color:string;label:string;valLabel?:string}> = ({val,max,color,label,valLabel}) => {
  const p = max>0?Math.min((val/max)*100,100):0;
  return (
    <div style={{marginBottom:"0.75rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:"0.78rem"}}>
        <span style={{color:"#9ca3af"}}>{label}</span>
        <span style={{fontFamily:"monospace",color:"#e8eaf0",fontWeight:700}}>{valLabel??`${Math.round(p)}%`}</span>
      </div>
      <div style={{height:8,background:"#1e2128",borderRadius:6,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${p}%`,background:color,borderRadius:6,transition:"width 0.8s cubic-bezier(.22,.61,.36,1)"}}/>
      </div>
    </div>
  );
};

export default function MoneyFlow() {
  const [trips,   setTrips]   = useState<Trip[]>([]);
  const [rates,   setRates]   = useState<FareRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [distKm,  setDistKm]  = useState(5);
  const [durMin,  setDurMin]  = useState(15);
  const [tod,     setTod]     = useState<"normal"|"peak"|"night">("normal");
  const [selV,    setSelV]    = useState<string>("");
  const [mCost,   setMCost]   = useState(2000);
  const [target,  setTarget]  = useState(50000);
  const [range,   setRange]   = useState<"today"|"7d"|"30d"|"all">("30d");
  const [showAll, setShowAll] = useState(false);

  const fetchAll = useCallback(async()=>{
    setSyncing(true);
    try {
      const [tR,rR] = await Promise.all([
        axiosInstance.get("/admin/trips",{headers:hdrs}),
        axiosInstance.get("/admin/fare/rates",{headers:hdrs}),
      ]);
      const t:Trip[]=[...tR.data.trips||[]]; const r:FareRate[]=[...rR.data.rates||[]];
      setTrips(t); setRates(r);
      if(r.length>0&&!selV) setSelV(r[0].vehicleType);
    } catch(e){console.error(e);}
    finally{setLoading(false);setSyncing(false);}
  },[selV]);
  useEffect(()=>{fetchAll();},[fetchAll]);

  const activeRate = useMemo(()=>rates.find(r=>r.vehicleType===selV)??rates[0],[rates,selV]);
  const commPct    = activeRate?.platformFeePercent??10;

  const filteredDone = useMemo(()=>{
    const done = trips.filter(t=>t.status==="completed");
    if(range==="all") return done;
    const now=new Date(); now.setHours(23,59,59,999);
    const from = range==="today"?ago(0):range==="7d"?ago(6):ago(29);
    return done.filter(t=>inRng(t.createdAt,from,now));
  },[trips,range]);

  const stats = useMemo(()=>{
    const gross = filteredDone.reduce((s,t)=>s+tf(t),0);
    const yours = filteredDone.reduce((s,t)=>{
      const r=rates.find(r=>r.vehicleType?.toLowerCase()===t.vehicleType?.toLowerCase());
      return s+tf(t)*((r?.platformFeePercent??commPct)/100);
    },0);
    const drivers = gross-yours;
    const rzp     = yours*0.02;
    const net     = yours-rzp;
    const avgF    = filteredDone.length>0?gross/filteredDone.length:0;
    const avgC    = filteredDone.length>0?yours/filteredDone.length:0;

    const byV: Record<string,{trips:number;revenue:number;yourCut:number}> = {};
    filteredDone.forEach(t=>{
      const vt=t.vehicleType||"unknown";
      if(!byV[vt]) byV[vt]={trips:0,revenue:0,yourCut:0};
      const r=rates.find(r=>r.vehicleType?.toLowerCase()===vt.toLowerCase());
      const cp=(r?.platformFeePercent??commPct)/100;
      byV[vt].trips++; byV[vt].revenue+=tf(t); byV[vt].yourCut+=tf(t)*cp;
    });

    const dailyMap: Record<string,{revenue:number;yourCut:number;trips:number}> = {};
    for(let i=13;i>=0;i--){
      const d=ago(i);
      const key=d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
      dailyMap[key]={revenue:0,yourCut:0,trips:0};
    }
    const todayNow=new Date(); todayNow.setHours(23,59,59,999);
    trips.filter(t=>t.status==="completed"&&inRng(t.createdAt,ago(13),todayNow)).forEach(t=>{
      const key=new Date(t.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
      if(dailyMap[key]){
        const r=rates.find(r=>r.vehicleType?.toLowerCase()===t.vehicleType?.toLowerCase());
        const cp=(r?.platformFeePercent??commPct)/100;
        dailyMap[key].revenue+=tf(t); dailyMap[key].yourCut+=tf(t)*cp; dailyMap[key].trips++;
      }
    });

    const todayTrips=trips.filter(t=>t.status==="completed"&&inRng(t.createdAt,ago(0),todayNow));
    const todayRev=todayTrips.reduce((s,t)=>{
      const r=rates.find(r=>r.vehicleType?.toLowerCase()===t.vehicleType?.toLowerCase());
      return s+tf(t)*((r?.platformFeePercent??commPct)/100);
    },0);

    const paid   = filteredDone.filter(t=> t.payment?.collected).length;
    const unpaid = filteredDone.filter(t=>!t.payment?.collected).length;
    const paidRev   = filteredDone.filter(t=> t.payment?.collected).reduce((s,t)=>s+tf(t),0);
    const unpaidRev = filteredDone.filter(t=>!t.payment?.collected).reduce((s,t)=>s+tf(t),0);

    return {gross,yours,drivers,rzp,net,avgF,avgC,byV,daily:Object.entries(dailyMap),todayRev,todayTrips:todayTrips.length,paid,unpaid,paidRev,unpaidRev,total:filteredDone.length};
  },[filteredDone,trips,rates,commPct]);

  const sim = useMemo(()=>{
    if(!activeRate) return null;
    const bf=activeRate.baseFare, df=activeRate.perKm*distKm, tf_=(activeRate.perMin??0)*durMin;
    let m=activeRate.manualSurge??1;
    if(tod==="peak"  &&(activeRate.peakMultiplier ??1)>m) m=activeRate.peakMultiplier ??1;
    if(tod==="night" &&(activeRate.nightMultiplier??1)>m) m=activeRate.nightMultiplier??1;
    const as_=(bf+df+tf_)*m;
    const gst=as_*((activeRate.gstPercent??0)/100);
    const total=Math.max(Math.round((as_+gst)/5)*5,activeRate.minFare??0);
    const comm=total*(commPct/100); const driver=total-comm;
    const rzp=total*0.02; const net=comm-rzp;
    return {total,comm,driver,rzp,net,commPct,m,bf,df,tf:tf_,gst,incentive:activeRate.perRideIncentive??0};
  },[activeRate,distKm,durMin,tod,commPct]);

  const tgtMath = useMemo(()=>{
    const avgC=stats.avgC>0?stats.avgC:(sim?.net??20);
    const daily=target/30;
    const tripsDay=Math.ceil(daily/avgC);
    const tripsMo=Math.ceil(target/avgC);
    const deficit=Math.max(0,target-stats.net);
    const surplus=Math.max(0,stats.net-target);
    const progress=target>0?Math.min((stats.net/target)*100,100):0;
    return {daily,tripsDay,tripsMo,deficit,surplus,progress,avgC};
  },[target,stats,sim]);

  const maxDaily = useMemo(()=>Math.max(...stats.daily.map(([,v])=>v.yourCut),1),[stats]);

  const exportCsv=()=>{
    const rows=[
      ["Period",range],["Trips",stats.total],["Gross Revenue",Math.round(stats.gross)],
      ["Your Earnings",Math.round(stats.yours)],["Net After Razorpay",Math.round(stats.net)],[],
      ["Date","Your Earnings","Trips"],
      ...stats.daily.map(([d,v])=>[d,Math.round(v.yourCut),v.trips]),
    ];
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"}));
    a.download=`moneyflow_${Date.now()}.csv`; a.click();
  };

  const PAGE: React.CSSProperties = {minHeight:"100vh",background:"#0b0c10",color:"#e8eaf0",fontFamily:"'Syne','Segoe UI',sans-serif",position:"relative"};
  const GRID: React.CSSProperties = {position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none",zIndex:0};
  const WRAP: React.CSSProperties = {position:"relative",zIndex:1,maxWidth:1200,margin:"0 auto",padding:"2.5rem 1.5rem 5rem"};
  const CARD: React.CSSProperties = {background:"#13151a",border:"1px solid #1e2128",borderRadius:16,overflow:"hidden"};
  const TOP  = (c:string): React.CSSProperties => ({position:"absolute",top:0,left:0,right:0,height:3,background:c});
  const INP: React.CSSProperties  = {background:"#0e1015",border:"1px solid #3a3f4a",borderRadius:10,padding:"10px 12px",color:"#e8eaf0",fontFamily:"monospace",fontSize:"0.88rem",width:"100%"};
  const CTIT= (c:string): React.CSSProperties => ({padding:"0.85rem 1.25rem",borderBottom:"1px solid #1e2128",fontFamily:"monospace",fontSize:"0.68rem",textTransform:"uppercase" as const,letterSpacing:"0.12em",color:c});
  const dateLabel = range==="today"?"Today":range==="7d"?"Last 7 days":range==="30d"?"Last 30 days":"All time";

  if(loading) return (
    <div style={{...PAGE,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={GRID}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #1e2128",borderTop:"3px solid #6366f1",borderRadius:"50%",animation:"spin 0.7s linear infinite",margin:"0 auto 12px"}}/>
        <p style={{color:"#6b7280",fontFamily:"monospace"}}>Loading trips & fare rates…</p>
      </div>
    </div>
  );

  return (
    <div style={PAGE}>
      <div style={GRID}/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadein{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .mf{animation:fadein 0.4s ease both}
        input:focus,select:focus{border-color:#6366f1!important;outline:none}
        .hr:hover{background:#0e1015!important}
        .sb:hover{border-color:#6366f1!important;color:#e8eaf0!important}
      `}</style>

      <div style={WRAP}>

        {/* ── HEADER ── */}
        <div className="mf" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",marginBottom:"2.5rem"}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,fontFamily:"monospace",fontSize:"0.7rem",letterSpacing:"0.18em",color:"#6366f1",border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.08)",padding:"5px 14px",borderRadius:30,marginBottom:12}}>
              💰 FINANCIAL CLARITY · LIVE DATA
            </div>
            <h1 style={{fontSize:"clamp(1.8rem,4vw,2.8rem)",fontWeight:800,letterSpacing:"-0.04em",lineHeight:1.1}}>
              Every rupee, <span style={{color:"#6366f1"}}>explained</span>
            </h1>
            <p style={{color:"#6b7280",marginTop:8,fontSize:"0.88rem"}}>
              {trips.length.toLocaleString()} total trips · {trips.filter(t=>t.status==="completed").length} completed · live from MongoDB
            </p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,alignItems:"center"}}>
            {(["today","7d","30d","all"] as const).map(r=>(
              <button key={r} className="sb" onClick={()=>setRange(r)} style={{padding:"8px 14px",borderRadius:10,fontFamily:"monospace",fontSize:"0.72rem",border:range===r?"1px solid #6366f1":"1px solid #3a3f4a",background:range===r?"rgba(99,102,241,0.15)":"#13151a",color:range===r?"#e8eaf0":"#6b7280",cursor:"pointer",transition:"all 0.15s"}}>
                {r==="today"?"Today":r==="7d"?"7 Days":r==="30d"?"30 Days":"All Time"}
              </button>
            ))}
            <button onClick={fetchAll} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#1e2128",border:"1px solid #3a3f4a",borderRadius:10,color:"#e8eaf0",cursor:"pointer",fontSize:"0.83rem"}}>
              <RefreshCw size={14} style={{animation:syncing?"spin 0.7s linear infinite":"none"}}/> Refresh
            </button>
            <button onClick={exportCsv} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:"0.83rem",fontWeight:700}}>
              <Download size={14}/> Export
            </button>
          </div>
        </div>

        {/* ══ S1: REAL EARNINGS ══════════════════════════ */}
        <Sec right={<span style={{fontFamily:"monospace",fontSize:"0.68rem",color:"#6366f1",background:"rgba(99,102,241,0.1)",padding:"3px 10px",borderRadius:20}}>{dateLabel}</span>}>
          📊 Real earnings from your trips
        </Sec>

        {/* 6 stat cards */}
        <div className="mf" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"0.85rem",marginBottom:"1.75rem"}}>
          {[
            {label:"Completed Trips",  val:stats.total,       accent:"#6366f1", icon:"✅", prefix:"",  sub:dateLabel},
            {label:"Gross Revenue",    val:stats.gross,       accent:"#f59e0b", icon:"💰", prefix:"₹", sub:"Customer paid"},
            {label:"You Earned",       val:stats.yours,       accent:"#6366f1", icon:"🏦", prefix:"₹", sub:`${pct(commPct)} avg commission`},
            {label:"Driver Payouts",   val:stats.drivers,     accent:"#22c55e", icon:"🧑‍✈️", prefix:"₹", sub:"Paid to drivers"},
            {label:"Net (after Rzp)",  val:stats.net,         accent:"#a78bfa", icon:"💳", prefix:"₹", sub:"After ~2% UPI cut"},
            {label:"Avg Cut/Trip",     val:stats.avgC,        accent:"#06b6d4", icon:"📌", prefix:"₹", sub:"Your avg per ride"},
          ].map((s,i)=>(
            <div key={i} className="mf" style={{background:"#13151a",border:"1px solid #1e2128",borderRadius:16,padding:"1.25rem",position:"relative",overflow:"hidden",animationDelay:`${i*50}ms`}}>
              <div style={TOP(s.accent)}/>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontFamily:"monospace",fontSize:"0.63rem",letterSpacing:"0.12em",textTransform:"uppercase" as const,color:"#6b7280"}}>{s.label}</div>
                <div style={{fontSize:"1rem"}}>{s.icon}</div>
              </div>
              <div style={{fontSize:"1.75rem",fontWeight:800,color:s.accent,fontFamily:"monospace",letterSpacing:"-0.03em",lineHeight:1}}>
                <Count val={Math.round(s.val)} prefix={s.prefix}/>
              </div>
              <div style={{fontSize:"0.68rem",color:"#6b7280",marginTop:6}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Flow boxes: Customer → You → Driver */}
        <div className="mf" style={{display:"grid",gridTemplateColumns:"1fr 36px 1fr 36px 1fr",alignItems:"center",marginBottom:"1.75rem",gap:0}}>
          {([
            {label:"Customer Paid",  val:stats.gross,   sub:`${stats.total} completed trips`, accent:"#f59e0b"},
            {label:"You Kept",       val:stats.yours,   sub:stats.gross>0?`${pct((stats.yours/stats.gross)*100)} of gross · net ${inr(stats.net)}`:`${pct(commPct)} avg commission`, accent:"#6366f1"},
            {label:"Drivers Got",    val:stats.drivers, sub:stats.gross>0?`${pct((stats.drivers/stats.gross)*100)} of gross`:"Remaining after commission", accent:"#22c55e"},
          ] as const).reduce((acc,item,i)=>{
            if(i>0) acc.push(<div key={`a${i}`} style={{textAlign:"center" as const,fontSize:"1.4rem",color:"#3a3f4a"}}>→</div>);
            acc.push(
              <div key={item.label} style={{...CARD,textAlign:"center" as const,padding:"1.4rem 0.75rem",position:"relative",overflow:"hidden"}}>
                <div style={TOP(item.accent)}/>
                <div style={{fontFamily:"monospace",fontSize:"0.63rem",letterSpacing:"0.14em",textTransform:"uppercase" as const,color:item.accent,marginBottom:6}}>{item.label}</div>
                <div style={{fontSize:"1.9rem",fontWeight:800,color:item.accent,fontFamily:"monospace",letterSpacing:"-0.04em",lineHeight:1}}>
                  <Count val={Math.round(item.val)} prefix="₹"/>
                </div>
                <div style={{fontSize:"0.7rem",color:"#6b7280",marginTop:6,lineHeight:1.4}}>{item.sub}</div>
              </div>
            );
            return acc;
          },[] as React.ReactNode[])}
        </div>

        {/* Split bar */}
        <div className="mf" style={{marginBottom:"1.75rem"}}>
          <div style={{fontFamily:"monospace",fontSize:"0.65rem",color:"#6b7280",marginBottom:8,letterSpacing:"0.1em",textTransform:"uppercase" as const}}>Revenue split — every ₹100 collected</div>
          <div style={{height:42,borderRadius:10,overflow:"hidden",display:"flex",border:"1px solid #1e2128"}}>
            {[
              {w:stats.gross>0?(stats.drivers/stats.gross)*100:88, bg:"rgba(34,197,94,0.85)", fg:"#052e16", label:"Drivers"},
              {w:stats.gross>0?(stats.yours/stats.gross)*100:10,   bg:"rgba(99,102,241,0.85)",fg:"#e0e7ff", label:"You"},
              {w:stats.gross>0?(stats.rzp/stats.gross)*100:0.5,    bg:"rgba(239,68,68,0.7)",  fg:"#fee2e2", label:"Rzp"},
            ].map((s,i)=>(
              <div key={i} style={{width:`${s.w}%`,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",fontSize:"0.7rem",fontWeight:700,color:s.fg,transition:"width 0.8s ease",overflow:"hidden",whiteSpace:"nowrap" as const}}>
                {s.w>5?(s.label + " " + Math.round(s.w) + "%"):""}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:"1.25rem",marginTop:8}}>
            {[{c:"#22c55e",l:"Driver earning"},{c:"#6366f1",l:"Your commission"},{c:"#ef4444",l:"Razorpay (~2%)"}].map(x=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:"0.68rem",color:"#6b7280"}}>
                <div style={{width:8,height:8,borderRadius:2,background:x.c}}/>{x.l}
              </div>
            ))}
          </div>
        </div>

        {/* Payment + vehicle breakdown */}
        <div className="mf" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.75rem"}}>
          <div style={CARD}>
            <div style={CTIT("#22c55e")}>💳 Payment collection ({dateLabel})</div>
            <div style={{padding:"1.1rem 1.25rem"}}>
              <Bar val={stats.paid}   max={stats.total} color="#22c55e" label={`Collected (${stats.paid} trips)`}  valLabel={inr(stats.paidRev)}/>
              <Bar val={stats.unpaid} max={stats.total} color="#f59e0b" label={`Pending (${stats.unpaid} trips)`}  valLabel={inr(stats.unpaidRev)}/>
              <div style={{background:"#0e1015",borderRadius:10,padding:"10px 12px",marginTop:10,fontSize:"0.73rem",color:"#6b7280",lineHeight:1.6}}>
                <strong style={{color:"#e8eaf0"}}>Pending = {inr(stats.unpaidRev)}</strong> not yet collected.{" "}
                {stats.unpaid>0?`Chase ${stats.unpaid} unpaid trips.`:"✅ All payments collected!"}
              </div>
            </div>
          </div>
          <div style={CARD}>
            <div style={CTIT("#6b7280")}>🚗 By vehicle type ({dateLabel})</div>
            <div style={{padding:"1.1rem 1.25rem"}}>
              {Object.entries(stats.byV).sort((a,b)=>b[1].yourCut-a[1].yourCut).map(([vt,data])=>(
                <div key={vt} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #1e2128",fontSize:"0.82rem"}}>
                  <span style={{color:"#9ca3af"}}>{VI[vt.toLowerCase()]??"🚗"} {vt} <span style={{color:"#4b5563",fontSize:"0.68rem"}}>({data.trips} trips)</span></span>
                  <div style={{textAlign:"right" as const}}>
                    <div style={{fontFamily:"monospace",fontWeight:700,color:"#6366f1"}}>{inr(data.yourCut)}</div>
                    <div style={{fontFamily:"monospace",fontSize:"0.65rem",color:"#4b5563"}}>{inr(data.revenue)} gross</div>
                  </div>
                </div>
              ))}
              {Object.keys(stats.byV).length===0&&<p style={{color:"#4b5563",fontSize:"0.82rem",textAlign:"center" as const,padding:"1rem 0"}}>No data for this period</p>}
            </div>
          </div>
        </div>

        {/* 14-day chart */}
        <div className="mf" style={{...CARD,padding:"1.5rem",marginBottom:"1.75rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
            <span style={{fontFamily:"monospace",fontSize:"0.7rem",color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.12em"}}>📈 Your daily earnings — last 14 days</span>
            <div style={{display:"flex",gap:16,fontSize:"0.68rem",fontFamily:"monospace"}}>
              <span style={{color:"#22c55e"}}>■ Today</span>
              <span style={{color:"#6366f1"}}>■ Past days</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:5,height:110}}>
            {stats.daily.map(([day,val])=>{
              const h=maxDaily>0?(val.yourCut/maxDaily)*100:0;
              const isToday=day===new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
              return (
                <div key={day} style={{flex:1,display:"flex",flexDirection:"column" as const,alignItems:"center",gap:3}}>
                  <div style={{fontSize:"0.52rem",fontFamily:"monospace",color:"#6366f1",height:14,display:"flex",alignItems:"center",whiteSpace:"nowrap" as const}}>
                    {val.yourCut>0?inr(val.yourCut):""}
                  </div>
                  <div style={{width:"100%",flex:1,display:"flex",alignItems:"flex-end"}}>
                    <div style={{width:"100%",height:`${Math.max(h,val.yourCut>0?4:0)}%`,background:isToday?"rgba(34,197,94,0.7)":val.yourCut>0?"rgba(99,102,241,0.75)":"#1e2128",borderRadius:"3px 3px 0 0",minHeight:val.yourCut>0?4:2,transition:"height 0.6s ease",position:"relative" as const}}>
                      {val.trips>0&&<div style={{position:"absolute",top:-14,left:"50%",transform:"translateX(-50%)",fontSize:"0.5rem",color:"#6b7280",whiteSpace:"nowrap" as const}}>{val.trips}t</div>}
                    </div>
                  </div>
                  <div style={{fontSize:"0.5rem",fontFamily:"monospace",color:isToday?"#22c55e":"#4b5563",textAlign:"center" as const,lineHeight:1.2}}>
                    {day.split(" ")[0]}<br/>{day.split(" ")[1]}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:"1px solid #1e2128",fontSize:"0.75rem"}}>
            <span style={{color:"#6b7280"}}>Best day: <span style={{color:"#6366f1",fontFamily:"monospace"}}>{inr(maxDaily)}</span></span>
            <span style={{color:"#6b7280"}}>Today: <span style={{color:"#22c55e",fontFamily:"monospace"}}>{inr(stats.todayRev)}</span> · {stats.todayTrips} trips</span>
          </div>
        </div>

        {/* ══ S2: PROFIT TARGETS ═════════════════════════ */}
        <Sec>🎯 Profit targets & trips needed</Sec>

        <div className="mf" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.25rem"}}>
          <div style={CARD}>
            <div style={CTIT("#f59e0b")}>🎯 Monthly goals</div>
            <div style={{padding:"1.25rem"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"1rem"}}>
                <div>
                  <div style={{fontFamily:"monospace",fontSize:"0.63rem",color:"#6b7280",marginBottom:5}}>Profit target / month (₹)</div>
                  <input type="number" value={target}  onChange={e=>setTarget(Number(e.target.value))}  style={INP}/>
                </div>
                <div>
                  <div style={{fontFamily:"monospace",fontSize:"0.63rem",color:"#6b7280",marginBottom:5}}>Server cost / month (₹)</div>
                  <input type="number" value={mCost}   onChange={e=>setMCost(Number(e.target.value))}   style={INP}/>
                </div>
              </div>
              <Bar val={tgtMath.progress} max={100} color={tgtMath.progress>=100?"#22c55e":"#6366f1"} label="Progress toward target" valLabel={`${Math.round(tgtMath.progress)}%`}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:10}}>
                {[
                  {label:"Earned so far",  val:inr(stats.net),    color:"#6366f1"},
                  {label:"Target",          val:inr(target),       color:"#f59e0b"},
                  {label:tgtMath.surplus>0?"Surplus 🎉":"Still need", val:inr(tgtMath.surplus>0?tgtMath.surplus:tgtMath.deficit), color:tgtMath.surplus>0?"#22c55e":"#ef4444"},
                ].map(s=>(
                  <div key={s.label} style={{background:"#0e1015",borderRadius:10,padding:"10px 8px",textAlign:"center" as const}}>
                    <div style={{fontFamily:"monospace",fontWeight:800,fontSize:"1rem",color:s.color}}>{s.val}</div>
                    <div style={{fontSize:"0.6rem",color:"#6b7280",marginTop:4}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={CARD}>
            <div style={CTIT("#6366f1")}>🚀 Trips needed to hit target</div>
            <div style={{padding:"1.25rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
              {[
                {label:"Trips/day",         val:tgtMath.tripsDay, color:"#f59e0b",  icon:"📅"},
                {label:"Trips/month",       val:tgtMath.tripsMo,  color:"#6366f1",  icon:"📆"},
                {label:"To cover server",   val:mCost>0?Math.ceil(mCost/(tgtMath.avgC||1)):0, color:"#22c55e", icon:"🖥️"},
                {label:"Avg your cut/trip", val:inr(tgtMath.avgC),color:"#a78bfa",  icon:"💰", isStr:true},
              ].map(s=>(
                <div key={s.label} style={{background:"#0e1015",borderRadius:12,padding:"1rem",textAlign:"center" as const}}>
                  <div style={{fontSize:"1.3rem",marginBottom:4}}>{s.icon}</div>
                  <div style={{fontFamily:"monospace",fontWeight:800,fontSize:"1.5rem",color:s.color,lineHeight:1}}>
                    {s.isStr?s.val:(s.val as number).toLocaleString("en-IN")}
                  </div>
                  <div style={{fontSize:"0.6rem",color:"#6b7280",marginTop:5,lineHeight:1.4}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{padding:"0 1.25rem 1.25rem"}}>
              <div style={{padding:"10px 12px",background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10,fontSize:"0.72rem",color:"#a5b4fc",lineHeight:1.6}}>
                Based on {inr(tgtMath.avgC)} avg cut/trip from your actual trips. Server cost not deducted from target yet.
              </div>
            </div>
          </div>
        </div>

        {/* Daily/Weekly/Monthly table */}
        <div className="mf" style={{...CARD,marginBottom:"2rem"}}>
          <div style={CTIT("#6b7280")}>📋 Daily · weekly · monthly breakdown</div>
          <div style={{overflowX:"auto" as const}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr 1fr",padding:"10px 16px",background:"#0e1015",fontFamily:"monospace",fontSize:"0.6rem",color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.08em",minWidth:680}}>
              {["Period","Revenue target","Trips needed","Earned (actual)","Server cost","Net after server","Status"].map(h=><div key={h}>{h}</div>)}
            </div>
            {[{label:"Daily",factor:1/30},{label:"Weekly",factor:7/30},{label:"Monthly",factor:1}].map(({label,factor})=>{
              const need=target*factor; const tripsN=Math.ceil(need/(tgtMath.avgC||1));
              const earned=label==="Daily"?stats.todayRev:label==="Weekly"?stats.net*(7/30):stats.net;
              const srv=mCost*factor; const trueNet=earned-srv; const ok=trueNet>=need;
              return (
                <div key={label} className="hr" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr 1fr",padding:"12px 16px",borderBottom:"1px solid #1e2128",fontSize:"0.8rem",minWidth:680,transition:"background 0.15s"}}>
                  <div style={{fontWeight:700,color:"#e8eaf0"}}>{label}</div>
                  <div style={{fontFamily:"monospace",color:"#f59e0b"}}>{inr(need)}</div>
                  <div style={{fontFamily:"monospace",color:"#6366f1"}}>{tripsN}</div>
                  <div style={{fontFamily:"monospace",color:"#9ca3af"}}>{inr(earned)}</div>
                  <div style={{fontFamily:"monospace",color:"#ef4444"}}>{inr(srv)}</div>
                  <div style={{fontFamily:"monospace",fontWeight:700,color:trueNet>=0?"#22c55e":"#ef4444"}}>{inr(trueNet)}</div>
                  <div><span style={{padding:"2px 8px",borderRadius:20,fontSize:"0.63rem",fontWeight:700,background:ok?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",color:ok?"#22c55e":"#ef4444"}}>{ok?"✅ On track":"⚠️ Behind"}</span></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ S3: FARE SIMULATOR ═════════════════════════ */}
        <Sec>🧮 Fare simulator — earn per trip</Sec>

        <div className="mf" style={{...CARD,padding:"1.5rem",marginBottom:"1.25rem",display:"flex",gap:"1rem",flexWrap:"wrap" as const,alignItems:"flex-end"}}>
          {([
            {label:"Vehicle",      type:"s", opts:rates.map(r=>({v:r.vehicleType,l:`${VI[r.vehicleType?.toLowerCase()]??"🚗"} ${r.vehicleType?.toUpperCase()}`})), val:selV,   set:(v:string)=>setSelV(v)},
            {label:"Distance(km)", type:"n", val:distKm, set:(v:number)=>setDistKm(v), step:0.5, min:0.5},
            {label:"Duration(min)",type:"n", val:durMin,  set:(v:number)=>setDurMin(v), step:1,   min:1},
            {label:"Time of Day",  type:"s", opts:[{v:"normal",l:"☀️ Normal"},{v:"peak",l:"🚀 Peak"},{v:"night",l:"🌙 Night"}], val:tod, set:(v:string)=>setTod(v as any)},
          ] as const).map((f,i)=>(
            <div key={i} style={{flex:1,minWidth:120,display:"flex",flexDirection:"column" as const,gap:5}}>
              <label style={{fontFamily:"monospace",fontSize:"0.63rem",color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.1em"}}>{f.label}</label>
              {f.type==="s"?(
                <select value={f.val as string} onChange={e=>(f.set as (v:string)=>void)(e.target.value)} style={{...INP}}>
                  {((f as any).opts??[]).map((o:{v:string;l:string})=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ):(
                <input type="number" value={f.val as number} step={(f as any).step} min={(f as any).min} onChange={e=>(f.set as (v:number)=>void)(Number(e.target.value))} style={INP}/>
              )}
            </div>
          ))}
        </div>

        {sim&&(
          <>
            {/* Sim flow boxes */}
            <div className="mf" style={{display:"grid",gridTemplateColumns:"1fr 36px 1fr 36px 1fr",alignItems:"center",marginBottom:"1.25rem",gap:0}}>
              {([
                {label:"Customer Pays",val:sim.total, sub:"Total fare",                                                           accent:"#f59e0b"},
                {label:"You Earn",     val:sim.comm,  sub:`${pct(sim.commPct)} · net ${inr(sim.net)} after Rzp`,                 accent:"#6366f1"},
                {label:"Driver Gets",  val:sim.driver,sub:`${pct((sim.driver/sim.total)*100)} of fare${sim.incentive>0?` + ${inr(sim.incentive)} bonus`:""}`, accent:"#22c55e"},
              ] as const).reduce((acc,item,i)=>{
                if(i>0) acc.push(<div key={`a${i}`} style={{textAlign:"center" as const,fontSize:"1.3rem",color:"#3a3f4a"}}>→</div>);
                acc.push(
                  <div key={item.label} style={{...CARD,textAlign:"center" as const,padding:"1.25rem 0.75rem",position:"relative",overflow:"hidden"}}>
                    <div style={TOP(item.accent)}/>
                    <div style={{fontFamily:"monospace",fontSize:"0.62rem",letterSpacing:"0.12em",textTransform:"uppercase" as const,color:item.accent,marginBottom:4}}>{item.label}</div>
                    <div style={{fontSize:"1.8rem",fontWeight:800,color:item.accent,fontFamily:"monospace",letterSpacing:"-0.04em",lineHeight:1}}>{inr(item.val)}</div>
                    <div style={{fontSize:"0.66rem",color:"#6b7280",marginTop:4,lineHeight:1.4}}>{item.sub}</div>
                  </div>
                );
                return acc;
              },[] as React.ReactNode[])}
            </div>

            {/* 4 detail cards */}
            <div className="mf" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"1rem",marginBottom:"1.75rem"}}>
              <div style={CARD}>
                <div style={CTIT("#f59e0b")}>🧾 Fare steps</div>
                <div style={{padding:"0.75rem 1.25rem"}}>
                  <Li label="Base fare"                           val={inr(sim.bf)}       vc="#f59e0b"/>
                  <Li label={`${distKm}km × ₹${activeRate?.perKm}`} val={inr(sim.df)}    vc="#f59e0b"/>
                  {sim.tf>0&&<Li label={`${durMin}min × ₹${activeRate?.perMin}`} val={inr(sim.tf)} vc="#f59e0b"/>}
                  {sim.m>1 &&<Li label={`Surge ×${sim.m}`} val={`+${inr(sim.total-(sim.bf+sim.df+sim.tf))}`} vc="#ef4444"/>}
                  {sim.gst>0&&<Li label="GST" val={inr(sim.gst)} vc="#ef4444"/>}
                  <Li label="Final fare" val={inr(sim.total)} vc="#f59e0b" bold top/>
                </div>
              </div>
              <div style={CARD}>
                <div style={CTIT("#6366f1")}>📥 Your income</div>
                <div style={{padding:"0.75rem 1.25rem"}}>
                  <Li label={`Commission (${pct(sim.commPct)})`} val={inr(sim.comm)}    vc="#6366f1"/>
                  <Li label="Razorpay 2% cut"                    val={"−"+inr(sim.rzp)} vc="#ef4444"/>
                  <Li label="Net you keep"                       val={inr(sim.net)}      vc="#6366f1" bold top/>
                </div>
              </div>
              <div style={CARD}>
                <div style={CTIT("#22c55e")}>🧑‍✈️ Driver payout</div>
                <div style={{padding:"0.75rem 1.25rem"}}>
                  <Li label="Gross fare"       val={inr(sim.total)}      vc="#22c55e"/>
                  <Li label="Minus commission" val={`−${inr(sim.comm)}`} vc="#ef4444"/>
                  {sim.incentive>0&&<Li label="+ Ride bonus" val={`+${inr(sim.incentive)}`} vc="#22c55e"/>}
                  <Li label="Driver gets"      val={inr(sim.driver+sim.incentive)} vc="#22c55e" bold top/>
                </div>
              </div>
              <div style={CARD}>
                <div style={CTIT("#a78bfa")}>📊 Scale this trip</div>
                <div style={{padding:"0.75rem 1.25rem"}}>
                  {[10,30,100,300].map(n=><Li key={n} label={`${n} trips → you earn`} val={inr(sim.net*n)} vc="#a78bfa"/>)}
                  <Li label="To hit monthly target" val={`${Math.ceil(target/sim.net)} trips`} vc="#f59e0b" bold top/>
                </div>
              </div>
            </div>

            {/* All vehicles comparison */}
            <div className="mf" style={{...CARD,marginBottom:"2rem"}}>
              <div style={CTIT("#6b7280")}>All vehicles · {distKm}km · {durMin}min · {tod}</div>
              <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr 1fr 0.7fr 1fr 1fr 0.8fr",padding:"10px 16px",background:"#0e1015",fontFamily:"monospace",fontSize:"0.6rem",color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.08em"}}>
                {["Vehicle","Customer Pays","You Earn","Comm%","Driver Gets","Net(after Rzp)","Driver %"].map(h=><div key={h}>{h}</div>)}
              </div>
              {rates.map(r=>{
                const bf=r.baseFare,df=r.perKm*distKm,tf_=(r.perMin??0)*durMin;
                let m=r.manualSurge??1;
                if(tod==="peak"  &&(r.peakMultiplier ??1)>m) m=r.peakMultiplier ??1;
                if(tod==="night" &&(r.nightMultiplier??1)>m) m=r.nightMultiplier??1;
                const total=Math.max(Math.round(((bf+df+tf_)*m)/5)*5,r.minFare??0);
                const cp=r.platformFeePercent??10; const comm=total*(cp/100);
                const driver=total-comm; const net=comm*0.98; const dp=(driver/total)*100;
                const vt=r.vehicleType?.toLowerCase(); const pc=PC[vt]??{bg:"#1e2128",fg:"#9ca3af"};
                const isSel=r.vehicleType===selV;
                return (
                  <div key={r._id} className="hr" onClick={()=>setSelV(r.vehicleType)} style={{display:"grid",gridTemplateColumns:"1.3fr 1fr 1fr 0.7fr 1fr 1fr 0.8fr",padding:"11px 16px",borderBottom:"1px solid #1e2128",fontSize:"0.8rem",cursor:"pointer",background:isSel?"#0e1015":"transparent",transition:"background 0.15s"}}>
                    <div><span style={{display:"inline-block",padding:"2px 10px",borderRadius:20,fontFamily:"monospace",fontSize:"0.65rem",fontWeight:700,background:pc.bg,color:pc.fg}}>{VI[vt]??"🚗"} {r.vehicleType}</span></div>
                    <div style={{fontFamily:"monospace",fontWeight:700,color:"#f59e0b"}}>{inr(total)}</div>
                    <div style={{fontFamily:"monospace",fontWeight:700,color:"#6366f1"}}>{inr(comm)}</div>
                    <div style={{fontFamily:"monospace",color:"#6b7280"}}>{cp}%</div>
                    <div style={{fontFamily:"monospace",fontWeight:700,color:"#22c55e"}}>{inr(driver)}</div>
                    <div style={{fontFamily:"monospace",color:"#a78bfa"}}>{inr(net)}</div>
                    <div style={{fontFamily:"monospace",color:dp>80?"#22c55e":"#f59e0b"}}>{pct(dp)}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══ S4: RECENT TRIPS ═══════════════════════════ */}
        <Sec right={<button onClick={()=>setShowAll(v=>!v)} style={{fontFamily:"monospace",fontSize:"0.63rem",color:"#6366f1",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:20,padding:"3px 12px",cursor:"pointer"}}>{showAll?"Show less":"Show all"}</button>}>
          🧾 Recent trips — your actual cut per ride
        </Sec>

        <div className="mf" style={{...CARD,marginBottom:"2rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",padding:"10px 16px",background:"#0e1015",fontFamily:"monospace",fontSize:"0.6rem",color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.1em"}}>
            {["Trip","Customer Paid","Driver Got","You Earned","Payment"].map(h=><div key={h}>{h}</div>)}
          </div>
          {trips.filter(t=>t.status==="completed").sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt)).slice(0,showAll?100:10).map(t=>{
            const r=rates.find(r=>r.vehicleType?.toLowerCase()===t.vehicleType?.toLowerCase());
            const cp=r?.platformFeePercent??commPct; const fare=tf(t); const cut=fare*(cp/100);
            return (
              <div key={t._id} className="hr" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",padding:"10px 16px",borderBottom:"1px solid #1e2128",fontSize:"0.78rem",transition:"background 0.15s"}}>
                <div>
                  <div style={{fontFamily:"monospace",color:"#6366f1",fontSize:"0.68rem"}}>#{t._id.slice(-8).toUpperCase()}</div>
                  <div style={{color:"#4b5563",fontSize:"0.65rem",marginTop:2}}>{VI[t.vehicleType?.toLowerCase()]??"🚗"} {t.vehicleType} · {t.type} · {t.customerId?.name||"Guest"} · {new Date(t.createdAt).toLocaleDateString("en-IN")}</div>
                </div>
                <div style={{fontFamily:"monospace",fontWeight:700,color:"#f59e0b"}}>{inr(fare)}</div>
                <div style={{fontFamily:"monospace",color:"#22c55e"}}>{inr(fare-cut)}</div>
                <div style={{fontFamily:"monospace",fontWeight:700,color:"#6366f1"}}>{inr(cut)}</div>
                <div><span style={{padding:"2px 8px",borderRadius:20,fontSize:"0.62rem",fontWeight:700,background:t.payment?.collected?"rgba(34,197,94,0.15)":"rgba(245,158,11,0.15)",color:t.payment?.collected?"#22c55e":"#f59e0b"}}>{t.payment?.collected?"Paid":"Pending"}</span></div>
              </div>
            );
          })}
          {trips.filter(t=>t.status==="completed").length===0&&<div style={{padding:"3rem",textAlign:"center" as const,color:"#4b5563",fontSize:"0.85rem"}}>No completed trips yet</div>}
        </div>

        {/* ══ S5b: FARE SUGGESTIONS ══════════════════════ */}
        <Sec>💡 Fare suggestions — what to change to hit your target</Sec>

        {(()=>{
          const needTotal  = mCost + target;
          const periodDays = range==="today"?1:range==="7d"?7:range==="30d"?30:90;
          const totalTrips = Object.values(stats.byV).reduce((s,v)=>s+v.trips,0);

          const rows = rates.map(r=>{
            const vt  = r.vehicleType?.toLowerCase();
            const byV = stats.byV[r.vehicleType]??stats.byV[vt]??null;
            const trips30  = byV ? Math.round((byV.trips/periodDays)*30) : 0;
            const commPct  = r.platformFeePercent??10;
            const avgFare  = byV&&byV.trips>0 ? byV.revenue/byV.trips : 0;
            const commNow  = avgFare*(commPct/100)*trips30;
            const share    = totalTrips>0&&byV ? byV.trips/totalTrips : 1/rates.length;
            const need     = needTotal*share;
            const gap      = need - commNow;
            const progress = need>0 ? Math.min(Math.round((commNow/need)*100),100) : 100;

            // Balanced: commission needed to break-even at current volume
            const balPct = trips30>0&&avgFare>0
              ? Math.min(25, Math.max(5, (need/(avgFare*trips30))*100))
              : commPct;

            // Profit: commission for 20% above need
            const proPct = trips30>0&&avgFare>0
              ? Math.min(30, Math.max(5, (need*1.2/(avgFare*trips30))*100))
              : commPct;

            // Fare increase: extra base fare needed per trip
            const extraPerTrip = trips30>0&&commPct>0 ? Math.max(0,gap/trips30/(commPct/100)) : 0;
            const newBase = Math.round((r.baseFare + extraPerTrip)/5)*5;
            const newKm   = Math.round((r.perKm + extraPerTrip/Math.max(distKm,3))*2)/2;

            const status: "good"|"ok"|"low" =
              commNow >= need*1.05 ? "good" : commNow >= need*0.85 ? "ok" : "low";

            return { r, vt, trips30, commPct, avgFare, commNow, need, gap, progress,
                     balPct, proPct, newBase, newKm, status };
          });

          const SC: Record<string,string> = { good:"#22c55e", ok:"#f59e0b", low:"#ef4444" };
          const SL: Record<string,string> = { good:"Profitable ✓", ok:"Break-even ≈", low:"Needs fix ↑" };

          return (
            <div className="mf" style={{marginBottom:"2rem"}}>

              {/* ── One card per vehicle ── */}
              {rows.map(s=>{
                const sc  = SC[s.status];
                const noData = s.trips30===0||s.avgFare===0;

                return (
                  <div key={s.r._id} style={{background:"#13151a",borderRadius:16,marginBottom:"0.75rem",overflow:"hidden",border:"1px solid #1e2128"}}>

                    {/* Top bar */}
                    <div style={{display:"flex",alignItems:"center",gap:12,padding:"0.9rem 1.25rem",borderBottom:"1px solid #1e2128"}}>
                      <span style={{fontSize:"1.4rem"}}>{VI[s.vt]??"🚗"}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:"0.95rem",textTransform:"capitalize" as const}}>{s.r.vehicleType}</div>
                        <div style={{fontSize:"0.7rem",color:"#6b7280",marginTop:1}}>
                          {noData ? "No trips yet" : s.trips30 + " trips/month · avg fare " + inr(Math.round(s.avgFare))}
                        </div>
                      </div>
                      {/* Progress ring-style indicator */}
                      <div style={{textAlign:"center" as const}}>
                        <div style={{fontSize:"1.6rem",fontWeight:800,fontFamily:"monospace",color:sc}}>{s.progress}%</div>
                        <div style={{fontSize:"0.62rem",color:"#6b7280"}}>of target</div>
                      </div>
                      <div style={{padding:"4px 14px",borderRadius:20,background:sc+"18",border:"1px solid "+sc+"44",fontWeight:700,fontSize:"0.75rem",color:sc,whiteSpace:"nowrap" as const}}>
                        {SL[s.status]}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{height:5,background:"#1e2128"}}>
                      <div style={{height:"100%",width:s.progress+"%",background:sc,transition:"width 0.8s ease"}}/>
                    </div>

                    {noData ? (
                      <div style={{padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",gap:16}}>
                        <div style={{flex:1,fontSize:"0.82rem",color:"#6b7280"}}>No completed trips yet for this vehicle.</div>
                        <div style={{display:"flex",gap:8}}>
                          <div style={{background:"#0e1015",borderRadius:10,padding:"10px 16px",textAlign:"center" as const}}>
                            <div style={{fontSize:"0.6rem",color:"#6b7280",marginBottom:4}}>START WITH</div>
                            <div style={{fontFamily:"monospace",fontWeight:800,color:"#f59e0b",fontSize:"1rem"}}>10–12%</div>
                            <div style={{fontSize:"0.6rem",color:"#6b7280"}}>commission</div>
                          </div>
                          <div style={{background:"#0e1015",borderRadius:10,padding:"10px 16px",textAlign:"center" as const}}>
                            <div style={{fontSize:"0.6rem",color:"#6b7280",marginBottom:4}}>BASE FARE</div>
                            <div style={{fontFamily:"monospace",fontWeight:800,color:"#f59e0b",fontSize:"1rem"}}>{inr(s.r.baseFare)}</div>
                            <div style={{fontSize:"0.6rem",color:"#6b7280"}}>keep current</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1px 1fr 1px 1fr",alignItems:"stretch"}}>

                        {/* NOW */}
                        <div style={{padding:"1rem 1.25rem"}}>
                          <div style={{fontSize:"0.62rem",color:"#6b7280",letterSpacing:"0.12em",textTransform:"uppercase" as const,marginBottom:10}}>Now</div>
                          <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                            {[
                              {l:"Commission",v:s.commPct+"%",   c:"#6366f1"},
                              {l:"Base fare",  v:inr(s.r.baseFare),c:"#f59e0b"},
                              {l:"Per km",     v:"₹"+s.r.perKm,  c:"#f59e0b"},
                              {l:"You earn/mo",v:inr(Math.round(s.commNow)),c:sc,big:true},
                              {l:"Need/mo",    v:inr(Math.round(s.need)),   c:"#6b7280"},
                            ].map(x=>(
                              <div key={x.l} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                                <span style={{fontSize:"0.72rem",color:"#6b7280"}}>{x.l}</span>
                                <span style={{fontFamily:"monospace",fontWeight:700,fontSize:x.big?"1rem":"0.82rem",color:x.c}}>{x.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{background:"#1e2128"}}/>

                        {/* BALANCED */}
                        <div style={{padding:"1rem 1.25rem",background:"rgba(245,158,11,0.03)"}}>
                          <div style={{fontSize:"0.62rem",color:"#f59e0b",letterSpacing:"0.12em",textTransform:"uppercase" as const,marginBottom:10}}>⚖ Break-even</div>
                          <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                            {/* Commission change */}
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span style={{fontSize:"0.72rem",color:"#6b7280"}}>Commission</span>
                              <div style={{display:"flex",alignItems:"center",gap:4}}>
                                <span style={{fontFamily:"monospace",fontSize:"0.75rem",color:"#4b5563",textDecoration:"line-through"}}>{s.commPct}%</span>
                                <span style={{color:"#6b7280",fontSize:"0.7rem"}}>→</span>
                                <span style={{fontFamily:"monospace",fontWeight:800,fontSize:"0.9rem",color:"#f59e0b"}}>{Math.round(s.balPct*10)/10}%</span>
                              </div>
                            </div>
                            {/* Delta badge */}
                            <div style={{background:s.balPct>s.commPct?"rgba(245,158,11,0.12)":"rgba(34,197,94,0.12)",border:"1px solid "+(s.balPct>s.commPct?"rgba(245,158,11,0.3)":"rgba(34,197,94,0.3)"),borderRadius:8,padding:"6px 10px",textAlign:"center" as const}}>
                              <span style={{fontFamily:"monospace",fontWeight:800,fontSize:"1.1rem",color:s.balPct>s.commPct?"#f59e0b":"#22c55e"}}>
                                {s.balPct>s.commPct?"+":""}{(s.balPct-s.commPct).toFixed(1)}%
                              </span>
                              <div style={{fontSize:"0.6rem",color:"#6b7280",marginTop:2}}>commission change</div>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                              <span style={{fontSize:"0.72rem",color:"#6b7280"}}>Est. you earn</span>
                              <span style={{fontFamily:"monospace",fontWeight:800,fontSize:"1rem",color:"#f59e0b"}}>{inr(Math.round(s.need))}</span>
                            </div>
                            <div style={{fontSize:"0.68rem",color:"#6b7280",lineHeight:1.5,marginTop:2}}>
                              {s.balPct>s.commPct
                                ? "Raise commission to cover your costs"
                                : "Commission is enough — grow trip volume"}
                            </div>
                          </div>
                        </div>

                        <div style={{background:"#1e2128"}}/>

                        {/* PROFIT */}
                        <div style={{padding:"1rem 1.25rem",background:"rgba(99,102,241,0.03)"}}>
                          <div style={{fontSize:"0.62rem",color:"#6366f1",letterSpacing:"0.12em",textTransform:"uppercase" as const,marginBottom:10}}>🚀 Profit</div>
                          <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>

                            {/* Option A — commission */}
                            <div style={{fontSize:"0.6rem",color:"#6b7280",letterSpacing:"0.1em",textTransform:"uppercase" as const}}>Option A · Commission</div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span style={{fontFamily:"monospace",fontSize:"0.75rem",color:"#4b5563",textDecoration:"line-through"}}>{s.commPct}%</span>
                              <span style={{color:"#6b7280",fontSize:"0.7rem"}}>→</span>
                              <span style={{fontFamily:"monospace",fontWeight:800,fontSize:"1rem",color:"#6366f1"}}>{Math.round(s.proPct*10)/10}%</span>
                            </div>

                            {/* Divider */}
                            <div style={{height:1,background:"#1e2128",margin:"2px 0"}}/>

                            {/* Option B — fare */}
                            <div style={{fontSize:"0.6rem",color:"#6b7280",letterSpacing:"0.1em",textTransform:"uppercase" as const}}>Option B · Raise fares</div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span style={{fontSize:"0.7rem",color:"#6b7280"}}>Base fare</span>
                              <div style={{display:"flex",alignItems:"center",gap:4}}>
                                <span style={{fontFamily:"monospace",fontSize:"0.72rem",color:"#4b5563",textDecoration:"line-through"}}>{inr(s.r.baseFare)}</span>
                                <span style={{color:"#6b7280",fontSize:"0.7rem"}}>→</span>
                                <span style={{fontFamily:"monospace",fontWeight:800,fontSize:"0.88rem",color:"#a78bfa"}}>{inr(s.newBase)}</span>
                              </div>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span style={{fontSize:"0.7rem",color:"#6b7280"}}>Per km</span>
                              <div style={{display:"flex",alignItems:"center",gap:4}}>
                                <span style={{fontFamily:"monospace",fontSize:"0.72rem",color:"#4b5563",textDecoration:"line-through"}}>{"₹"+s.r.perKm}</span>
                                <span style={{color:"#6b7280",fontSize:"0.7rem"}}>→</span>
                                <span style={{fontFamily:"monospace",fontWeight:800,fontSize:"0.88rem",color:"#a78bfa"}}>{"₹"+s.newKm}</span>
                              </div>
                            </div>

                            {/* Result */}
                            <div style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:8,padding:"6px 10px",textAlign:"center" as const,marginTop:2}}>
                              <div style={{fontFamily:"monospace",fontWeight:800,fontSize:"1rem",color:"#6366f1"}}>{inr(Math.round(s.need*1.2))}</div>
                              <div style={{fontSize:"0.6rem",color:"#6b7280",marginTop:1}}>est. monthly earnings</div>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── If I change one thing across all vehicles ── */}
              <div style={{background:"#13151a",border:"1px solid #1e2128",borderRadius:14,padding:"1.25rem 1.5rem",marginTop:"0.5rem"}}>
                <div style={{fontSize:"0.72rem",color:"#6b7280",letterSpacing:"0.12em",textTransform:"uppercase" as const,marginBottom:12}}>
                  ⚡ if i change just one thing — extra earnings per month
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"0.75rem"}}>
                  {[
                    {
                      icon:"⚙️", label:"+1% commission",
                      sub:"on all vehicles",
                      val: Math.round(rates.reduce((acc,r)=>{
                        const byV=stats.byV[r.vehicleType]??null;
                        const avg=byV&&byV.trips>0?byV.revenue/byV.trips:0;
                        const mo=byV?Math.round((byV.trips/periodDays)*30):0;
                        return acc+avg*0.01*mo;
                      },0)),
                      color:"#6366f1",
                    },
                    {
                      icon:"💰", label:"+₹10 base fare",
                      sub:"on all vehicles",
                      val: Math.round(rates.reduce((acc,r)=>{
                        const byV=stats.byV[r.vehicleType]??null;
                        const mo=byV?Math.round((byV.trips/periodDays)*30):0;
                        return acc+10*((r.platformFeePercent??10)/100)*mo;
                      },0)),
                      color:"#f59e0b",
                    },
                    {
                      icon:"📈", label:"+10 trips/day",
                      sub:"more completed rides",
                      val: Math.round(10*30*(stats.avgC>0?stats.avgC:20)),
                      color:"#22c55e",
                    },
                    {
                      icon:"🎁", label:"Remove incentives",
                      sub:"stop per-ride bonus",
                      val: Math.round(rates.reduce((acc,r)=>{
                        const byV=stats.byV[r.vehicleType]??null;
                        const mo=byV?Math.round((byV.trips/periodDays)*30):0;
                        return acc+(r.perRideIncentive??0)*mo;
                      },0)),
                      color:"#a78bfa",
                    },
                  ].map(c=>(
                    <div key={c.label} style={{background:"#0e1015",borderRadius:12,padding:"1rem",border:"1px solid #1e2128"}}>
                      <div style={{fontSize:"1.2rem",marginBottom:6}}>{c.icon}</div>
                      <div style={{fontFamily:"monospace",fontWeight:800,fontSize:"1.4rem",color:c.color}}>{inr(c.val)}</div>
                      <div style={{fontWeight:700,fontSize:"0.78rem",color:"#e8eaf0",marginTop:4}}>{c.label}</div>
                      <div style={{fontSize:"0.65rem",color:"#6b7280",marginTop:2}}>{c.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })()}

        {/* ══ S5: TOOL COSTS ═════════════════════════════ */}
        <Sec>🛠️ Monthly tool costs</Sec>
        <div className="mf" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:"0.75rem",marginBottom:"1.75rem"}}>
          {[
            {icon:"☁️",bg:"rgba(34,197,94,0.1)", name:"MongoDB Atlas",   desc:"M0 free → M10 paid",    cost:"FREE*",       free:true },
            {icon:"🚂",bg:"rgba(99,102,241,0.1)",name:"Railway/Render",  desc:"Backend server hosting", cost:"₹400–₹1,700",free:false},
            {icon:"💳",bg:"rgba(245,158,11,0.1)",name:"Razorpay UPI",    desc:"2% per transaction",    cost:"2% per txn",  free:false},
            {icon:"🗺️",bg:"rgba(59,130,246,0.1)",name:"Google Maps",     desc:"$200 free = ~40k calls", cost:"FREE*",       free:true },
            {icon:"🔔",bg:"rgba(239,68,68,0.1)", name:"Firebase FCM",    desc:"Push notifications",    cost:"FREE",        free:true },
            {icon:"📱",bg:"rgba(168,85,247,0.1)",name:"Play + App Store",desc:"$25 once / ₹8.3k/yr",   cost:"₹2k–₹8.3k", free:false},
          ].map(t=>(
            <div key={t.name} style={{...CARD,display:"flex",alignItems:"center",gap:12,padding:"0.9rem 1rem"}}>
              <div style={{width:36,height:36,borderRadius:10,background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",flexShrink:0}}>{t.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"0.8rem",fontWeight:700,color:"#e8eaf0"}}>{t.name}</div>
                <div style={{fontSize:"0.65rem",color:"#6b7280",marginTop:2}}>{t.desc}</div>
              </div>
              <div style={{fontFamily:"monospace",fontSize:"0.75rem",fontWeight:700,color:t.free?"#22c55e":"#ef4444",flexShrink:0}}>{t.cost}</div>
            </div>
          ))}
        </div>

        <div className="mf" style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:14,padding:"1rem 1.25rem",fontSize:"0.8rem",color:"#fca5a5",lineHeight:1.7}}>
          <strong style={{color:"#ef4444"}}>⚠️ Remember:</strong> Earnings shown are <strong>gross commission</strong> before server hosting, Razorpay fees, and driver incentive bonuses.
          Driver incentives are <strong>extra cost</strong> from your revenue. All numbers update live when you refresh or change fare rates.
        </div>

      </div>
    </div>
  );
}