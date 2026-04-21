import { lazy, Suspense, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText,
  Play,
  ScanLine,
  Siren,
  StopCircle, // Fix 1: Import ditambah
} from 'lucide-react-native';

import { DashboardHeader } from '../../components/DashboardHeader';
import { useAuth } from '../../context/AuthContext';
import { getTitikSemak, postSimpanRondaan } from '../../services/api';

const MapsDashboard = lazy(() => import('./MapsDashboard'));

export default function HomeMapScreen() {
  const [isRondaanActive, setIsRondaanActive] = useState(false);
  const [titikSemak, setTitikSemak] = useState<any[]>([]);
  const [userRoute, setUserRoute] = useState<any[]>([]);
  const [totalTitik, setTotalTitik] = useState(0);
  const { session } = useAuth();
  const onMulaRondaan = async () => {
    try {
      // 1. Panggil API dari Laravel
      // Pastikan anda sudah import 'getTitikSemak' dari fail services/api anda
      const response = await getTitikSemak(session?.token ?? '');
      
      if (response) {
        const titik =
          Array.isArray((response as any)?.data) ? (response as any).data : response;

        // 2. Simpan data sebenar dari database ke dalam state
        setTitikSemak(titik as any[]);
        
        // Simpan jumlah asal untuk kira peratus nanti
        setTotalTitik((titik as any[])?.length ?? 0);
  
        setIsRondaanActive(true);
        setUserRoute([]); // Reset rute
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

  const onTamatRondaan = async () => {
    if (totalTitik === 0) return;
  
    const baki = titikSemak.length;
    const diselesaikan = totalTitik - baki;
    const peratus = Math.round((diselesaikan / totalTitik) * 100);
  
    Alert.alert("Tamat Rondaan", `Selesaikan ${peratus}% rondaan?`, [
      { text: "Batal", style: "cancel" },
      { 
        text: "Simpan", 
        onPress: async () => {
          try {
            const response = await postSimpanRondaan(session?.token ?? '', {
              path: userRoute,
              peratus: peratus,
              durasi: '10:00', // fix later
            });
            if (response?.success) {
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

        <SafeAreaView className="absolute left-0 right-0 top-0 bg-white">
          <DashboardHeader />
        </SafeAreaView>

        <View className="absolute bottom-36 left-4 space-y-3">
          {!isRondaanActive ? (
            <Fab 
              label="MULA" 
              icon={<Play size={18} color="#0F172A" />} 
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
                icon={<ScanLine size={18} color="#0F172A" />} 
                onPress={() => Alert.alert("Imbas", "Buka Kamera...")} 
              />
            </>
          )}
          
          <View className="h-3" />
          <Fab label="LAPORAN" icon={<FileText size={18} color="#0F172A" />} />
          
          <View className="h-3" />
          <Fab
            label="SOS"
            icon={<Siren size={18} color="#0F172A" />}
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
      className="flex-row items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      {icon}
      <Text className="text-xs font-extrabold text-slate-900">{label}</Text>
    </Pressable>
  );
}
