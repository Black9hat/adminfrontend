
import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
interface Coord       { lat: number; lng: number; }
interface Exclusion   { _id: string; name: string; polygon: Coord[]; }
interface Zone {
  _id: string;
  name: string;
  type: 'city' | 'cluster' | 'area';
  parentId?: string | null;
  polygon: Coord[];
  exclusionZones: Exclusion[];
  serviceEnabled: boolean;
  surgeMultiplier: number;
  osmId?: string;
  createdAt: string;
}

type Mode =
  | { tag: 'idle' }
  | { tag: 'generating'; place: string }
  | { tag: 'draw_new' }
  | { tag: 'confirm_new' }
  | { tag: 'editing'; zone: Zone }
  | { tag: 'draw_exclusion'; zone: Zone }
  | { tag: 'confirm_exclusion'; zone: Zone }
  | { tag: 'detail'; zone: Zone };

/* ═══════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════ */
const API_BASE = (() => {
  const raw = (import.meta as any).env?.VITE_API_URL ?? '';
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '') || 'https://your-api.com';
})();

const hdrs = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('adminToken') ?? ''}`,
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

const CITY_CENTERS: Record<string, [number, number]> = {
  Hyderabad: [17.385, 78.487], Bangalore: [12.972, 77.595],
  Mumbai:    [19.076, 72.878], Delhi:     [28.614, 77.209],
  Chennai:   [13.083, 80.271], Pune:      [18.520, 73.857],
  Kolkata:   [22.573, 88.364], Ahmedabad: [23.022, 72.572],
};

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════ */
const T = {
  // Palette — deep navy ops theme
  bg0:    '#070d1a',   // deepest bg
  bg1:    '#0d1525',   // main bg
  bg2:    '#111e33',   // panel bg
  bg3:    '#172240',   // elevated
  line:   '#1e2f4a',   // borders
  line2:  '#243654',   // stronger borders
  // Accents
  teal:   '#00d4aa',
  tealD:  '#00a884',
  amber:  '#f5a623',
  red:    '#ff4757',
  blue:   '#4a9eff',
  purple: '#a78bfa',
  // Text
  t1:     '#e8f0fe',   // primary
  t2:     '#8fa8d4',   // secondary
  t3:     '#4a6080',   // muted
  // Status
  live:   '#00d4aa',
  off:    '#ff4757',
  city:   '#4a9eff',
  cluster:'#a78bfa',
  area:   '#f5a623',
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const km2 = (pts: Coord[]) => {
  if (pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].lng * pts[j].lat - pts[j].lng * pts[i].lat;
  }
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  return Math.abs(a / 2) * 111.32 * 111.32 * Math.cos((lat * Math.PI) / 180);
};

const typeColor = (t: Zone['type']) =>
  t === 'city' ? T.city : t === 'cluster' ? T.cluster : T.area;

const typeIcon = (t: Zone['type']) =>
  t === 'city' ? '🏙️' : t === 'cluster' ? '📍' : '📌';

/* ═══════════════════════════════════════════════════════════
   ATOM COMPONENTS
═══════════════════════════════════════════════════════════ */

const Spin = ({ size = 14, color = T.teal }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    style={{ animation: 'sam-spin .6s linear infinite', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity=".2" />
    <path d="M4 12a8 8 0 018-8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  v?: 'fill' | 'tonal' | 'ghost' | 'danger' | 'warn';
  accent?: string;
  full?: boolean;
  sm?: boolean;
}
const Button: React.FC<ButtonProps> = ({
  v = 'ghost', accent = T.teal, full, sm, children, style, ...rest
}) => {
  const variants: Record<string, React.CSSProperties> = {
    fill:   { background: accent, color: '#000', fontWeight: 800, boxShadow: `0 0 20px ${accent}40` },
    tonal:  { background: accent + '18', color: accent, border: `1px solid ${accent}30` },
    ghost:  { background: T.bg3, color: T.t2, border: `1px solid ${T.line2}` },
    danger: { background: T.red + '15', color: T.red, border: `1px solid ${T.red}30` },
    warn:   { background: T.amber + '15', color: T.amber, border: `1px solid ${T.amber}25` },
  };
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 6, border: 'none', borderRadius: 8, cursor: 'pointer',
      fontFamily: 'inherit', fontWeight: 700, transition: 'opacity .15s, transform .1s',
      padding: sm ? '5px 10px' : '9px 14px',
      fontSize: sm ? 11 : 12,
      width: full ? '100%' : undefined,
      ...variants[v], ...style,
    }} {...rest}>
      {children}
    </button>
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ style, ...rest }) => (
  <input style={{
    width: '100%', padding: '9px 12px', fontSize: 13, color: T.t1,
    background: T.bg1, border: `1.5px solid ${T.line2}`, borderRadius: 8,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    ...style,
  }} {...rest} />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ style, children, ...rest }) => (
  <select style={{
    width: '100%', padding: '9px 12px', fontSize: 13, color: T.t1,
    background: T.bg1, border: `1.5px solid ${T.line2}`, borderRadius: 8,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    appearance: 'none', ...style,
  }} {...rest}>
    {children}
  </select>
);

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontWeight: 800, color: T.t3, textTransform: 'uppercase',
    letterSpacing: '.1em', marginBottom: 6 }}>
    {children}
  </div>
);

const Chip = ({ label, color, icon }: { label: string; color: string; icon?: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
    borderRadius: 20, fontSize: 10, fontWeight: 700,
    background: color + '18', color, border: `1px solid ${color}28` }}>
    {icon}{label}
  </span>
);

const HR = () => <div style={{ height: 1, background: T.line, margin: '12px 0' }} />;

/* Toast */
interface ToastMsg { text: string; ok: boolean; }
const Toast = ({ msg, clear }: { msg: ToastMsg; clear: () => void }) => {
  useEffect(() => { const t = setTimeout(clear, 4000); return () => clearTimeout(t); }, [clear]);
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 18px', borderRadius: 10, whiteSpace: 'nowrap',
      background: msg.ok ? '#001a12' : '#1a0006',
      border: `1px solid ${msg.ok ? T.teal : T.red}50`,
      color: msg.ok ? T.teal : T.red,
      fontSize: 13, fontWeight: 600,
      boxShadow: `0 8px 32px ${msg.ok ? T.teal : T.red}20`,
      backdropFilter: 'blur(12px)',
    }}>
      <span style={{ fontSize: 15 }}>{msg.ok ? '✓' : '⚠'}</span>
      {msg.text}
      <button onClick={clear} style={{ all: 'unset', cursor: 'pointer', opacity: .4, marginLeft: 4, fontSize: 16 }}>✕</button>
    </div>
  );
};

/* Progress bar */
const ProgressBar = ({ label, sub }: { label: string; sub: string }) => (
  <div style={{ padding: '12px 14px', borderRadius: 10, background: T.teal + '0c',
    border: `1px solid ${T.teal}20`, marginBottom: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
      <Spin size={16} />
      <span style={{ fontSize: 13, fontWeight: 700, color: T.teal }}>{label}</span>
    </div>
    <div style={{ height: 3, background: T.line, borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', background: `linear-gradient(90deg,${T.teal},${T.blue})`,
        borderRadius: 2, animation: 'sam-progress 1.4s ease-in-out infinite alternate',
        width: '60%' }} />
    </div>
    <div style={{ fontSize: 11, color: T.t3, marginTop: 6 }}>{sub}</div>
  </div>
);

/* Section header */
const SectionHead = ({ icon, title, count }: { icon: string; title: string; count?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
    <span style={{ fontSize: 13 }}>{icon}</span>
    <span style={{ fontSize: 11, fontWeight: 800, color: T.t2, textTransform: 'uppercase', letterSpacing: '.07em' }}>{title}</span>
    {count != null && (
      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: T.t3,
        padding: '1px 7px', borderRadius: 20, background: T.bg0 }}>
        {count}
      </span>
    )}
  </div>
);

/* Zone row in sidebar list */
const ZoneRow = ({ zone, active, onClick }: { zone: Zone; active: boolean; onClick: () => void }) => (
  <div onClick={onClick} style={{
    padding: '9px 14px', cursor: 'pointer', transition: 'background .1s',
    background: active ? T.bg3 : 'transparent',
    borderLeft: `3px solid ${zone.serviceEnabled ? typeColor(zone.type) : T.red}`,
    borderBottom: `1px solid ${T.line}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11 }}>{typeIcon(zone.type)}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{zone.name}</span>
      </div>
      <span style={{ fontSize: 9, fontWeight: 800, color: zone.serviceEnabled ? T.live : T.off,
        letterSpacing: '.06em' }}>
        {zone.serviceEnabled ? 'LIVE' : 'OFF'}
      </span>
    </div>
    <div style={{ fontSize: 11, color: T.t3, marginTop: 2, paddingLeft: 17 }}>
      {zone.polygon?.length ?? 0} pts
      {zone.exclusionZones?.length ? ` · 🚫 ${zone.exclusionZones.length}` : ''}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */

