import { api, formatAxiosError } from './apiClient';

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

export async function verifyCheckpointByQr(
  token: string,
  rawData: string,
  coords: { latitude: number; longitude: number }
): Promise<VerifyCheckpointByQrResult> {
  const { fld_loc_id, qr_code } = validateQrPayload(rawData);
  const response = await postSahkanTitik(
    token, 
    {
    fld_loc_id,
    qr_code,
    latitude: coords.latitude,
    longitude: coords.longitude,
  });
  return { fld_loc_id, qr_code, response };
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

export async function submitRondaanRecord(
  token: string,
  payload: { path: any[]; peratus: number; durasi: string }
): Promise<SubmitRondaanRecordResult> {
  try {
    const response = await postSimpanRondaan(
      token,
      payload
      );
    const ok =
      response?.success === true ||
      response?.status === 'success' ||
      response?.status === true;
    return {
      ok,
      response,
      message: ok ? 'Rekod rondaan telah dihantar ke sistem.' : response?.message ?? 'Gagal simpan rondaan.',
    };
  } catch (e: any) {
    throw new Error(formatAxiosError(e, 'Gagal simpan rondaan.'));
  }
}

