import { api } from './apiClient';

export type LoginPayload = {
  login: string;
  password: string;
  lat: number;
  long: number;
};

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
      headers: {Authorization: `Bearer ${token}`},
    }
  );
  return res.data as { message?: string };
}

export async function postLogout(token: string) {
  const res = await api.post(
    'logout',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data as { success?: boolean; message?: string };
}

