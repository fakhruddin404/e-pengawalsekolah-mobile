import { useMemo, useState } from 'react';
import {ActivityIndicator, Alert, Image, Pressable, TextInput, View} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';

import { AppText } from '../components/AppText';
import { textVariants } from '../theme/typography';
import { palette, radii, spacing } from '../theme/ui';
import { useAuth } from '../context/AuthContext';
import { loginWithLocation, postForgotPassword } from '../services';

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Check if the email and password are valid and not loading
  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading]
  );
  // Submit the login form
  async function onSubmit() {
    if (!canSubmit) return;
    
    setLoading(true);
    try {
      const result = await loginWithLocation({
        login: email,
        password,
      });

      if (!result.ok) {
        Alert.alert(
          'Kebenaran Lokasi Diperlukan',
          'Sila benarkan akses lokasi untuk meneruskan log masuk.'
        );
        return;
      }

      setSession(result.session);
      if (result.needsEmailVerification) {
        // Jika belum verify, redirect ke skrin Verify Email
        setTimeout(() => router.replace('/verify-email'), 0); 
      } else {
        // Jika dah verify, masuk ke Dashboard macam biasa
        setTimeout(() => router.replace('/(tabs)/sesiRondaan'), 0);
      }

    } catch (e: any) {
      const data = e?.response?.data;

      let message: string = 'Log masuk gagal. Sila cuba lagi.';
    
      // Check if it's a Validation Error (Status 422)
      if (e?.response?.status === 422 && data?.errors) {
        const errorEntries = Object.values(data.errors); 
        if (errorEntries.length > 0) {
          const firstErrorArray = errorEntries[0] as string[];
          message = firstErrorArray[0];
        }
      } 
      // Fallback to Laravel's top-level message if provided
      else if (data?.message) {
        message = data.message;
      } 
      // Fallback to the Axios/Network error message
      else if (e?.message) {
        message = e.message;
      }
    
      Alert.alert('Ralat', message);
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    const targetEmail = email.trim();
    if (!targetEmail) {
      Alert.alert('Lupa Kata Laluan', 'Sila masukkan emel anda dahulu.');
      return;
    }

    try {
      const res = await postForgotPassword(targetEmail);
      Alert.alert('Lupa Kata Laluan', res?.message ?? 'Permintaan tetapan semula telah dihantar.');
    } catch (e: any) {
      Alert.alert('Ralat', e?.message ?? 'Gagal hantar pautan tetapan semula.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View style={{ flex: 1, paddingHorizontal: spacing.xl }}>
        {/* View for the login form */}
        <View className="w-full max-w-md flex-1 self-center">

          <AppText
            variant="h1"
            className="mt-12 text-center"
            style={{ color: palette.primary }}
          >
            SELAMAT DATANG
          </AppText>

          <View className="items-center pt-16">
            <Image
              source={require('../assets/images/splash.png')}
              className="h-64 w-64"
              resizeMode="contain"
            />
          </View>

          <View style={{ marginTop: spacing.xl, width: '100%' }}>
            <AppText variant="label" style={{ marginBottom: spacing.xs, color: palette.muted }}>
              Email
            </AppText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              className="text-slate-900"
              style={[
                textVariants.body,
                {
                  height: 52,
                  borderRadius: radii.md,
                  paddingHorizontal: spacing.md,
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                },
              ]}
            />
          </View>

          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <AppText variant="label" style={{ marginBottom: spacing.xs, color: palette.muted }}>
              Password
            </AppText>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="************"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                className="text-slate-900"
                style={[
                  textVariants.body,
                  {
                    height: 52,
                    borderRadius: radii.md,
                    paddingHorizontal: spacing.md,
                    paddingRight: 48,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  },
                ]}
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
              onPress={onForgotPassword}
              style={{ marginTop: spacing.xs, alignSelf: 'flex-end' }}
              accessibilityRole="button"
            >
              <AppText
                variant="caption"
                style={{ color: palette.primary, fontWeight: '600' }}
              >
                Forget Password
              </AppText>
            </Pressable>
          </View>

          <Pressable // Button for the login
            onPress={onSubmit} // on press will submit onSubmit function
            disabled={!canSubmit} // if not can submit will disabled
            className={[
              'w-full items-center justify-center bg-primary',
              !canSubmit ? 'opacity-60' : 'opacity-100',
            ].join(' ')}
            style={{ marginTop: spacing.xl, height: 56, borderRadius: radii.pill }}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <AppText variant="body" style={{ color: '#ffffff', fontWeight: '700' }}>
                Log Masuk
              </AppText>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

