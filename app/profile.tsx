import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Pencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { AppText } from '../components/AppText';
import { textVariants } from '../theme/typography';
import { palette, radii, shadows, spacing } from '../theme/ui';
import { useAuth } from '../context/AuthContext';
import { postSendEmailVerification, postUpdateProfile } from '../services';

const INPUT_BG = '#F8FAFC';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, setSession } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const token = session?.token ?? '';

  const [fullName, setFullName] = useState(session?.displayName ?? '');
  const [icNumber, setIcNumber] = useState(session?.ic ?? '');
  const [phoneNumber, setPhoneNumber] = useState(session?.phone ?? '');
  const [email, setEmail] = useState(session?.email ?? '');
  const [dob, setDob] = useState('');
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [pickedPhoto, setPickedPhoto] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const [sendingVerify, setSendingVerify] = useState(false);

  const initials = useMemo(() => getInitials(fullName), [fullName]);
  const remotePhotoUrl = session?.photoUrl ?? null;
  const canVerify = !!email.trim() && !!token && !sendingVerify;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <View className="relative flex-row items-center justify-center pb-2">
          <Pressable
            onPress={() => router.back()}
            className="absolute left-0 h-10 w-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <ArrowLeft size={22} color="#1F7BFF" />
          </Pressable>
          <AppText variant="h3" style={{ color: palette.primary }}>
            Profile
          </AppText>
        </View>

        <View style={{ alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl }}>
          <View className="relative">
            {localPhotoUri ? (
              <Image
                source={{ uri: localPhotoUri }}
                className="h-24 w-24 rounded-full bg-slate-200"
              />
            ) : remotePhotoUrl ? (
              <Image
                source={{
                  // Add a timestamp to the URL to avoid caching issues
                  uri: `${remotePhotoUrl}?t=${Date.now()}`,
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }}
                className="h-24 w-24 rounded-full bg-slate-200"
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-slate-200">
                <AppText variant="h2" style={{ color: '#334155' }}>
                  {initials || '?'}
                </AppText>
              </View>
            )}
            <Pressable
              onPress={async () => {
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
                if (!result.canceled) {
                  const asset = result.assets?.[0];
                  const uri = asset?.uri ?? null;
                  setLocalPhotoUri(uri);
                  if (uri) {
                    const originalName = asset?.fileName ?? 'profile.jpg';
                    const ext =
                      (originalName.split('.').pop() || '').toLowerCase() ||
                      (uri.split('?')[0]?.split('.').pop() || '').toLowerCase();
                    const type =
                      asset?.mimeType ??
                      (ext === 'png' ? 'image/png' : 'image/jpeg');

                    // On Android, ImagePicker may return `content://...` URIs.
                    // Copy to cache so multipart upload works reliably.
                    let uploadUri = uri;
                    if (uri.startsWith('content://')) {
                      const safeExt = ext === 'png' ? 'png' : 'jpg';
                      const dest = `${FileSystem.Paths.cache.uri}upload_${Date.now()}.${safeExt}`;
                      try {
                        await FileSystem.copyAsync({ from: uri, to: dest });
                        uploadUri = dest;
                      } catch {
                        // If copy fails, fall back to the original URI.
                        uploadUri = uri;
                      }
                    }

                    setPickedPhoto({
                      uri: uploadUri,
                      type,
                      name: originalName,
                    });
                  } else {
                    setPickedPhoto(null);
                  }
                }
              }}
              className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full bg-primary"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.7)',
                ...shadows.card,
              }}
              accessibilityRole="button"
              accessibilityLabel="Tukar gambar profil"
            >
              <Pencil size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        <Label text="Full Name" />
        <Field value={fullName} onChangeText={setFullName} placeholder="Full Name" />

        <View style={{ height: spacing.md }} />
        <Label text="Phone Number" />
        <Field
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+60..."
          keyboardType="phone-pad"
        />

        <View style={{ height: spacing.md }} />
        <Label text="IC Number" />
        <Field
          value={icNumber}
          onChangeText={setIcNumber}
          placeholder="123456789012"
        />

        <View style={{ height: spacing.md }} />
        <Label text="Email" />
        <Field
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <View style={{ height: spacing.lg }} />
        <Pressable
          onPress={async () => {
            if (!session || isUpdating) return;
            setIsUpdating(true);
            
            try {
              // 1. Panggil API Laravel
              const res = await postUpdateProfile(token, {
                name: fullName,
                email: email,
                phone: phoneNumber,
                ic: icNumber,
                ...(pickedPhoto ? { photo: pickedPhoto } : {}),
              });

              // 2. Update session dalam React Context (UI berubah secara automatik)
              const nextPhotoUrl =
                res?.photo_url ??
                res?.photoUrl ??
                res?.user?.pengawal?.photo_url ??
                res?.data?.photo_url ??
                session.photoUrl ??
                null;
              setSession({
                ...session,
                displayName: fullName,
                email: email,
                phone: phoneNumber,
                ic: icNumber,
                photoUrl: nextPhotoUrl,
              });

              // 3. Maklumkan kepada user
              if (res.email_changed) {
                Alert.alert(
                  'Profil Dikemaskini', 
                  'Email anda telah ditukar. Pautan pengesahan baru telah dihantar ke email anda.'
                );
                // Kalau nak terus redirect ke screen verify, boleh letak router.push('/verify-email') di sini
              } else {
                Alert.alert('Berjaya', 'Profil berjaya dikemaskini.');
              }
              
            } catch (error: any) {
              const msg =
                error?.response?.data?.message ??
                error?.response?.data?.error ??
                error?.message ??
                'Sesuatu yang tidak kena berlaku.';
              Alert.alert('Ralat', msg);
            } finally {
              setIsUpdating(false);
            }
          }}
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
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : parts[0]?.[1] ?? '';
  return (first + second).toUpperCase();
}

