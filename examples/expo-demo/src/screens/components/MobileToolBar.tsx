import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MORE_TOOLS, PRIMARY_TOOLS, TOOL_LABELS, type ToolId } from "../tools";
import { theme } from "../theme";

const TOOL_ICONS: Record<ToolId, keyof typeof Ionicons.glyphMap> = {
  search: "search",
  directions: "navigate",
  inspect: "locate-outline",
  tilequery: "layers-outline",
  isochrone: "radio-button-on-outline",
  matrix: "grid-outline",
  mapMatch: "git-commit-outline",
  optimize: "shuffle-outline",
  static: "image-outline",
};

interface MobileToolBarProps {
  activeTool: ToolId | null;
  moreOpen: boolean;
  onToolPress: (tool: ToolId) => void;
  onMorePress: () => void;
}

export function MobileToolBar({ activeTool, moreOpen, onToolPress, onMorePress }: MobileToolBarProps) {
  const moreActive = moreOpen || (activeTool != null && MORE_TOOLS.includes(activeTool));

  return (
    <View style={styles.wrap}>
      {PRIMARY_TOOLS.map((tool) => {
        const active = activeTool === tool;
        return (
          <Pressable
            key={tool}
            style={styles.item}
            onPress={() => onToolPress(tool)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={TOOL_LABELS[tool]}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Ionicons name={TOOL_ICONS[tool]} size={22} color={active ? "#fff" : theme.textMuted} />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{TOOL_LABELS[tool]}</Text>
          </Pressable>
        );
      })}

      <Pressable
        style={styles.item}
        onPress={onMorePress}
        accessibilityRole="button"
        accessibilityState={{ selected: moreActive }}
        accessibilityLabel="More tools"
      >
        <View style={[styles.iconWrap, moreActive && styles.iconWrapActive]}>
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={moreActive ? "#fff" : theme.textMuted}
          />
        </View>
        <Text style={[styles.label, moreActive && styles.labelActive]}>More</Text>
      </Pressable>
    </View>
  );
}

interface MoreToolsSheetProps {
  visible: boolean;
  activeTool: ToolId | null;
  onSelect: (tool: ToolId) => void;
  onClose: () => void;
}

export function MoreToolsSheet({ visible, activeTool, onSelect, onClose }: MoreToolsSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close more tools" />
        <View style={styles.moreSheet}>
          <Text style={styles.moreTitle}>Services</Text>
          <ScrollView contentContainerStyle={styles.moreGrid}>
            {MORE_TOOLS.map((tool) => {
              const active = activeTool === tool;
              return (
                <Pressable
                  key={tool}
                  style={[styles.moreItem, active && styles.moreItemActive]}
                  onPress={() => onSelect(tool)}
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={TOOL_ICONS[tool]}
                    size={22}
                    color={active ? theme.primary : theme.text}
                  />
                  <Text style={[styles.moreLabel, active && styles.moreLabelActive]}>
                    {TOOL_LABELS[tool]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  item: {
    flex: 1,
    alignItems: "center",
    minWidth: 64,
    maxWidth: 80,
    gap: 4,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface2,
  },
  iconWrapActive: {
    backgroundColor: theme.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.textMuted,
    textAlign: "center",
  },
  labelActive: {
    color: theme.primary,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  moreSheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: "42%",
  },
  moreTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 12,
  },
  moreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  moreItem: {
    width: "30%",
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
  },
  moreItemActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  moreLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.text,
    textAlign: "center",
  },
  moreLabelActive: {
    color: theme.primary,
  },
});
