import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, Search } from 'lucide-react-native';

import { DashboardHeader } from '../../components/DashboardHeader';

const CARD_BG = '#F2F2F2';
const TAG_BG = '#FFFFFF';

type Visitor = {
  id: string;
  name: string;
  purpose: string;
  plate: string;
  dateLabel: string;
  durationLabel: string;
  avatarUri: string;
};

const MOCK_VISITORS: Visitor[] = [
  {
    id: '1',
    name: 'Aminah',
    purpose: 'Hantar makanan',
    plate: 'TTB1234',
    dateLabel: 'Sunday, 12 June',
    durationLabel: '1 jam 30 minit',
    avatarUri: 'https://i.pravatar.cc/120?img=47',
  },
  {
    id: '2',
    name: 'Amirul',
    purpose: 'Hantar Anak',
    plate: 'WWW1234',
    dateLabel: 'Sunday, 12 June',
    durationLabel: '1 jam 30 minit',
    avatarUri: 'https://i.pravatar.cc/120?img=33',
  },
  {
    id: '3',
    name: 'Aina',
    purpose: 'Hantar Anak',
    plate: 'WWW1234',
    dateLabel: 'Sunday, 12 June',
    durationLabel: '1 jam 30 minit',
    avatarUri: 'https://i.pravatar.cc/120?img=45',
  },
];

export default function SenaraiPelawatScreen() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_VISITORS;
    return MOCK_VISITORS.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.purpose.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <DashboardHeader showTambah />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="pb-4 pt-2">
            <View
              className="flex-row items-center rounded-full border border-slate-200 bg-white px-4 py-3"
              style={{ borderWidth: 1 }}
            >
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cari pelawat…"
                placeholderTextColor="#94A3B8"
                className="min-h-[22px] flex-1 text-base text-slate-900"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Search size={22} color="#1F7BFF" />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <VisitorCard
            visitor={item}
            onKeluar={() =>
              Alert.alert('Keluar', `Rekod keluar untuk ${item.name}?`)
            }
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <Text className="py-8 text-center text-slate-500">
            Tiada pelawat dijumpai.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

function VisitorCard({
  visitor,
  onKeluar,
}: {
  visitor: Visitor;
  onKeluar: () => void;
}) {
  return (
    <View
      className="overflow-hidden rounded-3xl px-4 py-4"
      style={{ backgroundColor: CARD_BG }}
    >
      <View className="flex-row">
        <Image
          source={{ uri: visitor.avatarUri }}
          className="h-14 w-14 rounded-full"
        />
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-primary">{visitor.name}</Text>
          <Text className="mt-0.5 text-sm text-slate-700">
            <Text className="font-semibold text-slate-800">Tujuan: </Text>
            {visitor.purpose}
          </Text>
          <Text className="mt-0.5 text-sm text-slate-700">
            <Text className="font-semibold text-slate-800">No. Plat: </Text>
            {visitor.plate}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        <View
          className="flex-row items-center rounded-full px-3 py-1.5"
          style={{ backgroundColor: TAG_BG }}
        >
          <Calendar size={14} color="#1F7BFF" />
          <Text className="ml-1.5 text-xs font-semibold text-primary">
            {visitor.dateLabel}
          </Text>
        </View>
        <View
          className="flex-row items-center rounded-full px-3 py-1.5"
          style={{ backgroundColor: TAG_BG }}
        >
          <Clock size={14} color="#1F7BFF" />
          <Text className="ml-1.5 text-xs font-semibold text-primary">
            {visitor.durationLabel}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onKeluar}
        className="mt-4 h-12 items-center justify-center rounded-2xl bg-primary"
      >
        <Text className="text-base font-bold text-white">Keluar</Text>
      </Pressable>
    </View>
  );
}
