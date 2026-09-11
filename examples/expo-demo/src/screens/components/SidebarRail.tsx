import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleMode, StylePreset } from "@sphyra/react-native";
import { STYLE_PRESETS } from "@sphyra/react-native";
import { theme } from "../theme";

export type ToolId =
  | "search"
  | "directions"
  | "inspect"
  | "tilequery"
  | "isochrone"
  | "matrix"
  | "mapMatch"
  | "optimize"
  | "static";

const PRESET_ICONS: Record<StylePreset, keyof typeof Ionicons.glyphMap> = {
  dawn: "sunny-outline",
  day: "sunny",
  dusk: "partly-sunny-outline",
  night: "moon-outline",
};

const TOOLS: { id: ToolId; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { id: "search", icon: "search", label: "Search" },
  { id: "directions", icon: "navigate", label: "Directions" },
  { id: "inspect", icon: "locate-outline", label: "Inspect" },
  { id: "tilequery", icon: "time-outline", label: "Tile query" },
  { id: "isochrone", icon: "radio-button-on-outline", label: "Isochrone" },
  { id: "matrix", icon: "grid-outline", label: "Matrix" },
  { id: "mapMatch", icon: "git-commit-outline", label: "Map match" },
  { id: "optimize", icon: "shuffle-outline", label: "Optimize" },
  { id: "static", icon: "image-outline", label: "Static" },
];

interface SidebarRailProps {
  preset: StylePreset;
  mode: StyleMode;
  activeTool: ToolId | null;
  healthOk: boolean | null;
  onPresetChange: (preset: StylePreset) => void;
  onModeToggle: () => void;
  onToolPress: (tool: ToolId) => void;
}

export function SidebarRail({
  preset,
  mode,
  activeTool,
  healthOk,
  onPresetChange,
  onModeToggle,
  onToolPress,
}: SidebarRailProps) {
  return (
    <View style={styles.rail}>
      <View style={styles.brand}>
        <Text style={styles.brandText}>S</Text>
      </View>

      <View style={styles.presets}>
        {STYLE_PRESETS.map((p) => {
          const active = preset === p;
          const color = theme.presetColors[p];
          return (
            <Pressable
              key={p}
              style={[styles.presetChip, active && { borderColor: color, backgroundColor: `${color}26` }]}
              onPress={() => onPresetChange(p)}
              accessibilityLabel={p}
            >
              <Ionicons name={PRESET_ICONS[p]} size={16} color={color} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tools}>
        {TOOLS.map((tool, index) => (
          <View key={tool.id}>
            {index === 4 ? <View style={styles.divider} /> : null}
            <Pressable
              style={[styles.toolBtn, activeTool === tool.id && styles.toolBtnActive]}
              onPress={() => onToolPress(tool.id)}
              accessibilityLabel={tool.label}
            >
              <Ionicons
                name={tool.icon}
                size={18}
                color={activeTool === tool.id ? "#fff" : "#94a3b8"}
              />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.modeBtn} onPress={onModeToggle} accessibilityLabel="Toggle 2D/3D">
          <Text style={styles.modeLabel}>{mode === "3d" ? "3D" : "2D"}</Text>
        </Pressable>
        <View
          style={[
            styles.healthDot,
            healthOk === true && styles.healthOk,
            healthOk === false && styles.healthBad,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: theme.railW,
    alignSelf: "stretch",
    backgroundColor: theme.railBg,
    zIndex: 20,
    elevation: 20,
  },
  brand: {
    height: theme.railW,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  brandText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  presets: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  presetChip: {
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  tools: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    gap: 2,
  },
  divider: {
    width: 28,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 6,
  },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnActive: {
    backgroundColor: theme.railActive,
  },
  footer: {
    paddingVertical: 8,
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  modeBtn: {
    minWidth: 36,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  modeLabel: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#64748b",
  },
  healthOk: { backgroundColor: "#22c55e" },
  healthBad: { backgroundColor: "#ef4444" },
});
