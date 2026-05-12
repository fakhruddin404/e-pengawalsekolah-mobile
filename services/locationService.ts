import * as Location from 'expo-location';

import { api, formatAxiosError } from './apiClient';

export type LocationPingPayload = {
  latitude: number;
  longitude: number;
  timestamp: string; // ISO string
};

export type StartLocationPingOptions = {
  //Minimum movement in meters before sending again. Default: 5 meters.
  distanceIntervalM?: number;
  //Optional minimum time between sends (ms) to avoid spamming if GPS is noisy. Default: 10 seconds.
  minTimeBetweenSendsMs?: number;
  // API endpoint path (relative to api baseURL). Default: 'location-ping'
  endpointPath?: string;
  //Location accuracy used by expo-location.Default: Balanced (battery-friendly).
  accuracy?: Location.LocationAccuracy;
};

// process nk post
export async function postLocationPing(
  token: string,
  payload: LocationPingPayload,
  endpointPath = 'location-ping'
) {
  try {
    const res = await api.post<any>(
      endpointPath,
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
    timestamp: new Date(pos.timestamp).toISOString(),
  };
}

//next location ping(default: 5m).
export function startLocationPing(token: string, opts: StartLocationPingOptions = {}) {

  //calculate distance interval
  const distanceIntervalM =
    Number.isFinite(opts.distanceIntervalM) && (opts.distanceIntervalM as number) > 0
      ? (opts.distanceIntervalM as number)
      : 5;

  //calculate min time between sends
  const minTimeBetweenSendsMs =
    Number.isFinite(opts.minTimeBetweenSendsMs) && (opts.minTimeBetweenSendsMs as number) >= 0
      ? (opts.minTimeBetweenSendsMs as number)
      : 10_000;

  const endpointPath = (opts.endpointPath ?? 'location-ping').toString().trim() || 'location-ping';
  const accuracy = opts.accuracy ?? Location.LocationAccuracy.Balanced;

  let stopped = false;
  let subscription: Location.LocationSubscription | null = null;
  let inFlight = false;
  let flushingQueue = false;
  let lastSentAt = 0;
  const retryQueue: LocationPingPayload[] = [];

  const enqueueRetry = (payload: LocationPingPayload) => {
    retryQueue.push(payload);
    while (retryQueue.length > 3) retryQueue.shift();
  };

  const flushRetryQueue = async () => {
    if (stopped || flushingQueue || retryQueue.length === 0) return;
    flushingQueue = true;
    try {
      while (!stopped && retryQueue.length > 0) {
        const payload = retryQueue[0];
        await postLocationPing(token, payload, endpointPath);
        retryQueue.shift();
        lastSentAt = Date.now();
      }
    } finally {
      flushingQueue = false;
    }
  };

  const safeSend = async (pos: Location.LocationObject) => {
    if (stopped || inFlight) return;
    const now = Date.now();
    if (minTimeBetweenSendsMs > 0 && now - lastSentAt < minTimeBetweenSendsMs) return;
    inFlight = true;
    const payload = toPingPayload(pos);
    try {
      await flushRetryQueue();
      await postLocationPing(token, payload, endpointPath);
      lastSentAt = Date.now();
    } catch {
      // Keep last few failed pings and retry on next successful network window.
      enqueueRetry(payload);
    } finally {
      inFlight = false;
    }
  };

  // first location ping
  const start = async () => {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== 'granted') return;
    }
    // Send once immediately after login so website can show location
    // even before the user moves 5m.
    try {
      const firstPos = await Location.getCurrentPositionAsync({ accuracy });
      await safeSend(firstPos);
    } catch {
      // ignore
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

