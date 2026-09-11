import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CircleLayer,
  ShapeSource,
  SymbolLayer,
  SphyraDirectionsControl,
  SphyraError,
  SphyraGeolocateControl,
  SphyraMap,
  SphyraMarker,
  SphyraPopup,
  buildClusterConfig,
  computeScaleBar,
  mapNavigationProps,
  resolveClusterExpansion,
  useSearchBox,
  useSphyra,
  type ScaleBar,
  type ShapeSourceRef,
  type StyleMode,
  type StylePreset,
  type SphyraMapHandle,
} from "@sphyra/react-native";
import type { DemoConfig } from "../config";
import {
  DEFAULT_ZOOM,
  ISOCHRONE_ORIGIN,
  LANDMARKS,
  MAP_MATCH_TRACE,
  MATRIX_SOURCES,
  MATRIX_TARGETS,
  OPTIMIZE_STOPS,
  SAMPLE_POINTS,
  SEARCH_SAMPLE,
  STATIC_IMAGE_SAMPLE,
  YEREVAN_CENTER,
} from "../sample-data";
import { runService, type ServiceId } from "../services/runService";
import { fetchStaticImageDataUri } from "../services/staticImage";
import { PresetHeader } from "./components/PresetHeader";
import { MapLocateButton } from "./components/MapLocateButton";
import { MobileToolBar, MoreToolsSheet } from "./components/MobileToolBar";
import { ScaleBarView } from "./components/ScaleBarView";
import { ToolPanel } from "./components/ToolPanel";
import { type ToolId } from "./tools";
import { theme } from "./theme";

interface DemoScreenProps {
  config: DemoConfig;
}

function coordsFromFeature(feature: GeoJSON.Feature): [number, number] | null {
  if (feature.geometry?.type === "Point") {
    const c = feature.geometry.coordinates;
    return [c[0] ?? 0, c[1] ?? 0];
  }
  return null;
}

function summarizeService(id: string, data: unknown): string {
  if (id === "matrix" && data && typeof data === "object" && "durations" in data) {
    const d = (data as { durations: unknown[][] }).durations;
    return `Matrix ${d.length}×${d[0]?.length ?? 0}`;
  }
  if (id === "isochrone" && data && typeof data === "object" && "features" in data) {
    return `Isochrone ${(data as { features: unknown[] }).features.length} contour(s)`;
  }
  if (id === "mapMatch" && data && typeof data === "object" && "distance" in data) {
    return `Map match distance ${(data as { distance: number }).distance} m`;
  }
  if (id === "optimize" && data && typeof data === "object" && "trips" in data) {
    return `Optimize ${(data as { trips: unknown[] }).trips.length} trip(s)`;
  }
  if (id === "reverse" && data && typeof data === "object" && "displayName" in data) {
    return String((data as { displayName: string }).displayName);
  }
  if (id === "tilequery" && data && typeof data === "object" && "features" in data) {
    const feats = (data as { features: { properties?: Record<string, unknown> }[] }).features;
    return feats.length
      ? feats
          .slice(0, 3)
          .map((f) => String(f.properties?.name ?? f.properties?.layer ?? "feature"))
          .join(" · ")
      : "No features at tap";
  }
  if (id === "search" && data && typeof data === "object" && "suggestions" in data) {
    return (data as { suggestions: { name: string }[] }).suggestions.map((s) => s.name).join(", ");
  }
  return `${id} OK`;
}

