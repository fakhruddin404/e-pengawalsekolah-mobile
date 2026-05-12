import { api } from './apiClient';

export type PelawatSearchItem = {
  id: string;
  namaPenuh: string;
  noTel: string;
  ic?: string;
};

export type PelawatAktifItem = {
  id: string;
  name: string;
  purpose: string;
  plate: string;
  masaMasuk?: string;
  createdAt?: string;
};

export type PelawatAktifUiItem = {
  id: string;
  name: string;
  purpose: string;
  plate: string;
  dateLabel: string;
  durationLabel: string;
};

function firstDefined<T>(...vals: T[]) {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function normalizePelawat(row: any, idx: number): PelawatSearchItem {
  const idRaw =
    firstDefined(row?.id, row?.vis_id, row?.fld_vis_id, row?.pelawat_id, row?.uuid) ?? idx;
  const id = String(idRaw);

  const namaPenuh = String(
    firstDefined(row?.namaPenuh, row?.vis_namaPenuh, row?.nama_penuh, row?.name, row?.nama) ?? ''
  ).trim();

  const noTel = String(
    firstDefined(row?.noTel, row?.vis_noTel, row?.no_tel, row?.phone, row?.telefon) ?? ''
  ).trim();

  const icVal = firstDefined(row?.ic, row?.no_ic, row?.noIC, row?.vis_noIC, row?.fld_vis_noIC);
  const ic = typeof icVal === 'string' ? icVal.trim() : icVal ? String(icVal).trim() : undefined;

  return { id, namaPenuh, noTel, ic };
}

function normalizePelawatAktif(row: any, idx: number): PelawatAktifItem {
  const idRaw =
    firstDefined(row?.id, row?.pas_id, row?.fld_pas_id, row?.vis_id, row?.fld_vis_id, row?.uuid) ??
    idx;
  const id = String(idRaw);

  const name = String(
    firstDefined(
      row?.name,
      row?.nama,
      row?.namaPenuh,
      row?.vis_namaPenuh,
      row?.nama_penuh,
      row?.pelawat?.namaPenuh,
      row?.pelawat?.vis_namaPenuh
    ) ?? ''
  ).trim();

  const purpose = String(
    firstDefined(
      row?.purpose,
      row?.tujuan,
      row?.pas_tujuan,
      row?.fld_pas_tujuan,
      row?.fld_pas_tujuanLawatan
    ) ?? ''
  ).trim();

  const plate = String(
    firstDefined(
      row?.plate,
      row?.noKenderaan,
      row?.Pas_noKenderaan,
      row?.pas_noKenderaan,
      row?.fld_pas_noKenderaan
    ) ?? ''
  ).trim();

  const masaMasukVal = firstDefined(row?.masaMasuk, row?.pas_masaMasuk, row?.fld_pas_masaMasuk);
  const masaMasuk =
    typeof masaMasukVal === 'string'
      ? masaMasukVal.trim()
      : masaMasukVal
        ? String(masaMasukVal).trim()
        : undefined;

  const createdAtVal = firstDefined(row?.created_at, row?.createdAt, row?.tarikh, row?.date);
  const createdAt =
    typeof createdAtVal === 'string'
      ? createdAtVal.trim()
      : createdAtVal
        ? String(createdAtVal).trim()
        : undefined;

  return { id, name, purpose, plate, masaMasuk, createdAt };
}

/**
 * cari pelawat (pelawat) dengan query (nama / no telefon / ic).
 * Used by page: `app/(tabs)/createPasLawatan.tsx` (visitor search + autofill).
 */
export async function getSearchPelawat(token: string, query: string) {
  const q = (query ?? '').toString().trim();
  if (!q) return [] as PelawatSearchItem[];

  const path ='pelawat-search';
  const res = await api.get<any>(path, 
    {
    params: { q, query: q, search: q },
    headers: { Authorization: `Bearer ${token}` },
    },
  );

  const data = res.data;
  const list: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.pelawat)
        ? data.pelawat
        : [];

  return list.map(normalizePelawat).filter((p) => p.namaPenuh || p.noTel);
}

