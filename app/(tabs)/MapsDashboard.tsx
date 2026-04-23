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
            distanceInterval: 3 // Kemaskini setiap 3 meter pergerakan
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

  const normalizeCoord = (point: any): Coords | null => {
    const latRaw =
      point?.latitude ?? point?.latitud ?? point?.fld_loc_latitud ?? point?.lat;
    const lngRaw =
      point?.longitude ??
      point?.longitud ??
      point?.fld_loc_longitud ??
      point?.long;
    const latitude = typeof latRaw === 'number' ? latRaw : Number(latRaw);
    const longitude = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  };

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
            geodesic={true} 
            lineJoin="round"
          />
        )}

        {/* LUKIS TITIK SEMAK: Marker akan hilang secara automatik bila `titikSemak` (prop) dikemaskini */}
        {titikSemak.map((point: any, idx: number) => {
          const coord = normalizeCoord(point);
          if (!coord) return null;
          return (
            <Marker
              key={(() => {
                const coordKey = `${coord.latitude},${coord.longitude}`;
                const rawKey =
                  point?.id ??
                  point?.fld_loc_id ??
                  point?.qr ??
                  (coordKey !== 'undefined,undefined' ? coordKey : idx);
                return String(rawKey);
              })()}
              coordinate={coord}
              pinColor="red"
              title={point?.name ?? point?.fld_loc_nama ?? 'Titik Semak'}
            />
          );
        })}
      </MapView>

      {locating && (
        <View className="absolute inset-0 items-center justify-center bg-white/60">
          <ActivityIndicator size="large" color="#1F7BFF" />
        </View>
      )}
    </View>
  );
}