export function DemoScreen({ config }: DemoScreenProps) {
  const client = useSphyra();
  const mapRef = useRef<SphyraMapHandle>(null);
  const clusterRef = useRef<ShapeSourceRef>(null);
  const clusterCfg = buildClusterConfig();

  const [preset, setPreset] = useState<StylePreset>("day");
  const [mode, setMode] = useState<StyleMode>("3d");
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [openPopup, setOpenPopup] = useState<string | null>(null);
  const [inspectText, setInspectText] = useState("Tap the map to inspect");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceBusy, setServiceBusy] = useState(false);
  const [serviceLabel, setServiceLabel] = useState<string | null>(null);
  const [routeLabel, setRouteLabel] = useState<string | null>(null);
  const [staticUri, setStaticUri] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [scale, setScale] = useState<ScaleBar | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleLoading, setStyleLoading] = useState(true);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [directionWaypoints, setDirectionWaypoints] = useState<[number, number][]>([]);

  const search = useSearchBox({ query: searchQuery, lang: "hy", enabled: mapLoaded, limit: 5 });
  const navProps = mapNavigationProps({ zoom: true, rotate: true, pitch: true, compass: true });

  useEffect(() => {
    client
      .healthCheck()
      .then(() => setHealthOk(true))
      .catch(() => setHealthOk(false));
  }, [client]);

  const handleRegionChange = useCallback((region: unknown) => {
    const props = (region as { properties?: { zoom?: number }; geometry?: { coordinates?: number[] } })
      ?.properties;
    const zoom = props?.zoom ?? DEFAULT_ZOOM;
    const lat =
      (region as { geometry?: { coordinates?: number[] } })?.geometry?.coordinates?.[1] ??
      YEREVAN_CENTER[1];
    setScale(computeScaleBar(zoom, lat));
  }, []);

  const flyTo = useCallback((center: [number, number], zoom = DEFAULT_ZOOM, animationDuration = 800) => {
    mapRef.current?.setCamera({ center, zoom, animationDuration });
  }, []);

  const handleLocate = useCallback(
    (center: [number, number]) => {
      setLocationEnabled(true);
      flyTo(center, 15, 400);
    },
    [flyTo],
  );

  const clearDirections = useCallback(() => {
    setDirectionWaypoints([]);
    setRouteLabel(null);
  }, []);

  const directionsHint =
    activeTool === "directions"
      ? directionWaypoints.length === 0
        ? "Tap the map to set your starting point (A)."
        : directionWaypoints.length === 1
          ? "Tap the map to set your destination (B)."
          : "Route shown. Tap again to move destination, or Clear to reset."
      : null;

  const handleMapPress = useCallback(
    async (feature: GeoJSON.Feature) => {
      const coords = coordsFromFeature(feature);
      if (!coords) return;

      if (activeTool === "directions") {
        setDirectionWaypoints((wps) => {
          if (wps.length < 2) return [...wps, coords];
          return [wps[0]!, coords];
        });
        if (directionWaypoints.length === 0) setRouteLabel(null);
        return;
      }

      if (activeTool !== "inspect" && activeTool !== "tilequery") return;
      try {
        if (activeTool === "inspect") {
          const result = await runService(client, "reverse", coords);
          setInspectText(summarizeService("reverse", result.data));
        } else {
          const result = await runService(client, "tilequery", {
            lon: coords[0],
            lat: coords[1],
            limit: 8,
          });
          setInspectText(summarizeService("tilequery", result.data));
        }
      } catch (err) {
        setInspectText(err instanceof SphyraError ? `[${err.code}] ${err.message}` : "Inspect failed");
      }
    },
    [client, activeTool, directionWaypoints.length],
  );

  const handleClusterPress = useCallback(
    async (event: { features?: GeoJSON.Feature[] }) => {
      const feature = event.features?.[0];
      const source = clusterRef.current;
      if (!feature || !source || feature.properties?.point_count == null) return;
      try {
        const target = await resolveClusterExpansion(source, feature);
        flyTo(target.center, target.zoom);
      } catch {
        // cluster expansion failed — ignore
      }
    },
    [flyTo],
  );

  const runServiceAction = useCallback(
    async (id: ServiceId | "static") => {
      setServiceBusy(true);
      setServiceLabel(null);
      try {
        if (id === "static") {
          const uri = await fetchStaticImageDataUri(config, STATIC_IMAGE_SAMPLE);
          setStaticUri(uri);
          setServiceLabel("Static image loaded");
          return;
        }
        const inputs: Record<ServiceId, unknown> = {
          directions: { waypoints: directionWaypoints, geometries: "geojson" },
          matrix: { sources: MATRIX_SOURCES.slice(0, 2), targets: MATRIX_TARGETS.slice(0, 2) },
          isochrone: { origin: ISOCHRONE_ORIGIN, contoursMinutes: [5, 10] },
          mapMatch: { coordinates: MAP_MATCH_TRACE, geometries: "geojson" },
          optimize: { waypoints: OPTIMIZE_STOPS, geometries: "geojson" },
          tilequery: { lon: 44.5136, lat: 40.1772, limit: 5 },
          search: SEARCH_SAMPLE,
          reverse: YEREVAN_CENTER,
        };
        const result = await runService(client, id, inputs[id]);
        setServiceLabel(summarizeService(id, result.data));
      } catch (err) {
        setServiceLabel(err instanceof SphyraError ? `[${err.code}] ${err.message}` : "Service failed");
      } finally {
        setServiceBusy(false);
      }
    },
    [client, config, directionWaypoints],
  );

  const handleRetrieve = useCallback(
    async (id: string) => {
      const feature = await search.retrieve(id);
      if (feature?.coordinates) {
        flyTo(feature.coordinates, 15);
        setSearchQuery(feature.name);
      }
    },
    [search, flyTo],
  );

  const handleToolPress = useCallback((tool: ToolId) => {
    setMoreOpen(false);
    setActiveTool((cur) => {
      if (cur === tool) {
        setPanelOpen(false);
        if (tool === "directions") {
          setDirectionWaypoints([]);
          setRouteLabel(null);
        }
        return null;
      }
      setPanelOpen(true);
      return tool;
    });
    if (tool === "inspect") setInspectText("Tap the map to inspect");
    if (tool === "tilequery") setInspectText("Tap the map to query features");
    if (tool === "directions") {
      setDirectionWaypoints([]);
      setRouteLabel(null);
    }
  }, []);

  const handleMoreSelect = useCallback((tool: ToolId) => {
    setMoreOpen(false);
    setActiveTool(tool);
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setActiveTool(null);
    clearDirections();
  }, [clearDirections]);

  const searchErrorText = search.error ? `[${search.error.code}] ${search.error.message}` : null;

  return (
    <SafeAreaView style={styles.root}>
      <PresetHeader
        preset={preset}
        mode={mode}
        healthOk={healthOk}
        onPresetChange={setPreset}
        onModeToggle={() => setMode((m) => (m === "3d" ? "2d" : "3d"))}
      />

      <View style={styles.mapStage}>
        <SphyraMap
            ref={mapRef}
            preset={preset}
            mode={mode}
            center={YEREVAN_CENTER}
            zoom={DEFAULT_ZOOM}
            style={styles.map}
            onLoad={() => {
              setMapLoaded(true);
              setStyleLoading(false);
            }}
            onError={(err) => {
              setMapError(`[${err.code}] ${err.message}`);
              setStyleLoading(false);
            }}
            onRegionChange={handleRegionChange}
            onPress={handleMapPress}
            {...navProps}
          >
            <ShapeSource
              id="poi-cluster"
              ref={clusterRef}
              shape={SAMPLE_POINTS}
              cluster
              clusterRadius={clusterCfg.source.clusterRadius}
              clusterMaxZoomLevel={clusterCfg.source.clusterMaxZoomLevel}
              onPress={handleClusterPress}
            >
              <CircleLayer
                id="cluster-circles"
                filter={["has", "point_count"]}
                style={clusterCfg.clusterCircleStyle}
              />
              <SymbolLayer
                id="cluster-count"
                filter={["has", "point_count"]}
                style={clusterCfg.clusterCountStyle}
              />
              <CircleLayer
                id="unclustered-points"
                filter={["!", ["has", "point_count"]]}
                style={clusterCfg.unclusteredCircleStyle}
              />
            </ShapeSource>

            {LANDMARKS.map((lm) => (
              <SphyraMarker
                key={lm.id}
                id={lm.id}
                coordinate={lm.coordinate}
                onPress={() => setOpenPopup((cur) => (cur === lm.id ? null : lm.id))}
              >
                <View style={styles.pin}>
                  <Ionicons name="location" size={22} color={theme.primary} />
                </View>
              </SphyraMarker>
            ))}

            {LANDMARKS.map((lm) => (
              <SphyraPopup key={`popup-${lm.id}`} coordinate={lm.coordinate} visible={openPopup === lm.id}>
                <View style={styles.popup}>
                  <Text style={styles.popupTitle}>{lm.title}</Text>
                  <Text style={styles.popupBody}>{lm.description}</Text>
                </View>
              </SphyraPopup>
            ))}

            {directionWaypoints.map((coord, index) => (
              <SphyraMarker key={`dir-${index}-${coord.join(",")}`} id={`dir-${index}`} coordinate={coord}>
                <View
                  style={[
                    styles.routePin,
                    { borderColor: index === 0 ? "#22c55e" : "#ef4444", backgroundColor: index === 0 ? "#dcfce7" : "#fee2e2" },
                  ]}
                >
                  <Text style={styles.routePinLabel}>{index === 0 ? "A" : "B"}</Text>
                </View>
              </SphyraMarker>
            ))}

            {directionWaypoints.length >= 2 ? (
              <SphyraDirectionsControl
                waypoints={directionWaypoints}
                onRoute={(result) => {
                  const route = result.routes[0];
                  if (route) {
                    setRouteLabel(
                      `${Math.round(route.distance ?? 0)} m · ${Math.round(route.duration ?? 0)} s · ${route.legs?.[0]?.steps?.length ?? 0} steps`,
                    );
                  }
                }}
                onError={(err) => setRouteLabel(`[${err.code}] ${err.message}`)}
              />
            ) : null}

            <SphyraGeolocateControl visible={locationEnabled} />
          </SphyraMap>

          <MapLocateButton bottom={16} onLocated={handleLocate} />

          {styleLoading ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>Loading map…</Text>
            </View>
          ) : null}

          {mapError ? (
            <Pressable style={styles.errorBanner} onPress={() => setMapError(null)}>
              <Text style={styles.errorText}>{mapError}</Text>
            </Pressable>
          ) : null}

          <ScaleBarView scale={scale} insetBottom={16} />
        </View>

      <ToolPanel
        visible={panelOpen}
        tool={activeTool}
        onClose={closePanel}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchLoading={search.loading}
        searchError={searchErrorText}
        suggestions={search.suggestions}
        onSuggestionPress={handleRetrieve}
        inspectText={inspectText}
        routeLabel={routeLabel}
        directionsHint={directionsHint}
        onClearDirections={activeTool === "directions" ? clearDirections : undefined}
        serviceBusy={serviceBusy}
        serviceLabel={serviceLabel}
        staticUri={staticUri}
        onRunService={runServiceAction}
      />

      <MobileToolBar
        activeTool={activeTool}
        moreOpen={moreOpen}
        onToolPress={handleToolPress}
        onMorePress={() => setMoreOpen((v) => !v)}
      />

      <MoreToolsSheet
        visible={moreOpen}
        activeTool={activeTool}
        onSelect={handleMoreSelect}
        onClose={() => setMoreOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.surface2 },
  mapStage: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: theme.surface2,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pin: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  popup: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: theme.border,
  },
  popupTitle: { fontWeight: "700", fontSize: 13, marginBottom: 4 },
  popupBody: { fontSize: 12, color: "#374151" },
  routePin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  routePinLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,250,252,0.85)",
    zIndex: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.textMuted,
  },
  errorBanner: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 8,
    zIndex: 10,
    elevation: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 10,
  },
  errorText: { fontSize: 12, color: "#b91c1c" },
});
