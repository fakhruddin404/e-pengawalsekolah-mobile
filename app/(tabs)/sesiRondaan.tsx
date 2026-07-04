import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  FileText,
  Play,
  ScanLine,
  Siren,
  StopCircle,
} from 'lucide-react-native';
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from 'expo-camera';
import * as Location from 'expo-location';

import { AppText } from '../../components/AppText';
import { palette, radii, shadows, spacing } from '../../theme/ui';
import { useAuth } from '../../context/AuthContext';
import NetInfo from '@react-native-community/netinfo';
import {
  calculatePatrolStats,
  formatAxiosError,
  prepareRondaanStartData,
  verifyCheckpointLocally,
  syncScanQueue,
  submitRondaanWithFallback,
  type RondaanMapPoint,
  cacheTitikSemak,
  getCachedTitikSemak,
  addToScanQueue,
  getScanQueue,
  clearScanQueue,
  getPendingRondaan,
  clearPendingRondaan,
  hasPendingSync,
} from '../../services';

const MapsDashboard = lazy(() => import('./MapsDashboard'));

const TAB_BAR_CLEARANCE = Platform.select({ ios: 82, android: 96, default: 96 }) ?? 96;

export default function HomeMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fabBottom = TAB_BAR_CLEARANCE + insets.bottom;
  const [isRondaanActive, setIsRondaanActive] = useState(false);
  const [titikSemak, setTitikSemak] = useState<RondaanMapPoint[]>([]);
  const [userRoute, setUserRoute] = useState<any[]>([]);
  const [totalTitik, setTotalTitik] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const { session } = useAuth();
  const scanLockRef = useRef(false);

  const [cachedTitik, setCachedTitik] = useState<RondaanMapPoint[]>([]);
  const [pendingSync, setPendingSync] = useState(false);

  // Check for pending sync on mount
  useEffect(() => {
    (async () => {
      const hasPending = await hasPendingSync();
      setPendingSync(hasPending);
    })();
  }, []);

  // Auto-sync listener when internet returns
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && pendingSync) {
        // Attempt to sync pending rondaan when connection is back
        syncPendingRondaanNow();
      }
    });
    return () => unsubscribe();
  }, [pendingSync, session?.token]);

  const syncPendingRondaanNow = async () => {
    if (!session?.token) return;
    try {
      const pendingData = await getPendingRondaan();
      if (!pendingData) {
        setPendingSync(false);
        return;
      }
      
      const { ok, pending, message } = await submitRondaanWithFallback(session.token, pendingData.payload);
      if (ok) {
        await clearPendingRondaan();
        setPendingSync(false);
        Alert.alert('Berjaya Disegerak', 'Rekod rondaan tertunggak telah berjaya dihantar ke server.');
      }
    } catch (e) {
      console.log('Auto-sync failed, will retry later:', e);
    }
  };

  useEffect(() => {
    (async () => {
      if (!permission?.granted) await requestPermission();
    })();
    // Intentionally omit deps to avoid repeated prompts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    // tutup overlay
    setIsScanning(false);

    try {
      if (!session?.token) {
        Alert.alert('Ralat', 'Sesi tidak sah. Sila log masuk semula.');
        return;
      }

      //request permission to use location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ralat', 'Keizinan lokasi diperlukan untuk pengesahan.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const result = await verifyCheckpointLocally(
        data,
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
        cachedTitik
      );

      // Simpan ke scan queue
      await addToScanQueue({
        fld_loc_id: result.fld_loc_id,
        qr_code: result.qr_code,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        scanned_at: Math.floor(Date.now() / 1000),
      });

      // Remove the titik semak from the list
      setTitikSemak((prev) =>
        (Array.isArray(prev) ? prev : []).filter((p) => p.id.toString() !== result.fld_loc_id.toString())
      );
      
      Alert.alert('Berjaya', 'Titik semak disahkan secara tempatan.');
    } catch (error: any) {
      Alert.alert('Ralat', error.message ?? 'Gagal mengesahkan titik semak.');
    } finally {
      setTimeout(() => {
        scanLockRef.current = false;
      }, 1000); // 1 saat cooldown
    }
  };

  // Function to start the rondaan
  const onMulaRondaan = async () => {
    try {
      if (!session?.token) {
        Alert.alert('Ralat', 'Sesi tidak sah. Sila log masuk semula.');
        return;
      }

      // Pastikan ada internet sebelum benarkan mula rondaan
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        Alert.alert(
          'Tiada Sambungan Internet',
          'Sambungan internet diperlukan untuk memulakan rondaan bagi mendapatkan data titik semak terkini dari pelayan.'
        );
        return;
      }

      // Dapatkan data titik semak dari server (wajib online)
      const normalized = await prepareRondaanStartData(session.token);
      if (normalized.length === 0) {
        Alert.alert('Ralat', 'Data titik semak diterima tetapi tiada koordinat sah untuk dipaparkan.');
        return;
      }

      // Cache data untuk kegunaan semasa rondaan (jika tiada internet ketika imbas QR)
      await cacheTitikSemak(normalized);

      setCachedTitik(normalized);
      setTitikSemak(normalized);
      setTotalTitik(normalized.length);
      setStartTime(Math.floor(Date.now() / 1000));
      setIsRondaanActive(true);
      setUserRoute([]);

      // Clear sebarang scan queue yang mungkin tersangkut dari sesi lepas
      await clearScanQueue();
    } catch (error: any) {
      Alert.alert('Ralat', error.message ?? 'Gagal memulakan rondaan. Pastikan anda mempunyai sambungan internet.');
    }
  };

  // Function to end the rondaan
  const onTamatRondaan = async () => {
    if (totalTitik === 0 || startTime === null) return;
    if (!session?.token) {
      Alert.alert('Ralat', 'Sesi anda telah tamat. Sila log masuk semula.');
      return;
    }

    // Tanya pengguna dahulu
    Alert.alert("Tamat Rondaan", `Tamatkan sesi rondaan ini?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Tamat",
        onPress: async () => {
          try {
            // 1. Dapatkan scan queue dan cuba sync
            const queue = await getScanQueue();
            const { synced, rejected } = await syncScanQueue(session.token, queue);
            
            // 2. Hitung statistik
            // Kita hanya ambil kira titik yang berjaya di-sync ke server sebagai 'completed'
            // Walau bagaimanapun, titikSemak.length mewakili titik yang belum discan secara lokal
            // Jadi peratusan yang tepat adalah berdasarkan 'synced.length'
            const peratus = totalTitik > 0 ? Math.round((synced.length / totalTitik) * 100) : 0;
            const endTime = Math.floor(Date.now() / 1000);
            const totalSeconds = endTime - startTime;
            const hrs = Math.floor(totalSeconds / 3600);
            const mins = Math.floor((totalSeconds % 3600) / 60);
            const secs = totalSeconds % 60;
            const durasi = [hrs, mins, secs].map((v) => (v < 10 ? '0' + v : v)).join(':');

            // 3. Submit rondaan dengan fallback (simpan lokal jika gagal)
            const payload = {
              path: userRoute,
              peratus,
              durasi,
            };

            const result = await submitRondaanWithFallback(session.token, payload);
            
            if (result.ok) {
              await clearScanQueue();
              setIsRondaanActive(false);
              setTitikSemak([]);
              setUserRoute([]);
              Alert.alert("Selesai", result.message);
            } else if (result.pending) {
              setPendingSync(true);
              // Kita tak clearScanQueue jika submit rondaan pending, 
              // biarkan dalam queue supaya boleh di sync kemudian jika internet pulih.
              // Atau kita clear je scan queue sebab kalau submit rondaan dah simpan locally,
              // ia dah 'completed' dari segi rondaan. 
              // Tapi untuk simplicity, kita clear je scan queue, tapi payload peratus 
              // dah disimpan.
              await clearScanQueue();
              setIsRondaanActive(false);
              setTitikSemak([]);
              setUserRoute([]);
              Alert.alert("Mod Luar Talian", result.message);
            } else {
              Alert.alert("Ralat", result.message);
            }
          } catch (error: any) {
            Alert.alert('Ralat', error.message ?? 'Gagal simpan rondaan.');
          }
        }
      }
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        <View className="absolute inset-0">
          <Suspense
            fallback={
              <View className="flex-1 items-center justify-center bg-slate-100">
                <ActivityIndicator size="large" color="#1F7BFF" />
              </View>
            }
          >
            <MapsDashboard
              isRondaanActive={isRondaanActive}
              titikSemak={titikSemak}
              userRoute={userRoute}
              setUserRoute={setUserRoute}
              totalTitik={totalTitik}
              startTime={startTime}
            />
          </Suspense>
        </View>

        {isScanning && (
          <View className="absolute inset-0 bg-black">
            <CameraView
              onBarcodeScanned={handleBarCodeScanned}
              enableTorch={torchEnabled}
              style={{ flex: 1 }}
            />

            <SafeAreaView className="absolute left-0 right-0 top-0">
              <View className="px-4 py-3">
                <AppText
                  variant="h3"
                  className="text-center"
                  style={{ color: '#ffffff' }}
                >
                  Imbas Kod Qr
                </AppText>
                <AppText
                  variant="caption"
                  className="mt-2 text-center"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  Halakan Kod QR Titik Semak Dalam Kotak Yang Disediakan
                </AppText>
                <View className="mt-3 items-center">
                  <Pressable
                    onPress={() => setTorchEnabled((prev) => !prev)}
                    className="rounded-full bg-white/90 px-4 py-2"
                  >
                    <AppText variant="caption" style={{ fontWeight: '800', color: '#0F172A' }}>
                      {torchEnabled ? 'LAMPU: ON' : 'LAMPU: OFF'}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </SafeAreaView>

            <SafeAreaView className="absolute bottom-0 left-0 right-0">
              <View className="px-4 pb-6">
                <Pressable
                  onPress={() => setIsScanning(false)}
                  className="items-center rounded-full bg-white/90 px-4 py-3"
                >
                  <AppText variant="bodySm" style={{ fontWeight: '800' }}>
                    TUTUP
                  </AppText>
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        )}



        <View
          pointerEvents="box-none"
          className="absolute right-4"
          style={{ bottom: fabBottom }}
        >
          {pendingSync && !isRondaanActive && (
            <View className="mb-3 rounded-full bg-orange-100 px-3 py-1.5 border border-orange-300">
              <AppText variant="caption" className="text-orange-800 text-center font-bold">
                🔄 Menunggu Sambungan...
              </AppText>
            </View>
          )}

          {!isRondaanActive ? (
            <Fab
              label="MULA"
              icon={<Play size={18} color={palette.text} />}
              onPress={onMulaRondaan}
            />
          ) : (
            <>
              <Fab
                label="TAMAT"
                icon={<StopCircle size={18} color="#EF4444" />}
                onPress={onTamatRondaan}
              />
              <View className="h-3" />
              <Fab
                label="IMBAS"
                icon={<ScanLine size={18} color={palette.text} />}
                onPress={() => {
                  if (permission?.granted === false) {
                    Alert.alert('Ralat', 'Keizinan kamera diperlukan untuk imbas QR.');
                    return;
                  }
                  setTorchEnabled(true);
                  setIsScanning(true);
                }}
              />
            </>
          )}

          <View className="h-3" />
          <Fab
            label="LAPORAN"
            icon={<FileText size={18} color={palette.text} />}
            onPress={() => router.push('/(tabs)/createLaporan')}
          />

          <View className="h-3" />
          <Fab
            label="SOS"
            icon={<Siren size={18} color="#EF4444" />}
            onPress={() => {
              Alert.alert(
                '🚨 Isyarat Kecemasan',
                'Adakah anda pasti mahu menghantar isyarat SOS kecemasan?',
                [
                  { text: 'Batal', style: 'cancel' },
                  {
                    text: 'HANTAR SOS',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        if (!session?.token) {
                          Alert.alert('Ralat', 'Sesi tidak sah. Sila log masuk semula.');
                          return;
                        }

                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status !== 'granted') {
                          Alert.alert('Ralat', 'Keizinan lokasi diperlukan untuk SOS.');
                          return;
                        }

                        const pos = await Location.getCurrentPositionAsync({
                          accuracy: Location.Accuracy.Highest,
                        });

                        const { postSOS } = await import('../../services/sosService');
                        await postSOS(session.token, {
                          latitude: pos.coords.latitude,
                          longitude: pos.coords.longitude,
                        });

                        Alert.alert('Berjaya', 'Isyarat SOS berjaya dihantar. Bantuan sedang dimaklumkan.', [
                          {
                            text: 'OK',
                            onPress: () => Linking.openURL('tel:0139524123'),
                          },
                        ]);
                      } catch (error: any) {
                        const msg = error?.message ?? 'Gagal menghantar isyarat SOS.';
                        Alert.alert('Ralat', msg);
                      }
                    },
                  },
                ]
              );
            }}
          />
        </View>
      </View>
    </View>
  );
}

function Fab({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress ?? (() => {})}
      className="flex-row items-center gap-2 bg-white"
      style={{
        borderRadius: radii.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: palette.border,
        ...shadows.floating,
      }}
    >
      {icon}
      <AppText variant="caption" style={{ fontWeight: '800', color: palette.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}
