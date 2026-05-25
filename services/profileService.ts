import * as FileSystem from 'expo-file-system';
import { api, API_BASE_URL } from './apiClient';

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

/**
 * Download the pengawal's profile photo from the authenticated server endpoint
 * to a local cache file.  Returns a `file://...` URI that any <Image> component
 * can display on BOTH iOS and Android without needing auth headers.
 *
 * Call this:
 *   - after login  (authService.loginWithLocation)
 *   - after profile save (if a new photo was uploaded)
 *
 * Uses the last 12 non-symbol chars of the token as a per-user filename suffix
 * so different accounts on the same device don't share a stale cache entry.
 */
export async function downloadProfilePhoto(token: string): Promise<string | null> {
  if (!token) return null;

  // The authenticated photo endpoint
  const remoteUrl = `${API_BASE_URL}/me/photo`;

  // Unique filename per token so different users/sessions don't collide
  const suffix = token.slice(-12).replace(/[^a-zA-Z0-9]/g, '');
  const filename = `pgw_photo_${suffix}.jpg`;
  const localUri = `${FileSystem.cacheDirectory}${filename}`;

  try {
    const result = await FileSystem.downloadAsync(remoteUrl, localUri, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Treat any non-200 (e.g. 302 redirect to ui-avatars, 401, 404) as "no photo"
    if (result.status === 200) {
      return result.uri; // file:// path — works on iOS + Android without headers
    }
    return null;
  } catch {
    return null;
  }
}

