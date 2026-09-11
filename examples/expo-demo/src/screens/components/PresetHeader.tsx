import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { StyleMode, StylePreset } from "@sphyra/react-native";
import { STYLE_PRESETS } from "@sphyra/react-native";
import { theme } from "../theme";

const PRESET_ICONS: Record<StylePreset, keyof typeof Ionicons.glyphMap> = {
  dawn: "sunny-outline",
  day: "sunny",
  dusk: "partly-sunny-outline",
  night: "moon-outline",
};

interface PresetHeaderProps {
  preset: StylePreset;
  mode: StyleMode;
  healthOk: boolean | null;
  onPresetChange: (preset: StylePreset) => void;
  onModeToggle: () => void;
}

export function PresetHeader({
  preset,
  mode,
  healthOk,
  onPresetChange,
  onModeToggle,
}: PresetHeaderProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presets}
      >
        {STYLE_PRESETS.map((p) => {
          const active = preset === p;
          const color = theme.presetColors[p];
          return (
            <Pressable
              key={p}
              style={[styles.presetChip, active && { borderColor: color, backgroundColor: "#fff" }]}
              onPress={() => onPresetChange(p)}
              accessibilityLabel={`${p} preset`}
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={PRESET_ICONS[p]} size={20} color={color} />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={styles.modeBtn}
          onPress={onModeToggle}
          accessibilityLabel={`Switch to ${mode === "3d" ? "2D" : "3D"} view`}
        >
          <Text style={styles.modeLabel}>{mode === "3d" ? "3D" : "2D"}</Text>
        </Pressable>
        <View
          style={[
            styles.healthDot,
            healthOk === true && styles.healthOk,
            healthOk === false && styles.healthBad,
          ]}
          accessibilityLabel={
            healthOk === true ? "API healthy" : healthOk === false ? "API offline" : "Checking API"
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  presets: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
  },
  presetChip: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: theme.surface2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  modeBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: theme.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.primary,
  },
  healthDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#94a3b8",
  },
  healthOk: { backgroundColor: "#22c55e" },
  healthBad: { backgroundColor: "#ef4444" },
});
