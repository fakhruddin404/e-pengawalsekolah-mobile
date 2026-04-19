import { lazy, Suspense, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText,
  Play,
  ScanLine,
  Siren,
} from 'lucide-react-native';

import { DashboardHeader } from '../../components/DashboardHeader';

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

        <SafeAreaView className="absolute left-0 right-0 top-0 bg-white">
          <DashboardHeader />
        </SafeAreaView>

        <View className="absolute bottom-36 left-4">
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
