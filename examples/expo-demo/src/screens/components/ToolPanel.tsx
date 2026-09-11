import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { TOOL_LABELS, type ToolId } from "../tools";
import { theme } from "../theme";
import type { ServiceId } from "../../services/runService";

const TITLES: Record<ToolId, string> = {
  search: TOOL_LABELS.search,
  directions: "Directions",
  inspect: TOOL_LABELS.inspect,
  tilequery: "Tile query",
  isochrone: TOOL_LABELS.isochrone,
  matrix: TOOL_LABELS.matrix,
  mapMatch: "Map match",
  optimize: TOOL_LABELS.optimize,
  static: "Static image",
};

const HINTS: Record<ToolId, string> = {
  search: "Search addresses and places across Armenia.",
  directions: "Tap the map to set start (A), then destination (B).",
  inspect: "Tap the map to reverse-geocode the point.",
  tilequery: "Tap the map to query vector features at that point.",
  isochrone: "Reachability from Republic Square (5 / 10 min).",
  matrix: "Travel-time matrix between Yerevan landmarks.",
  mapMatch: "Map-match a noisy GPS trace to roads.",
  optimize: "Reorder delivery stops for the shortest trip.",
  static: "Render a static PNG preview of the map view.",
};

const SERVICE_MAP: Partial<Record<ToolId, ServiceId | "static">> = {
  isochrone: "isochrone",
  matrix: "matrix",
  mapMatch: "mapMatch",
  optimize: "optimize",
  static: "static",
};

interface ToolPanelProps {
  visible: boolean;
  tool: ToolId | null;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  searchLoading: boolean;
  searchError: string | null;
  suggestions: { id: string; name: string }[];
  onSuggestionPress: (id: string) => void;
  inspectText: string;
  routeLabel: string | null;
  directionsHint: string | null;
  onClearDirections?: () => void;
  serviceBusy: boolean;
  serviceLabel: string | null;
  staticUri: string | null;
  onRunService: (id: ServiceId | "static") => void;
}

export function ToolPanel({
  visible,
  tool,
  onClose,
  searchQuery,
  onSearchQueryChange,
  searchLoading,
  searchError,
  suggestions,
  onSuggestionPress,
  inspectText,
  routeLabel,
  directionsHint,
  onClearDirections,
  serviceBusy,
  serviceLabel,
  staticUri,
  onRunService,
}: ToolPanelProps) {
  if (!visible || !tool) return null;
  const serviceId = SERVICE_MAP[tool];

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text style={styles.title}>{TITLES[tool]}</Text>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityLabel="Close panel"
        >
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Text style={styles.hint}>{HINTS[tool]}</Text>

        {tool === "search" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Search places…"
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={onSearchQueryChange}
              autoCorrect={false}
            />
            {searchLoading ? <ActivityIndicator size="small" color={theme.primary} /> : null}
            {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
            {suggestions.map((s) => (
              <Pressable key={s.id} style={styles.suggestRow} onPress={() => onSuggestionPress(s.id)}>
                <Text style={styles.suggestText}>{s.name}</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {tool === "directions" ? (
          <>
            {directionsHint ? <Text style={styles.result}>{directionsHint}</Text> : null}
            {routeLabel ? <Text style={styles.result}>{routeLabel}</Text> : null}
            {onClearDirections ? (
              <Pressable style={styles.secondaryBtn} onPress={onClearDirections}>
                <Text style={styles.secondaryBtnText}>Clear route</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {tool === "inspect" || tool === "tilequery" ? (
          <Text style={styles.result}>{inspectText}</Text>
        ) : null}

        {serviceId ? (
          <>
            <Pressable
              style={[styles.primaryBtn, serviceBusy && styles.primaryBtnDisabled]}
              disabled={serviceBusy}
              onPress={() => onRunService(serviceId)}
            >
              {serviceBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Run {TITLES[tool].toLowerCase()}</Text>
              )}
            </Pressable>
            {serviceLabel ? <Text style={styles.result}>{serviceLabel}</Text> : null}
            {tool === "static" && staticUri ? (
              <Image source={{ uri: staticUri }} style={styles.staticImage} />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: 260,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    fontSize: 16,
    color: theme.textMuted,
    padding: 4,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 16,
  },
  hint: {
    fontSize: 12,
    color: theme.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.surface2,
    marginBottom: 8,
  },
  suggestRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  suggestText: {
    fontSize: 13,
    color: theme.primary,
  },
  primaryBtn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryBtnText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
  },
  result: {
    fontSize: 12,
    color: theme.text,
    lineHeight: 18,
    marginTop: 8,
  },
  error: {
    fontSize: 12,
    color: "#b91c1c",
    marginTop: 6,
  },
  staticImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: theme.surface2,
  },
});
