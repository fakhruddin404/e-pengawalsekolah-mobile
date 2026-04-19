import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardHeader } from '../../components/DashboardHeader';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <DashboardHeader />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base font-semibold text-slate-800">
          Senarai Pelawat Aktif (coming soon)
        </Text>
      </View>
    </SafeAreaView>
  );
}
