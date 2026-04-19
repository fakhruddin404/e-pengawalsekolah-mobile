import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';

import { postLogin } from '../services/api';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading]
  );

  async function onSubmit() {
    if (!canSubmit) return;

    setLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Kebenaran Lokasi Diperlukan',
          'Sila benarkan akses lokasi untuk meneruskan log masuk.'
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const current = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      await postLogin({
        login: email.trim(),
        password,
        lat: current.latitude,
        long: current.longitude,
      });

      router.replace('/(tabs)');
    } catch (e: any) {
      const data = e?.response?.data;
      let message: string =
        data?.message ?? e?.message ?? 'Log masuk gagal. Sila cuba lagi.';
      if (e?.response?.status === 422 && data?.errors && typeof data.errors === 'object') {
        const first = Object.values(data.errors).flat()[0];
        if (typeof first === 'string') {
          message = first;
        }
      }
      Alert.alert('Ralat', String(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6">
        <View className="w-full max-w-md flex-1 self-center">

          <Text className="mt-12 text-center text-4xl font-extrabold text-primary">
            SELAMAT DATANG
          </Text>

          <View className="items-center pt-16">
            <Image
              source={require('../assets/images/splash.png')}
              className="h-64 w-64"
              resizeMode="contain"
            />
          </View>

          <View className="mt-12 w-full">
            <Text className="mb-2 text-sm font-semibold text-slate-700">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              className="h-12 rounded-2xl bg-inputBg px-4 text-slate-900"
            />
          </View>

          <View className="mt-6 w-full">
            <Text className="mb-2 text-sm font-semibold text-slate-700">
              Password
            </Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="************"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                className="h-12 rounded-2xl bg-inputBg px-4 pr-12 text-slate-900"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-0 h-12 w-10 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Sembunyikan kata laluan' : 'Tunjuk kata laluan'
                }
              >
                {showPassword ? (
                  <Eye size={20} color="#0F172A" />
                ) : (
                  <EyeOff size={20} color="#0F172A" />
                )}
              </Pressable>
            </View>

            <Pressable
              onPress={() =>
                Alert.alert('Lupa Kata Laluan', 'Sila hubungi admin untuk reset.')
              }
              className="mt-2 self-end"
              accessibilityRole="button"
            >
              <Text className="text-xs font-semibold text-primary">
                Forget Password
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            className={[
              'mt-10 h-14 w-full items-center justify-center rounded-full bg-primary',
              !canSubmit ? 'opacity-60' : 'opacity-100',
            ].join(' ')}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">Log Masuk</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

