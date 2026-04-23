import { api } from './apiClient';

export async function postUpdateProfile(
  token: string,
  data: { name: string; email: string; phone: string; ic: string; photo?: any }
) {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('email', data.email);
  formData.append('phone', data.phone);
  formData.append('ic', data.ic);

  if (data.photo) {
    const normalized =
      typeof data.photo === 'string'
        ? ({
            uri: data.photo,
            type: 'image/jpeg',
            name: 'profile.jpg',
          } as any)
        : data.photo;
    formData.append('photo', normalized as any);
  }

  const tried: string[] = [];
  let lastError: any;

  const path = 'update-profile';
  tried.push(path);
  try {
    const res = await api.post(path, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        Accept: 'application/json',
      },
    });
    return res.data;
  } catch (e: any) {
    lastError = e;
    const status = e?.response?.status;
    if (status !== 404) throw e;
  }

  const status = lastError?.response?.status;
  if (status === 404) {
    const base = (api.defaults.baseURL ?? '').toString().replace(/\/+$/, '');
    throw new Error(
      `Backend 404. Tried: ${tried.map((p) => `${base}/${p}`).join(' | ')}`
    );
  }

  throw lastError;
}

