import type React from 'react';
import {
  useEffect,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  Bell,
  CheckCheck,
  X,
} from 'lucide-react-native';

import { AppText } from './AppText';
import { palette, radii, shadows, spacing } from '../theme/ui';
import { useNotification } from '../context/NotificationContext';
import type { NotifItem } from '../services/notificationService';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const BLUE    = '#1F7BFF';
const TEAL    = '#0EA5B5';
const RED     = '#EF4444';
const ORANGE  = '#F97316';
const GREEN   = '#22C55E';
const PURPLE  = '#8B5CF6';
const SURFACE = '#F8FAFC';

const TYPE_META: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  rondaan_created: {
    color: BLUE,
    bg: '#EFF6FF',
    label: 'Rondaan',
  },
  sos_created: {
    color: RED,
    bg: '#FEF2F2',
    label: 'SOS',
  },
  laporan_created: {
    color: ORANGE,
    bg: '#FFF7ED',
    label: 'Laporan',
  },
  pelawat_created: {
    color: GREEN,
    bg: '#F0FDF4',
    label: 'Pelawat',
  },
  pelawat_updated: {
    color: PURPLE,
    bg: '#F5F3FF',
    label: 'Pelawat Keluar',
  },
};

function getTypeMeta(type: string) {
  return (
    TYPE_META[type] ?? {
      color: palette.muted,
      bg: SURFACE,
      label: 'Notifikasi',
    }
  );
}

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return 'Baru sahaja';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins} min lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  return `${days} hari lalu`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string;
  value: number;
  color: string;
  gradStart: string;
  gradEnd: string;
  icon: React.ComponentType<{ size: number; color: string }>;
};

function KpiCard({ label, value, color, gradStart, gradEnd, icon: Icon }: KpiCardProps) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radii.md,
        backgroundColor: gradStart,
        padding: spacing.md,
        ...shadows.card,
        borderWidth: 1,
        borderColor: gradEnd + '55',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circle */}
      <View
        style={{
          position: 'absolute',
          right: -12,
          top: -12,
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: gradEnd + '33',
        }}
      />
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xs,
          ...shadows.card,
        }}
      >
        <Icon size={18} color={color} />
      </View>
      <AppText
        variant="h2"
        style={{ color, fontWeight: '800', fontSize: 28, lineHeight: 32 }}
      >
        {value}
      </AppText>
      <AppText
        variant="caption"
        style={{ color: palette.muted, marginTop: 2, fontWeight: '600' }}
      >
        {label}
      </AppText>
    </View>
  );
}

type NotifCardProps = {
  item: NotifItem;
  onPress: (id: string) => void;
};

function NotifCard({ item, onPress }: NotifCardProps) {
  const meta = getTypeMeta(item.type);

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => ({
        paddingVertical: 12,
        paddingHorizontal: spacing.md,
        backgroundColor: item.is_read ? '#fff' : '#F0F7FF',
        opacity: pressed ? 0.85 : 1,
        borderLeftWidth: item.is_read ? 0 : 3,
        borderLeftColor: meta.color,
      })}
    >
      {/* Type label + unread dot */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <View
          style={{
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 99,
            backgroundColor: meta.bg,
          }}
        >
          <AppText
            variant="caption"
            style={{ color: meta.color, fontWeight: '700', fontSize: 10 }}
          >
            {meta.label}
          </AppText>
        </View>
        {!item.is_read && (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: BLUE,
            }}
          />
        )}
      </View>

      {/* Title */}
      <AppText
        variant="bodySm"
        style={{ fontWeight: item.is_read ? '400' : '700', color: palette.text }}
        numberOfLines={1}
      >
        {item.title}
      </AppText>

      {/* Message */}
      <AppText
        variant="caption"
        style={{ color: palette.muted, marginTop: 1 }}
        numberOfLines={2}
      >
        {item.message}
      </AppText>

      {/* Time */}
      <AppText
        variant="caption"
        style={{ color: palette.muted, marginTop: 4, fontSize: 10 }}
      >
        {formatRelativeTime(item.occurred_at)}
      </AppText>
    </Pressable>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export type NotificationModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function NotificationModal({ visible, onClose }: NotificationModalProps) {
  const {
    kpi,
    notifications,
    unreadCount,
    loading,
    refreshing,
    handleMarkRead,
    handleMarkAllRead,
  } = useNotification();

  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // ── Animation ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  // Data is kept fresh by NotificationContext's polling + real-time subscription.
  // No need to re-fetch when modal opens.

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#0f172a',
            opacity: backdropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          }}
        />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '92%',
          backgroundColor: '#fff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
          transform: [{ translateY: slideAnim }],
          ...shadows.floating,
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: BLUE,
            paddingTop: 20,
            paddingBottom: 20,
            paddingHorizontal: spacing.lg,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#fff',
              opacity: 0.35,
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Bell size={20} color="#fff" />
              <AppText variant="h3" style={{ color: '#fff', fontWeight: '700' }}>
                Notifikasi
              </AppText>
              {unreadCount > 0 && (
                <View
                  style={{
                    backgroundColor: RED,
                    borderRadius: 99,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 5,
                  }}
                >
                  <AppText variant="caption" style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </AppText>
                </View>
              )}
            </View>

            <Pressable
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} color="#fff" />
            </Pressable>
          </View>

          {/* ── KPI Cards ──────────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <KpiCard
              label="Rondaan Hari Ini"
              value={kpi.rondaan_hari_ini}
              color={BLUE}
              gradStart="#EFF6FF"
              gradEnd={BLUE}
              icon={ShieldCheck}
            />
            <KpiCard
              label="Pelawat Hari Ini"
              value={kpi.pelawat_hari_ini}
              color={TEAL}
              gradStart="#ECFEFF"
              gradEnd={TEAL}
              icon={User}
            />
          </View>
        </View>

        {/* ── List header ────────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
            backgroundColor: '#fff',
          }}
        >
          <AppText variant="bodySm" style={{ fontWeight: '700', color: palette.text }}>
            Aktiviti Terkini
          </AppText>
          {unreadCount > 0 && (
            <Pressable
              onPress={handleMarkAllRead}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <CheckCheck size={14} color={BLUE} />
              <AppText variant="caption" style={{ color: BLUE, fontWeight: '600' }}>
                Tandakan semua dibaca
              </AppText>
            </Pressable>
          )}
        </View>

        {/* ── Notification list ──────────────────────────────────────────────── */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={BLUE} />
            <AppText variant="caption" style={{ color: palette.muted, marginTop: 8 }}>
              Memuatkan…
            </AppText>
          </View>
        ) : notifications.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
            <Bell size={40} color={palette.border} />
            <AppText variant="bodySm" style={{ color: palette.muted, marginTop: 12, fontWeight: '600' }}>
              Tiada notifikasi
            </AppText>
            <AppText variant="caption" style={{ color: palette.muted, marginTop: 4 }}>
              Aktiviti anda akan dipaparkan di sini
            </AppText>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotifCard item={item} onPress={handleMarkRead} />
            )}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
            )}
            onRefresh={() => loadStats(true)}
            refreshing={refreshing}
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </Modal>
  );
}
