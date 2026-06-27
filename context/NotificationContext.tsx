import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  type DashboardKpi,
  type NotifItem,
  type ActivityPayload,
  fetchDashboardStats,
  subscribeToPengawalActivity,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
} from '../services/notificationService';

type NotificationContextValue = {
  kpi: DashboardKpi;
  notifications: NotifItem[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  loadStats: (isRefresh?: boolean) => Promise<void>;
  handleMarkRead: (id: string) => Promise<void>;
  handleMarkAllRead: () => Promise<void>;
  handleClearAll: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const token = session?.token ?? '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpi, setKpi] = useState<DashboardKpi>({ rondaan_hari_ini: 0, pelawat_hari_ini: 0 });
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [pgwId, setPgwId] = useState('');
  // Track whether the very first fetch has completed so we never
  // hide the badge behind a spinner on subsequent background polls.
  const initialLoadDone = useRef(false);

  const loadStats = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      try {
        // Only show the loading spinner on the very first fetch.
        // Background polls and pull-to-refresh should not set loading=true
        // because that zeros out unreadCount and hides the badge.
        if (!initialLoadDone.current) {
          setLoading(true);
        } else if (isRefresh) {
          setRefreshing(true);
        }
        const data = await fetchDashboardStats(token);
        setKpi(data.kpi);
        setNotifications(data.notifikasi);
        setPgwId(data.pgw_id);
      } catch (e) {
        console.warn('[NotificationProvider] fetchDashboardStats failed:', e);
      } finally {
        initialLoadDone.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  // Fetch once on mount or when token changes
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Silent polling fallback (30 s) ─────────────────────────────────────────
  // Guarantees the badge count stays fresh even when the WebSocket
  // (Reverb/Pusher) connection is unavailable or drops silently.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      // Run silently — no spinner, no refreshing indicator.
      loadStats(false);
    }, 30_000);
    return () => clearInterval(id);
  }, [token, loadStats]);

  // Subscribe to real-time events
  useEffect(() => {
    if (!token || !pgwId) return;

    const unsub = subscribeToPengawalActivity(
      token,
      pgwId,
      (payload: ActivityPayload) => {
        setKpi(payload.kpi);
        const newItem: NotifItem = {
          id: `rt-${Date.now()}`,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          meta: payload.meta,
          occurred_at: payload.occurred_at,
          is_read: false,
        };
        setNotifications((prev) => [newItem, ...prev]);
      }
    );

    return unsub;
  }, [token, pgwId]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      try {
        await markNotificationRead(token, id);
      } catch {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
        );
      }
    },
    [token]
  );

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllNotificationsRead(token);
    } catch {
      console.warn('[NotificationProvider] markAllRead failed');
    }
  }, [token]);

  const handleClearAll = useCallback(async () => {
    setNotifications([]);
    try {
      await clearAllNotifications(token);
    } catch {
      console.warn('[NotificationProvider] clearAll failed');
    }
  }, [token]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        kpi,
        notifications,
        unreadCount,
        loading,
        refreshing,
        loadStats,
        handleMarkRead,
        handleMarkAllRead,
        handleClearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return ctx;
}
