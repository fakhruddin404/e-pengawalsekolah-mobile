import { api } from './apiClient';

export const getTitikSemak = async (token: string) => {
  try {
    const response = await api.get('titik-semak', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching titik semak:', error);
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
    const response = await api.post('simpan-rondaan', payload, {
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
      'Error saving rondaan';
    console.error('Error saving rondaan:', msg);
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

