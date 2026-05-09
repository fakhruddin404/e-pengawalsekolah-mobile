import { api, formatAxiosError } from './apiClient';

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export async function postChangePassword(token: string, payload: ChangePasswordPayload) {
  const body = {
    current_password: payload.currentPassword,
    password: payload.newPassword,
    password_confirmation: payload.confirmNewPassword,
  };

  try {
    const res = await api.post<any>(
      'change-password', 
      body, 
      {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (e: any) {
    const validationErrors = e?.response?.data?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
      const firstFieldErrors = Object.values(validationErrors)[0];
      if (Array.isArray(firstFieldErrors) && firstFieldErrors.length > 0) {
        throw new Error(String(firstFieldErrors[0]));
      }
    }
    throw new Error(formatAxiosError(e, 'Gagal menukar kata laluan.'));
  }
}

