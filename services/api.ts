import axios from 'axios';

const baseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://20.17.177.115/api/pengawal';

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
  const res = await api.post<LoginResponse>('/login', payload);
  return res.data;
}

export async function postSendEmailVerification(token: string) {
  const res = await api.post(
    '/email/verification-notification',
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
  const response = await fetch('http://20.17.177.115/api/pengawal/update-profile', {// fix balik nanti
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Gagal kemaskini profil.');
  }

  return response.json();
}

