import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, Plus, Search } from 'lucide-react-native';

import { AppText } from '../../components/AppText';
import { textVariants } from '../../theme/typography';
import { palette, radii, shadows, spacing } from '../../theme/ui';
import { DashboardHeader } from '../../components/DashboardHeader';

const CARD_BG = palette.surface;
const TAG_BG = palette.surfaceAlt;
const PRIMARY = palette.primary;
const ICON_BUTTON_BG = '#E8F1FF';

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
      <DashboardHeader />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xl,
          paddingTop: spacing.sm,
        }}
        ListHeaderComponent={
          <View style={{ paddingBottom: spacing.md }}>
            <View className="flex-row items-center">
              <View
                className="flex-1 overflow-hidden bg-white"
                style={{
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <View
                  className="flex-row items-center"
                  style={{ paddingHorizontal: spacing.md, paddingVertical: 10 }}
                >
                  <Search size={20} color={PRIMARY} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Cari pelawat…"
                    placeholderTextColor="#94A3B8"
                    className="ml-2 min-h-[22px] flex-1 text-base text-slate-900"
                    autoCorrect={false}
                    autoCapitalize="none"
                    style={textVariants.body}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => Alert.alert('Tambah pelawat', 'Coming soon')}
                className="ml-3 flex-row items-center"
                style={{
                  backgroundColor: ICON_BUTTON_BG,
                  borderRadius: radii.pill,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 14,
                }}
                accessibilityRole="button"
              >
                <Plus size={18} color={PRIMARY} strokeWidth={2.5} />
                <AppText
                  variant="bodySm"
                  className="ml-2"
                  style={{ fontWeight: '800', color: PRIMARY }}
                >
                  Tambah
                </AppText>
              </Pressable>
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
          <AppText
            variant="bodySm"
            className="py-8 text-center"
            style={{ color: '#64748b' }}
          >
            Tiada pelawat dijumpai.
          </AppText>
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
      className="overflow-hidden"
      style={{
        backgroundColor: CARD_BG,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        ...shadows.card,
      }}
    >
      <View className="flex-row">
        <Image
          source={{ uri: visitor.avatarUri }}
          className="h-14 w-14 rounded-full bg-slate-200"
        />
        <View className="ml-3 flex-1">
          <AppText variant="body" style={{ fontWeight: '700', color: PRIMARY }}>
            {visitor.name}
          </AppText>
          <AppText variant="bodySm" className="mt-0.5" style={{ color: '#334155' }}>
            <AppText variant="bodySm" style={{ fontWeight: '600', color: '#1e293b' }}>
              Tujuan:{' '}
            </AppText>
            {visitor.purpose}
          </AppText>
          <AppText variant="bodySm" className="mt-0.5" style={{ color: '#334155' }}>
            <AppText variant="bodySm" style={{ fontWeight: '600', color: '#1e293b' }}>
              No. Plat:{' '}
            </AppText>
            {visitor.plate}
          </AppText>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <View
          className="flex-row items-center rounded-full px-3 py-1.5"
          style={{ backgroundColor: TAG_BG }}
        >
          <Calendar size={14} color="#1F7BFF" />
          <AppText
            variant="caption"
            className="ml-1.5"
            style={{ fontWeight: '600', color: PRIMARY }}
          >
            {visitor.dateLabel}
          </AppText>
        </View>
        <View
          className="flex-row items-center rounded-full px-3 py-1.5"
          style={{ backgroundColor: TAG_BG }}
        >
          <Clock size={14} color="#1F7BFF" />
          <AppText
            variant="caption"
            className="ml-1.5"
            style={{ fontWeight: '600', color: PRIMARY }}
          >
            {visitor.durationLabel}
          </AppText>
        </View>
      </View>

      <Pressable
        onPress={onKeluar}
        className="items-center justify-center bg-primary"
        style={{
          marginTop: spacing.md,
          height: 52,
          borderRadius: radii.pill,
        }}
      >
        <AppText variant="body" style={{ fontWeight: '800', color: '#ffffff' }}>
          Keluar
        </AppText>
      </Pressable>
    </View>
  );
}
