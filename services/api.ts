import axios from 'axios';

const baseURL =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim() ||
  'http://20.17.177.115/api/pengawal';

export const api = axios.create({
  baseURL,
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export type LoginPayload = {
  login: string;
  password: string;
  lat: number;
  long: number;
};
//
export type LoginResponse = {
  token: string;
  token_type: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    email_verified_at: string | null;
  };
  pengawal: {
    fld_pgw_id: string;
    nama?: string;
    photo_url?: string | null;
    fld_pgw_noTelefon?: string;
    fld_pgw_noIC?: string;
    fld_pgw_status?: string;
    fld_pgw_statusSemasa?: string;
  };
};

export async function postLogin(payload: LoginPayload) {
  const res = await api.post<LoginResponse>('login', payload);
  return res.data;
}

export async function postSendEmailVerification(token: string) {
  const res = await api.post(
    'email/verification-notification',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data as { message?: string };
}

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

export const calculatePatrolStats = (totalPoints: number, remainingPoints: number, startTime: number) => {
  // 1. Kira Peratusan
  const completedPoints = totalPoints - remainingPoints;
  const peratus = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  // 2. Kira Durasi (HH:MM:SS)
  const endTime = Math.floor(Date.now() / 1000);
  const totalSeconds = endTime - startTime;
  
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const durasi = [hrs, mins, secs]
    .map(v => v < 10 ? "0" + v : v)
    .join(":");

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
    // Re-throw with useful backend message (if any)
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

export const postSOS = async (token: string, location: any) => {
  try {
    const response = await api.post('sos', { location }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error sending SOS:', error);
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

export async function postSahkanTitik(token: string, payload: SahkanTitikPayload) {
  const res = await api.post<SahkanTitikResponse>('sahkan-titik', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function postUpdateProfile(token: string, data: { name: string; email: string; phone: string; ic: string }) {
  const candidates = ['update-profile', 'update_profile', 'updateProfile'] as const;

  const tried: string[] = [];
  let lastError: any;

  for (const path of candidates) {
    tried.push(path);
    try {
      const res = await api.post(path, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (e: any) {
      lastError = e;
      const status = e?.response?.status;
      if (status !== 404) break;
    }
  }

  // Make 404s actionable: show the exact URL(s) we attempted.
  const status = lastError?.response?.status;
  if (status === 404) {
    const base = (api.defaults.baseURL ?? '').toString();
    throw new Error(
      `Backend 404. Tried: ${tried
        .map((p) => `${base}/${p}`)
        .join(' | ')}`
    );
  }

  throw lastError;
}

