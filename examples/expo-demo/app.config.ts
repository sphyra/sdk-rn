import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Sphyra Expo Demo",
  slug: "sphyra-expo-demo",
  scheme: "sphyra-expo-demo",
  version: "1.0.0",
  orientation: "default",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "com.sphyra.expodemo",
    supportsTablet: true,
  },
  android: {
    package: "com.sphyra.expodemo",
  },
  plugins: [
    "@maplibre/maplibre-react-native",
    "./plugins/withXcode26FmtFix.js",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow Sphyra Demo to use your location to center the map on your position.",
      },
    ],
  ],
});
