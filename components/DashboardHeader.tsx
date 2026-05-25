import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Cog } from 'lucide-react-native';

import { AppText } from './AppText';
import { NotificationModal } from './NotificationModal';
import { palette, spacing } from '../theme/ui';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardStats } from '../services/notificationService';

const ICON_BUTTON_BG = '#F1F5F9';

export type DashboardHeaderProps = {
  showTambah?: boolean;
};

export function DashboardHeader() {
  const router = useRouter();
  const { session } = useAuth();
  const pengawalName = session?.displayName ?? '';
  const photoUrl = session?.photoUrl ?? null;
  const token = session?.token ?? '';
  const initials = getInitials(pengawalName);

  const [modalVisible, setModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count on mount (lightweight — only reads the count from stats)
  useEffect(() => {
    if (!token) return;
    fetchDashboardStats(token)
      .then((data) => {
        const unread = data.notifikasi.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
  }, [token]);

  const handleOpenModal = () => {
    setModalVisible(true);
    // Optimistically clear badge when user opens the panel
    setUnreadCount(0);
  };

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
        <View className="min-w-0 flex-1 flex-row items-center">
          {photoUrl ? (
            <Image
              source={{
                uri: photoUrl,
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              }}
              className="h-10 w-10 shrink-0 rounded-full bg-slate-200"
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
            <AppText
              variant="h3"
              numberOfLines={1}
            >
              {pengawalName || '…'}
            </AppText>
          </View>
        </View>

        <View className="ml-2 flex-row shrink-0 items-center gap-2">
          {/* Bell button with numeric badge */}
          <View className="relative">
            <Pressable
              onPress={handleOpenModal}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: ICON_BUTTON_BG }}
              accessibilityLabel="Buka panel notifikasi"
              accessibilityRole="button"
            >
              <Bell size={18} color={palette.text} />
            </Pressable>

            {/* Badge — shows numeric count when > 0, otherwise a plain dot */}
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                  borderWidth: 1.5,
                  borderColor: '#ffffff',
                }}
              >
                <AppText
                  variant="caption"
                  style={{ color: '#fff', fontSize: 9, fontWeight: '800', lineHeight: 12 }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </AppText>
              </View>
            ) : (
              <View
                className="absolute h-2.5 w-2.5 rounded-full bg-primary"
                style={{
                  top: 4,
                  right: 4,
                  borderWidth: 2,
                  borderColor: '#ffffff',
                }}
              />
            )}
          </View>

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
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

function getInitials(name: string) {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return '';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : parts[0]?.[1] ?? '';
  return (first + second).toUpperCase();
}
