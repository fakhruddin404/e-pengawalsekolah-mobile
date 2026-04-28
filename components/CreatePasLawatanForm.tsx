import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { Search, X } from 'lucide-react-native';

import { AppText } from './AppText';
import { textVariants } from '../theme/typography';
import { palette, radii, shadows, spacing } from '../theme/ui';

type PasTujuan =
  | 'Urusan pejabat'
  | 'Hantar dokumen'
  | 'Jumpa guru'
  | 'Ambil anak'
  | 'Lain-lain';

export type PelawatOption = {
  id: string;
  namaPenuh: string;
  noTel: string;
  ic?: string;
};

export type CreatePasLawatanValues = {
  namaPenuh: string;
  noTel: string;
  ic: string;
  noKenderaan: string;
  tujuan: PasTujuan;
  tujuan_lain: string;
  masaMasuk: string; // HH:mm
};

export type CreatePasLawatanSubmitPayload = Omit<
  CreatePasLawatanValues,
  'tujuan' | 'tujuan_lain'
> & {
  tujuan: string;
  id: string | null;
};

export type CreatePasLawatanFormProps = {
  /**
   * Provide your API lookup here. If omitted, search UI still renders but uses empty results.
   */
  searchPelawat?: (query: string) => Promise<PelawatOption[]>;
  onCancel?: () => void;
  onSubmit?: (payload: CreatePasLawatanSubmitPayload) => Promise<void> | void;
  initialValues?: Partial<CreatePasLawatanValues>;
  submitting?: boolean;
  autoFillCurrentTime?: boolean;
};

const INPUT_BG = '#F8FAFC';
const ORANGE = '#F97316'; // tailwind orange-500

const TUJUAN_OPTIONS: PasTujuan[] = [
  'Urusan pejabat',
  'Hantar dokumen',
  'Jumpa guru',
  'Ambil anak',
  'Lain-lain',
];

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Used by: `app/(tabs)/createPasLawatan.tsx` via `CreatePasLawatanForm`.
 * Purpose: build a HH:mm string for auto-filled "Masa Masuk".
 */
