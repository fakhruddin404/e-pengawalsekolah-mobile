import { Alert, Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Cog, Plus } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';

const ICON_BUTTON_BG = '#E8EEF6';
const TAMBAH_PILL_BG = '#D1E3FF';

export type DashboardHeaderProps = {
  showTambah?: boolean;
};

export function DashboardHeader({
  showTambah = false,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { session } = useAuth();
  const pengawalName = session?.displayName ?? '';
  const photoUrl = session?.photoUrl ?? null;
  const token = session?.token ?? '';
  const initials = getInitials(pengawalName);

  return (
    <View className="flex-row items-center justify-between bg-white px-4 pt-2 pb-1">
      <View className="min-w-0 flex-1 flex-row items-center">
        {photoUrl ? (
          <Image
            source={{
              uri: photoUrl,
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }}
            className="h-10 w-10 shrink-0 rounded-full bg-slate-200"
          />
        ) : (
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200">
            <Text className="text-sm font-extrabold text-slate-700">
              {initials || '?'}
            </Text>
          </View>
        )}
        <View className="ml-3 min-w-0 flex-1">
          <Text className="text-xs font-semibold text-primary">Hi, WelcomeBack</Text>
          <Text
            className="text-lg font-extrabold text-slate-900"
            numberOfLines={1}
          >
            {pengawalName || '…'}
          </Text>
        </View>
      </View>

      <View className="ml-2 flex-row shrink-0 items-center gap-2">
        {showTambah ? (
          <Pressable
            onPress={() => Alert.alert('Tambah pelawat', 'Coming soon')}
            className="flex-row items-center rounded-full px-3 py-2"
            style={{ backgroundColor: TAMBAH_PILL_BG }}
          >
            <Plus size={16} color="#1F7BFF" strokeWidth={2.5} />
            <Text className="ml-1.5 text-xs font-bold text-primary">Tambah</Text>
          </Pressable>
        ) : null}
        <View className="relative">
          <Pressable
            onPress={() => Alert.alert('Notifikasi', 'Coming soon')}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: ICON_BUTTON_BG }}
          >
            <Bell size={18} color="#0F172A" />
          </Pressable>
          <View
            className="absolute h-2.5 w-2.5 rounded-full bg-primary"
            style={{
              top: 4,
              right: 4,
              borderWidth: 2,
              borderColor: '#ffffff',
            }}
          />
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: ICON_BUTTON_BG }}
        >
          <Cog size={18} color="#0F172A" />
        </Pressable>
      </View>
    </View>
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
