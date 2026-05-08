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
import { palette, radii, spacing } from '../theme/ui';

export type PelawatSearchOption = {
  id: string;
  namaPenuh: string;
  noTel: string;
  ic?: string;
};

type PelawatSearchModalProps = {
  visible: boolean;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  searchError: string | null;
  searchLoading: boolean;
  searchResults: PelawatSearchOption[];
  onClose: () => void;
  onSelect: (item: PelawatSearchOption) => void;
  inputBackgroundColor?: string;
};

export function PelawatSearchModal({
  visible,
  searchQuery,
  onChangeSearchQuery,
  searchError,
  searchLoading,
  searchResults,
  onClose,
  onSelect,
  inputBackgroundColor = '#F8FAFC',
}: PelawatSearchModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
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
              Pilih pelawat untuk auto-isi nama dan nombor telefon
            </AppText>
          </View>
          <Pressable
            onPress={onClose}
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
              backgroundColor: inputBackgroundColor,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Search size={18} color={palette.primary} />
            <TextInput
              value={searchQuery}
              onChangeText={onChangeSearchQuery}
              placeholder="Taip untuk cari..."
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
                Mencari...
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
                  onPress={() => onSelect(item)}
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
  );
}
