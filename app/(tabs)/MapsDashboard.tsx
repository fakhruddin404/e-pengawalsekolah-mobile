import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';

type Coords = { latitude: number; longitude: number };

const DELTA = 0.012;
const FALLBACK_REGION = {
  latitude: 3.139,
  longitude: 101.6869,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

interface MapsDashboardProps {
  isRondaanActive: boolean;
  titikSemak: any[]; // Anda boleh tukar 'any' kepada interface TitikSemak jika ada
  userRoute: Coords[];
  setUserRoute: React.Dispatch<React.SetStateAction<Coords[]>>;
}

export default function MapsDashboard({ 
  isRondaanActive, 
  titikSemak = [], 
  userRoute = [], 
  setUserRoute 
}: MapsDashboardProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [locating, setLocating] = useState(true);

  // 1. Dapatkan lokasi awal sekali sahaja semasa komponen dimuatkan
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPermDenied(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  // 2. Logik Plotting Rute (Hanya berjalan jika isRondaanActive = true)
  useEffect(() => {
    let subscription: any;

    if (isRondaanActive) {
      (async () => {
        subscription = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.High, 
            distanceInterval: 5 // Kemaskini setiap 5 meter pergerakan
          },
          (location) => {
            const newPoint = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            // Simpan rute baru ke dalam array untuk dilukis oleh Polyline
            setUserRoute((prev: Coords[]) => [...prev, newPoint]);
          }
        );
      })();
    }

    return () => {
      if (subscription) subscription.remove();
    };
  }, [isRondaanActive]);

  if (Platform.OS === 'web') return <View className="flex-1 items-center justify-center"><Text>Peta tersedia pada Android/iOS</Text></View>;
  if (permDenied) return <View className="flex-1 items-center justify-center"><Text>Keizinan lokasi diperlukan</Text></View>;

  const initialRegion = coords
    ? { ...coords, latitudeDelta: DELTA, longitudeDelta: DELTA }
    : FALLBACK_REGION;

  return (
    <View className="flex-1">
      <MapView
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={Platform.OS === 'android'}
      >
        {/* LUKIS RUTE: Hanya jika ada data dalam userRoute */}
        {userRoute.length > 0 && (
          <Polyline 
            coordinates={userRoute} 
            strokeWidth={4} 
            strokeColor="#1F7BFF" 
          />
        )}

        {/* LUKIS TITIK SEMAK: Marker akan hilang secara automatik bila titikSemak dikemaskini */}
        {titikSemak.map((point: any, idx: number) => (
          <Marker 
            key={(() => {
              const coordKey = `${point?.latitude},${point?.longitude}`;
              const rawKey = point?.id ?? point?.qr ?? (coordKey !== 'undefined,undefined' ? coordKey : idx);
              return String(rawKey);
            })()} 
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            pinColor="red"
            title="Titik Semak"
          />
        ))}
      </MapView>

      {locating && (
        <View className="absolute inset-0 items-center justify-center bg-white/60">
          <ActivityIndicator size="large" color="#1F7BFF" />
        </View>
      )}
    </View>
  );
}