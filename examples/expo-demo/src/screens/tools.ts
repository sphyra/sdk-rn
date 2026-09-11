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

export const PRIMARY_TOOLS: ToolId[] = ["search", "directions", "inspect", "tilequery"];

export const MORE_TOOLS: ToolId[] = ["isochrone", "matrix", "mapMatch", "optimize", "static"];

export const TOOL_LABELS: Record<ToolId, string> = {
  search: "Search",
  directions: "Route",
  inspect: "Inspect",
  tilequery: "Query",
  isochrone: "Isochrone",
  matrix: "Matrix",
  mapMatch: "Match",
  optimize: "Optimize",
  static: "Static",
};
