import Echo from 'laravel-echo';
import type PusherTypes from 'pusher-js';
import * as PusherNamespace from 'pusher-js';

import { API_BASE_URL } from './apiClient';

type PusherCtor = typeof PusherTypes;

function getPusherConstructor(): PusherCtor {
  const raw = (PusherNamespace as unknown as { default?: unknown }).default ?? PusherNamespace;
  if (typeof raw === 'function') return raw as PusherCtor;
  throw new Error('Pusher: expected a constructor (check Metro default export interop).');
}

type Unsubscribe = () => void;

/** Dihantar oleh `SessionPasLawatanRealtime` apabila broadcast `pas_lawatan.updated` diterima. */
export const PELAWAT_AKTIF_SYNC_EVENT = 'eps:pelawat-aktif-sync' as const;

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return '';
  }
}

function getDefaultWsHost() {
  try {
    return new URL(API_BASE_URL).hostname;
  } catch {
    return '';
  }
}

function normalizeWsHost(rawHost: string, fallbackScheme: string) {
  const trimmed = rawHost.trim();
  if (!trimmed) return { host: '', port: undefined as number | undefined };

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `${fallbackScheme}://${trimmed}`);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : undefined,
    };
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
  const hostInput = process.env.EXPO_PUBLIC_REVERB_HOST?.trim() || getDefaultWsHost();
  const normalizedHost = normalizeWsHost(hostInput, scheme);
  const port = Number(
    process.env.EXPO_PUBLIC_REVERB_PORT?.trim() ||
      normalizedHost.port ||
      (scheme === 'https' ? 443 : 80)
  );
  const apiOrigin = getApiOrigin();

  if (!key || !normalizedHost.host || !apiOrigin || !Number.isFinite(port)) return null;

  return {
    key,
    host: normalizedHost.host,
    port,
    forceTLS: scheme === 'https',
    authEndpoint: `${apiOrigin}/api/pengawal/broadcasting/auth`,
  };
}

function createEcho(token: string) {
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
 * Langgan saluran sulit `pengawal.pelawat` (nama Pusher: private-pengawal.pelawat).
 * Callback dipanggil untuk setiap broadcast `pas_lawatan.updated`
 * daripada event Laravel `App\Events\PasLawatanUpdated` (API `PasLawatanController`:
 * selepas pas dibuat / keluar / create_denied).
 *
 * Prefer panggil dari root layout sahaja ({@link SessionPasLawatanRealtime} dalam `app/_layout.tsx`)
 * supaya langganan kekal aktif walaupun skrin lain (cth create pas lawatan) sedang dibuka —
 * pendengaran pada skrin `senaraiPelawat` sahaja boleh terhenti selepas blur/unmount tab.
 *
 * Prasyarat pelayan: `BROADCAST_CONNECTION=reverb`, Reverb berjalan, token Sanctum sah untuk
 * `/api/pengawal/broadcasting/auth`.
 */
export function subscribeToPelawatAktifUpdates(
  token: string,
  onUpdated: () => void
): Unsubscribe {
  if (!token) return () => {};

  let echo: InstanceType<typeof Echo> | null = null;
  try {
    echo = createEcho(token);
  } catch (e) {
    console.warn('[realtime] Echo / Pusher init failed:', e);
    return () => {};
  }
  if (!echo) return () => {};

  const channelName = 'pengawal.pelawat';
  const channel = echo.private(channelName);
  channel.listen('.pas_lawatan.updated', onUpdated);

  return () => {
    try {
      channel.stopListening('.pas_lawatan.updated');
      echo.leave(channelName);
      echo.disconnect();
    } catch {
      // Ignore cleanup failures during app navigation/unmount.
    }
  };
}
