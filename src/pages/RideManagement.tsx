import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  RefreshCw, UserCheck, XCircle, MapPin, Clock,
  TrendingUp, AlertTriangle, CheckCircle2, Navigation,
} from "lucide-react";
import { useTrips, useDrivers, useMutation } from "../hooks/index";
import type { Trip } from "../types/index";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError,
  SearchBar, Sel, Tabs, Timeline, InfoRow, SectionLabel,
  ConfirmDialog, C, Pagination, StatCard, LiveDot,
} from "../components/ui";
import { toast } from "react-toastify";

const PER = 20;
const VI: Record<string, string> = { bike:"🏍️", auto:"🛺", car:"🚗", premium:"🚙", xl:"🚐" };

const STATUS_TABS = [
  { value:"all",             label:"All"         },
  { value:"requested",       label:"Requested"   },
  { value:"driver_assigned", label:"Assigned"    },
  { value:"ride_started",    label:"En Route"    },
  { value:"completed",       label:"Completed"   },
  { value:"cancelled",       label:"Cancelled"   },
];
const TYPE_OPTS = [
  { value:"all",    label:"All Types"    },
  { value:"short",  label:"🏙️ City"     },
  { value:"long",   label:"🛣️ Outstation" },
  { value:"parcel", label:"📦 Parcel"    },
];

// ── Maps ──────────────────────────────────────────────────────────────────────
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY ?? "";
let _ms: "idle"|"loading"|"ready" = (window as any).google?.maps ? "ready" : "idle";
const _mq: Array<()=>void> = [];
function loadMaps(cb:()=>void) {
  if (!MAPS_KEY) return;
  if (_ms==="ready") { cb(); return; }
  _mq.push(cb);
  if (_ms==="loading") return;
  _ms="loading";
  const s=document.createElement("script");
  s.src=`https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=geometry,directions`;
  s.async=true;
  s.onload=()=>{ _ms="ready"; _mq.forEach(f=>f()); _mq.length=0; };
  document.head.appendChild(s);
}
const DARK_MAP=[
  {elementType:"geometry",stylers:[{color:"#0f1117"}]},
  {elementType:"labels.text.fill",stylers:[{color:"#525e7a"}]},
  {elementType:"labels.text.stroke",stylers:[{color:"#0f1117"}]},
  {featureType:"road",elementType:"geometry",stylers:[{color:"#1a1f2e"}]},
  {featureType:"road",elementType:"geometry.stroke",stylers:[{color:"#12151c"}]},
  {featureType:"road",elementType:"labels.text.fill",stylers:[{color:"#3a4560"}]},
  {featureType:"water",elementType:"geometry",stylers:[{color:"#060810"}]},
  {featureType:"poi",stylers:[{visibility:"off"}]},
  {featureType:"transit",stylers:[{visibility:"off"}]},
  {featureType:"administrative",elementType:"geometry",stylers:[{color:"#1a1f2e"}]},
];
function toLatLng(loc?:Trip["pickup"]):{lat:number;lng:number}|null {
  const c=loc?.coordinates;
  if (c?.length===2) return {lat:c[1],lng:c[0]};
  return null;
}
function RideMap({trip,height=260}:{trip:Trip;height?:number}) {
  const ref=useRef<HTMLDivElement>(null);
  const [rdy,setRdy]=useState(_ms==="ready");
  useEffect(()=>{ loadMaps(()=>setRdy(true)); },[]);
  useEffect(()=>{
    if (!rdy||!ref.current) return;
    const pickup=toLatLng(trip.pickup); const drop=toLatLng(trip.drop);
    if (!pickup) return;
    try {
      const G=(window as any).google.maps;
      const map=new G.Map(ref.current,{
        zoom:13,center:pickup,styles:DARK_MAP,
        disableDefaultUI:true,zoomControl:false,
      });
      const mkOpts=(color:string)=>({
        path:G.SymbolPath.CIRCLE,scale:8,
        fillColor:color,fillOpacity:1,
        strokeColor:"#fff",strokeWeight:2,
      });
      new G.Marker({position:pickup,map,title:"Pickup",icon:mkOpts(C.green)});
      if (drop) {
        new G.Marker({position:drop,map,title:"Drop",icon:mkOpts(C.red)});
        const ds=new G.DirectionsService();
        const dr=new G.DirectionsRenderer({map,suppressMarkers:true,
          polylineOptions:{strokeColor:C.primary,strokeOpacity:0.9,strokeWeight:4}});
        ds.route({origin:pickup,destination:drop,travelMode:G.TravelMode.DRIVING},
          (r:any,s:any)=>{
            if(s===G.DirectionsStatus.OK) dr.setDirections(r);
            else new G.Polyline({path:[pickup,drop],geodesic:true,strokeColor:C.primary,strokeWeight:3,map});
            const b=new G.LatLngBounds();b.extend(pickup);b.extend(drop);map.fitBounds(b,48);
          });
      }
    } catch(e){console.warn(e);}
  },[rdy,trip]);

  if (!MAPS_KEY) return (
    <div style={{
      height,background:C.surface2,border:"1px solid "+C.border,borderRadius:9,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,
    }}>
      <span style={{fontSize:"1.4rem"}}>🗺️</span>
      <span style={{color:C.muted,fontSize:"0.71rem",fontFamily:"'JetBrains Mono',monospace"}}>
        Set VITE_GOOGLE_MAPS_KEY to enable map
      </span>
      <div style={{fontSize:"0.69rem",color:C.muted,textAlign:"center",maxWidth:280,marginTop:2}}>
        📍 {trip.pickup?.address?.slice(0,50)}<br/>
        🏁 {trip.drop?.address?.slice(0,50)}
      </div>
    </div>
  );
  return <div ref={ref} style={{width:"100%",height,borderRadius:9,background:C.surface2}}/>;
}

