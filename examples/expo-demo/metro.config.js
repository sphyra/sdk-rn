const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sdkRoot = path.resolve(projectRoot, "../..");
const sdkEntry = path.resolve(sdkRoot, "src/index.ts");
const demoModules = path.resolve(projectRoot, "node_modules");
const maplibreRoot = path.join(demoModules, "@maplibre/maplibre-react-native");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sdkRoot];
config.resolver.nodeModulesPaths = [demoModules];
// Never resolve from sdk-rn/node_modules — duplicates MapLibre native view registration (MLRNCamera).
config.resolver.blockList = [
  new RegExp(`${sdkRoot.replace(/[/\\]/g, "[/\\\\]")}[/\\\\]node_modules[/\\\\].*`),
];
config.resolver.extraNodeModules = {
  "@sphyra/react-native": sdkRoot,
  "@maplibre/maplibre-react-native": maplibreRoot,
  react: path.join(demoModules, "react"),
  "react-native": path.join(demoModules, "react-native"),
};

const maplibreEntry = path.join(maplibreRoot, "lib/commonjs/MapLibreRN.js");

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@sphyra/react-native") {
    return { type: "sourceFile", filePath: sdkEntry };
  }
  if (
    moduleName === "@maplibre/maplibre-react-native" ||
    moduleName.startsWith("@maplibre/maplibre-react-native/")
  ) {
    if (moduleName === "@maplibre/maplibre-react-native") {
      return { type: "sourceFile", filePath: maplibreEntry };
    }
    const sub = moduleName.slice("@maplibre/maplibre-react-native/".length);
    return {
      type: "sourceFile",
      filePath: path.join(maplibreRoot, sub),
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