/**
 * dapatkan senarai pelawat aktif
 * Used by page: `app/(tabs)/senaraiPelawat.tsx` (list view data source).
 */
export async function getPelawatAktif(token: string) {
  const path ='pelawat-aktif';
  const res = await api.get<any>(path, 
    {
    headers: { Authorization: `Bearer ${token}` },
    },
  );

  const data = res.data;
  const list: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.pelawatAktif)
        ? data.pelawatAktif
        : Array.isArray(data?.pelawat)
          ? data.pelawat
          : [];

  return list.map(normalizePelawatAktif).filter((p) => p.name || p.plate || p.purpose);
}

function formatDateLabel(input?: string) {
  if (!input) return '';
  const d = parseDateInput(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function parseDateInput(input: string) {
  const value = (input ?? '').toString().trim();
  if (!value) return new Date(NaN);

  // HH:mm -> use current local day.
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (hhmm) {
    const hour = Number(hhmm[1]);
    const minute = Number(hhmm[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
    }
    return new Date(NaN);
  }

  // MySQL-like local datetime without timezone (YYYY-MM-DD HH:mm[:ss]).
  const mysqlLike = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (mysqlLike) {
    const year = Number(mysqlLike[1]);
    const month = Number(mysqlLike[2]) - 1;
    const day = Number(mysqlLike[3]);
    const hour = Number(mysqlLike[4]);
    const minute = Number(mysqlLike[5]);
    const second = Number(mysqlLike[6] ?? 0);
    return new Date(year, month, day, hour, minute, second, 0);
  }

  // Date only (YYYY-MM-DD) -> midnight local time.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  // Datetime with explicit timezone: normalize to strict ISO for consistent parsing.
  const hasExplicitTimezone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  if (hasExplicitTimezone) {
    const normalized = value
      .replace(' ', 'T')
      .replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  // ISO-like local datetime without timezone, e.g. YYYY-MM-DDTHH:mm[:ss][.sss]
  const isoLocal =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/.exec(value);
  if (isoLocal) {
    const year = Number(isoLocal[1]);
    const month = Number(isoLocal[2]) - 1;
    const day = Number(isoLocal[3]);
    const hour = Number(isoLocal[4]);
    const minute = Number(isoLocal[5]);
    const second = Number(isoLocal[6] ?? 0);
    const ms = Number((isoLocal[7] ?? '0').padEnd(3, '0'));
    return new Date(year, month, day, hour, minute, second, ms);
  }

  // Epoch timestamps (seconds or milliseconds).
  if (/^\d+$/.test(value)) {
    const num = Number(value);
    if (Number.isFinite(num)) {
      const ms = value.length <= 10 ? num * 1000 : num;
      return new Date(ms);
    }
  }

  return new Date(NaN);
}

function formatDurationSince(masaMasuk?: string, createdAt?: string) {
  const base = masaMasuk?.trim() || createdAt?.trim() || '';
  if (!base) return '';

  const start = parseDateInput(base);
  if (Number.isNaN(start.getTime())) return '';

  const diffMs = Date.now() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return '';
  const totalMin = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs <= 0) return `${mins} min`;
  return `${hrs} jam ${mins} min`;
}

export function toPelawatAktifUiItem(row: PelawatAktifItem): PelawatAktifUiItem {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    plate: row.plate,
    dateLabel: formatDateLabel(row.createdAt),
    durationLabel: formatDurationSince(row.masaMasuk, row.createdAt),
  };
}

/**
 * kegunaan cara render data di senarai pelawat aktif
 * Used by page: `app/(tabs)/senaraiPelawat.tsx`.
 */
export async function getPelawatAktifUi(token: string) {
  const rows = await getPelawatAktif(token);
  return rows.map(toPelawatAktifUiItem);
}

