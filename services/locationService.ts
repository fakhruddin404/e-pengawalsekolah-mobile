import * as Location from 'expo-location';

import { api, formatAxiosError } from './apiClient';

export type LocationPingPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: string; // ISO string
};

export type StartLocationPingOptions = {
  distanceIntervalM?: number;
  enSendsMs?: number;
  accuracy?: Location.LocationAccuracy;
};

export async function postLocationPing(
  token: string,
  payload: LocationPingPayload,
) {
  try {
    const res = await api.post<any>(
      'location-ping',
      payload, 
      {
      headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data;
  } catch (e: any) {
    throw new Error(formatAxiosError(e, 'Gagal menghantar lokasi semasa.'));
  }
}

function toPingPayload(pos: Location.LocationObject): LocationPingPayload {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null,
    altitude: pos.coords.altitude ?? null,
    heading: pos.coords.heading ?? null,
    speed: pos.coords.speed ?? null,
    timestamp: new Date(pos.timestamp).toISOString(),
  };
}

/**
 * Start sending current location to backend every N meters moved (default: 5m).
 * Foreground-only (will stop when app is killed/backgrounded depending on OS behavior).
 *
 * Returns a stop() function to unsubscribe.
 */
export function startLocationPing(token: string, opts: StartLocationPingOptions = {}) {
  const distanceIntervalM =
    Number.isFinite(opts.distanceIntervalM) && (opts.distanceIntervalM as number) > 0
      ? (opts.distanceIntervalM as number)
      : 5;
  const minTimeBetweenSendsMs =
    Number.isFinite(opts.minTimeBetweenSendsMs) && (opts.minTimeBetweenSendsMs as number) >= 0
      ? (opts.minTimeBetweenSendsMs as number)
      : 10_000;
  const endpointPath = (opts.endpointPath ?? 'location-ping').toString().trim() || 'location-ping';
  const accuracy = opts.accuracy ?? Location.LocationAccuracy.Balanced;

  let stopped = false;
  let subscription: Location.LocationSubscription | null = null;
  let inFlight = false;
  let lastSentAt = 0;

  const safeSend = async (pos: Location.LocationObject) => {
    if (stopped || inFlight) return;
    const now = Date.now();
    if (minTimeBetweenSendsMs > 0 && now - lastSentAt < minTimeBetweenSendsMs) return;
    inFlight = true;
    try {
      const payload = toPingPayload(pos);
      await postLocationPing(token, payload, endpointPath);
      lastSentAt = Date.now();
    } catch {
      // Intentionally ignore: avoid noisy alerts/toasts while tracking.
    } finally {
      inFlight = false;
    }
  };

  const start = async () => {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== 'granted') return;
    }

    subscription = await Location.watchPositionAsync(
      {
        accuracy,
        distanceInterval: distanceIntervalM,
      },
      (pos) => void safeSend(pos)
    );
  };

  void start();

  return function stop() {
    stopped = true;
    try {
      subscription?.remove();
    } finally {
      subscription = null;
    }
  };
}

