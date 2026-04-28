import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Clock, Plus, Search } from 'lucide-react-native';

import { AppText } from '../../components/AppText';
import { textVariants } from '../../theme/typography';
import { palette, radii, shadows, spacing } from '../../theme/ui';
import { DashboardHeader } from '../../components/DashboardHeader';
import { useAuth } from '../../context/AuthContext';
import { getPelawatAktifUi, postKeluarPasLawatan } from '../../services';

const CARD_BG = palette.surface;
const TAG_BG = palette.surfaceAlt;
const PRIMARY = palette.primary;
const ICON_BUTTON_BG = '#E8F1FF';

type PelawatAktif = Awaited<ReturnType<typeof getPelawatAktifUi>>[number];

export default function SenaraiPelawatAktif() {
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.token ?? '';
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PelawatAktif[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoadError(null);
    setLoading(true);
    try {
      const res = await getPelawatAktifUi(token);
      setItems(res);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Gagal memuatkan senarai pelawat.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function confirmKeluar(id: string, name: string) {
    if (!token) {
      Alert.alert('Ralat', 'Sesi tamat. Sila log masuk semula.');
      return;
    }

    Alert.alert('Keluar', `Rekod keluar untuk ${name}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          try {
            await postKeluarPasLawatan(token, id);
            await load();
            Alert.alert('Berjaya', 'Pelawat telah direkod keluar.');
          } catch (e: any) {
            Alert.alert('Ralat', e?.message ?? 'Gagal rekod keluar. Sila cuba lagi.');
          }
        },
      },
    ]);
  }

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const searchPelawatAktif = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.purpose.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <DashboardHeader />

      <FlatList
        data={searchPelawatAktif}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={async () => {
          if (!token) return;
          setRefreshing(true);
          try {
            await load();
          } finally {
            setRefreshing(false);
          }
        }}
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
                onPress={() => router.push('/(tabs)/createPasLawatan')}
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
                  Pas
                </AppText>
              </Pressable>
            </View>
            {loadError ? (
              <AppText
                variant="caption"
                className="mt-2"
                style={{ color: '#DC2626', textAlign: 'center' }}
              >
                {loadError}
              </AppText>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <VisitorCard
            visitor={item}
            onKeluar={() => confirmKeluar(item.id, item.name)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <AppText
            variant="bodySm"
            className="py-8 text-center"
            style={{ color: '#64748b' }}
          >
            {loading ? 'Memuatkan…' : 'Tiada pelawat dijumpai.'}
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
  visitor: PelawatAktif;
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
      <View>
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
