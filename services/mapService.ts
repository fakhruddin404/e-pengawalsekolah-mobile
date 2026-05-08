import * as Location from 'expo-location';
import { AnimatedRegion } from 'react-native-maps';

export type MapCoords = { latitude: number; longitude: number };

export const MAP_REGION_DELTA = 0.012;
export const MAP_FALLBACK_REGION = {
  latitude: 3.139,
  longitude: 101.6869,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

export function createAnimatedMapRegion() {
  return new AnimatedRegion({
    ...MAP_FALLBACK_REGION,
  });
}

export function animateRegionTo(
  region: AnimatedRegion,
  next: MapCoords,
  duration = 300
) {
  (region as any)
    .timing({
      latitude: next.latitude,
      longitude: next.longitude,
      latitudeDelta: MAP_REGION_DELTA,
      longitudeDelta: MAP_REGION_DELTA,
      duration,
      useNativeDriver: false,
    })
    .start();
}

export function setRegionToCoords(region: AnimatedRegion, coords: MapCoords) {
  region.setValue({
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: MAP_REGION_DELTA,
    longitudeDelta: MAP_REGION_DELTA,
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
