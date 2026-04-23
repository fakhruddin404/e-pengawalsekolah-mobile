import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, KeyRound, LogOut, User, ArrowLeft } from 'lucide-react-native';

import { AppText } from '../components/AppText';
import { palette, radii, shadows, spacing } from '../theme/ui';
import { useAuth } from '../context/AuthContext';
import { performLogout } from '../services/logout';

const ROW_BG = palette.surface;
const ICON_BG = '#E8F1FF';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, setSession } = useAuth();

  const name = session?.displayName ?? '';
  const initials = getInitials(name);

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
            Settings
          </AppText>
        </View>

        <View style={{ alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl }}>
          <AvatarCircle initials={initials} />
          <AppText variant="h2" style={{ marginTop: spacing.md }}>
            {name || 'Pengawal'}
          </AppText>
        </View>

        <SettingsRow
          icon={<User size={18} color="#1F7BFF" />}
          label="Profile"
          onPress={() => router.push('/profile')}
        />
        <View className="h-4" />
        <SettingsRow
          icon={<KeyRound size={18} color="#1F7BFF" />}
          label="Password Manager"
          onPress={() => router.push('/password-manager')}
        />
        <View className="h-4" />
        <SettingsRow
          icon={<LogOut size={18} color="#1F7BFF" />}
          label="Logout"
          onPress={() =>
            Alert.alert('Log Keluar', 'Anda pasti mahu log keluar?', [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'Log Keluar',
                style: 'destructive',
                onPress: () => performLogout({ session, setSession, router }),
              },
            ])
          }
        />
      </View>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center"
      style={{
        backgroundColor: ROW_BG,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        ...shadows.card,
      }}
      accessibilityRole="button"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: ICON_BG }}
      >
        {icon}
      </View>
      <AppText variant="body" className="ml-4 flex-1" style={{ fontWeight: '600' }}>
        {label}
      </AppText>
      <ChevronRight size={20} color="#94A3B8" />
    </Pressable>
  );
}

function AvatarCircle({ initials }: { initials: string }) {
  return (
    <View className="h-24 w-24 items-center justify-center rounded-full bg-slate-200">
      <AppText variant="h2" style={{ color: '#334155' }}>
        {initials || '?'}
      </AppText>
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

