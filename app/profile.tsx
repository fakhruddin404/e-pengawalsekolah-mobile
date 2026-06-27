import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Pencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';           // API baru — untuk Paths.cache.uri
import * as FileSystemLegacy from 'expo-file-system/legacy'; // API lama — untuk copyAsync

import { AppText } from '../components/AppText';
import { textVariants } from '../theme/typography';
import { palette, radii, shadows, spacing } from '../theme/ui';
import { useAuth } from '../context/AuthContext';
import { formatAxiosError, postSendEmailVerification, postUpdateProfile } from '../services';
import { downloadProfilePhoto } from '../services/profileService';

// Jenis data gambar yang akan dihantar ke server
type PickedPhoto = { uri: string; type: string; name: string };

const INPUT_BG = '#F8FAFC';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, setSession } = useAuth();

  const token = session?.token ?? '';

  // ─── State form ────────────────────────────────────────────
  const [fullName, setFullName]       = useState(session?.displayName ?? '');
  const [icNumber, setIcNumber]       = useState(session?.ic ?? '');
  const [phoneNumber, setPhoneNumber] = useState(session?.phone ?? '');
  const [email, setEmail]             = useState(session?.email ?? '');

  // ─── State gambar ──────────────────────────────────────────
  // localPickedUri: preview serta-merta gambar yang baru dipilih dari galeri
  const [localPickedUri, setLocalPickedUri] = useState<string | null>(null);
  // pickedPhoto: data gambar yang akan diupload ke server
  const [pickedPhoto, setPickedPhoto] = useState<PickedPhoto | null>(null);
  // cachedPhotoError: true jika gambar dari cache gagal dipapar
  const [cachedPhotoError, setCachedPhotoError] = useState(false);

  // ─── State loading ─────────────────────────────────────────
  const [isUpdating, setIsUpdating] = useState(false);

  const initials = useMemo(() => getInitials(fullName), [fullName]);

  // photoUrl dalam session sentiasa URI file:// tempatan (bukan URL server)
  const cachedPhotoUri = session?.photoUrl ?? null;

  // ─── Handler: buka galeri dan pilih gambar ─────────────────
  async function handlePickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Kebenaran Diperlukan', 'Sila benarkan akses galeri.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    const uri   = asset?.uri ?? null;
    if (!uri) return;

    // Tunjuk preview serta-merta
    setLocalPickedUri(uri);

    // Tentukan jenis fail
    const originalName = asset?.fileName ?? 'profile.jpg';
    const ext  = (originalName.split('.').pop() || '').toLowerCase() || 'jpg';
    const type = asset?.mimeType ?? (ext === 'png' ? 'image/png' : 'image/jpeg');

    // Android content:// URI perlu disalin ke cache dulu sebelum upload
    let uploadUri = uri;
    if (uri.startsWith('content://')) {
      const dest = `${FileSystem.Paths.cache.uri}upload_${Date.now()}.${ext}`;
      try {
        await FileSystemLegacy.copyAsync({ from: uri, to: dest });
        uploadUri = dest;
      } catch {
        uploadUri = uri; // gagal salin — cuba guna URI asal
      }
    }

    setPickedPhoto({ uri: uploadUri, type, name: originalName });
  }

  // ─── Handler: simpan profil ────────────────────────────────
  async function handleSave() {
    if (!session || isUpdating) return;
    setIsUpdating(true);

    try {
      // 1. Hantar data profil ke Laravel server
      const res = await postUpdateProfile(token, {
        name:  fullName,
        email: email,
        phone: phoneNumber,
        ic:    icNumber,
        ...(pickedPhoto ? { photo: pickedPhoto } : {}),
      });

      // 2. Kalau ada gambar baru diupload, download semula dari server
      //    supaya cache tempatan dikemaskini dengan gambar terkini
      const freshPhotoUri = pickedPhoto
        ? await downloadProfilePhoto(token)
        : null;

      // 3. Kemaskini session — perubahan akan kelihatan di semua screen
      //    (DashboardHeader, Settings, Profile) tanpa perlu logout
      setSession({
        ...session,
        displayName: fullName,
        email:       email,
        phone:       phoneNumber,
        ic:          icNumber,
        photoUrl:    freshPhotoUri ?? session.photoUrl ?? null,
      });

      // 4. Buang preview tempatan — session sudah ada gambar terkini
      if (freshPhotoUri) setLocalPickedUri(null);

      // 5. Maklumkan pengguna
      if (res.email_changed) {
        Alert.alert(
          'Profil Dikemaskini',
          'Email anda telah ditukar. Pautan pengesahan baru telah dihantar.'
        );
      } else {
        Alert.alert('Berjaya', 'Profil berjaya dikemaskini.');
      }

    } catch (error: any) {
      Alert.alert('Ralat', formatAxiosError(error, 'Sesuatu yang tidak kena berlaku.'));
    } finally {
      setIsUpdating(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>

        {/* Header */}
        <View className="relative flex-row items-center justify-center pb-2">
          <Pressable
            onPress={() => router.back()}
            className="absolute left-0 h-10 w-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <ArrowLeft size={22} color="#1F7BFF" />
          </Pressable>
          <AppText variant="h3" style={{ color: palette.primary }}>Profile</AppText>
        </View>

        {/* Gambar profil */}
        <View style={{ alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl }}>
          <View className="relative">
            {/* Keutamaan paparan:
                1. localPickedUri — preview serta-merta gambar baru dipilih
                2. cachedPhotoUri — gambar dari cache (file://)
                3. Inisial — fallback kalau tiada gambar */}
            {localPickedUri ? (
              <Image
                source={{ uri: localPickedUri }}
                style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#E2E8F0' }}
                resizeMode="cover"
              />
            ) : cachedPhotoUri && !cachedPhotoError ? (
              <Image
                source={{ uri: cachedPhotoUri }}
                style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#E2E8F0' }}
                resizeMode="cover"
                onError={() => setCachedPhotoError(true)}
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-slate-200">
                <AppText variant="h2" style={{ color: '#334155' }}>{initials || '?'}</AppText>
              </View>
            )}

            {/* Butang tukar gambar */}
            <Pressable
              onPress={handlePickPhoto}
              className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full bg-primary"
              style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', ...shadows.card }}
              accessibilityRole="button"
              accessibilityLabel="Tukar gambar profil"
            >
              <Pencil size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* Form maklumat */}
        <Label text="Full Name" />
        <Field value={fullName} onChangeText={setFullName} placeholder="Full Name" />

        <View style={{ height: spacing.md }} />
        <Label text="Phone Number" />
        <Field value={phoneNumber} onChangeText={setPhoneNumber} placeholder="+60..." keyboardType="phone-pad" />

        <View style={{ height: spacing.md }} />
        <Label text="IC Number" />
        <Field value={icNumber} onChangeText={setIcNumber} placeholder="123456789012" />

        <View style={{ height: spacing.md }} />
        <Label text="Email" />
        <Field value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />

        {/* Butang simpan */}
        <View style={{ height: spacing.lg }} />
        <Pressable
          onPress={handleSave}
          disabled={isUpdating}
          className={['items-center justify-center bg-primary', isUpdating ? 'opacity-70' : 'opacity-100'].join(' ')}
          style={{ height: 56, borderRadius: radii.pill }}
          accessibilityRole="button"
        >
          <AppText variant="body" style={{ fontWeight: '800', color: '#ffffff' }}>
            {isUpdating ? 'Menyimpan...' : 'Update Profile'}
          </AppText>
        </Pressable>

      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// Komponen kecil
// ─────────────────────────────────────────────────────────────
function Label({ text }: { text: string }) {
  return (
    <AppText variant="label" style={{ marginBottom: spacing.xs, color: palette.muted }}>
      {text}
    </AppText>
  );
}

function Field({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  value: string;
  onChangeText?: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      editable
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      className="text-slate-900"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      style={[
        textVariants.body,
        {
          height: 52,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          backgroundColor: INPUT_BG,
          borderWidth: 1,
          borderColor: palette.border,
        },
      ]}
    />
  );
}

function getInitials(name: string) {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return '';
  const parts  = cleaned.split(/\s+/).filter(Boolean);
  const first  = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : parts[0]?.[1] ?? '';
  return (first + second).toUpperCase();
}
