import { createContext, useContext, type ReactNode } from "react";
import type { SphyraClient } from "../SphyraClient";

const SphyraContext = createContext<SphyraClient | null>(null);

export function SphyraProvider({
  client,
  children,
}: {
  client: SphyraClient;
  children: ReactNode;
}): JSX.Element {
  return <SphyraContext.Provider value={client}>{children}</SphyraContext.Provider>;
}

export function useSphyra(): SphyraClient {
  const client = useContext(SphyraContext);
  if (client === null) {
    throw new Error("useSphyra must be used within a <SphyraProvider>");
  }
  return client;
}
