import { useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

import { AppText } from '../components/AppText';
import { textVariants } from '../theme/typography';

const INPUT_BG = '#F0F4FF';

export default function PasswordManagerScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      currentPassword.length > 0 &&
      newPassword.length > 0 &&
      confirmNewPassword.length > 0
    );
  }, [currentPassword, newPassword, confirmNewPassword]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-5 pt-2">
        <View className="relative flex-row items-center justify-center pb-2">
          <Pressable
            onPress={() => router.back()}
            className="absolute left-0 h-10 w-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <ArrowLeft size={22} color="#1F7BFF" />
          </Pressable>
          <AppText variant="h3" style={{ color: '#1F7BFF' }}>
            Password Manager
          </AppText>
        </View>

        <View className="pt-6">
          <Label text="Current Password" />
          <PasswordField
            value={currentPassword}
            onChangeText={setCurrentPassword}
            visible={showCurrent}
            onToggleVisible={() => setShowCurrent((v) => !v)}
          />
          <Pressable
            onPress={() => Alert.alert('Lupa Kata Laluan', 'Sila hubungi admin.')}
            className="mt-2 self-end"
            accessibilityRole="button"
          >
            <AppText variant="caption" style={{ fontWeight: '600', color: '#1F7BFF' }}>
              Forgot Password?
            </AppText>
          </Pressable>

          <View className="h-6" />
          <Label text="New Password" />
          <PasswordField
            value={newPassword}
            onChangeText={setNewPassword}
            visible={showNew}
            onToggleVisible={() => setShowNew((v) => !v)}
          />

          <View className="h-6" />
          <Label text="Confirm New Password" />
          <PasswordField
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm((v) => !v)}
          />
        </View>
      </View>

      <View className="flex-1" />
      <View className="px-5 pb-8">
        <Pressable
          onPress={() =>
            Alert.alert('Change Password', 'Coming soon (API belum siap).')
          }
          disabled={!canSubmit}
          className={[
            'h-14 items-center justify-center rounded-full bg-primary',
            !canSubmit ? 'opacity-60' : 'opacity-100',
          ].join(' ')}
          accessibilityRole="button"
        >
          <AppText variant="body" style={{ fontWeight: '800', color: '#ffffff' }}>
            Change Password
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return (
    <AppText variant="label" className="mb-2">
      {text}
    </AppText>
  );
}

function PasswordField({
  value,
  onChangeText,
  visible,
  onToggleVisible,
}: {
  value: string;
  onChangeText: (t: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <View className="relative">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        placeholder="************"
        placeholderTextColor="#94A3B8"
        className="h-12 rounded-2xl px-4 pr-12 text-slate-900"
        style={[textVariants.body, { backgroundColor: INPUT_BG }]}
      />
      <Pressable
        onPress={onToggleVisible}
        className="absolute right-3 top-0 h-12 w-10 items-center justify-center"
        accessibilityRole="button"
      >
        {visible ? <Eye size={20} color="#0F172A" /> : <EyeOff size={20} color="#0F172A" />}
      </Pressable>
    </View>
  );
}

