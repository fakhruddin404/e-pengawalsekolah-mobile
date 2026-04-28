import { api } from './apiClient';

export type CreatePasLawatanPayload = {
  id: string | null;
  namaPenuh: string;
  noTel: string;
  ic: string;
  noKenderaan: string;
  tujuan: string;
  masaMasuk: string; // HH:mm
};

// Helper function to omit nullish values from the object
function omitNullish<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  return out;
}

/**
 * Used by page: `app/(tabs)/createPasLawatan.tsx`.
 * Purpose: submit/create a new "Pas Lawatan" record.
 */
export async function postCreatePasLawatan(token: string, payload: CreatePasLawatanPayload) {
  const body = omitNullish({
    vis_id: payload.id,
    vis_namaPenuh: payload.namaPenuh,
    vis_noTel: payload.noTel,
    vis_noIC: payload.ic,
    Pas_noKenderaan: payload.noKenderaan,
    pas_tujuan: payload.tujuan,
    pas_masaMasuk: payload.masaMasuk,

    id: payload.id,
    namaPenuh: payload.namaPenuh,
    noTel: payload.noTel,
    ic: payload.ic,
    noKenderaan: payload.noKenderaan,
    tujuan: payload.tujuan,
    masaMasuk: payload.masaMasuk,
  });

  const path = 'pas-lawatan';
  const res = await api.post<any>(path, 
    body, 
    {
    headers: { Authorization: `Bearer ${token}` },
    });

  return res.data;
}

/**
 * Used by page: `app/(tabs)/senaraiPelawat.tsx`.
 * Purpose: mark a "Pas Lawatan" as keluar (visitor exit) by id.
 */
export async function postKeluarPasLawatan(token: string, id: string) {
  const safeId = (id ?? '').toString().trim();
  if (!safeId) throw new Error('ID pas lawatan tidak sah.');

  const path = `keluar-pas-lawatan/${encodeURIComponent(safeId)}`;
  const res = await api.post<any>(
    path,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return res.data;
}
