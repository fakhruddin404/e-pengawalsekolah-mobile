import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { type Region } from 'react-native-maps';
import { ArrowLeft, Camera, Crosshair, ImagePlus, MapPin } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { AppText } from '../../components/AppText';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { SelectModalDropdown } from '../../components/SelectModalDropdown';
import { textVariants } from '../../theme/typography';
import { palette, radii, shadows, spacing } from '../../theme/ui';
import { useAuth } from '../../context/AuthContext';
import { postCreateLaporan } from '../../services';

type KejadianType = 'Kerosakkan' | 'Pencerobohan' | 'Kemalangan' | 'Lain-lain';
type LatLng = { latitude: number; longitude: number };

const KEJADIAN_OPTIONS: KejadianType[] = [
  'Kerosakkan',
  'Pencerobohan',
  'Kemalangan',
  'Lain-lain',
];
const MAP_DEFAULT_REGION: Region = {
  latitude: 3.139,
  longitude: 101.6869,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function formatDatePart(d: Date) {
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimePart(d: Date) {
  const hh = `${d.getHours()}`.padStart(2, '0');
  const mi = `${d.getMinutes()}`.padStart(2, '0');
  return `${hh}:${mi}`;
}

function formatDateTimeValue(d: Date) {
  return `${formatDatePart(d)} ${formatTimePart(d)}`;
}

function formatCoord(v: number | null) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '-';
  return v.toFixed(6);
}

async function buildUploadImage(asset: ImagePicker.ImagePickerAsset) {
  const uri = asset.uri;
  const originalName = asset.fileName ?? `laporan_${Date.now()}.jpg`;
  const ext =
    (originalName.split('.').pop() || '').toLowerCase() ||
    (uri.split('?')[0]?.split('.').pop() || '').toLowerCase();
  const type = asset.mimeType ?? (ext === 'png' ? 'image/png' : 'image/jpeg');

  let uploadUri = uri;
  if (uri.startsWith('content://')) {
    const safeExt = ext === 'png' ? 'png' : 'jpg';
    const dest = `${FileSystem.Paths.cache.uri}laporan_${Date.now()}.${safeExt}`;
    try {
      await FileSystem.copyAsync({ from: uri, to: dest });
      uploadUri = dest;
    } catch {
      uploadUri = uri;
    }
  }

  return {
    uri: uploadUri,
    type,
    name: originalName,
  };
}

export default function CreateLaporanScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const isIOS = Platform.OS === 'ios';
  const token = session?.token ?? '';
  const [kejadian, setKejadian] = useState<KejadianType>('Kerosakkan');
  const [keterangan, setKeterangan] = useState('');
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activePicker, setActivePicker] = useState<'date' | 'time' | null>(null);
  const [draftDateTime, setDraftDateTime] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapDraftLocation, setMapDraftLocation] = useState<LatLng | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!kejadian.trim()) return false;
    if (!keterangan.trim()) return false;
    if (!selectedLocation) return false;
    return true;
  }, [kejadian, keterangan, selectedLocation, submitting]);

  const dateText = useMemo(() => formatDatePart(selectedDateTime), [selectedDateTime]);
  const timeText = useMemo(() => formatTimePart(selectedDateTime), [selectedDateTime]);
  const mapInitialRegion = useMemo<Region>(() => {
    const point = mapDraftLocation ?? selectedLocation;
    if (!point) return MAP_DEFAULT_REGION;
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [mapDraftLocation, selectedLocation]);

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Kebenaran Diperlukan', 'Sila benarkan akses galeri.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    const uploadImage = await buildUploadImage(asset);
    setSelectedImage(uploadImage);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Kebenaran Diperlukan', 'Sila benarkan akses kamera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    const uploadImage = await buildUploadImage(asset);
    setSelectedImage(uploadImage);
  }

  async function onSubmit() {
    if (!canSubmit) return;
    if (!token) {
      Alert.alert('Ralat', 'Sesi tamat. Sila log masuk semula.');
      return;
    }

    setSubmitting(true);
    try {
      await postCreateLaporan(token, {
        kejadian,
        keterangan: keterangan.trim(),
        datetime: formatDateTimeValue(selectedDateTime),
        latitude: selectedLocation!.latitude,
        longitude: selectedLocation!.longitude,
        imej: selectedImage,
      });
      Alert.alert('Berjaya', 'Laporan berjaya dihantar.');
      setKejadian('Kerosakkan');
      setKeterangan('');
      setSelectedDateTime(new Date());
      setSelectedLocation(null);
      setMapDraftLocation(null);
      setSelectedImage(null);
      router.back();
    } catch (e: any) {
      Alert.alert('Ralat', e?.message ?? 'Gagal simpan laporan.');
    } finally {
      setSubmitting(false);
    }
  }

  async function useCurrentLocation() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Kebenaran Diperlukan', 'Sila benarkan akses lokasi.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const point = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
    setSelectedLocation(point);
    setMapDraftLocation(point);
  }

  function openMapPicker() {
    setMapDraftLocation(selectedLocation);
    setMapPickerOpen(true);
  }

  function openDatePicker() {
    if (isIOS) {
      setDraftDateTime(selectedDateTime);
      setActivePicker('date');
      return;
    }
    setShowDatePicker(true);
  }

  function openTimePicker() {
    if (isIOS) {
      setDraftDateTime(selectedDateTime);
      setActivePicker('time');
      return;
    }
    setShowTimePicker(true);
  }

  function closeIosPicker() {
    setActivePicker(null);
  }

  function confirmIosPicker() {
    setSelectedDateTime(new Date(draftDateTime));
    setActivePicker(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={[]}>
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
          onPress={() => router.back()}
          className="absolute left-0 h-10 w-10 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <ArrowLeft size={22} color={palette.primary} />
        </Pressable>
        <AppText variant="h3" style={{ color: palette.primary }}>
          Cipta Laporan
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
          className="bg-white rounded-xl border border-gray-100 p-6"
          style={{ ...shadows.card }}
        >
          <AppText variant="label" style={{ marginBottom: spacing.xs, color: '#374151' }}>
            Imej
          </AppText>
          <View
            className="items-center justify-center"
            style={{
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderStyle: 'dashed',
              borderRadius: radii.md,
              minHeight: 170,
              backgroundColor: '#F8FAFC',
            }}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                style={{ width: '100%', height: 180, borderRadius: radii.md }}
                resizeMode="cover"
              />
            ) : (
              <AppText variant="caption" style={{ color: '#64748B' }}>
                Tiada imej dipilih
              </AppText>
            )}
          </View>

          <View className="flex-row" style={{ gap: 10, marginTop: spacing.sm }}>
            <Pressable
              onPress={takePhoto}
              className="flex-1 flex-row items-center justify-center rounded-full"
              style={{ height: 44, backgroundColor: '#E2E8F0' }}
            >
              <Camera size={16} color={palette.text} />
              <AppText variant="caption" style={{ marginLeft: 6, fontWeight: '700' }}>
                Ambil Gambar
              </AppText>
            </Pressable>
            <Pressable
              onPress={pickFromGallery}
              className="flex-1 flex-row items-center justify-center rounded-full"
              style={{ height: 44, backgroundColor: '#E2E8F0' }}
            >
              <ImagePlus size={16} color={palette.text} />
              <AppText variant="caption" style={{ marginLeft: 6, fontWeight: '700' }}>
                Pilih Galeri
              </AppText>
            </Pressable>
          </View>

          <View style={{ height: spacing.lg }} />

          <AppText variant="label" style={{ marginBottom: spacing.xs, color: '#374151' }}>
            Kejadian
          </AppText>
          <SelectModalDropdown
            value={kejadian}
            options={KEJADIAN_OPTIONS}
            onChange={setKejadian}
            disabled={submitting}
            title="Pilih Kejadian"
            accessibilityLabel="Pilih kejadian"
            inputBackgroundColor="#F8FAFC"
            activeBackgroundColor="#EFF6FF"
            activeBorderColor="#93C5FD"
            activeTextColor={palette.primary}
          />

          <View style={{ height: spacing.lg }} />

          <AppText variant="label" style={{ marginBottom: spacing.xs, color: '#374151' }}>
            Lokasi (Latitude, Longitude)
          </AppText>
          <View
            style={{
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              backgroundColor: '#F8FAFC',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            <AppText variant="body" style={{ color: '#0F172A' }}>
              {formatCoord(selectedLocation?.latitude ?? null)}, {formatCoord(selectedLocation?.longitude ?? null)}
            </AppText>
          </View>
          <View className="flex-row" style={{ gap: 10, marginTop: spacing.sm }}>
            <Pressable
              onPress={useCurrentLocation}
              className="flex-1 flex-row items-center justify-center rounded-full"
              style={{ height: 44, backgroundColor: '#E2E8F0' }}
            >
              <Crosshair size={16} color={palette.text} />
              <AppText variant="caption" style={{ marginLeft: 6, fontWeight: '700' }}>
                Lokasi Semasa
              </AppText>
            </Pressable>
            <Pressable
              onPress={openMapPicker}
              className="flex-1 flex-row items-center justify-center rounded-full"
              style={{ height: 44, backgroundColor: '#E2E8F0' }}
            >
              <MapPin size={16} color={palette.text} />
              <AppText variant="caption" style={{ marginLeft: 6, fontWeight: '700' }}>
                Pilih Pada Peta
              </AppText>
            </Pressable>
          </View>

          <View style={{ height: spacing.lg }} />

          <AppText variant="label" style={{ marginBottom: spacing.xs, color: '#374151' }}>
            Keterangan
          </AppText>
          <TextInput
            value={keterangan}
            onChangeText={setKeterangan}
            placeholder="Terangkan kejadian..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            style={[
              textVariants.body,
              {
                minHeight: 120,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                backgroundColor: '#F8FAFC',
                paddingHorizontal: spacing.md,
                paddingTop: spacing.sm,
                color: '#0F172A',
              },
            ]}
          />

          <View style={{ height: spacing.lg }} />

          <AppText variant="label" style={{ marginBottom: spacing.xs, color: '#374151' }}>
            Tarikh
          </AppText>
          <Pressable
            onPress={openDatePicker}
            disabled={submitting}
            style={[
              {
                height: 52,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                backgroundColor: '#F8FAFC',
                paddingHorizontal: spacing.md,
                justifyContent: 'center',
                opacity: submitting ? 0.7 : 1,
              },
            ]}
          >
            <AppText variant="body" style={{ color: '#0F172A' }}>
              {dateText}
            </AppText>
          </Pressable>

          <View style={{ height: spacing.md }} />
          <AppText variant="label" style={{ marginBottom: spacing.xs, color: '#374151' }}>
            Masa
          </AppText>
          <Pressable
            onPress={openTimePicker}
            disabled={submitting}
            style={{
              height: 52,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              backgroundColor: '#F8FAFC',
              paddingHorizontal: spacing.md,
              justifyContent: 'center',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            <AppText variant="body" style={{ color: '#0F172A' }}>
              {timeText}
            </AppText>
          </Pressable>

          <Pressable onPress={() => setSelectedDateTime(new Date())} style={{ marginTop: spacing.xs }}>
            <AppText variant="caption" style={{ color: palette.primary, fontWeight: '700' }}>
              Guna masa semasa
            </AppText>
          </Pressable>

          {Platform.OS === 'android' && showDatePicker ? (
            <DateTimePicker
              value={selectedDateTime}
              mode="date"
              display="default"
              onChange={(event: any, value?: Date) => {
                setShowDatePicker(false);
                if (event.type === 'dismissed' || !value) return;
                setSelectedDateTime((prev) => {
                  const next = new Date(prev);
                  next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
                  return next;
                });
                setShowDatePicker(false);
              }}
            />
          ) : null}

          {Platform.OS === 'android' && showTimePicker ? (
            <DateTimePicker
              value={selectedDateTime}
              mode="time"
              is24Hour
              display="default"
              onChange={(event: any, value?: Date) => {
                setShowTimePicker(false);
                if (event.type === 'dismissed' || !value) return;
                setSelectedDateTime((prev) => {
                  const next = new Date(prev);
                  next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                  return next;
                });
                setShowTimePicker(false);
              }}
            />
          ) : null}

          <View style={{ height: spacing.xl }} />

          <View className="flex-row justify-end" style={{ gap: 12 }}>
            <Pressable
              onPress={() => router.back()}
              disabled={submitting}
              style={{
                height: 48,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.pill,
                backgroundColor: '#E2E8F0',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <AppText variant="bodySm" style={{ fontWeight: '700' }}>
                Batal
              </AppText>
            </Pressable>

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={{
                height: 48,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.pill,
                backgroundColor: '#F97316',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: canSubmit ? 1 : 0.6,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <AppText variant="bodySm" style={{ color: '#FFFFFF', fontWeight: '800' }}>
                  Simpan Laporan
                </AppText>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {isIOS && activePicker ? (
        <Modal transparent animationType="slide" visible onRequestClose={closeIosPicker}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.35)' }}>
            <Pressable style={{ flex: 1 }} onPress={closeIosPicker} />
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingHorizontal: spacing.md,
                paddingTop: spacing.md,
                paddingBottom: spacing.lg,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}
              >
                <AppText variant="label" style={{ color: '#374151' }}>
                  {activePicker === 'date' ? 'Pilih Tarikh' : 'Pilih Masa'}
                </AppText>
                <Pressable onPress={closeIosPicker} accessibilityRole="button">
                  <AppText variant="caption" style={{ color: '#64748B', fontWeight: '700' }}>
                    Batal
                  </AppText>
                </Pressable>
              </View>

              <DateTimePicker
                value={draftDateTime}
                mode={activePicker}
                display="spinner"
                is24Hour={activePicker === 'time'}
                onChange={(event: any, value?: Date) => {
                  if (event.type === 'dismissed' || !value) return;
                  setDraftDateTime((prev) => {
                    const next = new Date(prev);
                    if (activePicker === 'date') {
                      next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
                    } else {
                      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                    }
                    return next;
                  });
                }}
              />

              <Pressable
                onPress={confirmIosPicker}
                style={{
                  marginTop: spacing.sm,
                  height: 44,
                  borderRadius: radii.pill,
                  backgroundColor: palette.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '800' }}>
                  Selesai
                </AppText>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      <LocationPickerModal
        visible={mapPickerOpen}
        initialRegion={mapInitialRegion}
        draftLocation={mapDraftLocation}
        onMapPress={(loc) => setMapDraftLocation(loc)}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={() => {
          if (!mapDraftLocation) {
            Alert.alert('Makluman', 'Sila pilih titik lokasi di peta dahulu.');
            return;
          }
          setSelectedLocation(mapDraftLocation);
          setMapPickerOpen(false);
        }}
        locationText={`${formatCoord(mapDraftLocation?.latitude ?? null)}, ${formatCoord(mapDraftLocation?.longitude ?? null)}`}
      />
    </SafeAreaView>
  );
}
