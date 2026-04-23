import { Alert, Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Cog } from 'lucide-react-native';

import { AppText } from './AppText';
import { palette, spacing } from '../theme/ui';
import { useAuth } from '../context/AuthContext';

const ICON_BUTTON_BG = '#F1F5F9';

export type DashboardHeaderProps = {
  showTambah?: boolean;
};

export function DashboardHeader() {
  const router = useRouter();
  const { session } = useAuth();
  const pengawalName = session?.displayName ?? '';
  const photoUrl = session?.photoUrl ?? null;
  const token = session?.token ?? '';
  const initials = getInitials(pengawalName);

  return (
    <View
      className="flex-row items-center justify-between bg-white"
      style={{
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
      }}
    >
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
            <AppText variant="bodySm" style={{ fontWeight: '800', color: palette.text }}>
              {initials || '?'}
            </AppText>
          </View>
        )}
        <View className="ml-3 min-w-0 flex-1">
          <AppText variant="caption" style={{ color: palette.primary, fontWeight: '600' }}>
            Hi, WelcomeBack
          </AppText>
          <AppText
            variant="h3"
            numberOfLines={1}
          >
            {pengawalName || '…'}
          </AppText>
        </View>
      </View>

      <View className="ml-2 flex-row shrink-0 items-center gap-2">
        <View className="relative">
          <Pressable
            onPress={() => Alert.alert('Notifikasi', 'Coming soon')}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: ICON_BUTTON_BG }}
          >
            <Bell size={18} color={palette.text} />
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
          <Cog size={18} color={palette.text} />
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
