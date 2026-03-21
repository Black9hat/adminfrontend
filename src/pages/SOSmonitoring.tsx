/**
 * SOSMonitoring.tsx
 *
 * SOS Emergency Dashboard — fully self-contained, zero shared component imports.
 * Auth pattern matches ServiceAreaManagement.tsx (Bearer adminToken).
 * Socket connects with role:"admin" to join admin-room.
 *
 * Dependencies: react, socket.io-client, @react-google-maps/api
 */

import React, {
  useState, useMemo, useCallback, useEffect, useRef,
} from 'react';
import { io as socketIO } from 'socket.io-client';
import {
  GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline,
} from '@react-google-maps/api';

/* ═══════════════════════════════════════════════════════════
   CONFIG  (same pattern as ServiceAreaManagement)
═══════════════════════════════════════════════════════════ */
const API_BASE = (() => {
  const raw = (import.meta as any).env?.VITE_API_URL ?? '';
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '') || '';
})();

const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL ?? API_BASE;

const MAPS_KEY: string = (import.meta as any).env?.VITE_GOOGLE_MAPS_KEY ?? '';

// Auth headers — matches ServiceAreaManagement Bearer token pattern
// Also sends x-admin-token for the SOS endpoints that use verifyAdminToken
const authHdrs = () => ({
  'Authorization': `Bearer ${localStorage.getItem('adminToken') ?? ''}`,
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
  'x-admin-token': localStorage.getItem('adminToken') ?? '',
});

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS  (dark ops theme matching ServiceArea)
═══════════════════════════════════════════════════════════ */
const T = {
  bg0:    '#070d1a',
  bg1:    '#0d1525',
  bg2:    '#111e33',
  bg3:    '#172240',
  line:   '#1e2f4a',
  line2:  '#243654',
  red:    '#ef4444',
  redDim: 'rgba(239,68,68,0.12)',
  redBdr: 'rgba(239,68,68,0.35)',
  amber:  '#f5a623',
  blue:   '#4a9eff',
  green:  '#22c55e',
  teal:   '#00d4aa',
  t1:     '#e8f0fe',
  t2:     '#8fa8d4',
  t3:     '#4a6080',
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

/* ═══════════════════════════════════════════════════════════
   INJECT ANIMATIONS (once)
═══════════════════════════════════════════════════════════ */
if (typeof document !== 'undefined' && !document.getElementById('sos-anim')) {
  const s = document.createElement('style');
  s.id = 'sos-anim';
  s.textContent = `
    @keyframes sosPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}50%{box-shadow:0 0 0 10px rgba(239,68,68,0)}}
    @keyframes sosBlink{0%,100%{opacity:1}50%{opacity:.25}}
    @keyframes sosIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
    @keyframes sosFade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
    @keyframes sosSpin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════════════════════ */
async function sosGet(path: string) {
  const r = await fetch(API_BASE + path, { headers: authHdrs() });
  return r.json();
}

async function sosPost(path: string, body: object) {
  const r = await fetch(API_BASE + path, {
    method: 'POST',
    headers: authHdrs(),
    body: JSON.stringify(body),
  });
  return r.json();
}

/* ═══════════════════════════════════════════════════════════
   ATOM COMPONENTS  (all self-contained, no imports from ui/)
═══════════════════════════════════════════════════════════ */

// Spinner
const Spin = ({ size = 14, color = T.teal }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    style={{ animation: 'sosSpin .6s linear infinite', flexShrink: 0, display: 'inline-block' }}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity=".2" />
    <path d="M4 12a8 8 0 018-8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// Toast
interface ToastMsg { text: string; ok: boolean }
const Toast = ({ msg, clear }: { msg: ToastMsg; clear: () => void }) => {
  useEffect(() => { const t = setTimeout(clear, 5000); return () => clearTimeout(t); }, [clear]);
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, padding: '10px 18px', borderRadius: 10,
      background: msg.ok ? '#001a12' : '#1a0006',
      border: `1px solid ${msg.ok ? T.teal : T.red}50`,
      color: msg.ok ? T.teal : T.red,
      fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
      boxShadow: `0 8px 32px ${msg.ok ? T.teal : T.red}20`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span>{msg.ok ? '✓' : '⚠'}</span>
      {msg.text}
      <button onClick={clear} style={{ all: 'unset' as any, cursor: 'pointer', opacity: .4, marginLeft: 4 }}>✕</button>
    </div>
  );
};

// Inline Modal (no shared Modal component)
const SosModal = ({
  open, onClose, title, children, width = 600,
}: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; width?: number;
}) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(7,13,26,.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.bg2, border: `1px solid ${T.line2}`,
          borderRadius: 14, width: '100%', maxWidth: width,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: `0 24px 80px rgba(0,0,0,.7), 0 0 0 1px ${T.red}20`,
          animation: 'sosFade .2s ease',
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${T.line}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: T.t1 }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              all: 'unset' as any, cursor: 'pointer', width: 28, height: 28,
              borderRadius: 7, background: T.bg3, color: T.t3,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}
          >✕</button>
        </div>
        <div style={{ padding: '16px 18px' }}>{children}</div>
      </div>
    </div>
  );
};

// InfoRow  
const InfoRow = ({ label, value, color }: { label: string; value: any; color?: string }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '.06em', minWidth: 72, flexShrink: 0, paddingTop: 2 }}>{label}</span>
    <span style={{ fontSize: 13, color: color ?? T.t1, fontWeight: 500, wordBreak: 'break-all' }}>{value}</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   GOOGLE MAPS — Dark style
═══════════════════════════════════════════════════════════ */
const DARK_STYLE = [
  { elementType: 'geometry',          stylers: [{ color: '#0e1015' }] },
  { elementType: 'labels.text.fill',  stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke',stylers: [{ color: '#0e1015' }] },
  { featureType: 'road', elementType: 'geometry',         stylers: [{ color: '#1e2330' }] },
  { featureType: 'road', elementType: 'geometry.stroke',  stylers: [{ color: '#13161e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] },
  { featureType: 'water',elementType: 'geometry',         stylers: [{ color: '#080a0f' }] },
  { featureType: 'poi',  stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e2330' }] },
];

const MAP_OPTIONS = {
  styles: DARK_STYLE,
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

/* ═══════════════════════════════════════════════════════════
   SOS MAP — customer (RED pin) + driver (BLUE pin) + polyline
═══════════════════════════════════════════════════════════ */
interface SosMapProps {
  customerLoc?: { lat: number; lng: number } | null;
  driverLoc?:   { lat: number; lng: number } | null;
  height?: number;
}

function SosMap({ customerLoc, driverLoc, height = 380 }: SosMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_KEY,
    id: 'sos-map-instance',
  });

  const [activePin, setActivePin] = useState<string | null>(null);

  const center = useMemo(() => {
    if (customerLoc?.lat) return { lat: customerLoc.lat, lng: customerLoc.lng };
    if (driverLoc?.lat)   return { lat: driverLoc.lat,   lng: driverLoc.lng   };
    return DEFAULT_CENTER;
  }, [customerLoc, driverLoc]);

  const polyPath = useMemo(() => {
    if (!customerLoc?.lat || !driverLoc?.lat) return [];
    return [
      { lat: customerLoc.lat, lng: customerLoc.lng },
      { lat: driverLoc.lat,   lng: driverLoc.lng   },
    ];
  }, [customerLoc, driverLoc]);

  const makePin = (fill: string, emoji: string) =>
    'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
        <ellipse cx="18" cy="42" rx="7" ry="3.5" fill="rgba(0,0,0,.4)"/>
        <path d="M18 0C8.6 0 1 7.6 1 17c0 12.4 17 29 17 29S35 29.4 35 17C35 7.6 27.4 0 18 0z" fill="${fill}" stroke="#fff" stroke-width="2"/>
        <text x="18" y="22" text-anchor="middle" font-size="15">${emoji}</text>
      </svg>`
    );

  const placeholder = (msg: string, icon = '🗺️') => (
    <div style={{
      height, background: T.bg1, borderRadius: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 10, border: `1px dashed ${T.line}`,
    }}>
      <span style={{ fontSize: '1.8rem' }}>{icon}</span>
      <span style={{ color: T.t3, fontSize: 12, fontFamily: 'monospace' }}>{msg}</span>
    </div>
  );

  if (!MAPS_KEY) return placeholder('Add VITE_GOOGLE_MAPS_KEY to .env');
  if (loadError) return placeholder('Map failed — check API key & billing', '⚠️');
  if (!isLoaded) return (
    <div style={{ height, background: T.bg1, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size={28} />
    </div>
  );

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height, borderRadius: 10 }}
      center={center}
      zoom={customerLoc?.lat ? 15 : 11}
      options={MAP_OPTIONS}
    >
      {/* Customer — RED */}
      {customerLoc?.lat && customerLoc?.lng && (
        <Marker
          position={{ lat: customerLoc.lat, lng: customerLoc.lng }}
          title="Customer (SOS)"
          icon={{
            url: makePin('#ef4444', '👤'),
            scaledSize: new window.google.maps.Size(36, 46),
            anchor:     new window.google.maps.Point(18, 46),
          }}
          onClick={() => setActivePin(activePin === 'customer' ? null : 'customer')}
        >
          {activePin === 'customer' && (
            <InfoWindow onCloseClick={() => setActivePin(null)}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13 }}>
                <strong style={{ color: '#ef4444' }}>🚨 Customer</strong><br />
                <span style={{ color: '#6b7280', fontSize: 11 }}>
                  {customerLoc.lat.toFixed(5)}, {customerLoc.lng.toFixed(5)}
                </span>
              </div>
            </InfoWindow>
          )}
        </Marker>
      )}

      {/* Driver — BLUE */}
      {driverLoc?.lat && driverLoc?.lng && (
        <Marker
          position={{ lat: driverLoc.lat, lng: driverLoc.lng }}
          title="Driver"
          icon={{
            url: makePin('#4a9eff', '🚗'),
            scaledSize: new window.google.maps.Size(36, 46),
            anchor:     new window.google.maps.Point(18, 46),
          }}
          onClick={() => setActivePin(activePin === 'driver' ? null : 'driver')}
        >
          {activePin === 'driver' && (
            <InfoWindow onCloseClick={() => setActivePin(null)}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13 }}>
                <strong style={{ color: '#4a9eff' }}>🚗 Driver</strong><br />
                <span style={{ color: '#6b7280', fontSize: 11 }}>
                  {driverLoc.lat.toFixed(5)}, {driverLoc.lng.toFixed(5)}
                </span>
              </div>
            </InfoWindow>
          )}
        </Marker>
      )}

      {/* Connecting line */}
      {polyPath.length === 2 && (
        <Polyline
          path={polyPath}
          options={{ strokeColor: '#ef4444', strokeWeight: 2, strokeOpacity: 0.5 }}
        />
      )}
    </GoogleMap>
  );
}

