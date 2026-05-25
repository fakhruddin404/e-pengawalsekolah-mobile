import Echo from 'laravel-echo';
import type PusherTypes from 'pusher-js';
import * as PusherNamespace from 'pusher-js';

import { api } from './apiClient';
import { API_BASE_URL } from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifType =
  | 'rondaan_created'
  | 'sos_created'
  | 'laporan_created'
  | 'pelawat_created'
  | 'pelawat_updated';

export type NotifItem = {
  id: string;
  type: NotifType | string;
  title: string;
  message: string;
  meta: Record<string, unknown>;
  occurred_at: string;
  is_read: boolean;
};

export type DashboardKpi = {
  rondaan_hari_ini: number;
  pelawat_hari_ini: number;
};

export type DashboardStatsResponse = {
  pgw_id: string;
  kpi: DashboardKpi;
  notifikasi: NotifItem[];
};

export type ActivityPayload = {
  type: NotifType | string;
  title: string;
  message: string;
  meta: Record<string, unknown>;
  occurred_at: string;
  kpi: DashboardKpi;
};

type Unsubscribe = () => void;
type PusherCtor = typeof PusherTypes;

// ─── REST helpers ─────────────────────────────────────────────────────────────

/**
 * GET /api/pengawal/dashboard-stats
 * Returns KPI counts + notification history for the current pengawal.
 */
export async function fetchDashboardStats(
  token: string
): Promise<DashboardStatsResponse> {
  const res = await api.get<{ success: boolean; data: DashboardStatsResponse }>(
    'dashboard-stats',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const d = res.data?.data;
  return {
    pgw_id: d?.pgw_id ?? '',
    kpi: {
      rondaan_hari_ini: Number(d?.kpi?.rondaan_hari_ini ?? 0),
      pelawat_hari_ini: Number(d?.kpi?.pelawat_hari_ini ?? 0),
    },
    notifikasi: Array.isArray(d?.notifikasi) ? d.notifikasi : [],
  };
}

/**
 * POST /api/pengawal/notifikasi/{id}/baca
 */
export async function markNotificationRead(
  token: string,
  id: string
): Promise<void> {
  await api.post(
    `notifikasi/${id}/baca`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

/**
 * POST /api/pengawal/notifikasi/baca-semua
 */
export async function markAllNotificationsRead(token: string): Promise<void> {
  await api.post(
    'notifikasi/baca-semua',
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// ─── Real-time (Laravel Echo / Reverb) ───────────────────────────────────────

function getPusherConstructor(): PusherCtor {
  const raw = (PusherNamespace as unknown as { default?: unknown }).default ?? PusherNamespace;
  if (typeof raw === 'function') return raw as PusherCtor;
  throw new Error('Pusher: expected a constructor.');
}

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return '';
  }
}

function normalizeWsHost(rawHost: string, fallbackScheme: string) {
  const trimmed = rawHost.trim();
  if (!trimmed) return { host: '', port: undefined as number | undefined };
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `${fallbackScheme}://${trimmed}`);
    return { host: url.hostname, port: url.port ? Number(url.port) : undefined };
  } catch {
    return {
      host: trimmed.replace(/^https?:\/\//, '').split('/')[0].split(':')[0],
      port: undefined,
    };
  }
}

function getReverbConfig() {
  const key = process.env.EXPO_PUBLIC_REVERB_APP_KEY?.trim() ?? '';
  const scheme = process.env.EXPO_PUBLIC_REVERB_SCHEME?.trim() || 'https';
  const hostInput = process.env.EXPO_PUBLIC_REVERB_HOST?.trim() || new URL(API_BASE_URL).hostname;
  const { host, port: parsedPort } = normalizeWsHost(hostInput, scheme);
  const port = Number(
    process.env.EXPO_PUBLIC_REVERB_PORT?.trim() || parsedPort || (scheme === 'https' ? 443 : 80)
  );
  const apiOrigin = getApiOrigin();

  if (!key || !host || !apiOrigin || !Number.isFinite(port)) return null;

  return {
    key,
    host,
    port,
    forceTLS: scheme === 'https',
    authEndpoint: `${apiOrigin}/api/pengawal/broadcasting/auth`,
  };
}

function createEcho(token: string): InstanceType<typeof Echo> | null {
  const config = getReverbConfig();
  if (!config) return null;

  const PusherClient = getPusherConstructor();
  (globalThis as { Pusher?: PusherCtor }).Pusher = PusherClient;

  return new Echo({
    broadcaster: 'reverb',
    Pusher: PusherClient,
    key: config.key,
    wsHost: config.host,
    wsPort: config.port,
    wssPort: config.port,
    forceTLS: config.forceTLS,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: config.authEndpoint,
    auth: {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

/**
 * Subscribe to the pengawal's private activity channel.
 * The callback is called with each `pengawal.activity` event payload,
 * which includes the notification data AND updated KPI counts.
 *
 * @returns Unsubscribe function — call on component unmount.
 */
export function subscribeToPengawalActivity(
  token: string,
  pgwId: string,
  onActivity: (payload: ActivityPayload) => void
): Unsubscribe {
  if (!token || !pgwId) return () => {};

  let echo: InstanceType<typeof Echo> | null = null;
  try {
    echo = createEcho(token);
  } catch (e) {
    console.warn('[notificationService] Echo init failed:', e);
    return () => {};
  }
  if (!echo) return () => {};

  const channelName = `pengawal.${pgwId}`;
  const channel = echo.private(channelName);
  channel.listen('.pengawal.activity', onActivity);

  return () => {
    try {
      channel.stopListening('.pengawal.activity');
      echo.leave(channelName);
      echo.disconnect();
    } catch {
      // Ignore cleanup failures.
    }
  };
}
