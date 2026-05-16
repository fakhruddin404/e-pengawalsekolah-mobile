// Merges app.json and injects Android Google Maps API key for native builds (expo prebuild / EAS).
// Set EXPO_PUBLIC_GOOGLE_MAPS_ANDROID or GOOGLE_MAPS_ANDROID_API_KEY in .env — see .env.example.
const appJson = require('./app.json');

const androidApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID ||
  process.env.GOOGLE_MAPS_ANDROID_API_KEY ||
  '';

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: Array.from(
      new Set([...(appJson.expo.plugins ?? []), 'expo-camera'])
    ),
    android: {
      ...appJson.expo.android,
      permissions: Array.from(
        new Set([...(appJson.expo.android?.permissions ?? []), 'CAMERA'])
      ),
      config: {
        ...appJson.expo.android?.config,
        googleMaps: {
          apiKey: androidApiKey,
        },
      },
    },
    updates: {
      url: "https://u.expo.dev/a1c497e7-2e15-44fd-ba6f-1bf4e7f5f876"
    },
    runtimeVersion: {
      policy: "sdkVersion"
    }
  }
};
