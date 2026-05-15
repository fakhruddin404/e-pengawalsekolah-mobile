import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';

import { AppText } from '../../components/AppText';
import { PelawatSearchModal, type PelawatSearchOption } from '../../components/PelawatSearchModal';
import { SelectModalDropdown } from '../../components/SelectModalDropdown';
import { textVariants } from '../../theme/typography';
import { palette, radii, shadows, spacing } from '../../theme/ui';
import { useAuth } from '../../context/AuthContext';
import { formatAxiosError, getSearchPelawat, postCreatePasLawatan } from '../../services';

type PasTujuan =
  | 'Urusan pejabat'
  | 'Hantar dokumen'
  | 'Jumpa guru'
  | 'Ambil anak'
  | 'Lain-lain';

type PelawatOption = PelawatSearchOption;

type CreatePasLawatanSubmitPayload = {
  id: string | null;
  namaPenuh: string;
  noTel: string;
  ic: string;
  noKenderaan: string;
  tujuan: string;
};

const TUJUAN_OPTIONS: PasTujuan[] = [
  'Urusan pejabat',
  'Hantar dokumen',
  'Jumpa guru',
  'Ambil anak',
  'Lain-lain',
];

export default function CreatePasLawatanScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.token ?? '';
  const [submitting, setSubmitting] = useState(false);
  const [namaPenuh, setNamaPenuh] = useState('');
  const [noTel, setNoTel] = useState('');
  const [ic, setIc] = useState('');
  const [noKenderaan, setNoKenderaan] = useState('');
  const [tujuan, setTujuan] = useState<PasTujuan>('Urusan pejabat');
  const [tujuan_lain, setTujuanLain] = useState('');
  const [selectedPelawatId, setSelectedPelawatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PelawatOption[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  function goToSenaraiPelawat() {
    router.replace('/(tabs)/senaraiPelawat');
  }

  function resetSearchState(closeModal = true) {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setSearchLoading(false);
    if (closeModal) setSearchOpen(false);
  }

  function resetFormState() {
    setNamaPenuh('');
    setNoTel('');
    setIc('');
    setNoKenderaan('');
    setTujuan('Urusan pejabat');
    setTujuanLain('');
    setSelectedPelawatId(null);
  }

  function resetAllState() {
    resetFormState();
    resetSearchState();
  }

  function handleBack() {
    resetAllState();
    goToSenaraiPelawat();
  }

  function handleCancel() {
    resetAllState();
    goToSenaraiPelawat();
  }

  const searchPelawat = useMemo(
    () => async (query: string): Promise<PelawatOption[]> => {
      if (!token) return [];
      return await getSearchPelawat(token, query);
    },
    [token]
  );

  const finalTujuan = useMemo(() => {
    if (tujuan !== 'Lain-lain') return tujuan;
    const v = tujuan_lain.trim();
    return v || tujuan;
  }, [tujuan, tujuan_lain]);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!namaPenuh.trim()) return false;
    if (!noTel.trim()) return false;
    if (!ic.trim()) return false;
    if (!noKenderaan.trim()) return false;
    if (!finalTujuan.trim()) return false;
    return true;
  }, [submitting, namaPenuh, noTel, ic, noKenderaan, finalTujuan]);

  useEffect(() => {
    let alive = true;
    const q = searchQuery.trim();
    if (!searchOpen) return;
    if (!q) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    Promise.resolve()
      .then(async () => await searchPelawat(q))
      .then((res) => {
        if (!alive) return;
        setSearchResults(Array.isArray(res) ? res : []);
      })
      .catch((e: any) => {
        if (!alive) return;
        setSearchError(e?.message ?? 'Carian gagal. Sila cuba lagi.');
        setSearchResults([]);
      })
      .finally(() => {
        if (!alive) return;
        setSearchLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [searchOpen, searchQuery, searchPelawat]);

  async function handleSubmit(payload: CreatePasLawatanSubmitPayload) {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!token) throw new Error('Sesi tamat. Sila log masuk semula.');
      await postCreatePasLawatan(token, payload);
      resetAllState();
      Alert.alert('Berjaya', 'Pas lawatan disimpan.');
      goToSenaraiPelawat();
    } catch (e: any) {
      Alert.alert('Ralat', formatAxiosError(e, 'Simpan gagal. Sila cuba lagi.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function onPressSubmit() {
    if (!canSubmit) return;
    await handleSubmit({
      id: selectedPelawatId,
      namaPenuh: namaPenuh.trim(),
      noTel: noTel.trim(),
      ic: ic.trim(),
      noKenderaan: noKenderaan.trim(),
      tujuan: finalTujuan.trim(),
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View
        className="flex-row items-center justify-center bg-white"
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
        }}
      >
        <Pressable
          onPress={handleBack}
          className="absolute left-0 h-10 w-10 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <ArrowLeft size={22} color={palette.primary} />
        </Pressable>
        <AppText variant="h3" style={{ color: palette.primary }}>
          Create Pas Lawatan
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
        }}
      >
        <View
          className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm"
          style={{ ...shadows.card }}
        >
          <View>
            <AppText
              variant="label"
              style={{ marginBottom: spacing.xs, color: '#374151', fontWeight: '600' }}
            >
              Cari pelawat sedia ada
            </AppText>
            <Pressable
              onPress={() => setSearchOpen(true)}
              className="flex-row items-center"
              style={{
                height: 52,
                borderRadius: radii.md,
                paddingHorizontal: spacing.md,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#F3F4F6',
              }}
              accessibilityRole="button"
              accessibilityLabel="Cari pelawat"
            >
              <Search size={18} color={palette.muted} />
              <AppText
                variant="body"
                className="ml-2 flex-1"
                style={{ color: searchQuery.trim() ? palette.text : '#94A3B8' }}
              >
                {searchQuery.trim() ? searchQuery.trim() : 'Cari nama / no telefon...'}
              </AppText>
            </Pressable>

            <PelawatSearchModal
              visible={searchOpen}
              searchQuery={searchQuery}
              onChangeSearchQuery={setSearchQuery}
              searchError={searchError}
              searchLoading={searchLoading}
              searchResults={searchResults}
              onClose={() => setSearchOpen(false)}
              onSelect={(item) => {
                setNamaPenuh(item.namaPenuh ?? '');
                setNoTel(item.noTel ?? '');
                setIc(item.ic ?? '');
                setSelectedPelawatId(item.id);
                setSearchQuery('');
                setSearchResults([]);
                setSearchError(null);
                setSearchOpen(false);
              }}
              inputBackgroundColor={'#F8FAFC'}
            />
          </View>

          <View style={{ height: spacing.lg }} />

          {/* form input */}
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -8 }}>
            <FieldBlock title="Nama Penuh" required className="w-full md:w-1/2" pad>
              <FocusField
                value={namaPenuh}
                onChangeText={(v) => {
                  setNamaPenuh(v);
                  setSelectedPelawatId(null);
                }}
                placeholder="Ahmad bin Ali"
                editable={!submitting}
              />
            </FieldBlock>

            <FieldBlock title="No Telefon" required className="w-full md:w-1/2" pad>
              <FocusField
                value={noTel}
                onChangeText={(v) => {
                  setNoTel(v);
                  setSelectedPelawatId(null);
                }}
                placeholder="0123456789"
                keyboardType="phone-pad"
                editable={!submitting}
              />
            </FieldBlock>

            <FieldBlock title="No IC" required className="w-full md:w-1/2" pad>
              <FocusField
                value={ic}
                onChangeText={(v) => {
                  setIc(v);
                  setSelectedPelawatId(null);
                }}
                placeholder="010101-01-0101"
                editable={!submitting}
              />
            </FieldBlock>

            <FieldBlock title="No Kenderaan" required className="w-full md:w-1/2" pad>
              <FocusField
                value={noKenderaan}
                onChangeText={setNoKenderaan}
                placeholder="Contoh: WXY1234"
                autoCapitalize="characters"
                editable={!submitting}
              />
            </FieldBlock>

            <FieldBlock title="Tujuan" required className="w-full md:w-1/2" pad>
              <SelectModalDropdown
                value={tujuan}
                options={TUJUAN_OPTIONS}
                onChange={(v) => {
                  setTujuan(v);
                  if (v !== 'Lain-lain') setTujuanLain('');
                }}
                disabled={submitting}
                title="Pilih Tujuan"
                accessibilityLabel="Pilih tujuan"
                inputBackgroundColor={'#F8FAFC'}
                activeBackgroundColor="#FFF7ED"
                activeBorderColor="#FED7AA"
                activeTextColor="#9A3412"
              />
            </FieldBlock>

            {tujuan === 'Lain-lain' ? (
              <FieldBlock title="Tujuan (Lain-lain)" required className="w-full md:w-1/2" pad>
                <FocusField
                  value={tujuan_lain}
                  onChangeText={setTujuanLain}
                  placeholder="Nyatakan tujuan..."
                  editable={!submitting}
                />
                <AppText variant="caption" style={{ marginTop: spacing.xs, color: palette.muted }}>
                  Jika diisi, nilai ini akan digunakan semasa simpan.
                </AppText>
              </FieldBlock>
            ) : null}

          </View>

          <View style={{ height: spacing.xl }} />

          <View className="flex-row items-center justify-end" style={{ gap: 12 }}>
            <Pressable
              onPress={handleCancel}
              disabled={submitting}
              className={['items-center justify-center', submitting ? 'opacity-60' : 'opacity-100'].join(
                ' '
              )}
              style={{
                height: 48,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.pill,
                backgroundColor: '#F1F5F9',
              }}
              accessibilityRole="button"
              accessibilityLabel="Batal"
            >
              <AppText variant="bodySm" style={{ fontWeight: '700', color: palette.text }}>
                Batal
              </AppText>
            </Pressable>

            <Pressable
              onPress={onPressSubmit}
              disabled={!canSubmit}
              className={['items-center justify-center', !canSubmit ? 'opacity-60' : 'opacity-100'].join(
                ' '
              )}
              style={{
                height: 48,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.pill,
                backgroundColor: '#F97316',
              }}
              accessibilityRole="button"
              accessibilityLabel="Simpan / Daftar Pas"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <AppText variant="bodySm" style={{ fontWeight: '800', color: '#FFFFFF' }}>
                  Simpan Pas
                </AppText>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldBlock({
  title,
  required,
  children,
  className,
  pad,
}: {
  title: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <View className={className} style={pad ? { paddingHorizontal: 8, paddingBottom: 14 } : undefined}>
      <AppText variant="label" style={{ marginBottom: spacing.xs, color: '#374151', fontWeight: '600' }}>
        {title}
        {required ? <AppText variant="label" style={{ color: '#DC2626' }}>{' *'}</AppText> : null}
      </AppText>
      {children}
    </View>
  );
}

function FocusField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  editable,
  rightHint,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  rightHint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="relative">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        className="text-slate-900"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          textVariants.body,
          {
            height: 52,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            paddingRight: rightHint ? 60 : spacing.md,
            backgroundColor: '#F8FAFC',
            borderWidth: 1,
            borderColor: focused ? '#F97316' : palette.border,
          },
        ]}
      />
      {rightHint ? (
        <View className="absolute right-3 top-0 h-[52px] justify-center">
          <View
            className="rounded-full px-2 py-1"
            style={{ backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' }}
          >
            <AppText variant="caption" style={{ color: '#9A3412', fontWeight: '700' }}>
              {rightHint}
            </AppText>
          </View>
        </View>
      ) : null}
    </View>
  );
}


