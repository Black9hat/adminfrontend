import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import axios from 'axios';
import { OlaMaps, defaultStyleJson } from 'olamaps-web-sdk';

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

const MAPS_KEY = (import.meta as any).env?.VITE_OLA_MAPS_KEY ?? '';

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
  bg0:    '#070d1a',   bg1:    '#0d1525',   bg2:    '#111e33',
  bg3:    '#172240',   line:   '#1e2f4a',   line2:  '#243654',
  teal:   '#00d4aa',   tealD:  '#00a884',   amber:  '#f5a623',
  red:    '#ff4757',   blue:   '#4a9eff',   purple: '#a78bfa',
  t1:     '#e8f0fe',   t2:     '#8fa8d4',   t3:     '#4a6080',
  live:   '#00d4aa',   off:    '#ff4757',
  city:   '#4a9eff',   cluster:'#a78bfa',   area:   '#f5a623',
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
   HELPER: Create Custom Marker Element
═══════════════════════════════════════════════════════════ */
function makeMarkerEl(color: string, emoji: string, size = 36): HTMLDivElement {
  const el = document.createElement('div');
  Object.assign(el.style, {
    width:          `${size}px`,
    height:         `${size}px`,
    borderRadius:   '999px',
    background:     color,
    border:         '3px solid #fff',
    boxShadow:      '0 4px 18px rgba(0,0,0,0.45)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       `${Math.round(size * 0.48)}px`,
    cursor:         'pointer',
    userSelect:     'none',
    transition:     'transform 0.15s ease',
  });
  el.textContent = emoji;
  return el;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const _style = typeof document !== 'undefined' && (() => {
  if (document.getElementById('sam-styles')) return;
  const s = document.createElement('style');
  s.id = 'sam-styles';
  s.textContent = `
    @keyframes sam-spin { to { transform: rotate(360deg); } }
    @keyframes sam-progress { from { margin-left: 0; width: 50%; } to { margin-left: 50%; width: 40%; } }
    @keyframes sam-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
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
  const drawnPts  = useRef<Coord[]>([]);

  // Custom drawing state
  const customMarkers  = useRef<any[]>([]);
  const [livePointCount, setLivePointCount] = useState(0);

  // Layer storage
  const zoneLayers = useRef<Map<string, { layerId: string; sourceId: string }>>(new Map());
  const exLayers   = useRef<Map<string, { layerId: string; sourceId: string }>>(new Map());
  const editingPolygon = useRef<any>(null);

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
    if (!drawnPts.current.length) return notify('No polygon data', false);
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
      if (r.data.city?.polygon?.length) {
        const pts = r.data.city.polygon as Coord[];
        const avgLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
        const avgLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
        mapInst.current?.flyTo({ center: [avgLng, avgLat], zoom: 11, duration: 1500 });
      }
    } catch (e: any) {
      notify(e.response?.data?.message ?? 'Generation failed', false);
    } finally { setGenLoading(false); }
  };

  /* ───────────────────── MAP INIT (OLA MAPS) ───────────────────── */
  useEffect(() => {
    if (mapInst.current || !mapDiv.current || !MAPS_KEY) return;
    let cancelled = false;

    (async () => {
      try {
        const olaMaps = new OlaMaps({ apiKey: MAPS_KEY });
        const map = await olaMaps.init({
          container: mapDiv.current!,
          style: defaultStyleJson,
          center: [78.487, 17.385], // [lng, lat]
          zoom: 11,
          attributionControl: false,
        });

        if (cancelled) { map.remove?.(); return; }
        mapInst.current = map;

        map.addControl(new OlaMaps.NavigationControl({ showCompass: true }), 'top-right');

        map.on('load', () => {
          if (cancelled) return;
          setMapReady(true);
        });
      } catch (err) {
        console.error('Ola Maps init error:', err);
      }
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      zoneLayers.current.forEach(({ layerId, sourceId }) => {
        try {
          const map = mapInst.current;
          if (map) {
            if (map.getLayer(`${layerId}-outline`)) map.removeLayer(`${layerId}-outline`);
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
          }
        } catch {}
      });
      zoneLayers.current.clear();
      exLayers.current.forEach(({ layerId, sourceId }) => {
        try {
          const map = mapInst.current;
          if (map) {
            if (map.getLayer(`${layerId}-outline`)) map.removeLayer(`${layerId}-outline`);
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
          }
        } catch {}
      });
      exLayers.current.clear();
      mapInst.current?.remove?.();
      mapInst.current = null;
    };
  }, []);

  /* ───────────────────── RENDER ZONES ON MAP ───────────────────── */
  useEffect(() => {
    const map = mapInst.current;
    if (!map || !mapReady) return;

    // Clear existing zone layers PROPERLY
    zoneLayers.current.forEach(({ layerId, sourceId }) => {
      try {
        // Remove outline layer first
        if (map.getLayer(`${layerId}-outline`)) {
          map.removeLayer(`${layerId}-outline`);
        }
        // Then remove fill layer
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        // Finally remove source
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch (err) {
        console.warn('Layer cleanup error:', err);
      }
    });
    zoneLayers.current.clear();

    // Clear exclusion layers PROPERLY
    exLayers.current.forEach(({ layerId, sourceId }) => {
      try {
        // Remove outline layer first
        if (map.getLayer(`${layerId}-outline`)) {
          map.removeLayer(`${layerId}-outline`);
        }
        // Then remove fill layer
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        // Finally remove source
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch (err) {
        console.warn('Exclusion layer cleanup error:', err);
      }
    });
    exLayers.current.clear();

    const activeId =
      (mode.tag === 'detail' || mode.tag === 'editing' ||
       mode.tag === 'draw_exclusion' || mode.tag === 'confirm_exclusion')
        ? (mode as any).zone._id : null;

    const editingId = mode.tag === 'editing' ? (mode as any).zone._id : null;

    zones.forEach(zone => {
      if (!zone.polygon?.length) return;
      if (zone._id === editingId) return; // Skip zone being edited

      const isSel  = zone._id === activeId;
      const color  = zone.serviceEnabled ? typeColor(zone.type) : T.off;

      // Convert to GeoJSON
      const coordinates = zone.polygon.map(c => [c.lng, c.lat]);
      coordinates.push(coordinates[0]); // Close the ring

      const geojson = {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coordinates],
        },
        properties: {
          name: zone.name,
          type: zone.type,
          enabled: zone.serviceEnabled,
        },
      };

      const sourceId = `zone-${zone._id}`;
      const layerId = `zone-layer-${zone._id}`;

      // Safety check - remove if exists (shouldn't happen with proper cleanup above)
      try {
        if (map.getLayer(`${layerId}-outline`)) {
          map.removeLayer(`${layerId}-outline`);
        }
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch (err) {
        // Ignore cleanup errors
      }

      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
      });

      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': color,
          'fill-opacity': zone.serviceEnabled ? (isSel ? 0.2 : 0.1) : 0.06,
        },
      });

      // Calculate line-dasharray - MUST be array or omitted entirely
      const lineDashArray = (() => {
        if (!zone.serviceEnabled) {
          return [8, 5]; // Disabled zones: dashed
        }
        if (zone.type === 'city') {
          return undefined; // City zones: solid line (no dasharray)
        }
        return [4, 3]; // Cluster/area zones: small dashes
      })();

      // Build outline layer paint config
      const outlinePaint: any = {
        'line-color': isSel ? T.amber : color,
        'line-width': isSel ? 3 : zone.type === 'city' ? 2.5 : 1.5,
      };

      // Only add line-dasharray if it's defined
      if (lineDashArray) {
        outlinePaint['line-dasharray'] = lineDashArray;
      }

      map.addLayer({
        id: `${layerId}-outline`,
        type: 'line',
        source: sourceId,
        paint: outlinePaint,
      });

      // Store for cleanup
      zoneLayers.current.set(zone._id, { layerId, sourceId });

      // Click handler - remove old handler first
      try {
        map.off('click', layerId);
      } catch {}
      
      map.on('click', layerId, () => {
        const fresh = zones.find(z => z._id === zone._id) ?? zone;
        setMode({ tag: 'detail', zone: fresh });
      });

      // Exclusion zones
      (zone.exclusionZones ?? []).forEach(ex => {
        if (!ex.polygon?.length) return;
        const exCoords = ex.polygon.map(c => [c.lng, c.lat]);
        exCoords.push(exCoords[0]);

        const exGeoJson = {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [exCoords],
          },
          properties: { name: ex.name },
        };

        const exSourceId = `exclusion-${ex._id}`;
        const exLayerId = `exclusion-layer-${ex._id}`;

        // Safety cleanup
        try {
          if (map.getLayer(`${exLayerId}-outline`)) {
            map.removeLayer(`${exLayerId}-outline`);
          }
          if (map.getLayer(exLayerId)) {
            map.removeLayer(exLayerId);
          }
          if (map.getSource(exSourceId)) {
            map.removeSource(exSourceId);
          }
        } catch (err) {
          // Ignore
        }

        map.addSource(exSourceId, { type: 'geojson', data: exGeoJson });
        
        map.addLayer({
          id: exLayerId,
          type: 'fill',
          source: exSourceId,
          paint: { 'fill-color': T.red, 'fill-opacity': 0.3 },
        });
        
        map.addLayer({
          id: `${exLayerId}-outline`,
          type: 'line',
          source: exSourceId,
          paint: { 
            'line-color': T.red, 
            'line-width': 1.5, 
            'line-dasharray': [4, 3] 
          },
        });

        exLayers.current.set(ex._id, { layerId: exLayerId, sourceId: exSourceId });
      });
    });
  }, [zones, mode, mapReady, setMode]);

  /* ───────────────────── DRAWING TOOLS ───────────────────── */
  const clearDraw = useCallback(() => {
    const map = mapInst.current;
    if (map) {
      // Remove click handler
      if ((map as any)._samClickHandler) {
        map.off('click', (map as any)._samClickHandler);
        (map as any)._samClickHandler = null;
      }
      map.getCanvas().style.cursor = '';

      // Remove draw preview layers
      try {
        if (map.getLayer('draw-preview-outline')) {
          map.removeLayer('draw-preview-outline');
        }
        if (map.getLayer('draw-preview-fill')) {
          map.removeLayer('draw-preview-fill');
        }
        if (map.getSource('draw-preview')) {
          map.removeSource('draw-preview');
        }
      } catch {}

      // Remove edit zone layers
      try {
        if (map.getLayer('edit-zone-outline')) {
          map.removeLayer('edit-zone-outline');
        }
        if (map.getLayer('edit-zone-fill')) {
          map.removeLayer('edit-zone-fill');
        }
        if (map.getSource('edit-zone')) {
          map.removeSource('edit-zone');
        }
      } catch {}
    }

    // Remove custom markers
    customMarkers.current.forEach(m => m.remove?.());
    customMarkers.current = [];
    setLivePointCount(0);

    // Remove editing polygon
    if (editingPolygon.current) {
      editingPolygon.current.remove?.();
      editingPolygon.current = null;
    }

    drawnPts.current = [];
  }, []);

  const updatePolygonPreview = useCallback((color: string) => {
    const map = mapInst.current;
    if (!map) return;

    const coords = customMarkers.current.map(m => {
      const ll = m.getLngLat();
      return [ll.lng, ll.lat];
    });

    if (coords.length < 3) return;

    coords.push(coords[0]); // Close polygon

    const geojson = {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [coords],
      },
      properties: {},
    };

    if (map.getSource('draw-preview')) {
      (map.getSource('draw-preview') as any).setData(geojson);
    } else {
      map.addSource('draw-preview', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'draw-preview-fill',
        type: 'fill',
        source: 'draw-preview',
        paint: { 'fill-color': color, 'fill-opacity': 0.18 },
      });
      map.addLayer({
        id: 'draw-preview-outline',
        type: 'line',
        source: 'draw-preview',
        paint: { 'line-color': color, 'line-width': 2.5, 'line-dasharray': [5, 4] },
      });
    }
  }, []);

  const startCustomDraw = useCallback((color: string) => {
    const map = mapInst.current;
    if (!map) return;
    map.getCanvas().style.cursor = 'crosshair';

    const onMapClick = (e: any) => {
      const cur = modeRef.current;
      if (cur.tag !== 'draw_new' && cur.tag !== 'draw_exclusion') return;

      const { lng, lat } = e.lngLat;

      const el = makeMarkerEl(color, String(customMarkers.current.length + 1), 24);
      const marker = new OlaMaps.Marker({ element: el, draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);

      // Update preview when dragged
      marker.on('dragend', () => {
        updatePolygonPreview(color);
      });

      customMarkers.current.push(marker);
      setLivePointCount(customMarkers.current.length);

      // Update polygon preview
      updatePolygonPreview(color);
    };

    (map as any)._samClickHandler = onMapClick;
    map.on('click', onMapClick);
  }, [updatePolygonPreview]);

  const finishCustomDraw = useCallback(() => {
    if (customMarkers.current.length < 3) {
      alert('Place at least 3 points first.');
      return;
    }
    drawnPts.current = customMarkers.current.map(m => {
      const ll = m.getLngLat();
      return { lat: ll.lat, lng: ll.lng };
    });
    const cur = modeRef.current;
    if (cur.tag === 'draw_new') setMode({ tag: 'confirm_new' });
    else if (cur.tag === 'draw_exclusion') setMode({ tag: 'confirm_exclusion', zone: cur.zone });
  }, [setMode]);

  const undoLastPoint = useCallback(() => {
    const map = mapInst.current;
    const last = customMarkers.current.pop();
    if (last && map) last.remove();
    setLivePointCount(customMarkers.current.length);
    const color = modeRef.current.tag === 'draw_exclusion' ? T.red : T.teal;
    updatePolygonPreview(color);
  }, [updatePolygonPreview]);

  const startDrawNewMode = useCallback((color: string) => {
    clearDraw();
    startCustomDraw(color);
  }, [clearDraw, startCustomDraw]);

  const startExclusionDrawMode = useCallback((zone: Zone) => {
    clearDraw();

    // Fit to zone
    const coords = zone.polygon.map(c => [c.lng, c.lat]);
    if (coords.length) {
      const bounds = coords.reduce((b: any, c: any) => b.extend(c), new OlaMaps.LngLatBounds(coords[0], coords[0]));
      mapInst.current?.fitBounds(bounds, { padding: 60 });
    }

    startCustomDraw(T.red);
  }, [clearDraw, startCustomDraw]);

  const startEditMode = useCallback((zone: Zone) => {
    clearDraw();

    const coords = zone.polygon.map(c => [c.lng, c.lat]);
    coords.push(coords[0]);

    drawnPts.current = zone.polygon.map(c => ({ ...c }));

    const geojson = {
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: [coords] },
      properties: {},
    };

    const map = mapInst.current;
    if (!map) return;

    if (map.getSource('edit-zone')) {
      try {
        if (map.getLayer('edit-zone-outline')) map.removeLayer('edit-zone-outline');
        if (map.getLayer('edit-zone-fill')) map.removeLayer('edit-zone-fill');
        map.removeSource('edit-zone');
      } catch {}
    }

    map.addSource('edit-zone', { type: 'geojson', data: geojson });
    map.addLayer({
      id: 'edit-zone-fill',
      type: 'fill',
      source: 'edit-zone',
      paint: { 'fill-color': T.amber, 'fill-opacity': 0.22 },
    });
    map.addLayer({
      id: 'edit-zone-outline',
      type: 'line',
      source: 'edit-zone',
      paint: { 'line-color': T.amber, 'line-width': 2.5 },
    });

    // Create draggable markers for each vertex
    zone.polygon.forEach((coord, idx) => {
      const el = makeMarkerEl('#ffffff', String(idx + 1), 14);
      const marker = new OlaMaps.Marker({ element: el, draggable: true })
        .setLngLat([coord.lng, coord.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const ll = marker.getLngLat();
        drawnPts.current[idx] = { lat: ll.lat, lng: ll.lng };
        updateEditPolygon();
      });

      customMarkers.current.push(marker);
    });
  }, [clearDraw]);

  const updateEditPolygon = useCallback(() => {
    const map = mapInst.current;
    if (!map) return;

    const coords = drawnPts.current.map(c => [c.lng, c.lat]);
    coords.push(coords[0]);

    const geojson = {
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: [coords] },
      properties: {},
    };

    if (map.getSource('edit-zone')) {
      (map.getSource('edit-zone') as any).setData(geojson);
    }
  }, []);

  const cancelDraw = useCallback(() => {
    clearDraw();
    const cur = modeRef.current;
    if (cur.tag === 'draw_exclusion' || cur.tag === 'confirm_exclusion' || cur.tag === 'editing') {
      setMode({ tag: 'detail', zone: (cur as any).zone });
    } else {
      setMode({ tag: 'idle' });
    }
  }, [clearDraw, setMode]);

  const finishDrawNew = useCallback(() => {
    if (drawnPts.current.length < 3 && customMarkers.current.length >= 3) {
      drawnPts.current = customMarkers.current.map(m => {
        const ll = m.getLngLat();
        return { lat: ll.lat, lng: ll.lng };
      });
    }
    if (drawnPts.current.length < 3) {
      alert('Shape needs at least 3 points.');
      return;
    }
    setMode({ tag: 'confirm_new' });
  }, [setMode]);

  const flyTo = (coords: [number, number]) =>
    mapInst.current?.flyTo({ center: [coords[1], coords[0]], zoom: 12, duration: 1100 });

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
    if (mode.tag === 'detail') {
      const zone = mode.zone;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
              <Button v="tonal" accent={T.amber} full
                onClick={() => {
                  startEditMode(zone);
                  setMode({ tag: 'editing', zone });
                }}>
                🔧 Edit Zone Shape
              </Button>

              <Button v={zone.serviceEnabled ? 'warn' : 'tonal'}
                accent={zone.serviceEnabled ? T.amber : T.teal} full
                onClick={() => toggleZone(zone)}>
                {zone.serviceEnabled ? '⏸ Disable Zone' : '▶ Enable Zone'}
              </Button>

              <Button v="tonal" accent={T.red} full
                onClick={() => {
                  setExLabel('');
                  setMode({ tag: 'draw_exclusion', zone });
                  startExclusionDrawMode(zone);
                }}>
                ✂️ Cut Area Out of Zone
              </Button>

              <Button v="danger" full onClick={() => deleteZone(zone)}>
                🗑️ Delete Zone
              </Button>
            </div>

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

    if (mode.tag === 'editing') {
      const zone = mode.zone;
      return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.amber, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: T.amber }}>Editing Boundary</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 2,
            padding: '6px 10px', borderRadius: 7, background: T.bg0,
            border: `1px solid ${T.line}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {zone.name}
          </div>

          <div style={{ padding: '11px 13px', borderRadius: 10,
            background: T.amber + '0c', border: `1px solid ${T.amber}28` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.amber,
              textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
              How to Edit
            </div>
            {[
              { n: '1', t: 'Drag markers', d: 'Pull numbered markers to reshape' },
              { n: '2', t: 'Adjust boundary', d: 'Move vertices to match real borders' },
              { n: '3', t: 'Click Save Shape', d: 'Saves your new boundary' },
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
        </div>
      );
    }

    if (mode.tag === 'draw_new') return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.teal,
            flexShrink: 0, animation: 'sam-pulse 1.5s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: T.teal }}>Drawing New Zone</span>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: T.t3,
          padding: '6px 10px', borderRadius: 7, background: T.bg0, border: `1px solid ${T.line}` }}>
          Click map to place vertices ({livePointCount} points)
        </div>

        <div style={{ padding: '11px 13px', borderRadius: 10,
          background: T.teal + '0c', border: `1px solid ${T.teal}28` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.teal,
            textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
            How to Draw
          </div>
          {[
            { n: '1', t: 'Click map', d: 'Place vertices around your zone' },
            { n: '2', t: 'Min 3 points', d: 'Need at least 3 to form polygon' },
            { n: '3', t: 'Click Finish', d: 'Complete and name your zone' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 9, marginBottom: 7, alignItems: 'flex-start' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%',
                background: T.teal, color: '#000',
                fontSize: 9, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1 }}>
                {s.n}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{s.t}</div>
                <div style={{ fontSize: 11, color: T.t3 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        {livePointCount > 0 && (
          <Button v="warn" full onClick={undoLastPoint}>
            ↶ Undo Last Point
          </Button>
        )}

        <Button v="fill" accent={T.teal} full
          disabled={livePointCount < 3}
          onClick={finishCustomDraw}
          style={{ padding: '12px 0', fontSize: 13 }}>
          ✅ Finish Drawing ({livePointCount} pts)
        </Button>

        <Button v="danger" full onClick={() => {
          if (window.confirm('Discard and go back?')) cancelDraw();
        }}>
          ✕ Cancel Drawing
        </Button>
      </div>
    );

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

    if (mode.tag === 'draw_exclusion') {
      const zone = mode.zone;
      return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.red, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: T.red }}>Drawing Cut-out</span>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: T.t1,
            padding: '6px 10px', borderRadius: 7, background: T.bg0,
            border: `1px solid ${T.line}`, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ✂️ Cutting inside: <span style={{ color: '#fca5a5' }}>{zone.name}</span>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: T.t3,
            padding: '6px 10px', borderRadius: 7, background: T.bg0, border: `1px solid ${T.line}` }}>
            Click map to place cut-out vertices ({livePointCount} points)
          </div>

          <div>
            <Lbl>Cut-out Label (optional)</Lbl>
            <Input value={exLabel}
              onChange={e => setExLabel(e.target.value)}
              placeholder="e.g. Airport, Lake…" />
          </div>

          {livePointCount > 0 && (
            <Button v="warn" full onClick={undoLastPoint}>
              ↶ Undo Last Point
            </Button>
          )}

          <Button v="fill" accent={T.red} full
            disabled={livePointCount < 3}
            onClick={finishCustomDraw}
            style={{ padding: '12px 0', fontSize: 13 }}>
            ✂️ Finish Cut-out ({livePointCount} pts)
          </Button>

          <Button v="danger" full onClick={() => {
            if (window.confirm('Discard cut-out and go back?')) cancelDraw();
          }}>
            ✕ Cancel
          </Button>
        </div>
      );
    }

    if (mode.tag === 'confirm_exclusion') {
      const zone = mode.zone;
      return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ padding: '10px 12px', borderRadius: 9,
            background: T.red + '0d', border: `1px solid ${T.red}30` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.red }}>✂️ Cut-out ready</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>
              {drawnPts.current.length} pts · ~{km2(drawnPts.current).toFixed(2)} km²
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

        {tab === 'generate' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.7, marginBottom: 14, padding: '10px 12px', borderRadius: 9, background: T.bg0, border: `1px solid ${T.line}` }}>
              Type a <b style={{ color: T.teal }}>city or state name</b> to automatically load clusters from OpenStreetMap.
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
            <Button v="ghost" full
              onClick={() => { setNewName(''); setNewType('cluster'); setMode({ tag: 'draw_new' }); startDrawNewMode(T.teal); }}>
              ✏️ Draw Zone Manually
            </Button>
          </div>
        )}

        {tab === 'zones' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:disabled { opacity: .4 !important; cursor: not-allowed !important; }
        @keyframes sam-spin { to { transform: rotate(360deg); } }
        @keyframes sam-progress { from { margin-left: 0; width: 50%; } to { margin-left: 50%; width: 40%; } }
        @keyframes sam-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.line2}; border-radius: 4px; }
        select option { background: ${T.bg2}; color: ${T.t1}; }
      `}</style>

      {toast && <Toast msg={toast} clear={() => setToast(null)} />}

      {/* TOP BAR */}
      <div style={{ background: T.bg2, borderBottom: `1px solid ${T.line}`,
        padding: '0 18px', height: 52, display: 'flex', alignItems: 'center',
        gap: 14, flexShrink: 0 }}>
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

      {/* BODY */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: 300, background: T.bg2, borderRight: `1px solid ${T.line}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          {renderSidebar()}
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          {!MAPS_KEY ? (
            <div style={{
              height: '100%', background: T.bg0, borderRadius: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '1px dashed ' + T.line, gap: 10,
            }}>
              <span style={{ fontSize: '2rem' }}>🗺️</span>
              <div style={{ color: T.t3, fontSize: '0.82rem', fontFamily: 'monospace', textAlign: 'center' }}>
                Add <span style={{ color: T.teal }}>VITE_OLA_MAPS_KEY</span> to your{' '}
                <span style={{ color: T.amber }}>.env</span> file
              </div>
            </div>
          ) : (
            <div ref={mapDiv} style={{ width: '100%', height: '100%' }} />
          )}

          {!mapReady && MAPS_KEY && (
            <div style={{ position: 'absolute', inset: 0, background: T.bg0,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 16 }}>
              <Spin size={40} color={T.teal} />
              <div style={{ color: T.t3, fontSize: 13 }}>Initialising Ola Maps…</div>
            </div>
          )}

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
              {mode.tag === 'draw_new'       && '✏️ Click map to place vertices · Min 3 points required'}
              {mode.tag === 'draw_exclusion' && '✂️ Click map to place cut-out vertices · Right-click marker to delete'}
              {mode.tag === 'editing'        && '🔧 Drag numbered markers to reshape boundary'}
            </div>
          )}

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