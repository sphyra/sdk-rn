import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleMode, StylePreset } from "@sphyra/react-native";
import { STYLE_MODES, STYLE_PRESETS } from "@sphyra/react-native";

interface PresetBarProps {
  preset: StylePreset;
  mode: StyleMode;
  onPresetChange: (preset: StylePreset) => void;
  onModeChange: (mode: StyleMode) => void;
}

export function PresetBar({ preset, mode, onPresetChange, onModeChange }: PresetBarProps) {
  return (
    <View style={styles.row}>
      <View style={styles.group}>
        {STYLE_PRESETS.map((p) => (
          <Pressable
            key={p}
            style={[styles.chip, preset === p && styles.chipActive]}
            onPress={() => onPresetChange(p)}
          >
            <Text style={styles.chipText}>{p}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.group}>
        {STYLE_MODES.map((m) => (
          <Pressable
            key={m}
            style={[styles.chip, mode === m && styles.chipActive]}
            onPress={() => onModeChange(m)}
          >
            <Text style={styles.chipText}>{m.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 8, backgroundColor: "#fff" },
  group: { flexDirection: "row", gap: 4 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#2563eb" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#111827", textTransform: "capitalize" },
});
