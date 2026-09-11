import { useMemo } from "react";
import { SphyraClient, SphyraProvider } from "@sphyra/react-native";
import { loadConfig } from "./src/config";
import { DemoScreen } from "./src/screens/DemoScreen";

export default function App() {
  const config = loadConfig();
  const client = useMemo(
    () => new SphyraClient({ baseUrl: config.baseUrl, apiKey: config.apiKey, timeout: 30_000 }),
    [config.baseUrl, config.apiKey],
  );

  return (
    <SphyraProvider client={client}>
      <DemoScreen config={config} />
    </SphyraProvider>
  );
}
