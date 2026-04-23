import { useMemo, useState } from 'react';
import {ActivityIndicator, Alert, Image, Pressable, TextInput, View} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';

import { AppText } from '../components/AppText';
import { textVariants } from '../theme/typography';
import { palette, radii, spacing } from '../theme/ui';
import { useAuth } from '../context/AuthContext';
import { postLogin } from '../services';

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
    // if boleh submit try will running
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Kebenaran Lokasi Diperlukan',
          'Sila benarkan akses lokasi untuk meneruskan log masuk.'
        );
        return;
      }
      // Get the current position
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      // Create the current position object
      const current = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      // Post the login data to the API and get the response(masuk dlm loginData)
      const loginData = await postLogin({
        login: email.trim(),
        password,
        lat: current.latitude,
        long: current.longitude,
      });

      // Get the display name from the login data
      const displayName =
        loginData.pengawal?.nama?.trim() || loginData.user?.name?.trim() || '';
      // Set the session data(masuk dlm setSession)
      setSession({
        token: loginData.token,
        displayName: displayName || 'Pengawal',
        photoUrl: loginData.pengawal?.photo_url ?? null,
        email: loginData.user?.email ?? null,
        phone: loginData.pengawal?.fld_pgw_noTelefon ?? null,
        ic: loginData.pengawal?.fld_pgw_noIC ?? null,
        isEmailVerified: loginData.user?.email_verified_at !== null,
      });
      // --- LOGIK SOFT LOGIN BERMULA DI SINI ---
      if (loginData.user?.email_verified_at === null) {
        // Jika belum verify, redirect ke skrin Verify Email
        // (Pastikan anda ganti '/verify-email' dengan laluan fail skrin anda yang sebenar)
        setTimeout(() => router.replace('/verify-email'), 0); 
      } else {
        // Jika dah verify, masuk ke Dashboard macam biasa
        setTimeout(() => router.replace('/(tabs)/sesiRondaan'), 0);
      }
      // ---------------------------------------
    } catch (e: any) {
      const data = e?.response?.data;
      
      // Default generic message
      let message: string = 'Log masuk gagal. Sila cuba lagi.';
    
      // 1. Check if it's a Validation Error (Status 422)
      if (e?.response?.status === 422 && data?.errors) {
        /**
         * Laravel sends: 
         * "errors": { "login": ["Akaun ini bukan pengawal."] }
         * We want that first string inside the first array.
         */
        const errorEntries = Object.values(data.errors); 
        if (errorEntries.length > 0) {
          const firstErrorArray = errorEntries[0] as string[];
          message = firstErrorArray[0]; // Gets: "Akaun ini bukan pengawal."
        }
      } 
      // 2. Fallback to Laravel's top-level message if provided
      else if (data?.message) {
        message = data.message;
      } 
      // 3. Fallback to the Axios/Network error message
      else if (e?.message) {
        message = e.message;
      }
    
      Alert.alert('Ralat', message);
    } finally {
      setLoading(false);
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
              onPress={() =>
                Alert.alert('Lupa Kata Laluan', 'Sila hubungi admin untuk reset.')
              }
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

