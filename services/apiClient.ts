import axios from 'axios';
import { DeviceEventEmitter } from 'react-native';

const DEFAULT_API_BASE_URL = 'https://e-pengawalsekolah.xyz/api/pengawal';
const API_PREFIX = '/api/pengawal';

// Event yang akan dihantar bila server balas 401 (token tidak sah / dipadam)
// _layout.tsx akan dengar event ini dan paksa logout
export const AUTH_EXPIRED_EVENT = 'auth:session_expired';

function resolveApiBaseUrl(raw: string) {
  const fallback = DEFAULT_API_BASE_URL.replace(/\/+$/, '');
  const candidate = raw.trim();

  if (!candidate) return fallback;

  const cleaned = candidate.replace(/\/+$/, '');
  if (cleaned.endsWith(API_PREFIX)) return cleaned;
  if (cleaned.includes('/api/')) return cleaned;

  return `${cleaned}${API_PREFIX}`;
}

export const API_BASE_URL = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
  },
});

// ─────────────────────────────────────────────────────────────
// Global 401 Interceptor — Keselamatan Satu Peranti
//
// Bila mana-mana API call dapat respons 401 (Unauthorized):
//   → Bermakna token telah dipadam di server (pengawal login pada peranti lain)
//   → App akan emit AUTH_EXPIRED_EVENT
//   → _layout.tsx mendengar event ini dan paksa logout + redirect ke /login
//
// Ini memastikan bila pengawal login pada Peranti B,
// Peranti A akan dipaksa keluar secara automatik pada API call seterusnya.
// ─────────────────────────────────────────────────────────────
api.interceptors.response.use(
  // Respons berjaya — biarkan terus
  (response) => response,

  // Respons ralat — semak jika 401
  (error) => {
    const status = error?.response?.status as number | undefined;

    if (status === 401) {
      // Emit event — SessionExpiredHandler dalam _layout.tsx akan handle logout
      DeviceEventEmitter.emit(AUTH_EXPIRED_EVENT);
    }

    // Teruskan reject supaya caller boleh handle error mereka sendiri juga
    return Promise.reject(error);
  }
);

export function formatAxiosError(e: any, fallback: string) {
  const status = e?.response?.status as number | undefined;

  const data = e?.response?.data;
  const msgFromLaravel =
    (typeof data?.message === 'string' && data.message) ||
    (typeof data?.error === 'string' && data.error) ||
    null;

  if (msgFromLaravel) {
    return status ? `${msgFromLaravel}` : msgFromLaravel;
  }

  if (status === 403) {
    return 'Akses ditolak. Akaun anda mungkin tidak mempunyai kebenaran untuk tindakan ini.';
  }
  if (status === 401) {
    return 'Sesi tidak sah. Sila log masuk semula.';
  }

  const isNetworkError =
    !status &&
    ((typeof e?.message === 'string' && /network error/i.test(e.message)) ||
      e?.code === 'ERR_NETWORK');
  if (isNetworkError) {
    return `Tidak dapat hubungi pelayan. Semak internet/perlindungan SSL dan pastikan API boleh dicapai di ${API_BASE_URL}.`;
  }

  return e?.message ?? fallback;
}
