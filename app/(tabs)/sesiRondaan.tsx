//test 
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
import {
  calculatePatrolStats,
  prepareRondaanStartData,
  submitRondaanRecord,
  verifyCheckpointByQr,
  type RondaanMapPoint,
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

      const verify = await verifyCheckpointByQr(
        session.token,
        data, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const res = verify.response;

      // jawapan dari API
      if (res?.success === true) {
        setTitikSemak((prev) =>
          //remove the titik semak from the list
          (Array.isArray(prev) ? prev : []).filter((p) => p.id.toString() !== verify.fld_loc_id.toString())
        );
        Alert.alert('Berjaya', res?.message ?? 'Titik semak disahkan.');
      } else {
        Alert.alert('Ralat', res?.message ?? 'Pengesahan gagal. Anda mungkin terlalu jauh dari titik semak.');
      }
    } catch (error: any) {
      const msg = error?.message ?? 'Gagal mengesahkan titik semak.';
      Alert.alert('Ralat', msg);
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

      const normalized = await prepareRondaanStartData(session.token);
      if (normalized.length === 0) {
        Alert.alert('Ralat', 'Data titik semak diterima tetapi tiada koordinat sah untuk dipaparkan.');
        return;
      }

      // Save the titik semak data to the state
      setTitikSemak(normalized);
      // Save the total number of titik semak
      setTotalTitik(normalized.length);
      // Save the start time of the rondaan
      setStartTime(Math.floor(Date.now() / 1000));
      // Set the rondaan as active
      setIsRondaanActive(true);
      // Reset the user route
      setUserRoute([]);
      Alert.alert('Mula', 'Data titik semak berjaya dimuat turun.');
    } catch (error: any) {
      const msg = error?.message ?? 'Gagal mengambil data titik semak dari server.';
      Alert.alert("Ralat", msg);
    }
  };

  // Function to end the rondaan
  const onTamatRondaan = async () => {
    // If there are no titik semak, return
    if (totalTitik === 0 || startTime === null) return;
    if (!session?.token) {
      Alert.alert('Ralat', 'Sesi anda telah tamat. Sila log masuk semula.');
      return;
    }

    const { peratus, durasi } = calculatePatrolStats(
      totalTitik,
      titikSemak.length,
      startTime
    );

    Alert.alert("Tamat Rondaan", `Selesaikan ${peratus}% rondaan?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Simpan",
        onPress: async () => {
          try {
            const result = await submitRondaanRecord(session.token, {
              path: userRoute,
              peratus: peratus,
              durasi,
            });
            if (result.ok) {
              setIsRondaanActive(false);
              setTitikSemak([]);
              setUserRoute([]);
              Alert.alert("Selesai", result.message);
            } else {
              Alert.alert("Ralat", result.message);
            }
          } catch (error: any) {
            const msg = error?.message ?? 'Gagal simpan rondaan.';
            Alert.alert('Ralat', msg);
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
                            onPress: () => Linking.openURL('tel:999'),
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
      onPress={onPress ?? (() => Alert.alert(label, 'Coming soon'))}
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
