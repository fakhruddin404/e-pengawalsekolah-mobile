import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';

type Coords = { latitude: number; longitude: number };

const DELTA = 0.012;
/** Approx. centre of Peninsular Malaysia — used until GPS fix. */
const FALLBACK_REGION = {
  latitude: 3.139,
  longitude: 101.6869,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

export default function MapsDashboard() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          if (mounted) {
            setPermDenied(true);
            setLocating(false);
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted) return;
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } finally {
        if (mounted) setLocating(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-100 px-6">
        <Text className="text-center text-base font-semibold text-slate-800">
          Peta tersedia pada Android dan iOS
        </Text>
      </View>
    );
  }

  if (permDenied) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-100 px-6">
        <Text className="text-center text-base font-semibold text-slate-800">
          Keizinan lokasi diperlukan untuk paparkan peta
        </Text>
      </View>
    );
  }

  const initialRegion = coords
    ? {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: DELTA,
        longitudeDelta: DELTA,
      }
    : FALLBACK_REGION;

  return (
    <View className="flex-1">
      <MapView
        key={coords ? 'centered' : 'fallback'}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={Platform.OS === 'android'}
      />
      {locating ? (
        <View
          className="absolute inset-0 items-center justify-center bg-white/60"
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#1F7BFF" />
        </View>
      ) : null}
    </View>
  );
}
