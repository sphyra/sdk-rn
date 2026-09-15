import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type PackageManifest = {
  name: string;
  version: string;
  private?: boolean;
  license?: string;
  main?: string;
  module?: string;
  types?: string;
  files?: string[];
  scripts?: Record<string, string>;
  publishConfig?: { access?: string };
  repository?: { type?: string; url?: string } | string;
  peerDependencies?: Record<string, string>;
  exports?: {
    "."?: {
      types?: string;
      import?: string;
      require?: string;
    };
  };
};

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "../package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as PackageManifest;

describe("package.json publish manifest", () => {
  describe("1.0.0 public-publish surface", () => {
    it("is scoped @sphyra/react-native at version 1.0.0 and is not private", () => {
      expect(pkg.name).toBe("@sphyra/react-native");
      expect(pkg.version).toBe("1.0.0");
      expect(pkg.private).toBe(false);
    });

    it("publishes publicly with GitHub repository metadata", () => {
      expect(pkg.publishConfig).toBeTypeOf("object");
      expect(pkg.publishConfig?.access).toBe("public");
      expect(pkg.repository).toBeTypeOf("object");
      expect(String((pkg.repository as { url?: string }).url)).toContain(
        "github.com/sphyra/sdk-rn",
      );
    });

    it("keeps the dual-package dist exports unchanged", () => {
      expect(Array.isArray(pkg.files)).toBe(true);
      expect(pkg.files).toContain("dist");
      expect(pkg.main).toBe("./dist/index.js");
      expect(pkg.module).toBe("./dist/index.mjs");
      expect(pkg.types).toBe("./dist/index.d.ts");
      expect(pkg.exports?.["."]?.types).toBe("./dist/index.d.ts");
      expect(pkg.exports?.["."]?.import).toBe("./dist/index.mjs");
      expect(pkg.exports?.["."]?.require).toBe("./dist/index.js");
    });
  });

  describe("invariants this publish must not break", () => {
    it("never ships an unscoped or wrong-scope name", () => {
      expect(pkg.name).toBe("@sphyra/react-native");
      expect(pkg.name).not.toBe("sphyra-react-native");
      expect(pkg.name).not.toBe("@sphyra/js");
      expect(pkg.name).not.toBe("@sphyra/client");
    });

    it("keeps build, test, and typecheck scripts", () => {
      expect(pkg.scripts).toHaveProperty("build");
      expect(pkg.scripts).toHaveProperty("test");
      expect(pkg.scripts).toHaveProperty("typecheck");
    });

    it("leaves the license UNLICENSED", () => {
      expect(pkg.license).toBe("UNLICENSED");
    });

    it("keeps the MapLibre React Native peer range", () => {
      expect(pkg.peerDependencies?.["@maplibre/maplibre-react-native"]).toBe(
        "^10.0.0",
      );
    });
  });
});
