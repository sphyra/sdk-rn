import { StyleSheet, Text, View } from "react-native";
import type { ScaleBar } from "@sphyra/react-native";

interface ScaleBarViewProps {
  scale: ScaleBar | null;
  insetBottom?: number;
}

export function ScaleBarView({ scale, insetBottom = 12 }: ScaleBarViewProps) {
  if (!scale) return null;
  return (
    <View style={[styles.wrap, { bottom: insetBottom }]} pointerEvents="none">
      <View style={[styles.bar, { width: scale.width }]} />
      <Text style={styles.label}>{scale.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bar: { height: 3, backgroundColor: "#111827", marginBottom: 4 },
  label: { fontSize: 11, color: "#111827", fontWeight: "600" },
});
