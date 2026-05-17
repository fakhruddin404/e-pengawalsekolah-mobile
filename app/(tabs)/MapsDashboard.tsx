import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  MAP_RECENTER_INTERVAL_MS,
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
}

export default function MapsDashboard({
  isRondaanActive,
  titikSemak = [],
  userRoute = [],
  setUserRoute,
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
    if (!coords) return;

    recenterCamera(coords, isRondaanActive, titikSemak);

    const intervalId = setInterval(() => {
      const user = coordsRef.current;
      if (!user) return;
      recenterCamera(user, isRondaanActiveRef.current, titikSemakRef.current);
    }, MAP_RECENTER_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [coords, isRondaanActive, titikSemak.length, recenterCamera, titikSemak]);

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
        {...(isIOS && iosLegalLabelInsets
          ? { legalLabelInsets: iosLegalLabelInsets }
          : {})}
        {...(Platform.OS === 'android' ? { toolbarEnabled: false } : {})}
      >
        {userRoute.length > 0 && (
          <Polyline
            coordinates={userRoute}
            strokeWidth={4}
            strokeColor="#1F7BFF"
            geodesic={true}
            lineJoin="round"
          />
        )}

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
