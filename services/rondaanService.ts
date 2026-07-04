import { api, formatAxiosError } from './apiClient';
import { 
  type OfflineScanEntry, 
  savePendingRondaan, 
  getScanQueue 
} from './offlineStorage';

export const getTitikSemak = async (token: string) => {
  try {
    const response = await api.get(
      'titik-semak', 
      {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Ralat semasa mendapatkan titik semak:', error);
    throw error;
  }
};

export const calculatePatrolStats = (
  totalPoints: number,
  remainingPoints: number,
  startTime: number
) => {
  const completedPoints = totalPoints - remainingPoints;
  const peratus =
    totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  const endTime = Math.floor(Date.now() / 1000);
  const totalSeconds = endTime - startTime;

  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const durasi = [hrs, mins, secs].map((v) => (v < 10 ? '0' + v : v)).join(':');

  return { peratus, durasi };
};

export const postSimpanRondaan = async (
  token: string,
  payload: { path: any[]; peratus: number; durasi: string }
) => {
  try {
    const response = await api.post(
      'simpan-rondaan',
       payload, 
       {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    const e: any = error;
    const msg =
      e?.response?.data?.message ??
      e?.response?.data?.error ??
      (e?.response?.status ? `HTTP ${e.response.status}` : null) ??
      e?.message ??
      'Ralat semasa menyimpan rondaan.';
    console.error('Ralat semasa menyimpan rondaan:', msg);
    throw error;
  }
};

export type SahkanTitikPayload = {
  fld_loc_id: string | number;
  qr_code: string;
  latitude: number;
  longitude: number;
};

export type SahkanTitikResponse = {
  success: boolean;
  message?: string;
  data?: any;
};

export async function postSahkanTitik(
  token: string,
  payload: SahkanTitikPayload
) {
  const res = await api.post<SahkanTitikResponse>('sahkan-titik', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export type RondaanMapPoint = {
  id: string | number;
  name: string;
  latitude: number;
  longitude: number;
};

export type VerifyCheckpointByQrResult = {
  fld_loc_id: string | number;
  qr_code: string;
  response: SahkanTitikResponse;
};

export type SubmitRondaanRecordResult = {
  ok: boolean;
  response: any;
  message: string;
};

// validate QR betu atau tidak
export function validateQrPayload(rawData: string): { fld_loc_id: string | number; qr_code: string } {
  let parsed: any;
  try {
    parsed = JSON.parse(rawData);
  } catch {
    throw new Error('Format kod QR tidak sah.');
  }

  const fld_loc_id = parsed?.id;
  const qr_code = parsed?.secret;
  if (
    (typeof fld_loc_id !== 'string' && typeof fld_loc_id !== 'number') ||
    typeof qr_code !== 'string' ||
    !qr_code.trim()
  ) {
    throw new Error('Data kod QR tidak lengkap. Sila cuba kod QR yang sah.');
  }

  return { fld_loc_id, qr_code: qr_code.trim() };
}

// Calculate distance using Haversine formula (in meters)
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadius = 6371000.0;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

export async function verifyCheckpointLocally(
  rawData: string,
  coords: { latitude: number; longitude: number },
  cachedTitikSemak: RondaanMapPoint[]
): Promise<{ fld_loc_id: string | number; qr_code: string; distanceM: number }> {
  const { fld_loc_id, qr_code } = validateQrPayload(rawData);

  // Cari titik semak dalam cache lokal
  const checkpoint = cachedTitikSemak.find(p => p.id.toString() === fld_loc_id.toString());
  
  if (!checkpoint) {
    throw new Error('Titik semak tidak dijumpai dalam senarai rondaan anda.');
  }

  // Semak jarak GPS (<= 10 meter)
  const distanceM = haversineMeters(
    coords.latitude,
    coords.longitude,
    checkpoint.latitude,
    checkpoint.longitude
  );

  if (distanceM > 10) {
    throw new Error(`Anda berada di luar kawasan titik semak (${distanceM}m). Maksimum dibenarkan ialah 10m.`);
  }

  return { fld_loc_id, qr_code, distanceM };
}

export async function syncScanQueue(
  token: string,
  queue: OfflineScanEntry[]
): Promise<{ synced: OfflineScanEntry[]; rejected: OfflineScanEntry[] }> {
  const synced: OfflineScanEntry[] = [];
  const rejected: OfflineScanEntry[] = [];

  for (const entry of queue) {
    try {
      const response = await postSahkanTitik(token, {
        fld_loc_id: entry.fld_loc_id,
        qr_code: entry.qr_code,
        latitude: entry.latitude,
        longitude: entry.longitude,
      });

      if (response?.success) {
        synced.push(entry);
      } else {
        rejected.push(entry);
      }
    } catch (e) {
      // Jika error network/server down, kita anggap gagal sync kali ini
      rejected.push(entry);
    }
  }

  return { synced, rejected };
}

// just normalize takut any error
export async function prepareRondaanStartData(token: string): Promise<RondaanMapPoint[]> {
  const responseTitikSemak = await getTitikSemak(token);
  const titik = Array.isArray((responseTitikSemak as any)?.data)
    ? (responseTitikSemak as any).data
    : responseTitikSemak;
  const normalized = (Array.isArray(titik) ? titik : []).filter((p: any) => {
    const hasId = typeof p?.id === 'string' || typeof p?.id === 'number';
    const hasName = typeof p?.name === 'string';
    const hasLat = Number.isFinite(p?.latitude);
    const hasLng = Number.isFinite(p?.longitude);
    return hasId && hasName && hasLat && hasLng;
  }) as RondaanMapPoint[];

  return normalized;
}

export async function submitRondaanWithFallback(
  token: string,
  payload: { path: any[]; peratus: number; durasi: string }
): Promise<{ ok: boolean; pending: boolean; message: string }> {
  try {
    const response = await postSimpanRondaan(token, payload);
    const ok =
      response?.success === true ||
      response?.status === 'success' ||
      response?.status === true;
      
    if (ok) {
      return { ok: true, pending: false, message: 'Rekod rondaan telah dihantar ke sistem.' };
    }
    
    // Jika API pulang success = false tapi tak throw error, kita assume fail
    throw new Error(response?.message ?? 'Gagal simpan rondaan.');
  } catch (error: any) {
    // Check if network error
    if (!error.response) {
      // Network error, simpan secara lokal
      await savePendingRondaan(token, payload);
      return { 
        ok: false, 
        pending: true, 
        message: 'Tiada sambungan internet. Rekod disimpan secara lokal dan akan dihantar apabila talian pulih.' 
      };
    }
    
    // API error (misalnya 4xx atau 5xx dari server)
    throw new Error(formatAxiosError(error, 'Gagal simpan rondaan.'));
  }
}

