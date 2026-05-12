import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <View style={styles.container}>
        <View style={styles.brandWrap}>
          <Image
            source={require('../assets/images/splash.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formCard}>
          <AppText variant="h1" style={styles.title}>
            SELAMAT DATANG
          </AppText>

          <View style={styles.fieldWrap}>
            <AppText variant="label" style={styles.label}>
              Email
            </AppText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor="#8AA6C2"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[textVariants.body, styles.input]}
            />
          </View>

          <View style={[styles.fieldWrap, styles.passwordWrap]}>
            <AppText variant="label" style={styles.label}>
              Password
            </AppText>
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="************"
                placeholderTextColor="#8AA6C2"
                secureTextEntry={!showPassword}
                style={[textVariants.body, styles.input, styles.passwordInput]}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Sembunyikan kata laluan' : 'Tunjuk kata laluan'
                }
              >
                {showPassword ? (
                  <Eye size={20} color="#3D6B91" />
                ) : (
                  <EyeOff size={20} color="#3D6B91" />
                )}
              </Pressable>
            </View>

            <Pressable
              onPress={onForgotPassword}
              style={styles.forgotWrap}
              accessibilityRole="button"
            >
              <AppText variant="caption" style={styles.forgotText}>
                Forget Password
              </AppText>
            </Pressable>
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <AppText variant="body" style={styles.submitText}>
                Log Masuk
              </AppText>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef6ff',
  },
  bgGlowTop: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    top: -160,
    right: -80,
    backgroundColor: 'rgba(111, 186, 255, 0.24)',
  },
  bgGlowBottom: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    bottom: -120,
    left: -100,
    backgroundColor: 'rgba(145, 206, 255, 0.26)',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 250,
    height: 250,
    opacity: 0.95,
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 24,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(125, 190, 245, 0.7)',
  },
  title: {
    textAlign: 'center',
    color: '#18436b',
  },
  subtitle: {
    textAlign: 'center',
    color: '#5b7f9f',
    marginTop: spacing.xs,
  },
  fieldWrap: {
    marginTop: spacing.lg,
    width: '100%',
  },
  passwordWrap: {
    marginTop: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
    color: '#2d5f88',
  },
  input: {
    height: 54,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: '#163a57',
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: 'rgba(120, 178, 224, 0.48)',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 8,
    top: 0,
    height: 54,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotWrap: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: '#2f89d0',
    fontWeight: '600',
  },
  submitButton: {
    marginTop: spacing.xl,
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

