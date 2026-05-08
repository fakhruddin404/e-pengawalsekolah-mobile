import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

import { AppText } from '../../components/AppText';
import {
  animateRegionTo,
  createAnimatedMapRegion,
  getHighRefreshWatchOptions,
  getMapMarkerKey,
  getMapMarkerTitle,
  normalizeMapCoord,
  setRegionToCoords,
  toCoordsFromLocation,
  type MapCoords,
} from '../../services';

const AnimatedMapView = MapView.Animated;

interface MapsDashboardProps {
  isRondaanActive: boolean;
  titikSemak: any[]; // Anda boleh tukar 'any' kepada interface TitikSemak jika ada
  userRoute: MapCoords[];
  setUserRoute: React.Dispatch<React.SetStateAction<MapCoords[]>>;
}

export default function MapsDashboard({ 
  isRondaanActive, 
  titikSemak = [], 
  userRoute = [], 
  setUserRoute 
}: MapsDashboardProps) {
  const region = useRef(createAnimatedMapRegion()).current;
  const [coords, setCoords] = useState<MapCoords | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [locating, setLocating] = useState(true);

  // 1. Dapatkan lokasi awal + start high-refresh watch untuk sync map region
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPermDenied(true);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        const firstPoint = toCoordsFromLocation(pos);
        setCoords(firstPoint);
        setRegionToCoords(region, firstPoint);

        subscription = await Location.watchPositionAsync(
          getHighRefreshWatchOptions(),
          (location) => {
            const nextPoint = toCoordsFromLocation(location);

            setCoords(nextPoint);
            animateRegionTo(region, nextPoint, 300);

            if (isRondaanActive) {
              setUserRoute((prev: MapCoords[]) => [...prev, nextPoint]);
            }
          }
        );
      } finally {
        setLocating(false);
      }
    })();

    return () => {
      subscription?.remove();
    };
  }, [isRondaanActive, region, setUserRoute]);

  if (Platform.OS === 'web')
    return (
      <View className="flex-1 items-center justify-center px-6">
        <AppText variant="body" className="text-center" style={{ color: '#64748b' }}>
          Peta tersedia pada Android/iOS
        </AppText>
      </View>
    );
  if (permDenied)
    return (
      <View className="flex-1 items-center justify-center px-6">
        <AppText variant="body" className="text-center" style={{ color: '#64748b' }}>
          Keizinan lokasi diperlukan
        </AppText>
      </View>
    );

  return (
    <View className="flex-1">
      <AnimatedMapView
        style={{ flex: 1 }}
        region={region}
        showsUserLocation
        showsMyLocationButton={Platform.OS === 'android'}
        followsUserLocation
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
          const coord = normalizeMapCoord(point);
          if (!coord) return null;
          return (
            <Marker
              key={getMapMarkerKey(point, coord, idx)}
              coordinate={coord}
              pinColor="red"
              title={getMapMarkerTitle(point)}
            />
          );
        })}
      </AnimatedMapView>

      {locating && (
        <View className="absolute inset-0 items-center justify-center bg-white/60">
          <ActivityIndicator size="large" color="#1F7BFF" />
        </View>
      )}
    </View>
  );
}