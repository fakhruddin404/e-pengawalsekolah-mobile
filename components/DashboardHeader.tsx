import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Cog } from 'lucide-react-native';

import { AppText } from './AppText';
import { NotificationModal } from './NotificationModal';
import { palette, spacing } from '../theme/ui';
import { useAuth } from '../context/AuthContext';
import {
  fetchDashboardStats,
  subscribeToPengawalActivity,
} from '../services/notificationService';

const ICON_BUTTON_BG = '#F1F5F9';

export type DashboardHeaderProps = {
  showTambah?: boolean;
};

export function DashboardHeader() {
  const router = useRouter();
  const { session } = useAuth();
  const pengawalName = session?.displayName ?? '';
  const photoUrl     = session?.photoUrl ?? null;
  const token        = session?.token ?? '';
  const initials     = getInitials(pengawalName);

  const [modalVisible, setModalVisible] = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [pgwId, setPgwId]               = useState('');

  // Keep a ref so the real-time handler can always read the latest count
  const unreadRef = useRef(0);
  useEffect(() => {
    unreadRef.current = unreadCount;
  }, [unreadCount]);

  // ─── Fetch initial unread count + pgwId on mount ─────────────────────────
  const refreshCount = () => {
    if (!token) return;
    fetchDashboardStats(token)
      .then((data) => {
        const unread = data.notifikasi.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
        unreadRef.current = unread;
        if (data.pgw_id) setPgwId(data.pgw_id);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ─── Real-time subscription: increment badge when new activity arrives ────
  useEffect(() => {
    if (!token || !pgwId) return;

    const unsub = subscribeToPengawalActivity(token, pgwId, () => {
      // Only increment when the modal is closed — if it's open the list handles it
      if (!modalVisible) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return unsub;
  }, [token, pgwId, modalVisible]);

  // ─── Open modal and reset badge optimistically ────────────────────────────
  const handleOpenModal = () => {
    setModalVisible(true);
    setUnreadCount(0);
    unreadRef.current = 0;
  };

  // ─── Re-sync unread count after modal closes ──────────────────────────────
  const handleCloseModal = () => {
    setModalVisible(false);
    // Short delay so mark-all-read has time to commit on the server
    setTimeout(() => refreshCount(), 500);
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
            <AppText variant="h3" numberOfLines={1}>
              {pengawalName || '…'}
            </AppText>
          </View>
        </View>

        <View className="ml-2 flex-row shrink-0 items-center gap-2">
          {/* ── Bell button + numeric badge ───────────────────────────────── */}
          <View style={{ position: 'relative' }}>
            <Pressable
              onPress={handleOpenModal}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: ICON_BUTTON_BG }}
              accessibilityLabel="Buka panel notifikasi"
              accessibilityRole="button"
            >
              <Bell size={18} color={palette.text} />
            </Pressable>

            {/* Numeric badge (red pill, shown when unreadCount > 0) */}
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 1.5,
                  borderColor: '#ffffff',
                }}
              >
                <AppText
                  variant="caption"
                  style={{ color: '#fff', fontSize: 9, fontWeight: '800', lineHeight: 13 }}
                >
                  {unreadCount > 9 ? '9+' : String(unreadCount)}
                </AppText>
              </View>
            ) : (
              /* Plain blue dot (default "online" indicator when nothing unread) */
              <View
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: palette.primary,
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
        onClose={handleCloseModal}
      />
    </>
  );
}

function getInitials(name: string) {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return '';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first  = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : parts[0]?.[1] ?? '';
  return (first + second).toUpperCase();
}
