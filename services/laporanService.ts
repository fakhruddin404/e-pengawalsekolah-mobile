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
    formData.append('imej', payload.imej as any);
  }

  try {
    const res = await api.post(
      'create-laporan', 
      formData, 
      {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (e: any) {
    throw new Error(formatAxiosError(e, 'Gagal simpan laporan.'));
  }
}