// Inject global styles once
const _style = typeof document !== 'undefined' && (() => {
  if (document.getElementById('sam-styles')) return;
  const s = document.createElement('style');
  s.id = 'sam-styles';
  s.textContent = `
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    .leaflet-tooltip { background: rgba(7,13,26,.9) !important; border: 1px solid rgba(255,255,255,.15) !important;
      color: #e8f0fe !important; font-family: 'DM Sans',system-ui !important;
      font-size: 10px !important; font-weight: 800 !important; padding: 2px 7px !important;
      border-radius: 5px !important; box-shadow: 0 2px 8px rgba(0,0,0,.5) !important; }
    .leaflet-tooltip::before { display: none !important; }
    /* Hide leaflet-draw toolbar during custom drawing (we replaced it) */
    .leaflet-draw-toolbar { display: none !important; }
  `;
  document.head.appendChild(s);
})();

export default function ServiceAreaManagement() {
  /* ── data ── */
  const [zones,   setZones]   = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── ui state ── */
  const [mode,    setMode_]   = useState<Mode>({ tag: 'idle' });
  const [toast,   setToast]   = useState<ToastMsg | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [tab,     setTab]     = useState<'zones' | 'generate'>('generate');

  /* ── generate form ── */
  const [genInput,   setGenInput]   = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genResult,  setGenResult]  = useState<{ city: Zone; clusters: Zone[] } | null>(null);

  /* ── zone form ── */
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<Zone['type']>('cluster');
  const [exLabel, setExLabel] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  /* ── filter ── */
  const [filter, setFilter] = useState<'all' | 'city' | 'cluster' | 'area'>('all');

  /* ── map refs ── */
  const mapDiv    = useRef<HTMLDivElement>(null);
  const mapInst   = useRef<any>(null);
  const Lref      = useRef<any>(null);
  const drawFG    = useRef<any>(null);
  const drawCtrl  = useRef<any>(null);
  const drawnPts  = useRef<Coord[]>([]);
  const editingLayer = useRef<any>(null);

  // zoneId → leaflet polygon layer
  const zoneLayers = useRef<Map<string, any>>(new Map());
  const exLayers   = useRef<Map<string, any>>(new Map());

  // ── Custom point-by-point draw system ──
  const customMarkers  = useRef<any[]>([]);
  const customPolyLine = useRef<any>(null);
  const customPolygon  = useRef<any>(null);
  const [livePointCount, setLivePointCount] = useState(0);

  // always-fresh mode ref for leaflet callbacks
  const modeRef = useRef<Mode>({ tag: 'idle' });
  const setMode = useCallback((m: Mode) => { modeRef.current = m; setMode_(m); }, []);

  const notify = useCallback((text: string, ok = true) => setToast({ text, ok }), []);

  /* ───────────────────── DATA ───────────────────── */
  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/api/zones`, hdrs());
      const data: Zone[] = (r.data.data ?? []).map((z: any) => ({
        ...z, exclusionZones: z.exclusionZones ?? [],
      }));
      setZones(data);
      // refresh active zone in mode
      setMode_(prev => {
        if (prev.tag === 'detail' || prev.tag === 'editing' ||
          prev.tag === 'draw_exclusion' || prev.tag === 'confirm_exclusion') {
          const fresh = data.find(z => z._id === (prev as any).zone._id);
          if (!fresh) return { tag: 'idle' };
          return { ...prev, zone: fresh };
        }
        return prev;
      });
    } catch { notify('Failed to load zones', false); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { loadZones(); }, [loadZones]);

  /* ───────────────────── CRUD ───────────────────── */
  const saveNewZone = async () => {
    if (!newName.trim()) return notify('Enter a zone name', false);
    if (!drawnPts.current.length) return notify('Draw the boundary first', false);
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/api/zones/create`, {
        name: newName.trim(), type: newType,
        polygon: drawnPts.current,
        exclusionZones: [], serviceEnabled: true,
        surgeMultiplier: 1, driverIncentive: 0,
        vehicleTypes: ['Bike','Auto','Car','Premium Car','XL'],
      }, hdrs());
      notify(`Zone "${newName}" saved`);
      setNewName(''); setNewType('cluster');
      clearDraw();
      setMode({ tag: 'idle' });
      await loadZones();
    } catch (e: any) {
      notify(e.response?.data?.message ?? 'Save failed', false);
    } finally { setSaving(false); }
  };

  const saveEditedZone = async (zone: Zone) => {
    // Always harvest the very latest coords from the live layer
    const lyr = editingLayer.current;
    if (lyr) {
      const latlngs = lyr.getLatLngs();
      const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      drawnPts.current = ring.map((p: any) => ({
        lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6),
      }));
    }
    if (!drawnPts.current.length) return notify('No polygon data — drag the handles first', false);
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/api/zones/${zone._id}`,
        { polygon: drawnPts.current }, hdrs());
      notify(`"${zone.name}" boundary saved ✓`);
      clearDraw();
      setMode({ tag: 'detail', zone });
      await loadZones();
    } catch { notify('Save failed', false); }
    finally { setSaving(false); }
  };

  const saveExclusionDraw = async (zone: Zone) => {
    // Harvest latest coords from the live editable layer (same pattern as saveEditedZone)
    const lyr = editingLayer.current;
    if (lyr) {
      const latlngs = lyr.getLatLngs();
      const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      drawnPts.current = ring.map((p: any) => ({
        lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6),
      }));
    }
    if (!drawnPts.current.length) return notify('No cut-out shape found', false);
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/api/zones/${zone._id}/exclusion`, {
        name: exLabel.trim() || 'Excluded Area',
        polygon: drawnPts.current,
      }, hdrs());
      notify('Cut-out saved ✓');
      setExLabel('');
      clearDraw();
      setMode({ tag: 'detail', zone });
      await loadZones();
    } catch (e: any) {
      notify(e.response?.data?.message ?? 'Failed to save cut-out', false);
    } finally { setSaving(false); }
  };

  const saveExclusion = async (zone: Zone) => {
    if (!drawnPts.current.length) return notify('No area drawn', false);
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/api/zones/${zone._id}/exclusion`, {
        name: exLabel.trim() || 'Excluded Area',
        polygon: drawnPts.current,
      }, hdrs());
      notify('Cut-out saved');
      setExLabel('');
      clearDraw();
      setMode({ tag: 'idle' });
      await loadZones();
    } catch (e: any) {
      notify(e.response?.data?.message ?? 'Failed', false);
    } finally { setSaving(false); }
  };

  const toggleZone = async (zone: Zone) => {
    try {
      await axios.put(`${API_BASE}/api/zones/${zone._id}`,
        { serviceEnabled: !zone.serviceEnabled }, hdrs());
      notify(`"${zone.name}" ${!zone.serviceEnabled ? 'enabled' : 'disabled'}`);
      await loadZones();
    } catch { notify('Failed', false); }
  };

  const renameZone = async (zone: Zone) => {
    if (!renameVal.trim()) return;
    try {
      await axios.put(`${API_BASE}/api/zones/${zone._id}`, { name: renameVal.trim() }, hdrs());
      notify('Renamed');
      setRenaming(null);
      await loadZones();
    } catch { notify('Failed', false); }
  };

  const deleteZone = async (zone: Zone) => {
    if (!window.confirm(`Delete "${zone.name}"? All child zones will also be removed.`)) return;
    try {
      await axios.delete(`${API_BASE}/api/zones/${zone._id}`, hdrs());
      notify(`"${zone.name}" deleted`);
      setMode({ tag: 'idle' });
      await loadZones();
    } catch { notify('Failed', false); }
  };

  const removeExclusion = async (zone: Zone, exId: string) => {
    try {
      await axios.delete(`${API_BASE}/api/zones/${zone._id}/exclusion/${exId}`, hdrs());
      notify('Area restored');
      await loadZones();
    } catch { notify('Failed', false); }
  };

  /* ───────────────────── AUTO-GENERATE ───────────────────── */
  const generateClusters = async () => {
    if (!genInput.trim()) return notify('Enter a city or state name', false);
    setGenLoading(true);
    setGenResult(null);
    try {
      const r = await axios.post(`${API_BASE}/api/zones/auto-generate`,
        { placeName: genInput.trim() }, hdrs());
      setGenResult(r.data);
      notify(`Generated ${r.data.clusters?.length ?? 0} clusters for ${genInput}`);
      await loadZones();
      // Fly to the city on the map
      if (r.data.city?.polygon?.length) {
        const pts = r.data.city.polygon as Coord[];
        const avgLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
        const avgLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
        mapInst.current?.flyTo([avgLat, avgLng], 11, { duration: 1.5 });
      }
    } catch (e: any) {
      notify(e.response?.data?.message ?? 'Generation failed', false);
    } finally { setGenLoading(false); }
  };

  /* ───────────────────── MAP INIT ───────────────────── */
  useEffect(() => {
    if (mapInst.current || !mapDiv.current) return;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet-draw');
      Lref.current = L;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapDiv.current!, { zoomControl: true }).setView([17.385, 78.487], 11);
      mapInst.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19,
      }).addTo(map);

      // FeatureGroup used for both draw_new starter polygon and edit mode
      const fg = new (L as any).FeatureGroup();
      map.addLayer(fg);
      drawFG.current = fg;

      // CREATED fires only when cut-out polygon is finished (draw_exclusion uses click-tool)
      map.on((L as any).Draw.Event.CREATED, (e: any) => {
        fg.clearLayers();
        fg.addLayer(e.layer);
        drawnPts.current = e.layer.getLatLngs()[0]
          .map((p: any) => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }));
        if (drawCtrl.current) { map.removeControl(drawCtrl.current); drawCtrl.current = null; }
        const cur = modeRef.current;
        if (cur.tag === 'draw_exclusion') setMode({ tag: 'confirm_exclusion', zone: cur.zone });
      });

      // EDITED fires after vertex drag — syncs drawnPts for both editing and draw_new
      map.on((L as any).Draw.Event.EDITED, () => {
        const lyr = editingLayer.current;
        if (!lyr) return;
        const latlngs = lyr.getLatLngs();
        const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
        drawnPts.current = ring.map((p: any) => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }));
      });

      setMapReady(true);
    })();
  }, [setMode]);

  /* ── refreshLivePolygon: redraws preview from current vertex markers ── */
  const refreshLivePolygon = useCallback(() => {
    const map = mapInst.current;
    const L   = Lref.current;
    if (!map || !L) return;
    const color = modeRef.current.tag === 'draw_exclusion' ? '#ff4757' : '#00d4aa';
    const pts   = customMarkers.current.map((m: any) => m.getLatLng());

    if (customPolyLine.current) { try { map.removeLayer(customPolyLine.current); } catch {} customPolyLine.current = null; }
    if (customPolygon.current)  { try { map.removeLayer(customPolygon.current);  } catch {} customPolygon.current  = null; }
    if (pts.length < 2) return;

    if (pts.length === 2) {
      customPolyLine.current = L.polyline(pts, { color, weight: 2.5, dashArray: '6 4', opacity: 0.9 }).addTo(map);
    } else {
      customPolygon.current = L.polygon(pts, { color, fillColor: color, fillOpacity: 0.18, weight: 2.5, dashArray: '5 4' }).addTo(map);
      customMarkers.current.forEach((m: any) => { try { m.bringToFront(); } catch {} });
    }
  }, []);

  /* ── startCustomDraw: activates click-to-place vertex system ── */
  const startCustomDraw = useCallback((color: string) => {
    const map = mapInst.current;
    const L   = Lref.current;
    if (!map || !L) return;
    map.getContainer().style.cursor = 'crosshair';

    const onMapClick = (e: any) => {
      const cur = modeRef.current;
      if (cur.tag !== 'draw_new' && cur.tag !== 'draw_exclusion') return;

      const marker = L.circleMarker([e.latlng.lat, e.latlng.lng], {
        radius: 7, color: '#ffffff', fillColor: color,
        fillOpacity: 1, weight: 2.5,
        interactive: true, bubblingMouseEvents: false,
      }).addTo(map);

      // Drag: mousedown → mousemove on map → mouseup
      marker.on('mousedown', (me: any) => {
        map.dragging.disable();
        me.originalEvent?.stopPropagation();
        const onMove = (mv: any) => {
          marker.setLatLng(map.mouseEventToLatLng(mv.originalEvent ?? mv));
          refreshLivePolygon();
        };
        const onUp = () => {
          map.dragging.enable();
          map.off('mousemove', onMove);
          map.off('mouseup', onUp);
          refreshLivePolygon();
        };
        map.on('mousemove', onMove);
        map.on('mouseup', onUp);
      });

      // Right-click = delete this vertex
      marker.on('contextmenu', (ce: any) => {
        ce.originalEvent?.preventDefault();
        ce.originalEvent?.stopPropagation();
        const idx = customMarkers.current.indexOf(marker);
        if (idx !== -1) {
          map.removeLayer(marker);
          customMarkers.current.splice(idx, 1);
          customMarkers.current.forEach((m: any, i: number) => { try { m.setTooltipContent(String(i + 1)); } catch {} });
          refreshLivePolygon();
          setLivePointCount(customMarkers.current.length);
        }
      });

      marker.bindTooltip(String(customMarkers.current.length + 1), {
        permanent: true, direction: 'top', offset: [0, -10],
      });

      customMarkers.current.push(marker);
      refreshLivePolygon();
      setLivePointCount(customMarkers.current.length);
    };

    (map as any)._samClickHandler = onMapClick;
    map.on('click', onMapClick);
  }, [refreshLivePolygon]);

  /* ── stopCustomDraw: remove all custom layers + click handler ── */
  const stopCustomDraw = useCallback(() => {
    const map = mapInst.current;
    if (!map) return;
    if ((map as any)._samClickHandler) {
      map.off('click', (map as any)._samClickHandler);
      (map as any)._samClickHandler = null;
    }
    map.getContainer().style.cursor = '';
    customMarkers.current.forEach((m: any) => { try { map.removeLayer(m); } catch {} });
    customMarkers.current = [];
    if (customPolyLine.current) { try { map.removeLayer(customPolyLine.current); } catch {} customPolyLine.current = null; }
    if (customPolygon.current)  { try { map.removeLayer(customPolygon.current);  } catch {} customPolygon.current  = null; }
    setLivePointCount(0);
  }, []);

  /* ── finishCustomDraw: collect coords and advance state ── */
  const finishCustomDraw = useCallback(() => {
    if (customMarkers.current.length < 3) { alert('Place at least 3 points first.'); return; }
    drawnPts.current = customMarkers.current.map((m: any) => {
      const ll = m.getLatLng();
      return { lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) };
    });
    const cur = modeRef.current;
    if      (cur.tag === 'draw_new')       setMode({ tag: 'confirm_new' });
    else if (cur.tag === 'draw_exclusion') setMode({ tag: 'confirm_exclusion', zone: cur.zone });
  }, [setMode]);

  /* ── undoLastPoint ── */
  const undoLastPoint = useCallback(() => {
    const map = mapInst.current;
    const last = customMarkers.current.pop();
    if (last && map) { try { map.removeLayer(last); } catch {} }
    customMarkers.current.forEach((m: any, i: number) => { try { m.setTooltipContent(String(i + 1)); } catch {} });
    refreshLivePolygon();
    setLivePointCount(customMarkers.current.length);
  }, [refreshLivePolygon]);



  /* ───────────────────── RENDER ZONES ───────────────────── */
  useEffect(() => {
    const map = mapInst.current;
    const L   = Lref.current;
    if (!map || !L || !mapReady) return;

    zoneLayers.current.forEach(l => { try { map.removeLayer(l); } catch {} });
    exLayers.current.forEach(l =>   { try { map.removeLayer(l); } catch {} });
    zoneLayers.current.clear();
    exLayers.current.clear();

    const activeId =
      (mode.tag === 'detail' || mode.tag === 'editing' ||
       mode.tag === 'draw_exclusion' || mode.tag === 'confirm_exclusion')
        ? (mode as any).zone._id : null;

    // The zone currently loaded into drawFG for editing — don't render it again
    const editingId = mode.tag === 'editing' ? (mode as any).zone._id : null;

    zones.forEach(zone => {
      if (!zone.polygon?.length) return;
      // Skip the zone being edited — it lives in drawFG instead
      if (zone._id === editingId) return;

      const isSel  = zone._id === activeId;
      const color  = zone.serviceEnabled ? typeColor(zone.type) : T.off;

      const poly = L.polygon(
        zone.polygon.map((c: Coord) => [c.lat, c.lng] as [number, number]),
        {
          color:       isSel ? T.amber : color,
          fillColor:   color,
          fillOpacity: zone.serviceEnabled ? (isSel ? 0.2 : 0.1) : 0.06,
          weight:      isSel ? 3 : zone.type === 'city' ? 2.5 : 1.5,
          dashArray:   !zone.serviceEnabled ? '8 5' : zone.type === 'city' ? undefined : '4 3',
        }
      ).addTo(map);

      const hierBadge = zone.type === 'city' ? '🏙️ City' : zone.type === 'cluster' ? '📍 Cluster' : '📌 Area';
      poly.bindTooltip(`
        <div style="font-family:system-ui;min-width:120px">
          <div style="font-size:13px;font-weight:800;color:#111">${zone.name}</div>
          <div style="font-size:11px;color:#555;margin-top:3px">
            ${hierBadge} · ${zone.serviceEnabled ? '🟢 Live' : '🔴 Off'}
          </div>
          ${zone.exclusionZones?.length ? `<div style="font-size:11px;color:#e33">🚫 ${zone.exclusionZones.length} cut-out(s)</div>` : ''}
          <div style="font-size:10px;color:#888;margin-top:2px">~${km2(zone.polygon).toFixed(0)} km²</div>
        </div>`, { sticky: true, opacity: .97 });

      poly.on('click', () => {
        const fresh = zones.find(z => z._id === zone._id) ?? zone;
        setMode({ tag: 'detail', zone: fresh });
      });

      zoneLayers.current.set(zone._id, poly);

      // Exclusion holes
      (zone.exclusionZones ?? []).forEach(ex => {
        if (!ex.polygon?.length) return;
        const ep = L.polygon(
          ex.polygon.map((c: Coord) => [c.lat, c.lng] as [number, number]),
          { color: T.red, fillColor: T.red, fillOpacity: 0.3, weight: 1.5, dashArray: '4 3' }
        ).addTo(map);
        ep.bindTooltip(`<div style="font-family:system-ui;font-size:12px;font-weight:700;color:#ff4757">🚫 ${ex.name}</div>`, { sticky: true });
        exLayers.current.set(ex._id, ep);
      });
    });
  }, [zones, mode, mapReady, setMode]);

  /* ───────────────────── DRAW TOOLS ───────────────────── */
  const clearDraw = useCallback(() => {
    // Clear custom draw markers + preview
    const map = mapInst.current;
    if (map) {
      if ((map as any)._samClickHandler) {
        map.off('click', (map as any)._samClickHandler);
        (map as any)._samClickHandler = null;
      }
      map.getContainer().style.cursor = '';
    }
    customMarkers.current.forEach((m: any) => { try { map?.removeLayer(m); } catch {} });
    customMarkers.current = [];
    if (customPolyLine.current) { try { map?.removeLayer(customPolyLine.current); } catch {} customPolyLine.current = null; }
    if (customPolygon.current)  { try { map?.removeLayer(customPolygon.current);  } catch {} customPolygon.current  = null; }
    setLivePointCount(0);
    // Also clear edit-mode layers
    drawFG.current?.clearLayers();
    drawnPts.current = [];
    editingLayer.current = null;
    if (drawCtrl.current && map) {
      try { map.removeControl(drawCtrl.current); } catch {}
      drawCtrl.current = null;
    }
  }, []);

  /**
   * startDrawNewMode — manual zone drawing.
   * Places a starter rectangle on the current map view and activates
   * leaflet-draw vertex handles — same UX as "Edit Zone Shape":
   *   1. Drag white handles  2. Click midpoints to add vertices  3. Click Save Zone
   */
  const startDrawNewMode = useCallback((color: string) => {
    const map = mapInst.current;
    const L   = Lref.current;
    if (!map || !L) return;
    clearDraw();

    // Starter rectangle centred on the current view (~40% of visible area)
    const b = map.getBounds();
    const latPad = (b.getNorth() - b.getSouth()) * 0.28;
    const lngPad = (b.getEast()  - b.getWest())  * 0.28;
    const starter: [number, number][] = [
      [b.getNorth() - latPad, b.getWest() + lngPad],
      [b.getNorth() - latPad, b.getEast() - lngPad],
      [b.getSouth() + latPad, b.getEast() - lngPad],
      [b.getSouth() + latPad, b.getWest() + lngPad],
    ];

    const layer = L.polygon(starter, {
      color, fillColor: color, fillOpacity: 0.18, weight: 2.5,
    });
    drawFG.current.addLayer(layer);
    editingLayer.current = layer;
    drawnPts.current = starter.map(([lat, lng]) => ({ lat, lng }));

    // Edit-only toolbar — no draw tools, only vertex drag
    const ctrl = new (L as any).Control.Draw({
      position: 'topleft',
      edit: {
        featureGroup: drawFG.current,
        edit: { selectedPathOptions: { color, fillColor: color } },
        remove: false,
      },
      draw: {
        polygon: false, polyline: false, circle: false,
        circlemarker: false, rectangle: false, marker: false,
      },
    });
    map.addControl(ctrl);
    drawCtrl.current = ctrl;

    // Auto-activate handles immediately
    setTimeout(() => {
      (document.querySelector('.leaflet-draw-edit-edit') as HTMLElement | null)?.click();
    }, 150);
  }, [clearDraw]);

  /**
   * startExclusionDrawMode — places a starter rectangle on the zone centroid,
   * then activates leaflet-draw vertex handles (same UX as Edit Zone Shape).
   * User drags handles to define the cut-out area, then clicks Save Cut-out.
   */
  const startExclusionDrawMode = useCallback((zone: Zone) => {
    const map = mapInst.current;
    const L   = Lref.current;
    if (!map || !L) return;
    clearDraw();

    // Fit map to zone so user can see what they're cutting
    const zonePts = zone.polygon;
    const L2 = Lref.current;
    if (zonePts.length && mapInst.current) {
      try {
        const tempPoly = L2.polygon(zonePts.map((c: Coord) => [c.lat, c.lng]));
        mapInst.current.fitBounds(tempPoly.getBounds(), { padding: [50, 50] });
      } catch {}
    }

    // Starter rectangle: centred on zone, ~12% of view
    const pts  = zone.polygon;
    const cLat = pts.reduce((s: number, p: Coord) => s + p.lat, 0) / pts.length;
    const cLng = pts.reduce((s: number, p: Coord) => s + p.lng, 0) / pts.length;
    const b      = map.getBounds();
    const latPad = (b.getNorth() - b.getSouth()) * 0.10;
    const lngPad = (b.getEast()  - b.getWest())  * 0.10;
    const starter: [number, number][] = [
      [cLat + latPad, cLng - lngPad],
      [cLat + latPad, cLng + lngPad],
      [cLat - latPad, cLng + lngPad],
      [cLat - latPad, cLng - lngPad],
    ];

    const layer = L.polygon(starter, {
      color: T.red, fillColor: T.red, fillOpacity: 0.22, weight: 2.5, dashArray: '6 4',
    });
    drawFG.current.addLayer(layer);
    editingLayer.current = layer;
    drawnPts.current = starter.map(([lat, lng]) => ({ lat, lng }));

    const ctrl = new (L as any).Control.Draw({
      position: 'topleft',
      edit: {
        featureGroup: drawFG.current,
        edit: { selectedPathOptions: { color: T.red, fillColor: T.red } },
        remove: false,
      },
      draw: {
        polygon: false, polyline: false, circle: false,
        circlemarker: false, rectangle: false, marker: false,
      },
    });
    map.addControl(ctrl);
    drawCtrl.current = ctrl;

    setTimeout(() => {
      (document.querySelector('.leaflet-draw-edit-edit') as HTMLElement | null)?.click();
    }, 200);
  }, [clearDraw]);

  /**
   * Enter edit mode for an existing zone polygon.
   * Loads the polygon into drawFG so Leaflet-Draw vertex handles appear.
   * The user drags handles to reshape, then clicks our "Save Shape" button.
   */
  const startEditMode = useCallback((zone: Zone) => {
    const map = mapInst.current;
    const L   = Lref.current;
    if (!map || !L) return;
    clearDraw();

    // Load the zone's polygon into drawFG as an editable layer
    const layer = L.polygon(
      zone.polygon.map((c: Coord) => [c.lat, c.lng] as [number, number]),
      { color: T.amber, fillColor: T.amber, fillOpacity: 0.22, weight: 2.5 }
    );
    drawFG.current.addLayer(layer);
    editingLayer.current = layer;
    // Seed drawnPts with current polygon (so Save works even if user doesn't drag)
    drawnPts.current = zone.polygon.map(c => ({ ...c }));

    // Mount edit-only Draw toolbar
    const ctrl = new (L as any).Control.Draw({
      position: 'topleft',
      edit: {
        featureGroup: drawFG.current,
        edit: { selectedPathOptions: { color: T.amber, fillColor: T.amber } },
        remove: false,
      },
      draw: {
        polygon: false, polyline: false, circle: false,
        circlemarker: false, rectangle: false, marker: false,
      },
    });
    map.addControl(ctrl);
    drawCtrl.current = ctrl;

    // Auto-click the edit (pencil) button so handles appear immediately
    setTimeout(() => {
      const editBtn = document.querySelector('.leaflet-draw-edit-edit') as HTMLElement | null;
      editBtn?.click();

      // Intercept the toolbar's own "Save" button — route it through our save
      setTimeout(() => {
        const toolbarSave = document.querySelector('.leaflet-draw-actions a[title="Save changes"]') as HTMLElement | null;
        if (toolbarSave) {
          toolbarSave.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Harvest latest coords from the layer
            const lyr = editingLayer.current;
            if (lyr) {
              const latlngs = lyr.getLatLngs();
              const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
              drawnPts.current = ring.map((p: any) => ({
                lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6),
              }));
            }
          }, { once: true });
        }
      }, 300);
    }, 150);
  }, [clearDraw]);

  const cancelDraw = useCallback(() => {
    clearDraw();
    const cur = modeRef.current;
    if (cur.tag === 'draw_exclusion' || cur.tag === 'confirm_exclusion' || cur.tag === 'editing') {
      setMode({ tag: 'detail', zone: (cur as any).zone });
    } else {
      setMode({ tag: 'idle' });
    }
  }, [clearDraw, setMode]);

  /**
   * Called from draw_new "Save Zone" button.
   * Harvests the latest coords from the editable layer, then goes to confirm_new.
   */
  const finishDrawNew = useCallback(() => {
    const lyr = editingLayer.current;
    if (lyr) {
      const latlngs = lyr.getLatLngs();
      const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      drawnPts.current = ring.map((p: any) => ({
        lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6),
      }));
    }
    if (drawnPts.current.length < 3) {
      alert('Shape needs at least 3 points — drag the handles to reshape first.');
      return;
    }
    setMode({ tag: 'confirm_new' });
  }, [setMode]);

  const flyTo = (coords: [number, number]) =>
    mapInst.current?.flyTo(coords, 12, { duration: 1.1 });

  /* ───────────────────── DERIVED ───────────────────── */
  const totalActive   = zones.filter(z => z.serviceEnabled).length;
  const totalCutouts  = zones.reduce((s, z) => s + (z.exclusionZones?.length ?? 0), 0);
  const cityCount     = zones.filter(z => z.type === 'city').length;
  const clusterCount  = zones.filter(z => z.type === 'cluster').length;

  const filteredZones = filter === 'all' ? zones : zones.filter(z => z.type === filter);

  /* ═══════════════════════════════════════════════════════════
     SIDEBAR CONTENT
  ═══════════════════════════════════════════════════════════ */
  const renderSidebar = () => {

    /* ── DETAIL / EDITING panels check for zone in mode ── */
    if (mode.tag === 'detail') {
      const zone = mode.zone;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.line}`,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { clearDraw(); setMode({ tag: 'idle' }); }}
              style={{ all: 'unset', cursor: 'pointer', color: T.t3, fontSize: 20, lineHeight: 1 }}>←</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.t1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {zone.name}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                <Chip label={zone.type} color={typeColor(zone.type)} icon={typeIcon(zone.type) + ' '} />
                <Chip label={zone.serviceEnabled ? 'LIVE' : 'OFF'}
                  color={zone.serviceEnabled ? T.live : T.off} />
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '13px 14px' }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 14 }}>
              {[
                { l: 'Points',   v: zone.polygon?.length ?? 0,   c: T.blue   },
                { l: 'Area',     v: `~${km2(zone.polygon).toFixed(0)} km²`, c: T.teal  },
                { l: 'Cut-outs', v: zone.exclusionZones?.length ?? 0, c: T.red  },
                { l: 'Surge',    v: `${zone.surgeMultiplier ?? 1}×`, c: T.amber },
              ].map(s => (
                <div key={s.l} style={{ padding: '9px 11px', borderRadius: 9,
                  background: s.c + '0c', border: `1px solid ${s.c}20` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: T.t3,
                    textTransform: 'uppercase', letterSpacing: '.08em' }}>{s.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: s.c, marginTop: 2 }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Rename */}
            {renaming === zone._id ? (
              <div style={{ marginBottom: 12 }}>
                <Lbl>New Name</Lbl>
                <Input autoFocus value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renameZone(zone); if (e.key === 'Escape') setRenaming(null); }}
                  placeholder="Zone name…" style={{ marginBottom: 7 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button v="fill" accent={T.teal} full onClick={() => renameZone(zone)}>Save</Button>
                  <Button v="ghost" full onClick={() => setRenaming(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button v="ghost" full style={{ marginBottom: 8 }}
                onClick={() => { setRenaming(zone._id); setRenameVal(zone.name); }}>
                ✏️ Rename Zone
              </Button>
            )}

            <HR />

            {/* Zone actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
              {/* Edit shape */}
              <Button v="tonal" accent={T.amber} full
                onClick={() => {
                  startEditMode(zone);
                  setMode({ tag: 'editing', zone });
                  // Fit map to this zone after a short delay (layer needs to be added first)
                  setTimeout(() => {
                    const lyr = editingLayer.current;
                    if (lyr && mapInst.current) {
                      try { mapInst.current.fitBounds(lyr.getBounds(), { padding: [60, 60] }); } catch {}
                    }
                  }, 300);
                }}>
                🔧 Edit Zone Shape
              </Button>

              {/* Toggle */}
              <Button v={zone.serviceEnabled ? 'warn' : 'tonal'}
                accent={zone.serviceEnabled ? T.amber : T.teal} full
                onClick={() => toggleZone(zone)}>
                {zone.serviceEnabled ? '⏸ Disable Zone' : '▶ Enable Zone'}
              </Button>

              {/* Cut out */}
              <Button v="tonal" accent={T.red} full
                onClick={() => {
                  setExLabel('');
                  setMode({ tag: 'draw_exclusion', zone });
                  startExclusionDrawMode(zone);
                }}>
                ✂️ Cut Area Out of Zone
              </Button>

              {/* Delete */}
              <Button v="danger" full onClick={() => deleteZone(zone)}>
                🗑️ Delete Zone
              </Button>
            </div>

            {/* Exclusion list */}
            {(zone.exclusionZones?.length ?? 0) > 0 && (
              <>
                <HR />
                <SectionHead icon="🚫" title="Cut-out Areas" count={zone.exclusionZones.length} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {zone.exclusionZones.map(ex => (
                    <div key={ex._id} style={{ display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', padding: '8px 10px',
                      borderRadius: 8, background: T.red + '08',
                      border: `1px solid ${T.red}20` }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5' }}>{ex.name}</div>
                        <div style={{ fontSize: 10, color: T.t3, marginTop: 1 }}>{ex.polygon?.length} pts</div>
                      </div>
                      <Button v="tonal" accent={T.teal} sm
                        onClick={() => removeExclusion(zone, ex._id)}>
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    /* ── EDITING ── */
    if (mode.tag === 'editing') {
      const zone = mode.zone;
      return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.amber, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: T.amber }}>Editing Boundary</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 2,
            padding: '6px 10px', borderRadius: 7, background: T.bg0,
            border: `1px solid ${T.line}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {zone.name}
          </div>

          {/* Step guide */}
          <div style={{ padding: '11px 13px', borderRadius: 10,
            background: T.amber + '0c', border: `1px solid ${T.amber}28` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.amber,
              textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
              How to Edit
            </div>
            {[
              { n: '1', t: 'Drag white handles', d: 'Pull existing vertices to reshape' },
              { n: '2', t: 'Click edge midpoints', d: 'Add new vertices anywhere on the border' },
              { n: '3', t: 'Click Save Shape', d: 'Saves your new boundary to the server' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 9, marginBottom: 7, alignItems: 'flex-start' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%',
                  background: T.amber, color: '#000',
                  fontSize: 9, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {s.n}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{s.t}</div>
                  <div style={{ fontSize: 11, color: T.t3 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Fit to zone */}
          <Button v="ghost" full onClick={() => {
            const lyr = editingLayer.current;
            if (lyr && mapInst.current) {
              try { mapInst.current.fitBounds(lyr.getBounds(), { padding: [40, 40] }); } catch {}
            }
          }}>
            🔍 Fit Map to Zone
          </Button>

          <Button v="fill" accent={T.amber} full disabled={saving}
            onClick={() => saveEditedZone(zone)}
            style={{ padding: '12px 0', fontSize: 13 }}>
            {saving ? <><Spin />Saving…</> : '💾 Save Shape'}
          </Button>

          <Button v="danger" full onClick={() => {
            if (window.confirm('Discard edits and go back?')) cancelDraw();
          }}>
            ✕ Cancel Editing
          </Button>

          <div style={{ padding: '8px 10px', borderRadius: 7,
            background: T.bg0, border: `1px solid ${T.line}`,
            fontSize: 10, color: T.t3, lineHeight: 1.6, textAlign: 'center' }}>
            💡 The polygon outline on the map is now<br />
            editable — handles are white circles
          </div>
        </div>
      );
    }

    /* ── DRAW NEW ── */
    /* ── DRAW NEW ── */
    if (mode.tag === 'draw_new') return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.teal,
            flexShrink: 0, animation: 'sam-pulse 1.5s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: T.teal }}>Drawing New Zone</span>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: T.t3,
          padding: '6px 10px', borderRadius: 7, background: T.bg0, border: `1px solid ${T.line}` }}>
          Reshape the teal polygon to match your zone boundary
        </div>

        {/* Step guide — same structure as editing panel */}
        <div style={{ padding: '11px 13px', borderRadius: 10,
          background: T.teal + '0c', border: `1px solid ${T.teal}28` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.teal,
            textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
            How to Draw
          </div>
          {[
            { n: '1', t: 'Drag white handles', d: 'Pull existing vertices to reshape' },
            { n: '2', t: 'Click edge midpoints', d: 'Add new vertices anywhere on the border' },
            { n: '3', t: 'Click Save Zone', d: 'Name it and save to the server' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 9, marginBottom: 7, alignItems: 'flex-start' }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: T.teal, color: '#000',
                fontSize: 9, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                {s.n}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{s.t}</div>
                <div style={{ fontSize: 11, color: T.t3 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Fit map to starter shape */}
        <Button v="ghost" full onClick={() => {
          const lyr = editingLayer.current;
          if (lyr && mapInst.current) {
            try { mapInst.current.fitBounds(lyr.getBounds(), { padding: [60, 60] }); } catch {}
          }
        }}>
          🔍 Fit Map to Shape
        </Button>

        <Button v="fill" accent={T.teal} full
          onClick={finishDrawNew}
          style={{ padding: '12px 0', fontSize: 13 }}>
          ✅ Save Zone
        </Button>

        <Button v="danger" full onClick={() => {
          if (window.confirm('Discard and go back?')) cancelDraw();
        }}>
          ✕ Cancel Drawing
        </Button>

        <div style={{ padding: '8px 10px', borderRadius: 7,
          background: T.bg0, border: `1px solid ${T.line}`,
          fontSize: 10, color: T.t3, lineHeight: 1.6, textAlign: 'center' }}>
          💡 The teal polygon on the map is editable<br />
          — white circles are draggable handles
        </div>
      </div>
    );

    /* ── CONFIRM NEW ── */
    if (mode.tag === 'confirm_new') return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ padding: '10px 12px', borderRadius: 9,
          background: T.teal + '0d', border: `1px solid ${T.teal}30` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.teal }}>✅ Shape ready</div>
          <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>
            {drawnPts.current.length} vertices · ~{km2(drawnPts.current).toFixed(1)} km²
          </div>
        </div>
        <div>
          <Lbl>Zone Name *</Lbl>
          <Input autoFocus value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveNewZone()}
            placeholder="e.g. Hitech City" />
        </div>
        <div>
          <Lbl>Type</Lbl>
          <Select value={newType} onChange={e => setNewType(e.target.value as Zone['type'])}>
            <option value="city">🏙️ City</option>
            <option value="cluster">📍 Cluster</option>
            <option value="area">📌 Area</option>
          </Select>
        </div>
        <Button v="fill" accent={T.teal} full disabled={saving || !newName.trim()}
          onClick={saveNewZone}>
          {saving ? <><Spin />Saving…</> : '✅ Save Zone'}
        </Button>
        <Button v="ghost" full
          onClick={() => { clearDraw(); setMode({ tag: 'draw_new' }); startDrawNewMode(T.teal); }}>
          ↩ Redraw
        </Button>
        <Button v="ghost" full style={{ color: T.t3 }} onClick={cancelDraw}>✕ Cancel</Button>
      </div>
    );

    /* ── DRAW EXCLUSION ── */
    if (mode.tag === 'draw_exclusion') {
      const zone = mode.zone;
      return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.red, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: T.red }}>Drawing Cut-out</span>
          </div>

          {/* Zone name badge */}
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t1,
            padding: '6px 10px', borderRadius: 7, background: T.bg0,
            border: `1px solid ${T.line}`, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ✂️ Cutting inside: <span style={{ color: '#fca5a5' }}>{zone.name}</span>
          </div>

          {/* Step guide — mirrors Edit Zone Shape panel */}
          <div style={{ padding: '11px 13px', borderRadius: 10,
            background: T.red + '0c', border: `1px solid ${T.red}28` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.red,
              textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
              How to Draw Cut-out
            </div>
            {[
              { n: '1', t: 'Drag white handles', d: 'Pull existing vertices to reshape the red area' },
              { n: '2', t: 'Click edge midpoints', d: 'Add new vertices anywhere on the border' },
              { n: '3', t: 'Click Save Cut-out', d: 'Blocks service inside this area permanently' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 9, marginBottom: 7, alignItems: 'flex-start' }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: T.red, color: '#fff',
                  fontSize: 9, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  {s.n}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{s.t}</div>
                  <div style={{ fontSize: 11, color: T.t3 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Label input — inline so user can name before saving */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: T.t3,
              textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>
              Cut-out Label (optional)
            </div>
            <input
              value={exLabel}
              onChange={e => setExLabel(e.target.value)}
              placeholder="e.g. Airport, Lake, Highway…"
              style={{
                width: '100%', padding: '9px 12px', fontSize: 13, color: T.t1,
                background: T.bg1, border: `1.5px solid ${T.line2}`,
                borderRadius: 8, outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box' as const,
              }}
            />
          </div>

          {/* Fit to zone */}
          <Button v="ghost" full onClick={() => {
            const lyr = editingLayer.current;
            if (lyr && mapInst.current) {
              try { mapInst.current.fitBounds(lyr.getBounds(), { padding: [40, 40] }); } catch {}
            }
          }}>
            🔍 Fit Map to Cut-out Shape
          </Button>

          <Button v="fill" accent={T.red} full disabled={saving}
            onClick={() => saveExclusionDraw(zone)}
            style={{ padding: '12px 0', fontSize: 13 }}>
            {saving ? <><Spin />Saving…</> : '✂️ Save Cut-out'}
          </Button>

          <Button v="danger" full onClick={() => {
            if (window.confirm('Discard cut-out and go back?')) cancelDraw();
          }}>
            ✕ Cancel
          </Button>

          <div style={{ padding: '8px 10px', borderRadius: 7,
            background: T.bg0, border: `1px solid ${T.line}`,
            fontSize: 10, color: T.t3, lineHeight: 1.6, textAlign: 'center' }}>
            💡 The red polygon on the map is editable<br />
            — white circles are draggable handles
          </div>
        </div>
      );
    }

    /* ── CONFIRM EXCLUSION ── */
    if (mode.tag === 'confirm_exclusion') {
      const zone = mode.zone;
      return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ padding: '10px 12px', borderRadius: 9,
            background: T.red + '0d', border: `1px solid ${T.red}30` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.red }}>✂️ Cut-out ready</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>
              {drawnPts.current.length} pts · ~{km2(drawnPts.current).toFixed(2)} km²
              <br />Blocks service inside <b style={{ color: '#fca5a5' }}>{zone.name}</b>
            </div>
          </div>
          <div>
            <Lbl>Label (optional)</Lbl>
            <Input autoFocus value={exLabel}
              onChange={e => setExLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveExclusion(zone)}
              placeholder="e.g. Airport zone" />
          </div>
          <Button v="fill" accent={T.red} full disabled={saving}
            onClick={() => saveExclusion(zone)}>
            {saving ? <><Spin />Saving…</> : '✂️ Confirm Cut-out'}
          </Button>
          <Button v="ghost" full
            onClick={() => { setMode({ tag: 'draw_exclusion', zone }); startExclusionDrawMode(zone); }}>
            ↩ Redraw Cut-out
          </Button>
          <Button v="ghost" full style={{ color: T.t3 }} onClick={cancelDraw}>✕ Cancel</Button>
        </div>
      );
    }

    /* ══ IDLE HOME ══ */
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          {(['generate', 'zones'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              all: 'unset', cursor: 'pointer', flex: 1,
              padding: '11px 0', fontSize: 11, fontWeight: 700, textAlign: 'center',
              color: tab === t ? T.teal : T.t3,
              borderBottom: `2px solid ${tab === t ? T.teal : 'transparent'}`,
              transition: 'all .15s',
            }}>
              {t === 'generate' ? '⚡ Auto-Generate' : '🗂 All Zones'}
            </button>
          ))}
        </div>

        {/* ── GENERATE TAB ── */}
        {tab === 'generate' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.7, marginBottom: 14, padding: '10px 12px', borderRadius: 9, background: T.bg0, border: `1px solid ${T.line}` }}>
              Type a <b style={{ color: T.teal }}>city or state name</b> to automatically load all clusters from OpenStreetMap boundaries.
            </div>

            <Lbl>City or State Name</Lbl>
            <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
              <Input
                value={genInput}
                onChange={e => setGenInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generateClusters()}
                placeholder="e.g. Hyderabad, Telangana…"
                style={{ flex: 1 }}
              />
              <Button v="fill" accent={T.teal} disabled={genLoading || !genInput.trim()}
                onClick={generateClusters} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                {genLoading ? <Spin size={13} /> : '⚡'}
              </Button>
            </div>

            {genLoading && (
              <ProgressBar
                label="Fetching from OpenStreetMap…"
                sub="Loading boundaries — this may take 10–20 seconds"
              />
            )}

            {genResult && !genLoading && (
              <div style={{ padding: '12px 13px', borderRadius: 10,
                background: T.teal + '0a', border: `1px solid ${T.teal}25`, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.teal, marginBottom: 8 }}>
                  ✅ {genResult.city?.name ?? genInput}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 7, background: T.city + '0f', border: `1px solid ${T.city}20` }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>City Zone</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.city }}>1</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 7, background: T.cluster + '0f', border: `1px solid ${T.cluster}20` }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: T.t3, textTransform: 'uppercase' }}>Clusters</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.cluster }}>{genResult.clusters?.length ?? 0}</div>
                  </div>
                </div>
                {(genResult.clusters?.length ?? 0) > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: 'uppercase', marginBottom: 6 }}>Generated Clusters</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {genResult.clusters.map(c => (
                        <span key={c._id} style={{ padding: '3px 8px', borderRadius: 20,
                          background: T.cluster + '15', color: T.cluster,
                          border: `1px solid ${T.cluster}25`, fontSize: 10, fontWeight: 600 }}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <HR />
            <Lbl>Quick City Jump</Lbl>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {Object.entries(CITY_CENTERS).map(([name, coords]) => (
                <button key={name} onClick={() => { setGenInput(name); flyTo(coords); }}
                  style={{ all: 'unset', cursor: 'pointer', padding: '4px 9px',
                    borderRadius: 6, background: T.bg0, border: `1px solid ${T.line}`,
                    color: T.t2, fontSize: 11, fontWeight: 600 }}>
                  {name}
                </button>
              ))}
            </div>

            <HR />

            {/* Manual draw option */}
            <Button v="ghost" full
              onClick={() => { setNewName(''); setNewType('cluster'); setMode({ tag: 'draw_new' }); startDrawNewMode(T.teal); }}>
              ✏️ Draw Zone Manually
            </Button>
          </div>
        )}

        {/* ── ZONES TAB ── */}
        {tab === 'zones' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Filter chips */}
            <div style={{ padding: '8px 10px', borderBottom: `1px solid ${T.line}`,
              display: 'flex', gap: 5, flexShrink: 0 }}>
              {(['all', 'city', 'cluster', 'area'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  all: 'unset', cursor: 'pointer', padding: '3px 9px',
                  borderRadius: 20, fontSize: 10, fontWeight: 700,
                  background: filter === f ? typeColor(f === 'all' ? 'cluster' : f) + '20' : T.bg0,
                  color: filter === f ? typeColor(f === 'all' ? 'cluster' : f) : T.t3,
                  border: `1px solid ${filter === f ? typeColor(f === 'all' ? 'cluster' : f) + '40' : T.line}`,
                }}>
                  {f === 'all' ? `All (${zones.length})` : `${typeIcon(f)} ${f} (${zones.filter(z => z.type === f).length})`}
                </button>
              ))}
            </div>

            {/* Zone list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && (
                <div style={{ padding: 24, textAlign: 'center', color: T.t3 }}>
                  <Spin size={22} color={T.teal} />
                </div>
              )}
              {!loading && filteredZones.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: T.t3, fontSize: 13 }}>
                  No zones yet.<br />Use Auto-Generate or draw manually.
                </div>
              )}
              {filteredZones.map(z => (
                <ZoneRow key={z._id} zone={z}
                  active={false}
                  onClick={() => setMode({ tag: 'detail', zone: z })}
                />
              ))}
            </div>

            <div style={{ padding: '10px 14px', borderTop: `1px solid ${T.line}`, flexShrink: 0 }}>
              <Button v="tonal" accent={T.teal} full
                onClick={() => { setNewName(''); setNewType('cluster'); setMode({ tag: 'draw_new' }); startDrawNewMode(T.teal); }}>
                ✏️ Draw New Zone
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
      background: T.bg0, color: T.t1 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:disabled { opacity: .4 !important; cursor: not-allowed !important; }
        .leaflet-container { font-family: 'DM Sans', sans-serif; background: ${T.bg0}; }
        .leaflet-draw-toolbar a { background-color: ${T.bg2} !important; color: ${T.t1} !important; border-color: ${T.line} !important; }
        .leaflet-draw-toolbar a:hover { background-color: ${T.bg3} !important; }
        @keyframes sam-spin { to { transform: rotate(360deg); } }
        @keyframes sam-progress { from { margin-left: 0; width: 50%; } to { margin-left: 50%; width: 40%; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.line2}; border-radius: 4px; }
        select option { background: ${T.bg2}; color: ${T.t1}; }
      `}</style>

      {toast && <Toast msg={toast} clear={() => setToast(null)} />}

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div style={{ background: T.bg2, borderBottom: `1px solid ${T.line}`,
        padding: '0 18px', height: 52, display: 'flex', alignItems: 'center',
        gap: 14, flexShrink: 0 }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg,${T.teal},${T.blue})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            🗺️
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.t1, lineHeight: 1 }}>Service Areas</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '.08em' }}>Operations Dashboard</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { l: 'Cities',   v: cityCount,    c: T.city    },
            { l: 'Clusters', v: clusterCount, c: T.cluster },
            { l: 'Active',   v: totalActive,  c: T.live    },
            { l: 'Cut-outs', v: totalCutouts, c: T.red     },
          ].map(s => (
            <div key={s.l} style={{ padding: '4px 11px', borderRadius: 20,
              background: s.c + '10', border: `1px solid ${s.c}20`,
              display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: T.t3,
                textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.l}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: s.c }}>{s.v}</span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Hierarchy legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', borderRadius: 8, background: T.bg0,
          border: `1px solid ${T.line}`, fontSize: 11, color: T.t3 }}>
          <span style={{ color: T.city    }}>🏙️ City</span>
          <span style={{ color: T.t3 }}>›</span>
          <span style={{ color: T.cluster }}>📍 Cluster</span>
          <span style={{ color: T.t3 }}>›</span>
          <span style={{ color: T.red     }}>🚫 Exclusion</span>
        </div>

        <button onClick={loadZones} disabled={loading}
          style={{ all: 'unset', cursor: 'pointer', padding: '6px 12px', borderRadius: 7,
            background: T.bg0, border: `1px solid ${T.line}`,
            color: T.t3, fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 5 }}>
          {loading ? <Spin size={11} color={T.t3} /> : '↻'} Refresh
        </button>
      </div>

      {/* ── BODY ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: 300, background: T.bg2, borderRight: `1px solid ${T.line}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          {renderSidebar()}
        </div>

        {/* ── MAP ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapDiv} style={{ width: '100%', height: '100%' }} />

          {/* Loading overlay */}
          {!mapReady && (
            <div style={{ position: 'absolute', inset: 0, background: T.bg0,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 16 }}>
              <Spin size={40} color={T.teal} />
              <div style={{ color: T.t3, fontSize: 13 }}>Initialising map…</div>
            </div>
          )}

          {/* Auto-generating overlay */}
          {mode.tag === 'generating' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,13,26,.7)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 16, backdropFilter: 'blur(4px)' }}>
              <Spin size={44} color={T.teal} />
              <div style={{ fontSize: 15, fontWeight: 700, color: T.teal }}>Loading clusters…</div>
              <div style={{ fontSize: 12, color: T.t3 }}>Fetching boundaries from OpenStreetMap</div>
            </div>
          )}

          {/* Drawing hint HUD */}
          {(mode.tag === 'draw_new' || mode.tag === 'draw_exclusion' || mode.tag === 'editing') && (
            <div style={{
              position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(7,13,26,.93)', backdropFilter: 'blur(8px)',
              border: `1px solid ${
                mode.tag === 'draw_exclusion' ? T.red :
                mode.tag === 'editing'        ? T.amber : T.teal}50`,
              borderRadius: 10, padding: '8px 20px',
              color: mode.tag === 'draw_exclusion' ? T.red :
                     mode.tag === 'editing'        ? T.amber : T.teal,
              fontSize: 12, fontWeight: 700, pointerEvents: 'none',
              whiteSpace: 'nowrap', zIndex: 1000,
            }}>
              {mode.tag === 'draw_new'       && '✏️  Drag white handles to reshape · Click edge midpoints to add vertices'}
              {mode.tag === 'draw_exclusion' && '✂️  Drag white handles to reshape · Click edge midpoints to add vertices · Click Save Cut-out when done'}
              {mode.tag === 'editing'        && '🔧  Drag white handles to reshape · Click Save Shape when done'}
            </div>
          )}

          {/* Empty state */}
          {mapReady && zones.length === 0 && !loading && mode.tag === 'idle' && (
            <div style={{
              position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(7,13,26,.92)', backdropFilter: 'blur(8px)',
              border: `1px solid ${T.teal}30`, borderRadius: 10,
              padding: '10px 20px', color: T.teal, fontSize: 12,
              fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>
              ⚡ Use Auto-Generate to load city clusters automatically
            </div>
          )}
        </div>
      </div>
    </div>
  );
}