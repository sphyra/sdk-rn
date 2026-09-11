import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ServiceId } from "../../services/runService";

const SERVICE_BUTTONS: { id: ServiceId | "static"; label: string }[] = [
  { id: "matrix", label: "Matrix" },
  { id: "isochrone", label: "Isochrone" },
  { id: "mapMatch", label: "Map match" },
  { id: "optimize", label: "Optimize" },
  { id: "static", label: "Static image" },
];

interface ServicePanelProps {
  busy: boolean;
  lastLabel: string | null;
  onRun: (id: ServiceId | "static") => void;
}

export function ServicePanel({ busy, lastLabel, onRun }: ServicePanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Services</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {SERVICE_BUTTONS.map((btn) => (
          <Pressable
            key={btn.id}
            style={[styles.btn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={() => onRun(btn.id)}
          >
            <Text style={styles.btnText}>{btn.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {lastLabel ? <Text style={styles.result} numberOfLines={4}>{lastLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#fff", padding: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  title: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  row: { flexDirection: "row", gap: 6 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  result: { marginTop: 8, fontSize: 11, color: "#374151" },
});
