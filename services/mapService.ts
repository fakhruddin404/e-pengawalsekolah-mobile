import * as Location from 'expo-location';
import { Platform } from 'react-native';
import type MapView from 'react-native-maps';
import { AnimatedRegion, type Region } from 'react-native-maps';

export type MapCoords = { latitude: number; longitude: number };

export const MAP_REGION_DELTA = 0.005;
export const MAP_USER_ZOOM_DELTA = 0.0025;   // ~280m radius — zoom lebih dekat (Strava-like)
export const MAP_CENTER_LAT_OFFSET_RATIO = 0.22;
export const MAP_RECENTER_INTERVAL_MS = 120_000;

export const MAP_FALLBACK_REGION = {
  latitude: 3.139,
  longitude: 101.6869,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

export type MapEdgePadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/** Camera/fit insets: header, tab bar, FAB column — used by fitToCoordinates only. */
export function getMapEdgePaddingBase(): MapEdgePadding {
  if (Platform.OS === 'ios') {
    return { top: 92, bottom: 92, left: 24, right: 128 };
  }
  return { top: 118, bottom: 108, left: 32, right: 132 };
}

export function getMapEdgePadding(insets?: {
  top?: number;
  bottom?: number;
}): MapEdgePadding {
  const base = getMapEdgePaddingBase();
  return {
    top: base.top + (insets?.top ?? 0),
    bottom: base.bottom + (insets?.bottom ?? 0),
    left: base.left,
    right: base.right,
  };
}

/** MapView padding: minimal left/bottom so legal label sits at frame corner. */
export function getMapViewPaddingBase(): MapEdgePadding {
  if (Platform.OS === 'ios') {
    return { top: 92, bottom: 6, left: 6, right: 128 };
  }
  return { top: 118, bottom: 6, left: 6, right: 132 };
}

export function getMapViewPadding(insets?: {
  top?: number;
  bottom?: number;
}): MapEdgePadding {
  const base = getMapViewPaddingBase();
  const safeBottom = insets?.bottom ?? 0;
  return {
    top: base.top + (insets?.top ?? 0),
    bottom: Math.max(base.bottom, Math.round(safeBottom * 0.25)),
    left: base.left,
    right: base.right,
  };
}

/** iOS Apple Maps — anchor legal label at bottom-left of map frame. */
export function getIosLegalLabelInsets(safeBottom = 0) {
  return {
    top: 0,
    left: 4,
    right: 0,
    bottom: Math.max(4, Math.round(safeBottom * 0.2)),
  };
}

export function getUserCenteredRegion(
  coords: MapCoords,
  delta: number = MAP_USER_ZOOM_DELTA
): Region {
  return {
    latitude: coords.latitude + delta * MAP_CENTER_LAT_OFFSET_RATIO,
    longitude: coords.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export function createAnimatedMapRegion() {
  return new AnimatedRegion({
    ...MAP_FALLBACK_REGION,
  });
}

export function animateRegionTo(
  region: AnimatedRegion,
  next: MapCoords,
  duration = 300,
  delta: number = MAP_USER_ZOOM_DELTA
) {
  const centered = getUserCenteredRegion(next, delta);
  (region as any)
    .timing({
      ...centered,
      duration,
      useNativeDriver: false,
    })
    .start();
}

/**
 * Gerakkan kamera peta terus melalui native API (mapRef.animateToRegion).
 * Lebih reliable berbanding AnimatedRegion.timing() untuk user-triggered recenter
 * pada iOS — Apple Maps akan selalu terima arahan ini walaupun user telah pan.
 */
export function animateMapTo(
  mapRef: MapView | null,
  next: MapCoords,
  duration = 400,
  delta: number = MAP_USER_ZOOM_DELTA
) {
  if (!mapRef) return;
  const centered = getUserCenteredRegion(next, delta);
  mapRef.animateToRegion(centered, duration);
}

export function setRegionToCoords(
  region: AnimatedRegion,
  coords: MapCoords,
  delta: number = MAP_USER_ZOOM_DELTA
) {
  region.setValue(getUserCenteredRegion(coords, delta));
}

export function getCoordsForFit(user: MapCoords | null, titikSemak: any[]): MapCoords[] {
  const coords: MapCoords[] = [];
  if (user) coords.push(user);

  for (const point of titikSemak) {
    const coord = normalizeMapCoord(point);
    if (coord) coords.push(coord);
  }

  return coords;
}

export function fitMapToCoords(
  mapRef: MapView | null,
  coordinates: MapCoords[],
  animated = true,
  edgePadding: MapEdgePadding = getMapEdgePadding()
) {
  if (!mapRef || coordinates.length === 0) return;

  mapRef.fitToCoordinates(coordinates, {
    edgePadding,
    animated,
  });
}

export function getHighRefreshWatchOptions(): Location.LocationOptions {
  return {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 1,
    timeInterval: 1000,
  };
}

export function toCoordsFromLocation(location: Location.LocationObject): MapCoords {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export function normalizeMapCoord(point: any): MapCoords | null {
  const latRaw = point?.latitude ?? point?.latitud ?? point?.fld_loc_latitud ?? point?.lat;
  const lngRaw =
    point?.longitude ?? point?.longitud ?? point?.fld_loc_longitud ?? point?.long;
  const latitude = typeof latRaw === 'number' ? latRaw : Number(latRaw);
  const longitude = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export function getMapMarkerKey(point: any, coord: MapCoords, fallbackIndex: number): string {
  const coordKey = `${coord.latitude},${coord.longitude}`;
  const rawKey =
    point?.id ??
    point?.fld_loc_id ??
    point?.qr ??
    (coordKey !== 'undefined,undefined' ? coordKey : fallbackIndex);
  return String(rawKey);
}

export function getMapMarkerTitle(point: any) {
  return point?.name ?? point?.fld_loc_nama ?? 'Titik Semak';
}
