import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  getMapMarkerTitle,
  normalizeMapCoord,
  setRegionToCoords,
  toCoordsFromLocation,
  type MapCoords,
  type MapEdgePadding,
} from '../../services';

const AnimatedMapView = MapView.Animated;
const isIOS = Platform.OS === 'ios';

interface MapsDashboardProps {
  isRondaanActive: boolean;
  titikSemak: any[];
  userRoute: MapCoords[];
  setUserRoute: React.Dispatch<React.SetStateAction<MapCoords[]>>;
  /** Total checkpoint count at start of patrol (for HUD) */
  totalTitik?: number;
  /** Patrol start time (Unix seconds) — for HUD elapsed timer */
  startTime?: number | null;
}

// ─── HUD: Elapsed timer ───────────────────────────────────────────────────────
function useElapsedTime(startTime: number | null | undefined, active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active || !startTime) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor(Date.now() / 1000) - startTime);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startTime]);
  return elapsed;
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Custom checkpoint marker ─────────────────────────────────────────────────
function CheckpointMarker({ label, verified }: { label: string; verified: boolean }) {
  return (
    <View style={styles.markerContainer}>
      <View style={[styles.markerBubble, verified ? styles.markerVerified : styles.markerPending]}>
        <Text style={styles.markerText} numberOfLines={1}>{label}</Text>
      </View>
      <View style={[styles.markerTail, verified ? styles.markerTailVerified : styles.markerTailPending]} />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapsDashboard({
  isRondaanActive,
  titikSemak = [],
  userRoute = [],
  setUserRoute,
  totalTitik = 0,
  startTime = null,
}: MapsDashboardProps) {
  const insets = useSafeAreaInsets();
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

  // Enhancement state
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [isOffCenter, setIsOffCenter] = useState(false);

  const isRondaanActiveRef = useRef(isRondaanActive);
  const coordsRef = useRef<MapCoords | null>(null);
  const titikSemakRef = useRef(titikSemak);
  const mapEdgePaddingRef = useRef<MapEdgePadding>(mapEdgePadding);
  const lastCenteredCoordsRef = useRef<MapCoords | null>(null);

  isRondaanActiveRef.current = isRondaanActive;
  coordsRef.current = coords;
  titikSemakRef.current = titikSemak;
  mapEdgePaddingRef.current = mapEdgePadding;

  // HUD data
  const elapsed = useElapsedTime(startTime, isRondaanActive);
  const verifiedCount = totalTitik - titikSemak.length;

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
      lastCenteredCoordsRef.current = user;
      setIsOffCenter(false);
      if (patrolActive) {
        fitPatrolView(user, points);
        return;
      }
      if (mapRef.current) {
        const centered = getUserCenteredRegion(user);
        mapRef.current.animateToRegion(centered, 500);
      }
    },
    [fitPatrolView]
  );

  const handleRecenter = useCallback(() => {
    const user = coordsRef.current;
    if (!user) return;
    recenterCamera(user, isRondaanActiveRef.current, titikSemakRef.current);
  }, [recenterCamera]);

  const handleRegionChange = useCallback(() => {
    if (lastCenteredCoordsRef.current) setIsOffCenter(true);
  }, []);

  const handleRegionChangeComplete = useCallback((r: any) => {
    const centered = lastCenteredCoordsRef.current;
    if (!centered) return;
    const diff = Math.abs(r.latitude - centered.latitude) + Math.abs(r.longitude - centered.longitude);
    if (diff < 0.001) setIsOffCenter(false);
  }, []);

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
        lastCenteredCoordsRef.current = firstPoint;

        // Force center map on initial load based on state
        setTimeout(() => {
          if (isRondaanActiveRef.current) {
            fitPatrolView(firstPoint, titikSemakRef.current, false);
          } else {
            if (mapRef.current) {
              mapRef.current.animateToRegion(getUserCenteredRegion(firstPoint), 0);
            }
          }
        }, 150);

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
  }, [setUserRoute, fitPatrolView]);

  // Handle camera changes ONLY when rondaan state or checkpoint count changes (not every movement)
  useEffect(() => {
    const user = coordsRef.current;
    if (!user) return;
    
    const timeoutId = setTimeout(() => {
      recenterCamera(user, isRondaanActive, titikSemak);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [isRondaanActive, titikSemak.length, recenterCamera, titikSemak]);

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
        mapType={mapType}
        mapPadding={mapViewPadding}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={false}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        {...(isIOS && iosLegalLabelInsets
          ? { legalLabelInsets: iosLegalLabelInsets }
          : {})}
        {...(Platform.OS === 'android' ? { toolbarEnabled: false } : {})}
      >
        {/* ── Patrol path: white outline + blue line (Strava-like) ── */}
        {userRoute.length > 0 && (
          <>
            <Polyline
              coordinates={userRoute}
              strokeWidth={10}
              strokeColor="rgba(255,255,255,0.85)"
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

        {/* ── Checkpoint markers — orange = pending ── */}
        {titikSemak.map((point: any, idx: number) => {
          const coord = normalizeMapCoord(point);
          if (!coord) return null;
          return (
            <Marker
              key={getMapMarkerKey(point, coord, idx)}
              coordinate={coord}
              anchor={{ x: 0.5, y: 1 }}
              title={getMapMarkerTitle(point)}
              tracksViewChanges={false}
            >
              <CheckpointMarker label={getMapMarkerTitle(point)} verified={false} />
            </Marker>
          );
        })}
      </AnimatedMapView>

      {/* ── HUD: Rondaan stats overlay ── */}
      {isRondaanActive && (
        <View
          style={[styles.hud, { top: insets.top + (isIOS ? 4 : 16) }]}
          pointerEvents="none"
        >
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>⏱ MASA</Text>
            <Text style={styles.hudValue}>{formatElapsed(elapsed)}</Text>
          </View>
          <View style={styles.hudDivider} />
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>📍 TITIK SEMAK</Text>
            <Text style={styles.hudValue}>{verifiedCount}/{totalTitik}</Text>
          </View>
        </View>
      )}

      {/* ── Map type switcher (Standard / Satelit) ── */}
      <Pressable
        onPress={() => setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'))}
        style={[styles.mapTypeBtn, { top: insets.top + (isRondaanActive ? 110 : 16) }]}
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
          style={[styles.recenterBtn, { top: insets.top + (isRondaanActive ? 110 : 16) + 52 }]}
          accessibilityLabel="Kembali ke lokasi saya"
        >
          <Crosshair size={20} color="#1F7BFF" />
        </Pressable>
      )}

      {/* ── Loading overlay ── */}
      {locating && (
        <View className="absolute inset-0 items-center justify-center bg-white/60">
          <ActivityIndicator size="large" color="#1F7BFF" />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  markerContainer: { alignItems: 'center' },
  markerBubble: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  markerVerified: { backgroundColor: '#16a34a' },
  markerPending:  { backgroundColor: '#ea580c' },
  markerText: { color: '#ffffff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  markerTailVerified: { borderTopColor: '#16a34a' },
  markerTailPending:  { borderTopColor: '#ea580c' },

  hud: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignSelf: 'center',
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
    right: 14,  // sebelah kanan, bawah butang Satelit
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
