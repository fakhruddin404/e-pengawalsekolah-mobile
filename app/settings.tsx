import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, KeyRound, LogOut, User, ArrowLeft } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';

const ROW_BG = '#FFFFFF';
const ICON_BG = '#D1E3FF';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, setSession } = useAuth();

  const name = session?.displayName ?? '';
  const initials = getInitials(name);

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
          <Text className="text-lg font-extrabold text-primary">Settings</Text>
        </View>

        <View className="items-center pt-6 pb-8">
          <AvatarCircle initials={initials} />
          <Text className="mt-4 text-2xl font-extrabold text-slate-900">
            {name || 'Pengawal'}
          </Text>
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
                onPress: () => {
                  setSession(null);
                  router.replace('/login');
                },
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
      className="flex-row items-center rounded-2xl px-4 py-4"
      style={{
        backgroundColor: ROW_BG,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }}
      accessibilityRole="button"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: ICON_BG }}
      >
        {icon}
      </View>
      <Text className="ml-4 flex-1 text-base font-semibold text-slate-900">
        {label}
      </Text>
      <ChevronRight size={20} color="#94A3B8" />
    </Pressable>
  );
}

function AvatarCircle({ initials }: { initials: string }) {
  return (
    <View className="h-24 w-24 items-center justify-center rounded-full bg-slate-200">
      <Text className="text-2xl font-extrabold text-slate-700">
        {initials || '?'}
      </Text>
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

