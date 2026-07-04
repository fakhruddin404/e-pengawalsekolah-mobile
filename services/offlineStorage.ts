import * as FileSystem from 'expo-file-system';
import { type RondaanMapPoint } from './rondaanService';

export type OfflineScanEntry = {
  fld_loc_id: string | number;
  qr_code: string;
  latitude: number;
  longitude: number;
  scanned_at: number;
};

export type PendingRondaan = {
  token: string;
  payload: { path: any[]; peratus: number; durasi: string };
  saved_at: number;
};

const CACHE_FILE = `${FileSystem.documentDirectory}eps_titik_cache.json`;
const QUEUE_FILE = `${FileSystem.documentDirectory}eps_scan_queue.json`;
const PENDING_RONDAAN_FILE = `${FileSystem.documentDirectory}eps_pending_rondaan.json`;

// --- Titik Semak Cache ---
export async function cacheTitikSemak(data: RondaanMapPoint[]): Promise<void> {
  await FileSystem.writeAsStringAsync(CACHE_FILE, JSON.stringify(data));
}

export async function getCachedTitikSemak(): Promise<RondaanMapPoint[] | null> {
  try {
    const exists = await FileSystem.getInfoAsync(CACHE_FILE);
    if (!exists.exists) return null;
    const contents = await FileSystem.readAsStringAsync(CACHE_FILE);
    return JSON.parse(contents) as RondaanMapPoint[];
  } catch (e) {
    console.error('Failed to read cached titik semak', e);
    return null;
  }
}

// --- Scan Queue ---
export async function getScanQueue(): Promise<OfflineScanEntry[]> {
  try {
    const exists = await FileSystem.getInfoAsync(QUEUE_FILE);
    if (!exists.exists) return [];
    const contents = await FileSystem.readAsStringAsync(QUEUE_FILE);
    return JSON.parse(contents) as OfflineScanEntry[];
  } catch (e) {
    console.error('Failed to read scan queue', e);
    return [];
  }
}

export async function addToScanQueue(entry: OfflineScanEntry): Promise<void> {
  const queue = await getScanQueue();
  queue.push(entry);
  await FileSystem.writeAsStringAsync(QUEUE_FILE, JSON.stringify(queue));
}

export async function clearScanQueue(): Promise<void> {
  try {
    const exists = await FileSystem.getInfoAsync(QUEUE_FILE);
    if (exists.exists) {
      await FileSystem.deleteAsync(QUEUE_FILE);
    }
  } catch (e) {
    console.error('Failed to clear scan queue', e);
  }
}

// --- Pending Rondaan ---
export async function savePendingRondaan(token: string, payload: { path: any[]; peratus: number; durasi: string }): Promise<void> {
  const data: PendingRondaan = { token, payload, saved_at: Date.now() };
  await FileSystem.writeAsStringAsync(PENDING_RONDAAN_FILE, JSON.stringify(data));
}

export async function getPendingRondaan(): Promise<PendingRondaan | null> {
  try {
    const exists = await FileSystem.getInfoAsync(PENDING_RONDAAN_FILE);
    if (!exists.exists) return null;
    const contents = await FileSystem.readAsStringAsync(PENDING_RONDAAN_FILE);
    return JSON.parse(contents) as PendingRondaan;
  } catch (e) {
    console.error('Failed to read pending rondaan', e);
    return null;
  }
}

export async function clearPendingRondaan(): Promise<void> {
  try {
    const exists = await FileSystem.getInfoAsync(PENDING_RONDAAN_FILE);
    if (exists.exists) {
      await FileSystem.deleteAsync(PENDING_RONDAAN_FILE);
    }
  } catch (e) {
    console.error('Failed to clear pending rondaan', e);
  }
}

export async function hasPendingSync(): Promise<boolean> {
  const rondaan = await getPendingRondaan();
  return rondaan !== null;
}
