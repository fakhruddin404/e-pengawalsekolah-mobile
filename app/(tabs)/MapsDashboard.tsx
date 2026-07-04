import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crosshair, Layers } from 'lucide-react-native';

import { AppText } from '../../components/AppText';
import {
  animateRegionTo,
  createAnimatedMapRegion,
  fitMapToCoords,
  getCoordsForFit,
  getHighRefreshWatchOptions,
  getIosLegalLabelInsets,
  getMapEdgePadding,
  getMapViewPadding,
  getMapMarkerKey,
  normalizeMapCoord,
  setRegionToCoords,
  toCoordsFromLocation,
  type MapCoords,
  type MapEdgePadding,
} from '../../services';

const AnimatedMapView = MapView.Animated;
const isIOS = Platform.OS === 'ios';

const formatElapsed = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};


interface MapsDashboardProps {
  isRondaanActive: boolean;
  titikSemak: any[];
  userRoute: MapCoords[];
  setUserRoute: React.Dispatch<React.SetStateAction<MapCoords[]>>;
  totalTitik?: number;
  startTime?: number | null;
}

export default function MapsDashboard({
  isRondaanActive,
  titikSemak = [],
  userRoute = [],
  setUserRoute,
  totalTitik = 0,
  startTime = null,
}: MapsDashboardProps) {
  const insets = useSafeAreaInsets();
  const baseTopPadding = isIOS ? 4 : 16;
  const mapViewPadding = useMemo(
    () => getMapViewPadding({ top: insets.top, bottom: insets.bottom }),
    [insets.top, insets.bottom]
  );
  const mapEdgePadding = useMemo(
    () => getMapEdgePadding({ top: insets.top, bottom: insets.bottom }),
    [insets.top, insets.bottom]
  );
  const iosLegalLabelInsets = useMemo(
    () => (isIOS ? getIosLegalLabelInsets(insets.bottom) : undefined),
    [insets.bottom]
  );

  const region = useRef(createAnimatedMapRegion()).current;
  const mapRef = useRef<MapView | null>(null);
  const [coords, setCoords] = useState<MapCoords | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [locating, setLocating] = useState(true);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [isOffCenter, setIsOffCenter] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const verifiedCount = totalTitik - titikSemak.length;

  const isRondaanActiveRef = useRef(isRondaanActive);
  const coordsRef = useRef<MapCoords | null>(null);
  const titikSemakRef = useRef(titikSemak);
  const mapEdgePaddingRef = useRef<MapEdgePadding>(mapEdgePadding);

  isRondaanActiveRef.current = isRondaanActive;
  coordsRef.current = coords;
  titikSemakRef.current = titikSemak;
  mapEdgePaddingRef.current = mapEdgePadding;

  const fitPatrolView = useCallback(
    (user: MapCoords, points: any[], animated = true) => {
      const fitCoords = getCoordsForFit(user, points);
      if (fitCoords.length > 1) {
        fitMapToCoords(mapRef.current, fitCoords, animated, mapEdgePaddingRef.current);
        return;
      }
      animateRegionTo(region, user, animated ? 500 : 0);
    },
    [region]
  );

  const recenterCamera = useCallback(
    (user: MapCoords, patrolActive: boolean, points: any[]) => {
      if (patrolActive) {
        fitPatrolView(user, points);
        return;
      }
      animateRegionTo(region, user, 500);
    },
    [fitPatrolView, region]
  );

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

        if (!isRondaanActiveRef.current) {
          setRegionToCoords(region, firstPoint);
        }

        subscription = await Location.watchPositionAsync(
          getHighRefreshWatchOptions(),
          (location) => {
            const nextPoint = toCoordsFromLocation(location);
            setCoords(nextPoint);

            if (isRondaanActiveRef.current) {
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
  }, [region, setUserRoute]);

  useEffect(() => {
    if (!startTime || !isRondaanActive) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setElapsed(now - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isRondaanActive]);

  const handlePanDrag = () => {
    setIsOffCenter(true);
  };

  const handleRecenter = () => {
    setIsOffCenter(false);
    if (coordsRef.current) {
      recenterCamera(coordsRef.current, isRondaanActiveRef.current, titikSemakRef.current);
    }
  };

  useEffect(() => {
    if (!isRondaanActive || !coords) return;

    const timeoutId = setTimeout(() => {
      fitPatrolView(coords, titikSemak);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [isRondaanActive, titikSemak.length, coords, fitPatrolView, titikSemak]);

  useEffect(() => {
    if (isRondaanActive || !coords) return;
    animateRegionTo(region, coords, 500);
  }, [isRondaanActive, coords, region]);

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
    <View style={StyleSheet.absoluteFillObject}>
      <AnimatedMapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        region={region}
        mapPadding={mapViewPadding}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={false}
        mapType={mapType}
        onPanDrag={handlePanDrag}
        {...(isIOS && iosLegalLabelInsets
          ? { legalLabelInsets: iosLegalLabelInsets }
          : {})}
        {...(Platform.OS === 'android' ? { toolbarEnabled: false } : {})}
      >
        {userRoute.length > 0 && (
          <>
            <Polyline
              coordinates={userRoute}
              strokeWidth={10}
              strokeColor="#ffffff"
              geodesic={true}
              lineJoin="round"
              lineCap="round"
            />
            <Polyline
              coordinates={userRoute}
              strokeWidth={6}
              strokeColor="#1F7BFF"
              geodesic={true}
              lineJoin="round"
              lineCap="round"
            />
          </>
        )}

        {titikSemak.map((point: any, idx: number) => {
          const coord = normalizeMapCoord(point);
          if (!coord) return null;
          // verified true jika tiada dalam titikSemak (telah dibuang), tapi titikSemak ini adalah yg belum verified.
          // Tapi point boleh disemak melalui field status jika di back-end ada flag, 
          // Ataupun titikSemak list ni hanya yg belum verified. Saya akan jadikan merah (pending).
          return (
            <Marker
              key={getMapMarkerKey(point, coord, idx)}
              coordinate={coord}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={[styles.dotMarker, { backgroundColor: '#ea580c' }]} />
            </Marker>
          );
        })}
      </AnimatedMapView>

      {/* ── HUD: Rondaan stats overlay ── */}
      {isRondaanActive && (
        <View style={[styles.hud, { top: insets.top + baseTopPadding }]} pointerEvents="none">
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>&#x23F1; MASA</Text>
            <Text style={styles.hudValue}>{formatElapsed(elapsed)}</Text>
          </View>
          <View style={styles.hudDivider} />
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>&#x1F4CD; TITIK SEMAK</Text>
            <Text style={styles.hudValue}>{verifiedCount}/{totalTitik}</Text>
          </View>
        </View>
      )}

      {/* ── Map type switcher (Standard / Satelit) ── */}
      <Pressable
        onPress={() => setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'))}
        style={[styles.mapTypeBtn, { top: insets.top + (isRondaanActive ? baseTopPadding + 70 : baseTopPadding) }]}
        android_ripple={{ color: 'rgba(0,0,0,0.1)', radius: 30, borderless: false }}
        accessibilityLabel="Tukar jenis peta"
      >
        <Layers size={16} color="#1e293b" />
        <Text style={styles.mapTypeBtnText}>
          {mapType === 'standard' ? 'Satelit' : 'Biasa'}
        </Text>
      </Pressable>

      {/* ── Recenter FAB — only shows when user has panned away ── */}
      {isOffCenter && (
        <Pressable
          onPress={handleRecenter}
          style={[styles.recenterBtn, { top: insets.top + (isRondaanActive ? baseTopPadding + 70 : baseTopPadding) + 48 }]}
          android_ripple={{ color: 'rgba(31,123,255,0.15)', radius: 22, borderless: true }}
          accessibilityLabel="Kembali ke lokasi saya"
        >
          <Crosshair size={20} color="#1F7BFF" />
        </Pressable>
      )}

      {locating && (
        <View className="absolute inset-0 items-center justify-center bg-white/60">
          <ActivityIndicator size="large" color="#1F7BFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dotMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    // elevation for Android shadow; shadow* props only work on iOS
    elevation: 4,
  },
  hud: {
    position: 'absolute',
    left: 16,
    right: 16,
    // Do NOT use alignSelf on an absolute View — left+right alone centres it
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  hudItem:    { alignItems: 'center', flex: 1 },
  hudLabel:   { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  hudValue:   { color: '#ffffff', fontSize: 18, fontWeight: '800', marginTop: 2, letterSpacing: 1 },
  hudDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },

  mapTypeBtn: {
    position: 'absolute',
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mapTypeBtnText: { color: '#1e293b', fontSize: 12, fontWeight: '700' },

  recenterBtn: {
    position: 'absolute',
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
  },
});