function formatHHmm(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Used by: `app/(tabs)/createPasLawatan.tsx` via `CreatePasLawatanForm`.
 * Purpose: defensive string normalization for initialValues fields.
 */
function coalesceStr(v: any) {
  return typeof v === 'string' ? v : '';
}

/**
 * Used by page: `app/(tabs)/createPasLawatan.tsx`.
 * Purpose: "Create Pas Lawatan" form UI + visitor search autofill + submit payload.
 */
export function CreatePasLawatanForm({
  searchPelawat,
  onCancel,
  onSubmit,
  initialValues,
  submitting = false,
  autoFillCurrentTime = true,
}: CreatePasLawatanFormProps) {
  const initialTime = useMemo(
    () => (autoFillCurrentTime ? formatHHmm(new Date()) : ''),
    [autoFillCurrentTime]
  );

  const [namaPenuh, setNamaPenuh] = useState(coalesceStr(initialValues?.namaPenuh));
  const [noTel, setNoTel] = useState(coalesceStr(initialValues?.noTel));
  const [ic, setIc] = useState(coalesceStr((initialValues as any)?.ic));
  const [noKenderaan, setNoKenderaan] = useState(
    coalesceStr(initialValues?.noKenderaan)
  );
  const [tujuan, setTujuan] = useState<PasTujuan>(
    (initialValues?.tujuan as PasTujuan) ?? 'Urusan pejabat'
  );
  const [tujuan_lain, setTujuanLain] = useState(coalesceStr(initialValues?.tujuan_lain));
  const [masaMasuk] = useState(coalesceStr(initialValues?.masaMasuk) || initialTime);
  const [selectedPelawatId, setSelectedPelawatId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PelawatOption[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const finalTujuan = useMemo(() => {
    if (tujuan !== 'Lain-lain') return tujuan;
    const v = tujuan_lain.trim();
    return v ? v : tujuan;
  }, [tujuan, tujuan_lain]);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!namaPenuh.trim()) return false;
    if (!noTel.trim()) return false;
    if (!ic.trim()) return false;
    if (!noKenderaan.trim()) return false;
    if (!finalTujuan.trim()) return false;
    if (!masaMasuk.trim()) return false;
    return true;
  }, [submitting, namaPenuh, noTel, ic, noKenderaan, finalTujuan, masaMasuk]);

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
      .then(async () => {
        if (!searchPelawat) return [];
        return await searchPelawat(q);
      })
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

  async function handleSubmit() {
    if (!canSubmit) return;
    const payload: CreatePasLawatanSubmitPayload = {
      id: selectedPelawatId,
      namaPenuh: namaPenuh.trim(),
      noTel: noTel.trim(),
      ic: ic.trim(),
      noKenderaan: noKenderaan.trim(),
      tujuan: finalTujuan.trim(),
      masaMasuk: masaMasuk.trim(),
    };
    await onSubmit?.(payload);
  }

  // Render the form
  return (
    <View
      className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm"
      style={{ ...shadows.card }}
    >
      {/* Search Section */}
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
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#F3F4F6', // gray-100
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
            {searchQuery.trim() ? searchQuery.trim() : 'Cari nama / no telefon…'}
          </AppText>
        </Pressable>

        <Modal
          visible={searchOpen}
          animationType="slide"
          presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
          onRequestClose={() => setSearchOpen(false)}
        >
          <View className="flex-1 bg-white" style={{ paddingTop: spacing.lg }}>
            <View
              className="flex-row items-center"
              style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}
            >
              <View className="flex-1">
                <AppText variant="h3" style={{ color: palette.primary }}>
                  Cari Pelawat
                </AppText>
                <AppText variant="caption" style={{ color: palette.muted }}>
                  Pilih pelawat untuk auto-isi nama & nombor telefon
                </AppText>
              </View>
              <Pressable
                onPress={() => setSearchOpen(false)}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: '#F1F5F9' }}
                accessibilityRole="button"
                accessibilityLabel="Tutup carian"
              >
                <X size={18} color={palette.text} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
              <View
                className="flex-row items-center"
                style={{
                  height: 52,
                  borderRadius: radii.pill,
                  paddingHorizontal: spacing.md,
                  backgroundColor: INPUT_BG,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              >
                <Search size={18} color={palette.primary} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Taip untuk cari…"
                  placeholderTextColor="#94A3B8"
                  className="ml-2 flex-1 text-slate-900"
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={textVariants.body}
                />
              </View>
              {searchError ? (
                <AppText variant="caption" style={{ marginTop: spacing.xs, color: '#DC2626' }}>
                  {searchError}
                </AppText>
              ) : null}
            </View>

            <View className="flex-1" style={{ paddingHorizontal: spacing.lg }}>
              {searchLoading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator color={palette.primary} />
                  <AppText variant="caption" style={{ marginTop: spacing.sm, color: palette.muted }}>
                    Mencari…
                  </AppText>
                </View>
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                  ListEmptyComponent={
                    <View style={{ paddingTop: spacing.xl }}>
                      <AppText variant="bodySm" style={{ color: palette.muted, textAlign: 'center' }}>
                        {searchQuery.trim()
                          ? 'Tiada pelawat dijumpai.'
                          : 'Mulakan carian dengan menaip nama atau nombor telefon.'}
                      </AppText>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        setNamaPenuh(item.namaPenuh ?? '');
                        setNoTel(item.noTel ?? '');
                        setIc(item.ic ?? '');
                        setSelectedPelawatId(item.id);
                        setSearchOpen(false);
                      }}
                      className="bg-white"
                      style={{
                        borderWidth: 1,
                        borderColor: '#F3F4F6',
                        borderRadius: radii.md,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.md,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Pilih ${item.namaPenuh}`}
                    >
                      <AppText variant="body" style={{ fontWeight: '700', color: palette.text }}>
                        {item.namaPenuh}
                      </AppText>
                      <AppText variant="caption" style={{ color: palette.muted }}>
                        {item.noTel}
                      </AppText>
                      {item.ic ? (
                        <AppText variant="caption" style={{ color: palette.muted }}>
                          IC: {item.ic}
                        </AppText>
                      ) : null}
                    </Pressable>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      </View>

      <View style={{ height: spacing.lg }} />

      {/* Form Grid */}
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -8 }}>
        <FieldBlock title="Nama Penuh" required className="w-full md:w-1/2" pad>
          <FocusField
            value={namaPenuh}
            onChangeText={(v) => {setNamaPenuh(v); setSelectedPelawatId(null);}}
            placeholder="Contoh: Ahmad bin Ali"
            editable={!submitting}
          />
        </FieldBlock>

        <FieldBlock title="No Telefon" required className="w-full md:w-1/2" pad>
          <FocusField
            value={noTel}
            onChangeText={(v) => {setNoTel(v); setSelectedPelawatId(null);}}
            placeholder="Contoh: 0123456789"
            keyboardType="phone-pad"
            editable={!submitting}
          />
        </FieldBlock>

        <FieldBlock title="No IC" required className="w-full md:w-1/2" pad>
          <FocusField
            value={ic}
            onChangeText={(v) => {setIc(v); setSelectedPelawatId(null);}}
            placeholder="Contoh: 010101-01-0101"
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
          <Dropdown
            value={tujuan}
            options={TUJUAN_OPTIONS}
            onChange={(v) => {
              setTujuan(v);
              if (v !== 'Lain-lain') setTujuanLain('');
            }}
            disabled={submitting}
          />
        </FieldBlock>

        {tujuan === 'Lain-lain' ? (
          <FieldBlock title="Tujuan (Lain-lain)" required className="w-full md:w-1/2" pad>
            <FocusField
              value={tujuan_lain}
              onChangeText={setTujuanLain}
              placeholder="Nyatakan tujuan…"
              editable={!submitting}
            />
            <AppText variant="caption" style={{ marginTop: spacing.xs, color: palette.muted }}>
              Jika diisi, nilai ini akan digunakan semasa simpan.
            </AppText>
          </FieldBlock>
        ) : null}

        <FieldBlock title="Masa Masuk" required className="w-full md:w-1/2" pad>
          <FocusField
            value={masaMasuk}
            onChangeText={() => {}}
            placeholder="HH:mm"
            editable={false}
            rightHint={autoFillCurrentTime ? 'Auto' : undefined}
          />
        </FieldBlock>
      </View>

      <View style={{ height: spacing.xl }} />

      {/* Actions */}
      <View className="flex-row items-center justify-end" style={{ gap: 12 }}>
        <Pressable
          onPress={onCancel}
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
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={[
            'items-center justify-center',
            !canSubmit ? 'opacity-60' : 'opacity-100',
          ].join(' ')}
          style={{
            height: 48,
            paddingHorizontal: spacing.lg,
            borderRadius: radii.pill,
            backgroundColor: ORANGE,
          }}
          accessibilityRole="button"
          accessibilityLabel="Simpan / Daftar Pas"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppText variant="bodySm" style={{ fontWeight: '800', color: '#ffffff' }}>
              Simpan / Daftar Pas
            </AppText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Used by: `CreatePasLawatanForm` (page: `app/(tabs)/createPasLawatan.tsx`).
 * Purpose: consistent label + spacing wrapper for each field.
 */
function FieldBlock({
  title,
  required,
  children,
  className,
  pad,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <View className={className} style={pad ? { paddingHorizontal: 8, paddingBottom: 14 } : undefined}>
      <AppText
        variant="label"
        style={{ marginBottom: spacing.xs, color: '#374151', fontWeight: '600' }}
      >
        {title}
        {required ? <AppText variant="label" style={{ color: '#DC2626' }}>{' *'}</AppText> : null}
      </AppText>
      {children}
    </View>
  );
}

/**
 * Used by: `CreatePasLawatanForm` (page: `app/(tabs)/createPasLawatan.tsx`).
 * Purpose: input styling + orange focus ring behavior (RN-safe).
 */
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
            backgroundColor: INPUT_BG,
            borderWidth: 1,
            borderColor: focused ? ORANGE : palette.border,
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

/**
 * Used by: `CreatePasLawatanForm` (page: `app/(tabs)/createPasLawatan.tsx`).
 * Purpose: dependency-free dropdown using a modal picker.
 */
function Dropdown<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = value;
  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={disabled ? 'opacity-70' : 'opacity-100'}
        style={{
          height: 52,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          backgroundColor: INPUT_BG,
          borderWidth: 1,
          borderColor: palette.border,
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel="Pilih tujuan"
      >
        <AppText variant="body" style={{ color: palette.text }}>
          {label}
        </AppText>
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1"
          style={{ backgroundColor: 'rgba(15,23,42,0.35)', padding: spacing.lg, justifyContent: 'center' }}
        >
          <Pressable
            onPress={() => {}}
            className="bg-white"
            style={{
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: '#F3F4F6',
              padding: spacing.lg,
              ...shadows.card,
            }}
          >
            <AppText variant="h3" style={{ color: palette.primary }}>
              Pilih Tujuan
            </AppText>
            <View style={{ height: spacing.sm }} />
            {options.map((opt) => {
              const active = opt === value;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: radii.md,
                    backgroundColor: active ? '#FFF7ED' : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? '#FED7AA' : 'transparent',
                    marginTop: 8,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Pilih ${opt}`}
                >
                  <AppText
                    variant="body"
                    style={{ fontWeight: active ? '800' : '600', color: active ? '#9A3412' : palette.text }}
                  >
                    {opt}
                  </AppText>
                </Pressable>
              );
            })}
            <View style={{ height: spacing.md }} />
            <Pressable
              onPress={() => setOpen(false)}
              className="items-center justify-center"
              style={{
                height: 48,
                borderRadius: radii.pill,
                backgroundColor: '#F1F5F9',
              }}
              accessibilityRole="button"
              accessibilityLabel="Tutup"
            >
              <AppText variant="bodySm" style={{ fontWeight: '700', color: palette.text }}>
                Tutup
              </AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

