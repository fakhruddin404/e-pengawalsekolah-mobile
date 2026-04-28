import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { AppText } from '../../components/AppText';
import {
  CreatePasLawatanForm,
  type CreatePasLawatanSubmitPayload,
  type PelawatOption,
} from '../../components/CreatePasLawatanForm';
import { palette, spacing } from '../../theme/ui';
import { useAuth } from '../../context/AuthContext';
import { formatAxiosError, getSearchPelawat, postCreatePasLawatan } from '../../services';

export default function CreatePasLawatanScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.token ?? '';
  const [submitting, setSubmitting] = useState(false);

  function goToSenaraiPelawat() {
    router.replace('/(tabs)/senaraiPelawat');
  }

  const searchPelawat = useMemo(
    () => async (query: string): Promise<PelawatOption[]> => {
      if (!token) return [];
      return await getSearchPelawat(token, query);
    },
    [token]
  );

  async function handleSubmit(payload: CreatePasLawatanSubmitPayload) {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!token) throw new Error('Sesi tamat. Sila log masuk semula.');
      await postCreatePasLawatan(token, payload);
      Alert.alert('Berjaya', 'Pas lawatan disimpan.');
      goToSenaraiPelawat();
    } catch (e: any) {
      Alert.alert('Ralat', formatAxiosError(e, 'Simpan gagal. Sila cuba lagi.'));
    } finally {
      setSubmitting(false);
    }
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
          onPress={goToSenaraiPelawat}
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
        <CreatePasLawatanForm
          searchPelawat={searchPelawat}
          submitting={submitting}
          onCancel={goToSenaraiPelawat}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

