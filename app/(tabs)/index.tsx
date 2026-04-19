import { lazy, Suspense, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  Cog,
  FileText,
  Play,
  ScanLine,
  Siren,
} from 'lucide-react-native';

const MapsDashboard = lazy(() => import('./MapsDashboard'));

export default function HomeMapScreen() {
  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        <Suspense
          fallback={
            <View className="flex-1 items-center justify-center bg-slate-100">
              <ActivityIndicator size="large" color="#1F7BFF" />
            </View>
          }
        >
          <MapsDashboard />
        </Suspense>

        <SafeAreaView className="absolute left-0 right-0 top-0">
          <View className="flex-row items-center justify-between px-4 pt-2">
            <View className="flex-row items-center">
              <Image
                source={{
                  uri: 'https://i.pravatar.cc/120?img=12',
                }}
                className="h-10 w-10 rounded-full"
              />
              <View className="ml-3">
                <Text className="text-xs font-semibold text-primary">
                  Hi, WelcomeBack
                </Text>
                <Text className="text-base font-extrabold text-slate-900">
                  John Doe
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => Alert.alert('Notifikasi', 'Coming soon')}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <Bell size={18} color="#0F172A" />
              </Pressable>
              <Pressable
                onPress={() => Alert.alert('Tetapan', 'Coming soon')}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <Cog size={18} color="#0F172A" />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>

        <View className="absolute bottom-28 left-4">
          <Fab label="MULA" icon={<Play size={18} color="#0F172A" />} />
          <View className="h-3" />
          <Fab label="IMBAS" icon={<ScanLine size={18} color="#0F172A" />} />
          <View className="h-3" />
          <Fab label="LAPORAN" icon={<FileText size={18} color="#0F172A" />} />
          <View className="h-3" />
          <Fab
            label="SOS"
            icon={<Siren size={18} color="#0F172A" />}
            onPress={() => Alert.alert('SOS', 'Menghantar SOS...')}
          />
        </View>
      </View>
    </View>
  );
}

function Fab({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress ?? (() => Alert.alert(label, 'Coming soon'))}
      className="flex-row items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      {icon}
      <Text className="text-xs font-extrabold text-slate-900">{label}</Text>
    </Pressable>
  );
}
