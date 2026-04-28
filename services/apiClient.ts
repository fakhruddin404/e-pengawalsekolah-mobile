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

export function formatAxiosError(e: any, fallback: string) {
  const status = e?.response?.status as number | undefined;

  const data = e?.response?.data;
  const msgFromLaravel =
    (typeof data?.message === 'string' && data.message) ||
    (typeof data?.error === 'string' && data.error) ||
    null;

  if (msgFromLaravel) {
    return status ? `${msgFromLaravel} (HTTP ${status})` : msgFromLaravel;
  }

  if (status === 403) {
    return 'Akses ditolak (403). Akaun anda mungkin tidak mempunyai kebenaran untuk tindakan ini.';
  }
  if (status === 401) {
    return 'Sesi tidak sah (401). Sila log masuk semula.';
  }

  return e?.message ?? fallback;
}

