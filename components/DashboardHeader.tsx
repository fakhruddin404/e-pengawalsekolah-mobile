import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
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
  const router        = useRouter();
  const { session }   = useAuth();
  const pengawalName  = session?.displayName ?? '';
  const photoUrl      = session?.photoUrl ?? null;
  const token         = session?.token ?? '';
  const initials      = getInitials(pengawalName);

  const [modalVisible, setModalVisible] = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [pgwId, setPgwId]               = useState('');

  // Keep a ref so the Echo callback never captures a stale pgwId
  const pgwIdRef = useRef('');

  // ─── Fetch initial unread count + pgwId ─────────────────────────────────
  const refreshCount = useCallback(() => {
    if (!token) return;
    fetchDashboardStats(token)
      .then((data) => {
        // Unread count: show immediately from first fetch
        const unread = data.notifikasi.filter((n) => !n.is_read).length;
        setUnreadCount(unread);

        // Store pgwId so the Echo subscription can start
        if (data.pgw_id && !pgwIdRef.current) {
          pgwIdRef.current = data.pgw_id;
          setPgwId(data.pgw_id);
        }
      })
      .catch(() => {});
  }, [token]);

  // Fetch once on mount / when token changes
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // ─── Echo subscription — STABLE, not tied to modalVisible ───────────────
  // This stays alive even when the modal opens/closes.
  // Every real-time activity event increments the badge so it updates live.
  useEffect(() => {
    if (!token || !pgwId) return;

    const unsub = subscribeToPengawalActivity(token, pgwId, () => {
      // Always increment — even if modal is open the badge is behind it,
      // it will show the correct value after close
      setUnreadCount((prev) => prev + 1);
    });

    return unsub;
    // ⚠️ Deliberately NOT including modalVisible: we want this to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pgwId]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleOpenModal = () => {
    setModalVisible(true);
    // Clear badge immediately — user is now viewing notifications
    setUnreadCount(0);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    // Re-sync the true unread count from server after user may have
    // read / marked items inside the modal
    setTimeout(() => refreshCount(), 400);
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
            // expo-image supports Authorization headers on BOTH Android and iOS.
            // RN's built-in Image ignores headers on Android → photo never loads.
            <Image
              source={{ uri: photoUrl }}
              headers={token ? { Authorization: `Bearer ${token}` } : undefined}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0' }}
              contentFit="cover"
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
