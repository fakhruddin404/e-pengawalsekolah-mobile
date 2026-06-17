// expo-file-system/legacy digunakan kerana versi baru tidak export
// cacheDirectory dan downloadAsync secara langsung.
import * as FileSystem from 'expo-file-system/legacy';
import { api, API_BASE_URL } from './apiClient';

// ─────────────────────────────────────────────────────────────
// Kemaskini profil pengawal (nama, email, telefon, ic, gambar)
// ─────────────────────────────────────────────────────────────
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
    // Normalkan photo kepada objek { uri, type, name } jika ia hanya string URI
    const photo =
      typeof data.photo === 'string'
        ? ({ uri: data.photo, type: 'image/jpeg', name: 'profile.jpg' } as any)
        : data.photo;
    formData.append('photo', photo);
  }

  const res = await api.post('update-profile', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
      Accept: 'application/json',
    },
  });

  return res.data;
}

// ─────────────────────────────────────────────────────────────
// Muat turun gambar profil dari server ke cache tempatan.
//
// Kenapa perlu download dulu?
//   → React Native <Image> tidak boleh hantar Authorization header.
//   → Endpoint /me/photo memerlukan token untuk keselamatan.
//   → Jadi kita download sekali, simpan dalam cache peranti (file://),
//     dan bagi URI local itu kepada <Image>.
//
// Dipanggil bila:
//   1. Selepas login  (authService.ts → loginWithLocation)
//   2. Selepas upload gambar baru  (profile.tsx → onSave)
//   3. Setiap kali app kembali ke foreground  (AuthContext → usePhotoSync)
//
// Return:
//   - string  → URI file:// jika berjaya (contoh: file:///cache/pgw_photo_xxx.jpg?ts=...)
//   - null    → gagal atau tiada gambar (akan papar inisial sebagai fallback)
// ─────────────────────────────────────────────────────────────
export async function downloadProfilePhoto(token: string): Promise<string | null> {
  if (!token) return null;

  // URL server + path cache tempatan yang unik bagi setiap akaun
  const remoteUrl = `${API_BASE_URL}/me/photo`;
  const suffix    = token.slice(-12).replace(/[^a-zA-Z0-9]/g, '');
  const localUri  = `${FileSystem.cacheDirectory}pgw_photo_${suffix}.jpg`;

  try {
    // Download dengan Authorization header.
    // Server akan return:
    //   200 → gambar sebenar (binary image)
    //   3xx → redirect ke ui-avatars.com (jika tiada gambar) — expo ikut redirect secara automatik
    const result = await FileSystem.downloadAsync(remoteUrl, localUri, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.status !== 200) {
      console.log('[downloadProfilePhoto] Status bukan 200:', result.status);
      return null;
    }

    // Pastikan yang diterima betul-betul gambar, bukan halaman error HTML
    const contentType = (
      result.headers?.['content-type'] ??
      result.headers?.['Content-Type'] ??
      ''
    ).toLowerCase();

    const isImage =
      contentType.startsWith('image/') ||
      contentType === '' ||                      // sesetengah server tak hantar content-type
      contentType === 'application/octet-stream';

    if (!isImage) {
      console.log('[downloadProfilePhoto] Bukan gambar. Content-Type:', contentType);
      return null;
    }

    // Tambah ?ts= supaya React Native reload dari disk (bypass memory cache)
    return `${result.uri}?ts=${Date.now()}`;

  } catch (e: any) {
    console.log('[downloadProfilePhoto] Exception:', e?.message);
    return null;
  }
}
