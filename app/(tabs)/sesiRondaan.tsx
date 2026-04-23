import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { DashboardHeader } from '../../components/DashboardHeader';
import { palette, radii, shadows, spacing } from '../../theme/ui';
import { useAuth } from '../../context/AuthContext';
import {
  getTitikSemak,
  postSahkanTitik,
  postSimpanRondaan,
  calculatePatrolStats,
} from '../../services';

const MapsDashboard = lazy(() => import('./MapsDashboard'));

type TitikSemakMapPoint = {
  id?: string | number;
  name?: string;
  latitude: number;
  longitude: number;
  raw?: any;
};

function toNumber(value: any): number | null {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeTitikSemakPoint(p: any): TitikSemakMapPoint | null {
  const lat =
    toNumber(p?.latitude) ??
    toNumber(p?.latitud) ??
    toNumber(p?.fld_loc_latitud) ??
    toNumber(p?.lat);
  const lng =
    toNumber(p?.longitude) ??
    toNumber(p?.longitud) ??
    toNumber(p?.fld_loc_longitud) ??
    toNumber(p?.long);

  if (lat === null || lng === null) return null;

  return {
    id: p?.id ?? p?.fld_loc_id ?? p?.qr ?? undefined,
    name: p?.name ?? p?.fld_loc_nama ?? undefined,
    latitude: lat,
    longitude: lng,
    raw: p,
  };
}

export default function HomeMapScreen() {
  const [isRondaanActive, setIsRondaanActive] = useState(false);
  const [titikSemak, setTitikSemak] = useState<any[]>([]);
  const [userRoute, setUserRoute] = useState<any[]>([]);
  const [totalTitik, setTotalTitik] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
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

      //get the scanned data
      let qrObject;
      try {
        qrObject = JSON.parse(data);
      } catch (e) {
        Alert.alert('Ralat', 'Format kod QR tidak sah (Bukan JSON).');
        return;
      }

      const fld_loc_id = qrObject.id; 
      const qr_code = qrObject.secret;
      
      //request permission to use location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ralat', 'Keizinan lokasi diperlukan untuk pengesahan.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      // Hantar terus ke API
      const res = await postSahkanTitik(session.token, {
        fld_loc_id: fld_loc_id, 
        qr_code: qr_code,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      // jawapan dari API
      if (res?.success === true) {
        setTitikSemak((prev) =>
          //remove the titik semak from the list
          (Array.isArray(prev) ? prev : []).filter((p: any) => {
            const id = (p?.id ?? p?.fld_loc_id ?? '').toString();
            return id !== fld_loc_id.toString();
          })
        );
        Alert.alert('Berjaya', res?.message ?? 'Titik semak disahkan.');
      } else {
        Alert.alert('Ralat', res?.message ?? 'Pengesahan gagal. Anda mungkin terlalu jauh dari titik semak.');
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ??
        error?.message ??
        'Gagal mengesahkan titik semak.';
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
      
      const responseTitikSemak = await getTitikSemak(session.token);
      
      if (responseTitikSemak) {
        const titik =
          Array.isArray((responseTitikSemak as any)?.data) ? (responseTitikSemak as any).data : responseTitikSemak;

        // Normalize the titik semak data
        const normalized = (Array.isArray(titik) ? titik : [])
          .map(normalizeTitikSemakPoint)// susun comey bare ni nk paka lamo
          .filter(Boolean) as TitikSemakMapPoint[];

        if (normalized.length === 0) {
          Alert.alert(
            'Ralat',
            'Data titik semak diterima tetapi tiada koordinat sah untuk dipaparkan.'
          );
          return;
        }

        // Save the titik semak data to the state
        setTitikSemak(normalized as any[]);
        
        // Save the total number of titik semak
        setTotalTitik(normalized.length);
        // Save the start time of the rondaan
        setStartTime(Math.floor(Date.now() / 1000));
        // Set the rondaan as active
        setIsRondaanActive(true);
        // Reset the user route
        setUserRoute([]); 
        Alert.alert("Mula", "Data titik semak berjaya dimuat turun.");
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        (error?.response?.status ? `HTTP ${error.response.status}` : null) ??
        error?.message ??
        'Gagal mengambil data titik semak dari server.';
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
            const response = await postSimpanRondaan(session.token, {
              path: userRoute,
              peratus: peratus,
              durasi,
            });
            const ok =
              response?.success === true ||
              response?.status === 'success' ||
              response?.status === true;
            if (ok) {
              setIsRondaanActive(false);
              setTitikSemak([]);
              setUserRoute([]);
              Alert.alert("Selesai", "Rekod rondaan telah dihantar ke sistem.");
            } else {
              Alert.alert("Ralat", response?.message ?? "Gagal simpan rondaan.");
            }
          } catch (error: any) {
            const msg =
              error?.response?.data?.message ??
              error?.response?.data?.error ??
              (error?.response?.status ? `HTTP ${error.response.status}` : null) ??
              error?.message ??
              'Gagal simpan rondaan.';
            Alert.alert('Ralat', msg);
          }
        }
      }
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        <Suspense
          fallback={
            <View className="flex-1 items-center justify-center bg-slate-100">
              <ActivityIndicator size="large" color="#1F7BFF" />
            </View>
          }
        >
          {/* Fix 2: Hantar props ke MapsDashboard */}
          <MapsDashboard 
            isRondaanActive={isRondaanActive}
            titikSemak={titikSemak}
            userRoute={userRoute}
            setUserRoute={setUserRoute}
          />
        </Suspense>

        {isScanning && (
          <View className="absolute inset-0 bg-black">
            <CameraView
              onBarcodeScanned={handleBarCodeScanned}
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

        <SafeAreaView className="absolute left-0 right-0 top-0 bg-white">
          <DashboardHeader />
        </SafeAreaView>

        <View className="absolute bottom-36 left-4 space-y-3">
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
                  setIsScanning(true);
                }}
              />
            </>
          )}
          
          <View className="h-3" />
          <Fab label="LAPORAN" icon={<FileText size={18} color={palette.text} />} />
          
          <View className="h-3" />
          <Fab
            label="SOS"
            icon={<Siren size={18} color={palette.text} />}
            onPress={() => Alert.alert('SOS', 'Menghantar SOS...')}
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
