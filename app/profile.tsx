import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Pencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../context/AuthContext';
import { postSendEmailVerification, postUpdateProfile } from '../services/api';

const INPUT_BG = '#F0F4FF';

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
  const [sendingVerify, setSendingVerify] = useState(false);

  const initials = useMemo(() => getInitials(fullName), [fullName]);
  const remotePhotoUrl = session?.photoUrl ?? null;
  const canVerify = !!email.trim() && !!token && !sendingVerify;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-5 pt-2">
        <View className="relative flex-row items-center justify-center pb-2">
          <Pressable
            onPress={() => router.back()}
            className="absolute left-0 h-10 w-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <ArrowLeft size={22} color="#1F7BFF" />
          </Pressable>
          <Text className="text-lg font-extrabold text-primary">Profile</Text>
        </View>

        <View className="items-center pt-6 pb-8">
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
                <Text className="text-2xl font-extrabold text-slate-700">
                  {initials || '?'}
                </Text>
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
                  setLocalPhotoUri(result.assets[0]?.uri ?? null);
                }
              }}
              className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full bg-primary"
              accessibilityRole="button"
              accessibilityLabel="Tukar gambar profil"
            >
              <Pencil size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        <Label text="Full Name" />
        <Field value={fullName} onChangeText={setFullName} placeholder="Full Name" />

        <View className="h-5" />
        <Label text="Phone Number" />
        <Field
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+60..."
          keyboardType="phone-pad"
        />

        <View className="h-5" />
        <Label text="IC Number" />
        <Field
          value={icNumber}
          onChangeText={setIcNumber}
          placeholder="123456789012"
        />

        <View className="h-5" />
        <View className="flex-row items-end justify-between">
          <Label text="Email" />
          <Pressable
            onPress={async () => {
              if (!canVerify) return;
              setSendingVerify(true);
              try {
                const res = await postSendEmailVerification(token);
                Alert.alert('Pengesahan Email', res?.message ?? 'Pautan pengesahan dihantar.');
              } catch (e: any) {
                Alert.alert('Ralat', e?.response?.data?.message ?? e?.message ?? 'Gagal hantar pengesahan.');
              } finally {
                setSendingVerify(false);
              }
            }}
            disabled={!canVerify}
            accessibilityRole="button"
          >
            <Text className={['text-xs font-extrabold text-primary', !canVerify ? 'opacity-60' : 'opacity-100'].join(' ')}>
              {sendingVerify ? 'Sending…' : 'Verify'}
            </Text>
          </Pressable>
        </View>
        <Field
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View className="h-5" />
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
              });

              // 2. Update session dalam React Context (UI berubah secara automatik)
              setSession({
                ...session,
                displayName: fullName,
                email: email,
                phone: phoneNumber,
                ic: icNumber,
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
          className={['h-14 items-center justify-center rounded-full bg-primary', isUpdating ? 'opacity-70' : 'opacity-100'].join(' ')}
          accessibilityRole="button"
        >
          <Text className="text-base font-extrabold text-white">
            {isUpdating ? 'Menyimpan...' : 'Update Profile'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text className="mb-2 text-sm font-bold text-slate-900">{text}</Text>;
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
      placeholderTextColor="#1F7BFF"
      className="h-12 rounded-2xl px-4 text-slate-900"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      style={{ backgroundColor: INPUT_BG }}
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

