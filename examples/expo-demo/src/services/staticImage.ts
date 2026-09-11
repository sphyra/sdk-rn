import { SphyraError } from "@sphyra/react-native";

export interface StaticImageParams {
  lon: number;
  lat: number;
  zoom: number;
  width: number;
  height: number;
  retina?: boolean;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return globalThis.btoa(binary);
}

export function buildStaticPath(params: StaticImageParams): string {
  const retina = params.retina ? "@2x" : "";
  return `/api/v1/static/${params.lon},${params.lat},${params.zoom}/${params.width}x${params.height}${retina}.png`;
}

/** Authenticated static PNG → data URI for React Native `<Image>`. */
export async function fetchStaticImageDataUri(
  cfg: { baseUrl: string; apiKey: string },
  params: StaticImageParams,
): Promise<string> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}${buildStaticPath(params)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  });

  if (!res.ok) {
    let code = "HTTP_ERROR";
    let message = res.statusText;
    try {
      const parsed = (await res.json()) as ErrorEnvelope;
      if (parsed.error?.code) {
        code = parsed.error.code;
        message = parsed.error.message ?? message;
      }
    } catch {
      // non-JSON error body
    }
    throw new SphyraError(code, message, res.status);
  }

  const bytes = await res.arrayBuffer();
  return `data:image/png;base64,${arrayBufferToBase64(bytes)}`;
}
