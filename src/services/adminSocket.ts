// src/services/adminSocket.ts
// ─────────────────────────────────────────────────────────────────────────────
// Singleton Socket.IO connection for the admin panel.
// Connects once, joins admin-room, and exposes typed event subscriptions.
//
// Usage:
//   import { getAdminSocket, onDriverLocationUpdate, offDriverLocationUpdate } from './adminSocket';
//   const socket = getAdminSocket();
// ─────────────────────────────────────────────────────────────────────────────

import { io, Socket } from 'socket.io-client';

// ── Types ──────────────────────────────────────────────────────────────────
export interface AdminDriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  isOnline: boolean;
  vehicleType?: string;
  name?: string;
  phone?: string;
  vehicleNumber?: string;
  tripId?: string;
  bearing?: number;
  timestamp: string;
}

export interface AdminDriverStatusChange {
  driverId: string;
  isOnline: boolean;
  vehicleType?: string;
  name?: string;
  phone?: string;
  timestamp: string;
}

// ── Singleton state ────────────────────────────────────────────────────────
let _socket: Socket | null = null;
let _connected = false;
let _joinedAdminRoom = false;

// ── Connection ─────────────────────────────────────────────────────────────
export function getAdminSocket(): Socket {
  if (_socket && _connected) return _socket;

  const BASE_URL =
    (import.meta as any).env?.VITE_API_URL ||
    (import.meta as any).env?.VITE_SOCKET_URL ||
    'http://localhost:5000';

  const ADMIN_TOKEN =
    (import.meta as any).env?.VITE_ADMIN_TOKEN || '';

  _socket = io(BASE_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    // Tell backend this is an admin connection so it auto-joins admin-room
    query: { role: 'admin', token: ADMIN_TOKEN },
    auth: { role: 'admin', token: ADMIN_TOKEN },
  });

  _socket.on('connect', () => {
    _connected = true;
    console.log('👨‍💼 Admin socket connected:', _socket!.id);

    // Belt-and-suspenders: emit admin:join in case query-based join didn't fire
    if (!_joinedAdminRoom) {
      _socket!.emit('admin:join');
      _joinedAdminRoom = true;
    }
  });

  _socket.on('admin:connected', (data: any) => {
    console.log('✅ Admin joined admin-room:', data);
  });

  _socket.on('admin:joined', (data: any) => {
    console.log('✅ Admin:join confirmed:', data);
  });

  _socket.on('disconnect', (reason) => {
    _connected = false;
    _joinedAdminRoom = false;
    console.warn('⚠️ Admin socket disconnected:', reason);
  });

  _socket.on('reconnect', () => {
    console.log('🔄 Admin socket reconnected — rejoining admin-room');
    _socket!.emit('admin:join');
    _joinedAdminRoom = true;
  });

  _socket.on('connect_error', (err) => {
    console.error('❌ Admin socket connect error:', err.message);
  });

  return _socket;
}

// ── Event helpers ──────────────────────────────────────────────────────────

/** Subscribe to real-time driver location pings (fires every ~5s per driver) */
export function onDriverLocationUpdate(
  handler: (data: AdminDriverLocation) => void
): void {
  getAdminSocket().on('admin:driverLocationUpdate', handler);
}

export function offDriverLocationUpdate(
  handler: (data: AdminDriverLocation) => void
): void {
  _socket?.off('admin:driverLocationUpdate', handler);
}

/** Subscribe to driver online/offline status changes */
export function onDriverStatusChange(
  handler: (data: AdminDriverStatusChange) => void
): void {
  getAdminSocket().on('admin:driverStatusChange', handler);
}

export function offDriverStatusChange(
  handler: (data: AdminDriverStatusChange) => void
): void {
  _socket?.off('admin:driverStatusChange', handler);
}

/** Destroy the singleton (call on admin logout / app unmount) */
export function disconnectAdminSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
    _connected = false;
    _joinedAdminRoom = false;
    console.log('🔌 Admin socket disconnected (explicit)');
  }
}

export function isAdminSocketConnected(): boolean {
  return _connected;
}