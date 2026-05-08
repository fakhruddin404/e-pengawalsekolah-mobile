import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, type Region } from 'react-native-maps';

import { AppText } from './AppText';
import { palette, radii, spacing } from '../theme/ui';

type LatLng = { latitude: number; longitude: number };

type LocationPickerModalProps = {
  visible: boolean;
  initialRegion: Region;
  draftLocation: LatLng | null;
  onMapPress: (loc: LatLng) => void;
  onClose: () => void;
  onConfirm: () => void;
  locationText: string;
};

export function LocationPickerModal({
  visible,
  initialRegion,
  draftLocation,
  onMapPress,
  onClose,
  onConfirm,
  locationText,
}: LocationPickerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View
          className="flex-row items-center justify-between"
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
          }}
        >
          <AppText variant="h3" style={{ color: palette.primary }}>
            Pilih Lokasi
          </AppText>
          <Pressable onPress={onClose} accessibilityRole="button">
            <AppText variant="bodySm" style={{ color: palette.text, fontWeight: '700' }}>
              Tutup
            </AppText>
          </Pressable>
        </View>

        <MapView
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          onPress={(event) => {
            const c = event.nativeEvent.coordinate;
            onMapPress({ latitude: c.latitude, longitude: c.longitude });
          }}
        >
          {draftLocation ? <Marker coordinate={draftLocation} /> : null}
        </MapView>

        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
          }}
        >
          <AppText variant="caption" style={{ color: '#64748B' }}>
            Tekan pada peta untuk set lokasi.
          </AppText>
          <AppText variant="bodySm" style={{ marginTop: spacing.xs, color: palette.text }}>
            {locationText}
          </AppText>

          <View className="flex-row justify-end" style={{ gap: 12, marginTop: spacing.sm }}>
            <Pressable
              onPress={onClose}
              style={{
                height: 44,
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
              onPress={onConfirm}
              disabled={!draftLocation}
              style={{
                height: 44,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.pill,
                backgroundColor: '#F97316',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: draftLocation ? 1 : 0.6,
              }}
            >
              <AppText variant="bodySm" style={{ color: '#FFFFFF', fontWeight: '800' }}>
                Guna Lokasi Ini
              </AppText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
