import { api, formatAxiosError } from './apiClient';

export type CreateLaporanPayload = {
  kejadian: string;
  keterangan: string;
  datetime: string;
  latitude: number;
  longitude: number;
  imej?: {
    uri: string;
    type: string;
    name: string;
  } | null;
};

export async function postCreateLaporan(token: string, payload: CreateLaporanPayload) {
  const formData = new FormData();
  formData.append('kejadian', payload.kejadian);
  formData.append('keterangan', payload.keterangan);
  formData.append('datetime', payload.datetime);
  formData.append('latitude', String(payload.latitude));
  formData.append('longitude', String(payload.longitude));

  if (payload.imej) {
    const rawUri = payload.imej.uri;
    const normalizedUri =
      rawUri.startsWith('file://') || rawUri.startsWith('content://')
        ? rawUri
        : `file://${rawUri}`;

    const uploadFile = {
      uri: normalizedUri,
      type: payload.imej.type || 'image/jpeg',
      name: payload.imej.name || `laporan_${Date.now()}.jpg`,
    };
    formData.append('imej', uploadFile as any);
  }

  try {
    const base = String(api.defaults.baseURL ?? '').replace(/\/+$/, '');
    const endpoint = `${base}/create-laporan`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData as any,
    });

    const raw = await response.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const validationErrors = data?.errors;
      if (validationErrors && typeof validationErrors === 'object') {
        const firstFieldErrors = Object.values(validationErrors)[0];
        if (Array.isArray(firstFieldErrors) && firstFieldErrors.length > 0) {
          throw new Error(String(firstFieldErrors[0]));
        }
      }

      const message =
        (typeof data?.message === 'string' && data.message) ||
        (typeof data?.error === 'string' && data.error) ||
        `HTTP ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (e: any) {
    throw new Error(e?.message ?? formatAxiosError(e, 'Gagal simpan laporan.'));
  }
}
