import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, LogOut, RefreshCw } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { postSendEmailVerification } from '../services/api';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { session, setSession } = useAuth();
  
  const [sending, setSending] = useState(false);

  const onRefreshStatus = () => {
    // Cara paling mudah: Log keluar supaya dia login balik dan ambil data terbaru
    setSession(null); 
    router.replace('/'); 
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
    // Kosongkan session
    setSession(null);
    // Kembali ke halaman log masuk
    router.replace('/'); 
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        
        {/* Ikon Email Utama */}
        <View className="mb-6 h-32 w-32 items-center justify-center rounded-full bg-blue-50">
          <Mail size={60} color="#1F7BFF" />
        </View>

        <Text className="text-center text-3xl font-extrabold text-primary">
          Sahkan Email Anda
        </Text>

        <Text className="mt-4 text-center text-base text-slate-600">
          Kami telah menghantar pautan pengesahan ke email:
        </Text>
        <Text className="mt-1 text-center text-lg font-bold text-slate-900">
          {session?.email || 'email anda'}
        </Text>

        <Text className="mt-6 text-center text-sm text-slate-500">
          Sila semak peti masuk atau folder spam anda. Klik pautan di dalam email tersebut untuk mengesahkan akaun anda.
        </Text>

        <View className="mt-12 w-full space-y-4">
          
          {/* Butang Hantar Semula */}
          <Pressable
            onPress={onResendEmail}
            disabled={sending}
            className={[
              'h-14 w-full flex-row items-center justify-center rounded-full bg-primary',
              sending ? 'opacity-70' : 'opacity-100',
            ].join(' ')}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">Hantar Semula Pautan</Text>
            )}
          </Pressable>

          <View className="h-4" />

          {/* Butang Log Keluar / Refresh (Selepas dorang verify kat browser) */}
          <Pressable
            onPress={onLogout}
            className="h-14 w-full flex-row items-center justify-center rounded-full border border-primary bg-white"
          >
            <RefreshCw size={20} color="#1F7BFF" />
            <Text className="ml-2 text-base font-bold text-primary">
              Sudah Sahkan? Log Masuk Semula
            </Text>
          </Pressable>

          <View className="h-2" />

          <Pressable
            onPress={onLogout}
            className="p-4 flex-row items-center justify-center"
          >
            <LogOut size={18} color="#EF4444" />
            <Text className="ml-2 text-sm font-bold text-red-500">
              Log Keluar
            </Text>
          </Pressable>

        </View>
      </View>
    </SafeAreaView>
  );
}