// ── Quick stat chip ───────────────────────────────────────────────────────────
function MetricPill({icon, label, value, color}:{icon:React.ReactNode;label:string;value:string|number;color:string}) {
  return (
    <div style={{
      display:"flex",alignItems:"center",gap:7,
      padding:"5px 12px",
      background:color+"12",
      border:"1px solid "+color+"22",
      borderRadius:8,
    }}>
      <span style={{color,display:"flex",flexShrink:0}}>{icon}</span>
      <div>
        <div style={{fontSize:"0.58rem",color:color+"aa",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</div>
        <div style={{fontSize:"0.9rem",fontWeight:800,color,lineHeight:1,marginTop:1}}>{value}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RideManagement() {
  const { trips, loading, error, refetch } = useTrips();
  const { drivers }                        = useDrivers();
  const { mutate, loading: acting }        = useMutation();

  const [statusF, setStatusF] = useState("all");
  const [typeF,   setTypeF]   = useState("all");
  const [q,       setQ]       = useState("");
  const [page,    setPage]    = useState(1);
  const [sel,     setSel]     = useState<Trip|null>(null);
  const [assignOpen,setAO]    = useState(false);
  const [assignDrvr,setAD]    = useState("");
  const [cancelOpen,setCO]    = useState(false);

  // KPIs
  const active     = useMemo(()=>trips.filter(t=>["requested","driver_assigned","driver_at_pickup","ride_started"].includes(t.status)),[trips]);
  const todayTrips = useMemo(()=>trips.filter(t=>new Date(t.createdAt).toDateString()===new Date().toDateString()),[trips]);
  const revenue    = useMemo(()=>trips.filter(t=>t.status==="completed").reduce((s,t)=>s+(t.finalFare??t.fare??0),0),[trips]);
  const cancelPct  = useMemo(()=>trips.length>0?Math.round(trips.filter(t=>t.status==="cancelled").length/trips.length*100):0,[trips]);

  const statusTabs = STATUS_TABS.map(o=>({
    ...o, count: o.value==="all" ? trips.length : trips.filter(t=>t.status===o.value).length,
  }));

  const filtered = useMemo(()=>{
    let b=trips;
    if (statusF!=="all") b=b.filter(t=>t.status===statusF);
    if (typeF!=="all")   b=b.filter(t=>t.type===typeF);
    if (q) {
      const ql=q.toLowerCase();
      b=b.filter(t=>[t._id,t.customerId?.name,t.customerId?.phone,
        t.assignedDriver?.name,t.pickup?.address,t.drop?.address
      ].some(v=>v?.toLowerCase?.().includes(ql)));
    }
    return b.sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt));
  },[trips,statusF,typeF,q]);

  const pages=Math.ceil(filtered.length/PER);
  const paged=filtered.slice((page-1)*PER,page*PER);

  const doAssign=async()=>{
    if (!sel||!assignDrvr) return;
    const {ok}=await mutate("post","/admin/manual-assign",{tripId:sel._id,driverId:assignDrvr});
    if(ok){toast.success("Driver assigned");setAO(false);refetch();}
    else toast.error("Assignment failed");
  };
  const doCancel=async()=>{
    if (!sel) return;
    const {ok}=await mutate("put",`/admin/trip/${sel._id}/cancel`,{});
    if(ok){toast.success("Cancelled");setCO(false);setSel(null);refetch();}
    else toast.error("Cancel failed");
  };

  if (loading) return <Spinner label="Loading rides…"/>;
  if (error)   return <PageError message={error} onRetry={refetch}/>;

  const fare=(t:Trip)=>t.finalFare??t.fare??0;

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter',sans-serif"}}>

      {/* ── TOPBAR ─────────────────────────────────────────────────────────── */}
      <div style={{
        background:C.surface,
        borderBottom:"1px solid "+C.border,
        padding:"0 1.75rem",
        height:56,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:50,
        gap:12,
      }}>
        {/* Title */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:32,height:32,borderRadius:8,
            background:C.primaryDim,border:"1px solid "+C.primaryBrd,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",
          }}>🚘</div>
          <div>
            <div style={{fontWeight:700,fontSize:"0.92rem",color:C.text,letterSpacing:"-0.01em"}}>Ride Management</div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginTop:1}}>
              <LiveDot/>
              <span style={{fontSize:"0.67rem",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>
                {active.length} active · {trips.length} total
              </span>
            </div>
          </div>
        </div>

        {/* Right: metric pills + refresh */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",gap:6}}>
            <MetricPill icon={<CheckCircle2 size={13}/>} label="Today" value={todayTrips.length} color={C.primary}/>
            <MetricPill icon={<TrendingUp size={13}/>}   label="Revenue" value={"₹"+Math.round(revenue/1000)+"k"} color={C.green}/>
            <MetricPill icon={<AlertTriangle size={13}/>} label="Cancel" value={cancelPct+"%"} color={C.red}/>
          </div>
          <Btn variant="ghost" size="sm" icon={<RefreshCw size={13}/>} onClick={refetch}>Refresh</Btn>
        </div>
      </div>

      {/* ── PAGE BODY ──────────────────────────────────────────────────────── */}
      <div style={{padding:"1.5rem 1.75rem",maxWidth:1700}}>

        {/* KPI cards */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(148px,1fr))",
          gap:"0.75rem", marginBottom:"1.25rem",
        }}>
          <StatCard label="Total Rides"   value={trips.length}   icon="🚘" color={C.primary}/>
          <StatCard label="Active Now"    value={active.length}  icon="🟢" color={C.green}  sub="in progress"/>
          <StatCard label="Today Rides"   value={todayTrips.length} icon="📅" color={C.cyan}/>
          <StatCard label="Total Revenue" value={"₹"+Math.round(revenue/1000)+"k"} icon="💰" color={C.amber}/>
          <StatCard label="Cancel Rate"   value={cancelPct+"%"}  icon="❌" color={C.red}/>
        </div>

        {/* Filter bar */}
        <div style={{
          display:"flex", gap:10, flexWrap:"wrap",
          alignItems:"center", marginBottom:"1rem",
        }}>
          <Tabs tabs={statusTabs} active={statusF} onChange={s=>{setStatusF(s);setPage(1);}}/>
          <div style={{flex:1}}/>
          <SearchBar value={q} onChange={v=>{setQ(v);setPage(1);}} placeholder="Search trip, customer, driver, address…"/>
          <Sel value={typeF} options={TYPE_OPTS} onChange={v=>{setTypeF(v);setPage(1);}}/>
          <span style={{fontSize:"0.69rem",color:C.muted,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>
            {filtered.length} results
          </span>
        </div>

        {/* Table card */}
        <Card>
          <Table
            headers={["Trip ID","Vehicle","Customer","Driver","Route","Fare","Status","Time","Actions"]}
            isEmpty={paged.length===0} emptyMessage="No rides match your filters"
          >
            {paged.map(t=>(
              <TR key={t._id} onClick={()=>setSel(t)}>

                {/* Trip ID */}
                <TD mono muted>
                  <span style={{fontSize:"0.72rem",letterSpacing:"0.04em"}}>
                    #{t._id?.slice(-8).toUpperCase()}
                  </span>
                </TD>

                {/* Vehicle */}
                <TD>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:"1.05rem"}}>{VI[t.vehicleType?.toLowerCase()]??"🚗"}</span>
                    <div>
                      <div style={{fontSize:"0.78rem",fontWeight:600,textTransform:"capitalize"}}>{t.vehicleType}</div>
                      <div style={{fontSize:"0.65rem",color:C.muted}}>{t.type}</div>
                    </div>
                  </div>
                </TD>

                {/* Customer */}
                <TD>
                  <div style={{fontWeight:600,fontSize:"0.84rem"}}>{t.customerId?.name??"—"}</div>
                  <div style={{fontSize:"0.68rem",color:C.muted,fontFamily:"'JetBrains Mono',monospace",marginTop:1}}>
                    {t.customerId?.phone}
                  </div>
                </TD>

                {/* Driver */}
                <TD>
                  {t.assignedDriver
                    ? <>
                        <div style={{fontWeight:600,fontSize:"0.84rem"}}>{t.assignedDriver.name}</div>
                        <div style={{fontSize:"0.68rem",color:C.muted,fontFamily:"'JetBrains Mono',monospace",marginTop:1}}>
                          {t.assignedDriver.phone}
                        </div>
                      </>
                    : <span style={{
                        fontSize:"0.7rem",color:C.amber,
                        background:C.amberDim,borderRadius:4,
                        padding:"2px 7px",fontFamily:"'JetBrains Mono',monospace",
                      }}>unassigned</span>}
                </TD>

                {/* Route */}
                <TD style={{maxWidth:185}}>
                  <div style={{display:"flex",flexDirection:"column",gap:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:C.green,flexShrink:0}}/>
                      <span style={{fontSize:"0.71rem",color:C.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {t.pickup?.address??"—"}
                      </span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:C.red,flexShrink:0}}/>
                      <span style={{fontSize:"0.71rem",color:C.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {t.drop?.address??"—"}
                      </span>
                    </div>
                  </div>
                </TD>

                {/* Fare */}
                <TD>
                  <div style={{fontWeight:700,fontSize:"0.88rem",color:C.amber,fontFamily:"'JetBrains Mono',monospace"}}>
                    ₹{Math.round(fare(t))}
                  </div>
                  <div style={{
                    fontSize:"0.63rem",marginTop:2,fontFamily:"'JetBrains Mono',monospace",
                    color:t.payment?.collected ? C.green : C.muted,
                  }}>
                    {t.payment?.collected ? "● paid" : "○ pending"}
                  </div>
                </TD>

                {/* Status */}
                <TD><Badge status={t.status}/></TD>

                {/* Time */}
                <TD mono muted style={{fontSize:"0.69rem",whiteSpace:"nowrap"}}>
                  {new Date(t.createdAt).toLocaleString("en-IN",{
                    day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:true,
                  })}
                </TD>

                {/* Actions */}
                <TD>
                  <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                    {t.status==="requested" && (
                      <Btn size="xs" variant="success" icon={<UserCheck size={11}/>}
                        onClick={()=>{setSel(t);setAO(true);}}>
                        Assign
                      </Btn>
                    )}
                    {["requested","driver_assigned","ride_started"].includes(t.status) && (
                      <Btn size="xs" variant="danger" icon={<XCircle size={11}/>}
                        onClick={()=>{setSel(t);setCO(true);}}>
                        Cancel
                      </Btn>
                    )}
                    <Btn size="xs" variant="ghost" onClick={()=>setSel(t)}>View</Btn>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
          <Pagination page={page} pages={pages} total={filtered.length} perPage={PER} onChange={setPage}/>
        </Card>
      </div>

      {/* ── TRIP DETAIL MODAL ──────────────────────────────────────────────── */}
      <Modal
        open={!!sel&&!assignOpen&&!cancelOpen}
        onClose={()=>setSel(null)}
        title={"Trip · #"+(sel?._id?.slice(-8).toUpperCase()??"")}
        width={580}
      >
        {sel && (
          <div style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>

            {/* Map */}
            <RideMap trip={sel} height={230}/>

            {/* Status row */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <Badge status={sel.status}/>
                <span style={{fontSize:"0.72rem",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>
                  {VI[sel.vehicleType?.toLowerCase()]??"🚗"} {sel.vehicleType} · {sel.type}
                </span>
              </div>
              <div style={{display:"flex",gap:6}}>
                {sel.status==="requested" && (
                  <Btn size="sm" variant="success" icon={<UserCheck size={12}/>} onClick={()=>setAO(true)}>
                    Assign Driver
                  </Btn>
                )}
                {["requested","driver_assigned","ride_started"].includes(sel.status) && (
                  <Btn size="sm" variant="danger" icon={<XCircle size={12}/>} onClick={()=>setCO(true)}>
                    Cancel
                  </Btn>
                )}
              </div>
            </div>

            {/* Metric mini row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.5rem"}}>
              {[
                {l:"Fare",    v:"₹"+fare(sel).toFixed(2),              c:C.amber},
                {l:"Payment", v:sel.payment?.collected?"✅ Paid":"⏳ Pending", c:sel.payment?.collected?C.green:C.amber},
                {l:"OTP",     v:sel.otp??"—",                          c:C.cyan},
              ].map(x=>(
                <div key={x.l} style={{
                  background:C.surface2,borderRadius:7,padding:"0.55rem",
                  textAlign:"center",border:"1px solid "+C.border,
                }}>
                  <div style={{fontSize:"0.57rem",color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:"'JetBrains Mono',monospace",marginBottom:3}}>{x.l}</div>
                  <div style={{fontWeight:700,color:x.c,fontSize:"0.82rem",fontFamily:"'JetBrains Mono',monospace"}}>{x.v}</div>
                </div>
              ))}
            </div>

            {/* Info rows */}
            <div style={{background:C.surface2,borderRadius:8,overflow:"hidden",border:"1px solid "+C.border}}>
              <InfoRow label="Customer" value={(sel.customerId?.name??"—")+(sel.customerId?.phone?" · "+sel.customerId.phone:"")}/>
              <InfoRow label="Driver"   value={sel.assignedDriver?sel.assignedDriver.name+" · "+sel.assignedDriver.phone:"Not assigned"}/>
              <InfoRow label="Pickup"   value={sel.pickup?.address??"—"}/>
              <InfoRow label="Drop"     value={sel.drop?.address??"—"}/>
              <InfoRow label="Created"  value={new Date(sel.createdAt).toLocaleString("en-IN")}/>
              {sel.completedAt && <InfoRow label="Completed" value={new Date(sel.completedAt).toLocaleString("en-IN")}/>}
              {sel.cancellationReason && <InfoRow label="Reason" value={sel.cancellationReason} color={C.red}/>}
            </div>

            {/* Timeline */}
            <div style={{background:C.surface2,borderRadius:8,padding:"0.875rem",border:"1px solid "+C.border}}>
              <SectionLabel>Timeline</SectionLabel>
              <Timeline events={[
                {label:"Requested",    time:sel.createdAt,     done:true,                       color:C.muted  },
                {label:"Accepted",     time:sel.acceptedAt,    done:!!sel.acceptedAt,           color:C.cyan   },
                {label:"Ride Started", time:sel.rideStartTime, done:!!sel.rideStartTime,        color:C.primary},
                {label:"Completed",    time:sel.completedAt,   done:sel.status==="completed",   color:C.green  },
                {label:"Cancelled",    time:sel.cancelledAt,   done:sel.status==="cancelled",   color:C.red    },
              ]}/>
            </div>

          </div>
        )}
      </Modal>

      {/* ── ASSIGN DRIVER ─────────────────────────────────────────────────── */}
      <Modal open={assignOpen} onClose={()=>setAO(false)} title="Assign Driver" width={420}>
        <div style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>
          <div style={{
            background:C.amberDim,border:"1px solid "+C.amber+"28",
            borderRadius:7,padding:"8px 12px",
            fontSize:"0.78rem",color:C.amber,
          }}>
            Trip #{sel?._id?.slice(-8).toUpperCase()} · {sel?.pickup?.address?.slice(0,45)}
          </div>
          <Sel
            label="Online Driver"
            value={assignDrvr}
            onChange={setAD}
            options={[
              {value:"",label:"Select a driver…"},
              ...drivers.filter(d=>d.isOnline&&!d.isBlocked)
                .map(d=>({value:d._id,label:d.name+" · "+(d.vehicleType??"")+" · "+d.phone})),
            ]}
            style={{width:"100%"}}
          />
          {drivers.filter(d=>d.isOnline&&!d.isBlocked).length===0 && (
            <p style={{fontSize:"0.77rem",color:C.muted,textAlign:"center"}}>No online drivers available</p>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn variant="ghost" onClick={()=>setAO(false)}>Cancel</Btn>
            <Btn variant="success" onClick={doAssign} disabled={!assignDrvr} loading={acting}>
              Assign Driver
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── CANCEL CONFIRM ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={cancelOpen} onClose={()=>setCO(false)} onConfirm={doCancel}
        title="Cancel Trip"
        message={`Cancel trip #${sel?._id?.slice(-8).toUpperCase()}? The customer will be notified. This action cannot be undone.`}
        confirmLabel="Yes, Cancel Trip" danger loading={acting}
      />
    </div>
  );
}