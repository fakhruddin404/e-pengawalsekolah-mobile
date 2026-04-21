import axios from 'axios';

function normalizeApiBaseUrl(raw?: string) {
  const fallback = 'http://20.17.177.115/api/pengawal';
  const input = (raw ?? '').trim();
  if (!input) return fallback;

  // Allow devs to set either:
  // - http://host/api
  // - http://host/api/pengawal
  // and always end up with .../api/pengawal
  const withoutTrailingSlash = input.replace(/\/+$/, '');
  if (withoutTrailingSlash.endsWith('/api')) return `${withoutTrailingSlash}/pengawal`;
  return withoutTrailingSlash;
}

const baseURL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

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

