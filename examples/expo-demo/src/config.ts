export interface DemoConfig {
  baseUrl: string;
  apiKey: string;
}

/** Reads EXPO_PUBLIC_* env vars (see `.env.example`). */
export function loadConfig(): DemoConfig {
  const baseUrl = (process.env.EXPO_PUBLIC_SPHYRA_URL ?? "http://localhost:4000").replace(/\/$/, "");
  const apiKey = process.env.EXPO_PUBLIC_SPHYRA_KEY ?? "sphyra_dev_local";
  return { baseUrl, apiKey };
}