/* ═══════════════════════════════════════════════════════════
   SOS ALERT CARD  (left panel list item)
═══════════════════════════════════════════════════════════ */
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function AlertCard({ alert, selected, onClick }: { alert: any; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position:     'relative',
        background:   selected ? T.redDim : T.bg1,
        border:       `1px solid ${selected ? T.red : alert.isEscalated ? T.amber : T.line}`,
        borderRadius: 10,
        padding:      '10px 10px 10px 14px',
        cursor:       'pointer',
        marginBottom: 8,
        animation:    'sosIn .22s ease',
        boxShadow:    selected ? `0 0 0 2px rgba(239,68,68,.2)` : 'none',
        transition:   'border .15s, background .15s',
        overflow:     'hidden',
      }}
    >
      {/* Left accent */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: alert.isEscalated ? T.amber : T.red,
        animation: 'sosPulse 2s infinite',
      }} />

      {/* Badges row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{
            background: T.red, color: '#fff', fontSize: 9, fontWeight: 800,
            letterSpacing: '.06em', padding: '2px 6px', borderRadius: 4,
            fontFamily: 'monospace', animation: 'sosBlink 1.8s infinite',
          }}>● ACTIVE</span>
          {alert.isEscalated && (
            <span style={{
              background: T.amber, color: '#000', fontSize: 9, fontWeight: 800,
              padding: '2px 6px', borderRadius: 4,
            }}>🚔 POLICE</span>
          )}
          {alert.sosType === 'MANUAL' && (
            <span style={{
              background: '#1e1060', color: '#a78bfa', fontSize: 9, fontWeight: 800,
              padding: '2px 6px', borderRadius: 4, letterSpacing: '.05em',
            }}>⚡ MANUAL SOS</span>
          )}
        </div>
        <span style={{ color: T.t3, fontSize: 10, fontFamily: 'monospace' }}>{timeAgo(alert.createdAt)}</span>
      </div>

      {/* Customer */}
      <div style={{ fontWeight: 700, fontSize: 13, color: T.t1, marginBottom: 2 }}>
        {alert.customerName || 'Unknown Customer'}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: T.t3, marginBottom: 5 }}>
        {alert.customerPhone || '—'}
      </div>

      {/* Driver */}
      <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 2 }}>
        🚗 {alert.driverName || 'No driver assigned'}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: T.t3, marginBottom: 6 }}>
        {alert.driverPhone || '—'}
      </div>

      {/* Vehicle chip */}
      {alert.vehicleNumber && (
        <span style={{
          background: '#1e2d45', color: '#93c5fd', fontSize: 10,
          fontFamily: 'monospace', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
        }}>
          {alert.vehicleNumber} · {alert.vehicleType || '—'}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SOUND HOOK
═══════════════════════════════════════════════════════════ */
function useSosSound() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const play = useCallback(() => {
    try {
      if (!ref.current) {
        ref.current = new Audio('/alert.mp3');
        ref.current.loop = true;
      }
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {}); // ignore autoplay block
      setPlaying(true);
    } catch (_) {}
  }, []);

  const stop = useCallback(() => {
    try {
      ref.current?.pause();
      if (ref.current) ref.current.currentTime = 0;
    } catch (_) {}
    setPlaying(false);
  }, []);

  return { playing, play, stop };
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function SOSMonitoring() {
  /* ── State ── */
  const [alerts,        setAlerts]        = useState<any[]>([]);
  const [selected,      setSelected]      = useState<any | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [acting,        setActing]        = useState(false);
  const [resolvedToday, setResolvedToday] = useState(0);
  const [socketLive,    setSocketLive]    = useState(false);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [toast,         setToast]         = useState<ToastMsg | null>(null);

  const { playing: soundOn, play: playAlarm, stop: stopAlarm } = useSosSound();
  const sockRef = useRef<ReturnType<typeof socketIO> | null>(null);

  const notify = useCallback((text: string, ok = true) => setToast({ text, ok }), []);

  /* ── Fetch active alerts ── */
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const d = await sosGet('/api/sos/active');
      if (d.success) setAlerts(d.alerts ?? []);
      else notify('Failed to load SOS alerts', false);
    } catch {
      notify('Network error loading alerts', false);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  /* ── Socket.IO ── */
  useEffect(() => {
    const sock = socketIO(SOCKET_URL, {
      query:               { role: 'admin' },
      auth:                { role: 'admin' },
      transports:          ['websocket'],
      reconnectionAttempts: 10,
    });
    sockRef.current = sock;

    sock.on('connect',    () => setSocketLive(true));
    sock.on('disconnect', () => setSocketLive(false));

    sock.on('SOS_ALERT', (p: any) => {
      setAlerts(prev => prev.find(a => a._id === p._id) ? prev : [p, ...prev]);
      playAlarm();
      notify('🚨 NEW SOS — ' + (p.customerName || 'Unknown customer'), false);
    });

    sock.on('SOS_LOCATION_UPDATE', (p: any) => {
      const patch = (a: any) => a._id === p._id ? { ...a, location: p.location } : a;
      setAlerts(prev => prev.map(patch));
      setSelected((prev: any) => prev?._id === p._id ? patch(prev) : prev);
    });

    sock.on('SOS_DRIVER_LOCATION_UPDATE', (p: any) => {
      const patch = (a: any) => a._id === p._id ? { ...a, driverLocation: p.driverLocation } : a;
      setAlerts(prev => prev.map(patch));
      setSelected((prev: any) => prev?._id === p._id ? patch(prev) : prev);
    });

    sock.on('SOS_RESOLVED', (p: any) => {
      setAlerts(prev => prev.filter(a => a._id !== p._id));
      setSelected((prev: any) => {
        if (prev?._id === p._id) { setModalOpen(false); return null; }
        return prev;
      });
      setResolvedToday(n => n + 1);
    });

    sock.on('SOS_ESCALATED', (p: any) => {
      const patch = (a: any) => a._id === p._id ? { ...a, isEscalated: true } : a;
      setAlerts(prev => prev.map(patch));
      setSelected((prev: any) => prev?._id === p._id ? patch(prev) : prev);
    });

    return () => { sock.disconnect(); };
  }, [playAlarm, notify]);

  /* ── Actions ── */
  const selectAlert = useCallback((alert: any) => {
    setSelected(alert);
    stopAlarm();
  }, [stopAlarm]);

  const openModal = useCallback((alert: any) => {
    setSelected(alert);
    setModalOpen(true);
    stopAlarm();
  }, [stopAlarm]);

  const handleResolve = useCallback(async (sos: any) => {
    if (!sos) return;
    setActing(true);
    try {
      const d = await sosPost('/api/sos/resolve', { sos_id: sos._id, resolvedBy: 'admin' });
      if (d.success) {
        notify('✅ SOS resolved');
        setAlerts(prev => prev.filter(a => a._id !== sos._id));
        setResolvedToday(n => n + 1);
        setSelected(null);
        setModalOpen(false);
      } else {
        notify(d.message || 'Resolve failed', false);
      }
    } catch { notify('Network error', false); }
    finally { setActing(false); }
  }, [notify]);

  const handleEscalate = useCallback(async (sos: any) => {
    if (!sos) return;
    if (sos.isEscalated) { notify('Already escalated'); return; }
    setActing(true);
    try {
      const d = await sosPost('/api/sos/escalate', { sos_id: sos._id });
      if (d.success) {
        notify('🚔 Police notified');
        const updated = { ...sos, isEscalated: true };
        setSelected(updated);
        setAlerts(prev => prev.map(a => a._id === sos._id ? updated : a));
      } else {
        notify(d.message || 'Escalate failed', false);
      }
    } catch { notify('Network error', false); }
    finally { setActing(false); }
  }, [notify]);

  /* ── Derived ── */
  const escalatedCount = useMemo(() => alerts.filter(a => a.isEscalated).length, [alerts]);

  const customerLoc = selected?.location?.lat != null
    ? { lat: selected.location.lat,       lng: selected.location.lng }
    : null;

  const driverLoc = selected?.driverLocation?.lat != null
    ? { lat: selected.driverLocation.lat, lng: selected.driverLocation.lng }
    : null;

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg0,
      padding: '1.5rem',
      fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
      color: T.t1,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,700;0,9..40,800&display=swap');
        * { box-sizing: border-box; }
        button:disabled { opacity:.4 !important; cursor:not-allowed !important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${T.line2}; border-radius:4px; }
      `}</style>

      {toast && <Toast msg={toast} clear={() => setToast(null)} />}

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        {/* Title + socket status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: T.redDim, border: `1px solid ${T.redBdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem',
            animation: alerts.length > 0 ? 'sosPulse 1.8s infinite' : 'none',
          }}>🚨</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: T.t1, letterSpacing: '-.01em' }}>
              SOS Emergency Dashboard
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: socketLive ? T.green : T.red,
                display: 'inline-block',
              }} />
              <span style={{ fontSize: 11, color: T.t3, fontFamily: 'monospace' }}>
                {socketLive ? 'LIVE — real-time connected' : 'Connecting to socket…'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {soundOn && (
            <button
              onClick={stopAlarm}
              style={{
                background: T.redDim, border: `1px solid ${T.redBdr}`,
                color: T.red, borderRadius: 8, padding: '7px 14px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                animation: 'sosBlink .7s infinite',
              }}
            >
              ✕ Stop Alarm
            </button>
          )}
          <button
            onClick={fetchAlerts}
            style={{
              background: T.bg3, border: `1px solid ${T.line2}`,
              color: T.t2, borderRadius: 8, padding: '7px 14px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {loading ? <Spin size={12} /> : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem',
      }}>
        {[
          { label: 'Active SOS',     value: alerts.length,             icon: '🆘', color: T.red   },
          { label: 'Escalated',      value: escalatedCount,            icon: '🚔', color: T.amber },
          { label: 'Resolved Today', value: resolvedToday,             icon: '✅', color: T.green },
          { label: 'Socket',         value: socketLive ? 'LIVE' : 'OFF', icon: '📡', color: socketLive ? T.green : T.t3 },
        ].map(s => (
          <div key={s.label} style={{
            background: T.bg2, border: `1px solid ${T.line}`,
            borderRadius: 10, padding: '0.875rem',
            animation: 'sosFade .3s ease',
          }}>
            <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: T.t3, marginTop: 3, letterSpacing: '.05em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', alignItems: 'start' }}>

        {/* ── LEFT: Alert list ── */}
        <div style={{
          background: T.bg2, border: `1px solid ${T.line}`,
          borderRadius: 12, overflow: 'hidden',
          maxHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column',
        }}>
          {/* List header */}
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${T.line}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 800, fontSize: 12, color: T.t1 }}>🚨 Active Alerts</span>
            <span style={{
              background: T.red, color: '#fff', borderRadius: 20,
              padding: '1px 9px', fontSize: 10, fontWeight: 800,
            }}>{alerts.length}</span>
          </div>

          {/* List body */}
          <div style={{ overflowY: 'auto', padding: '8px', flex: 1 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: T.t3 }}>
                <Spin size={22} /><br />
                <span style={{ fontSize: 12, marginTop: 10, display: 'block' }}>Loading…</span>
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
                <div style={{ color: T.green, fontWeight: 700, fontSize: 13 }}>All clear</div>
                <div style={{ color: T.t3, fontSize: 11, marginTop: 4 }}>No active SOS alerts</div>
              </div>
            ) : (
              alerts.map(alert => (
                <AlertCard
                  key={alert._id}
                  alert={alert}
                  selected={selected?._id === alert._id}
                  onClick={() => selectAlert(alert)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Map + detail ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Map card */}
          <div style={{
            background: T.bg2,
            border: `1px solid ${selected ? T.redBdr : T.line}`,
            borderRadius: 12, overflow: 'hidden',
            boxShadow: selected ? `0 0 28px rgba(239,68,68,.1)` : 'none',
            transition: 'border .3s, box-shadow .3s',
          }}>
            <div style={{
              padding: '10px 14px', borderBottom: `1px solid ${T.line}`,
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <span style={{ fontWeight: 800, fontSize: 12, color: T.t1 }}>📍 Live Tracking Map</span>
              {selected ? (
                <span style={{
                  background: T.redDim, border: `1px solid ${T.redBdr}`,
                  color: T.red, fontSize: 9, fontWeight: 800,
                  padding: '2px 8px', borderRadius: 4, letterSpacing: '.06em',
                  animation: 'sosBlink 1.4s infinite',
                }}>● TRACKING</span>
              ) : (
                <span style={{ color: T.t3, fontSize: 11 }}>← Select an alert</span>
              )}
            </div>

            <div style={{ padding: '10px' }}>
              <SosMap customerLoc={customerLoc} driverLoc={driverLoc} height={400} />
            </div>

            {/* Legend */}
            {selected && (
              <div style={{ padding: '6px 14px 12px', display: 'flex', gap: 16 }}>
                {[{ c: T.red, l: 'Customer (SOS)' }, { c: T.blue, l: 'Driver' }].map(x => (
                  <span key={x.l} style={{ fontSize: 11, color: T.t3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: x.c, display: 'inline-block' }} />
                    {x.l}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Inline detail panel */}
          {selected && (
            <div style={{
              background: T.bg2, border: `1px solid ${T.line}`,
              borderRadius: 12, padding: '1rem',
              animation: 'sosFade .2s ease',
            }}>
              {/* Panel header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: T.t1 }}>
                    🚨 Alert &nbsp;
                    <span style={{ fontFamily: 'monospace', color: T.t3, fontWeight: 400, fontSize: 11 }}>
                      …{selected._id?.slice(-10)}
                    </span>
                  </span>
                  {selected.sosType === 'MANUAL' && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: '#150d3a', border: '1px solid #6d28d9',
                      borderRadius: 8, padding: '6px 12px', flexWrap: 'wrap',
                    }}>
                      <span style={{
                        background: '#1e1060', color: '#a78bfa', fontSize: 10, fontWeight: 800,
                        padding: '2px 8px', borderRadius: 4, letterSpacing: '.05em', flexShrink: 0,
                      }}>⚡ MANUAL SOS TRIGGER</span>
                      {selected.emergencyContact && (
                        <span style={{ color: '#c4b5fd', fontSize: 11, fontFamily: 'monospace' }}>
                          Emergency contact saved by customer:&nbsp;
                          <a href={'tel:' + selected.emergencyContact}
                            style={{ color: '#a78bfa', fontWeight: 700, textDecoration: 'underline' }}>
                            {selected.emergencyContact}
                          </a>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{ all: 'unset' as any, cursor: 'pointer', color: T.t3, fontSize: 18, lineHeight: 1 }}
                >×</button>
              </div>

              {/* Customer + Driver boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[
                  { title: '👤 CUSTOMER', tc: T.red,  name: selected.customerName, phone: selected.customerPhone, hc: T.red,  hd: T.redDim, hb: T.redBdr },
                  { title: '🚗 DRIVER',   tc: T.blue, name: selected.driverName,   phone: selected.driverPhone,   hc: T.blue, hd: 'rgba(74,158,255,.12)', hb: 'rgba(74,158,255,.35)' },
                ].map(p => (
                  <div key={p.title} style={{
                    background: T.bg0, borderRadius: 8,
                    padding: '10px', border: `1px solid ${T.line}`,
                  }}>
                    <div style={{ fontSize: 9, color: p.tc, fontWeight: 800, letterSpacing: '.08em', marginBottom: 6 }}>{p.title}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.t1, marginBottom: 2 }}>{p.name || '—'}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: T.t3, marginBottom: 8 }}>{p.phone || '—'}</div>
                    {p.phone && (
                      <a
                        href={'tel:' + p.phone}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: p.hd, border: `1px solid ${p.hb}`,
                          color: p.hc, borderRadius: 6, padding: '3px 10px',
                          fontSize: 11, fontWeight: 700, textDecoration: 'none',
                        }}
                      >
                        📞 Call
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Meta chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {selected.vehicleNumber && (
                  <span style={{ background: '#1e2d45', color: '#93c5fd', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, padding: '3px 9px', borderRadius: 4 }}>
                    {selected.vehicleNumber} · {selected.vehicleType || '—'}
                  </span>
                )}
                <span style={{ background: T.bg0, color: T.t3, fontSize: 10, fontFamily: 'monospace', padding: '3px 9px', borderRadius: 4 }}>
                  Trip …{(selected.tripId ?? '').slice(-8).toUpperCase()}
                </span>
                <span style={{ background: T.bg0, color: T.t3, fontSize: 10, fontFamily: 'monospace', padding: '3px 9px', borderRadius: 4 }}>
                  {new Date(selected.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                {selected.sosType === 'MANUAL' ? (
                  <span style={{ background: '#1e1060', color: '#a78bfa', fontSize: 10, fontFamily: 'monospace', fontWeight: 800, padding: '3px 9px', borderRadius: 4 }}>
                    ⚡ MANUAL SOS
                  </span>
                ) : (
                  <span style={{ background: T.bg0, color: T.t3, fontSize: 10, fontFamily: 'monospace', padding: '3px 9px', borderRadius: 4 }}>
                    {selected.sosType ?? 'TRIPLE_TAP'}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Escalate */}
                <button
                  onClick={() => handleEscalate(selected)}
                  disabled={acting || selected.isEscalated}
                  style={{
                    background:   selected.isEscalated ? '#1c1917' : '#451a03',
                    border:       `1px solid ${selected.isEscalated ? '#44403c' : T.amber}`,
                    color:        selected.isEscalated ? '#78716c' : T.amber,
                    borderRadius: 8, padding: '8px 14px',
                    fontSize: 12, fontWeight: 700,
                    cursor:       acting || selected.isEscalated ? 'not-allowed' : 'pointer',
                    display:      'flex', alignItems: 'center', gap: 6,
                    transition:   'all .15s',
                  }}
                >
                  🚔 {selected.isEscalated ? 'Police Notified ✓' : 'Escalate to Police'}
                </button>

                {/* Resolve */}
                <button
                  onClick={() => handleResolve(selected)}
                  disabled={acting}
                  style={{
                    background: '#052e16', border: `1px solid ${T.green}`,
                    color: T.green, borderRadius: 8, padding: '8px 14px',
                    fontSize: 12, fontWeight: 700,
                    cursor: acting ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all .15s',
                  }}
                >
                  {acting ? <><Spin size={12} color={T.green} /> Working…</> : '✅ Mark Resolved'}
                </button>

                {/* Full detail */}
                <button
                  onClick={() => openModal(selected)}
                  style={{
                    background: T.bg3, border: `1px solid ${T.line2}`,
                    color: T.t2, borderRadius: 8, padding: '8px 14px',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Full Detail →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FULL DETAIL MODAL ── */}
      <SosModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={'🚨 SOS — ' + (selected?.customerName ?? 'Unknown')}
        width={640}
      >
        {selected && (
          <>
            {/* Map */}
            <div style={{ marginBottom: 16 }}>
              <SosMap customerLoc={customerLoc} driverLoc={driverLoc} height={240} />
            </div>

            {/* Customer + Driver */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ background: T.bg0, borderRadius: 8, padding: '12px', border: `1px solid ${T.line}` }}>
                <div style={{ fontSize: 9, color: T.red, fontWeight: 800, letterSpacing: '.08em', marginBottom: 8 }}>👤 CUSTOMER</div>
                <InfoRow label="Name"  value={selected.customerName  || '—'} />
                <InfoRow label="Phone" value={selected.customerPhone || '—'} />
                {selected.customerPhone && (
                  <a href={'tel:' + selected.customerPhone} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, background: T.redDim, border: `1px solid ${T.redBdr}`, color: T.red, borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                    📞 Call Customer
                  </a>
                )}
              </div>
              <div style={{ background: T.bg0, borderRadius: 8, padding: '12px', border: `1px solid ${T.line}` }}>
                <div style={{ fontSize: 9, color: T.blue, fontWeight: 800, letterSpacing: '.08em', marginBottom: 8 }}>🚗 DRIVER</div>
                <InfoRow label="Name"    value={selected.driverName    || '—'} />
                <InfoRow label="Phone"   value={selected.driverPhone   || '—'} />
                <InfoRow label="Vehicle" value={(selected.vehicleNumber || '—') + ' · ' + (selected.vehicleType || '—')} />
                {selected.driverPhone && (
                  <a href={'tel:' + selected.driverPhone} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, background: 'rgba(74,158,255,.12)', border: `1px solid rgba(74,158,255,.35)`, color: T.blue, borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                    📞 Call Driver
                  </a>
                )}
              </div>
            </div>

            {/* Meta */}
            <div style={{ marginBottom: 14 }}>
              {selected.sosType === 'MANUAL' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  background: '#150d3a', border: '1px solid #6d28d9',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 10,
                }}>
                  <span style={{
                    background: '#1e1060', color: '#a78bfa', fontSize: 10, fontWeight: 800,
                    padding: '2px 8px', borderRadius: 4, letterSpacing: '.05em',
                  }}>⚡ MANUAL SOS TRIGGER</span>
                  <span style={{ color: '#c4b5fd', fontSize: 11 }}>
                    Triggered from SOS page (not during a ride)
                  </span>
                  {selected.emergencyContact && (
                    <div style={{ width: '100%', marginTop: 4 }}>
                      <InfoRow
                        label="Emergency Contact"
                        value={
                          <a href={'tel:' + selected.emergencyContact}
                            style={{ color: '#a78bfa', fontWeight: 700, textDecoration: 'underline', fontFamily: 'monospace' }}>
                            {selected.emergencyContact}
                          </a>
                        }
                        color="#a78bfa"
                      />
                    </div>
                  )}
                </div>
              )}
              <InfoRow label="Trip ID"   value={'…' + (selected.tripId ?? '—').slice(-12).toUpperCase()} />
              <InfoRow label="SOS Type"  value={selected.sosType ?? 'TRIPLE_TAP'} />
              <InfoRow label="Triggered" value={new Date(selected.createdAt).toLocaleString('en-IN')} />
              <InfoRow label="Priority"  value={selected.priority ?? 'HIGH'} color={T.red} />
              {selected.isEscalated && <InfoRow label="Police" value="Contacted ✓" color={T.amber} />}
            </div>

            {/* Status history */}
            {selected.statusHistory?.length > 0 && (
              <div style={{ background: T.bg0, borderRadius: 8, padding: '10px 12px', border: `1px solid ${T.line}`, marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: T.t3, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>Status History</div>
                {selected.statusHistory.map((h: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 12, fontSize: 11, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'monospace', color: T.t3 }}>
                      {new Date(h.timestamp).toLocaleTimeString('en-IN')}
                    </span>
                    <span style={{
                      fontWeight: 700,
                      color: h.status === 'ACTIVE' ? T.green
                        : h.status === 'ESCALATED' ? T.amber
                        : h.status.includes('RESOLVED') ? T.teal
                        : T.t1,
                    }}>{h.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Modal action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => handleEscalate(selected)}
                disabled={acting || selected.isEscalated}
                style={{
                  background: selected.isEscalated ? '#1c1917' : '#451a03',
                  border: `1px solid ${selected.isEscalated ? '#44403c' : T.amber}`,
                  color:  selected.isEscalated ? '#78716c' : T.amber,
                  borderRadius: 8, padding: '9px 16px',
                  fontSize: 13, fontWeight: 700,
                  cursor: acting || selected.isEscalated ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                🚔 {selected.isEscalated ? 'Police Notified ✓' : 'Escalate to Police'}
              </button>

              <button
                onClick={() => handleResolve(selected)}
                disabled={acting}
                style={{
                  background: '#052e16', border: `1px solid ${T.green}`,
                  color: T.green, borderRadius: 8, padding: '9px 16px',
                  fontSize: 13, fontWeight: 700,
                  cursor: acting ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {acting ? <><Spin size={13} color={T.green} /> Working…</> : '✅ Mark Resolved'}
              </button>
            </div>
          </>
        )}
      </SosModal>
    </div>
  );
}
