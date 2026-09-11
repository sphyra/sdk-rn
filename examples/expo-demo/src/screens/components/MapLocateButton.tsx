import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet } from "react-native";
import { theme } from "../theme";

interface MapLocateButtonProps {
  bottom?: number;
  onLocated: (center: [number, number]) => void;
}

export function MapLocateButton({ bottom = 16, onLocated }: MapLocateButtonProps) {
  const [busy, setBusy] = useState(false);

  const handlePress = async () => {
    if (busy) return;
    setBusy(true);
    let moved = false;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          "Location access",
          "Allow location access to center the map on your position.",
        );
        return;
      }

      if (Platform.OS === "android") {
        await Location.enableNetworkProviderAsync().catch(() => undefined);
      }

      const cached = await Location.getLastKnownPositionAsync({ maxAge: 300_000 });
      if (cached) {
        moved = true;
        onLocated([cached.coords.longitude, cached.coords.latitude]);
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Lowest,
      });
      onLocated([position.coords.longitude, position.coords.latitude]);
    } catch {
      if (!moved) {
        Alert.alert("Location unavailable", "Could not read your current position. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      style={[styles.btn, { bottom }, busy && styles.btnBusy]}
      onPress={handlePress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Go to my location"
      accessibilityState={{ busy }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <Ionicons name="locate" size={22} color={theme.primary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: "absolute",
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  btnBusy: { opacity: 0.85 },
});
