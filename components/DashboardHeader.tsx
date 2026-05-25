import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Cog } from 'lucide-react-native';

import { AppText } from './AppText';
import { NotificationModal } from './NotificationModal';
import { palette, spacing } from '../theme/ui';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const ICON_BUTTON_BG = '#F1F5F9';

export type DashboardHeaderProps = {
  showTambah?: boolean;
};

export function DashboardHeader() {
  const router        = useRouter();
  const { session }   = useAuth();
  const pengawalName  = session?.displayName ?? '';
  const photoUrl      = session?.photoUrl ?? null;
  const initials      = getInitials(pengawalName);

  const { unreadCount } = useNotification();
  const [modalVisible, setModalVisible] = useState(false);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <View
        className="flex-row items-center justify-between bg-white"
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
        }}
      >
        {/* ── Profile section ──────────────────────────────────────────── */}
        <View className="min-w-0 flex-1 flex-row items-center">
          {photoUrl ? (
            // photoUrl is a local file:// URI — no auth headers needed,
            // works identically on iOS and Android.
            <Image
              source={{ uri: photoUrl }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0' }}
              resizeMode="cover"
            />
          ) : (
            <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200">
              <AppText variant="bodySm" style={{ fontWeight: '800', color: palette.text }}>
                {initials || '?'}
              </AppText>
            </View>
          )}
          <View className="ml-3 min-w-0 flex-1">
            <AppText variant="caption" style={{ color: palette.primary, fontWeight: '600' }}>
              Hi, WelcomeBack
            </AppText>
            <AppText variant="h3" numberOfLines={1}>
              {pengawalName || '…'}
            </AppText>
          </View>
        </View>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <View className="ml-2 flex-row shrink-0 items-center gap-2">

          {/* Bell + numeric badge */}
          <View style={{ position: 'relative' }}>
            <Pressable
              onPress={handleOpenModal}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: ICON_BUTTON_BG }}
              accessibilityLabel="Buka panel notifikasi"
              accessibilityRole="button"
            >
              <Bell size={18} color={unreadCount > 0 ? palette.primary : palette.text} />
            </Pressable>

            {/* Numeric red badge — ONLY shown when unreadCount > 0.
                NO plain dot fallback. Nothing shown when all read. */}
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -5,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 2,
                  borderColor: '#ffffff',
                }}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: '800',
                    lineHeight: 13,
                    includeFontPadding: false,
                  }}
                >
                  {unreadCount > 9 ? '9+' : String(unreadCount)}
                </AppText>
              </View>
            )}
          </View>

          {/* Settings */}
          <Pressable
            onPress={() => router.push('/settings')}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: ICON_BUTTON_BG }}
            accessibilityLabel="Tetapan"
            accessibilityRole="button"
          >
            <Cog size={18} color={palette.text} />
          </Pressable>
        </View>
      </View>

      <NotificationModal
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </>
  );
}

function getInitials(name: string) {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return '';
  const parts  = cleaned.split(/\s+/).filter(Boolean);
  const first  = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : parts[0]?.[1] ?? '';
  return (first + second).toUpperCase();
}
