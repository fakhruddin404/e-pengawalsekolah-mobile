import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, LogOut, RefreshCw } from 'lucide-react-native';

import { AppText } from '../components/AppText';
import { palette, radii, spacing } from '../theme/ui';
import { useAuth } from '../context/AuthContext';
import { performLogout, postSendEmailVerification } from '../services';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { session, setSession } = useAuth();
  
  const [sending, setSending] = useState(false);

  const onRefreshStatus = () => {
    // Cara paling mudah: Log keluar supaya dia login balik dan ambil data terbaru
    performLogout({ session, setSession, router });
  };

  // Fungsi untuk hantar semula pautan
  async function onResendEmail() {
    if (!session?.token || sending) return;
    setSending(true);

    try {
      const res = await postSendEmailVerification(session.token);
      Alert.alert('Berjaya', res?.message || 'Pautan pengesahan telah dihantar semula ke email anda.');
    } catch (error: any) {
      Alert.alert(
        'Ralat', 
        error?.response?.data?.message || error?.message || 'Gagal menghantar pautan.'
      );
    } finally {
      setSending(false);
    }
  }

  // Fungsi untuk log keluar supaya boleh log masuk semula lepas verify
  function onLogout() {
    performLogout({ session, setSession, router });
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
        
        {/* Ikon Email Utama */}
        <View
          style={{
            marginBottom: spacing.lg,
            height: 128,
            width: 128,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            backgroundColor: '#EFF6FF',
            borderWidth: 1,
            borderColor: '#DBEAFE',
          }}
        >
          <Mail size={60} color={palette.primary} />
        </View>

        <AppText variant="h2" className="text-center" style={{ color: palette.primary }}>
          Sahkan Email Anda
        </AppText>

        <AppText variant="body" className="text-center" style={{ marginTop: spacing.md, color: '#475569' }}>
          Kami telah menghantar pautan pengesahan ke email:
        </AppText>
        <AppText variant="h3" className="mt-1 text-center" style={{ fontWeight: '700' }}>
          {session?.email || 'email anda'}
        </AppText>

        <AppText variant="bodySm" className="text-center" style={{ marginTop: spacing.lg, color: palette.muted }}>
          Sila semak peti masuk atau folder spam anda. Klik pautan di dalam email tersebut untuk mengesahkan akaun anda.
        </AppText>

        <View style={{ marginTop: spacing.xl, width: '100%' }}>
          
          {/* Butang Hantar Semula */}
          <Pressable
            onPress={onResendEmail}
            disabled={sending}
            className={[
              'w-full flex-row items-center justify-center bg-primary',
              sending ? 'opacity-70' : 'opacity-100',
            ].join(' ')}
            style={{ height: 56, borderRadius: radii.pill }}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <AppText variant="body" style={{ fontWeight: '700', color: '#ffffff' }}>
                Hantar Semula Pautan
              </AppText>
            )}
          </Pressable>

          <View style={{ height: spacing.md }} />

          {/* Butang Log Keluar / Refresh (Selepas dorang verify kat browser) */}
          <Pressable
            onPress={onLogout}
            className="w-full flex-row items-center justify-center bg-white"
            style={{
              height: 56,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <RefreshCw size={20} color={palette.primary} />
            <AppText variant="body" className="ml-2" style={{ fontWeight: '700', color: palette.primary }}>
              Sudah Sahkan? Log Masuk Semula
            </AppText>
          </Pressable>

          <View style={{ height: spacing.sm }} />

          <Pressable
            onPress={onLogout}
            className="p-4 flex-row items-center justify-center"
          >
            <LogOut size={18} color="#EF4444" />
            <AppText variant="bodySm" className="ml-2" style={{ fontWeight: '700', color: '#ef4444' }}>
              Log Keluar
            </AppText>
          </Pressable>

        </View>
      </View>
    </SafeAreaView>
  );
}