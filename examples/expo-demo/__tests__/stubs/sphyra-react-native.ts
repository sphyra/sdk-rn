/** Vitest stub — avoids loading native maplibre/react-native in node unit tests. */

export class SphyraError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "SphyraError";
  }
}

export class SphyraClient {}
