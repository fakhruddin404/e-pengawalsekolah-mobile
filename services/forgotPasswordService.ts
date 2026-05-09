import { api, formatAxiosError } from './apiClient';

export async function postForgotPassword(email: string) {
  const body = {
    email: email.trim(),
  };

  try {
    const res = await api.post('forgot-password', body);
    return res.data as { success?: boolean; status?: string; message?: string };
  } catch (e: any) {
    const validationErrors = e?.response?.data?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
      const firstFieldErrors = Object.values(validationErrors)[0];
      if (Array.isArray(firstFieldErrors) && firstFieldErrors.length > 0) {
        throw new Error(String(firstFieldErrors[0]));
      }
    }
    throw new Error(formatAxiosError(e, 'Gagal hantar pautan tetapan semula kata laluan.'));
  }
}
