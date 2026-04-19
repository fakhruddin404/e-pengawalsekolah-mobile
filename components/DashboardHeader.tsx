import { Alert, Image, Pressable, Text, View } from 'react-native';
import { Bell, Cog } from 'lucide-react-native';

const ICON_BUTTON_BG = '#E8EEF6';

export function DashboardHeader() {
  return (
    <View className="flex-row items-center justify-between bg-white px-4 pt-2 pb-1">
      <View className="flex-row items-center">
        <Image
          source={{
            uri: 'https://i.pravatar.cc/120?img=12',
          }}
          className="h-10 w-10 rounded-full"
        />
        <View className="ml-3">
          <Text className="text-xs font-semibold text-primary">Hi, WelcomeBack</Text>
          <Text className="text-lg font-extrabold text-slate-900">John Doe</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3">
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
          onPress={() => Alert.alert('Tetapan', 'Coming soon')}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: ICON_BUTTON_BG }}
        >
          <Cog size={18} color="#0F172A" />
        </Pressable>
      </View>
    </View>
  );
}
