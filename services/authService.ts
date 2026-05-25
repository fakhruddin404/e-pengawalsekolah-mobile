import { api } from './apiClient';
import * as Location from 'expo-location';

import type { AuthSession } from '../context/AuthContext';
import { downloadProfilePhoto } from './profileService';

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
    email_verified_at: string | null;
  };
  pengawal: {
    fld_pgw_id: string;
    nama?: string;
    photo_url?: string | null;
    fld_pgw_noTelefon?: string;
    fld_pgw_noIC?: string;
  };
};

export async function postLogin(payload: LoginPayload) {
  const res = await api.post<LoginResponse>(
    'login'
    , payload
  );
  return res.data;
}

export function toAuthSession(loginData: LoginResponse): AuthSession {
  const displayName =
    loginData.pengawal?.nama?.trim() || loginData.user?.name?.trim() || '';

  return {
    token: loginData.token,
    displayName: displayName || 'Pengawal',
    photoUrl: loginData.pengawal?.photo_url ?? null,
    email: loginData.user?.email ?? null,
    phone: loginData.pengawal?.fld_pgw_noTelefon ?? null,
    ic: loginData.pengawal?.fld_pgw_noIC ?? null,
    isEmailVerified: loginData.user?.email_verified_at !== null,
  };
}

export async function loginWithLocation(opts: {
  login: string;
  password: string;
}) {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    return { ok: false as const, reason: 'location_permission_denied' as const };
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const loginData = await postLogin({
    login: opts.login.trim(),
    password: opts.password,
    lat: pos.coords.latitude,
    long: pos.coords.longitude,
  });

  const session = toAuthSession(loginData);
  const needsEmailVerification = loginData.user?.email_verified_at === null;

  // Download profile photo to local cache so Image components work on
  // both iOS & Android without needing auth headers at render time.
  const localPhotoUri = await downloadProfilePhoto(session.token);
  if (localPhotoUri) {
    session.photoUrl = localPhotoUri;
  }

  return {
    ok: true as const,
    session,
    needsEmailVerification,
  };
}

export async function postSendEmailVerification(token: string) {
  const res = await api.post(
    'email/verification-notification',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`
      },
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

