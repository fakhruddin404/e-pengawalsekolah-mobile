import axios from 'axios';

const DEFAULT_API_BASE_URL = 'https://e-pengawalsekolah.xyz/api/pengawal';
const API_PREFIX = '/api/pengawal';

function resolveApiBaseUrl(raw: string) {
  const fallback = DEFAULT_API_BASE_URL.replace(/\/+$/, '');
  const candidate = raw.trim();

  if (!candidate) return fallback;

  const cleaned = candidate.replace(/\/+$/, '');
  if (cleaned.endsWith(API_PREFIX)) return cleaned;
  if (cleaned.includes('/api/')) return cleaned;

  return `${cleaned}${API_PREFIX}`;
}

const baseURL = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? '');

export const api = axios.create({
  baseURL,
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
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

  const isNetworkError =
    !status &&
    ((typeof e?.message === 'string' && /network error/i.test(e.message)) ||
      e?.code === 'ERR_NETWORK');
  if (isNetworkError) {
    return `Tidak dapat hubungi pelayan. Semak internet/perlindungan SSL dan pastikan API boleh dicapai di ${baseURL}.`;
  }

  return e?.message ?? fallback;
}

