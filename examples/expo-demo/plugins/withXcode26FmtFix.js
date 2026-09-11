const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "Xcode 26 fmt workaround";
const SNIPPET = `
    # ${MARKER}: Apple Clang 21+ rejects fmt consteval (RN 0.76 ships fmt 11.0.2)
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |cfg|
          cfg.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
`;

/** Patch ios/Podfile post_install so fmt builds under Xcode 26.x. */
function withXcode26FmtFix(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfilePath)) return cfg;

      let contents = fs.readFileSync(podfilePath, "utf8");
      if (contents.includes(MARKER)) return cfg;

      const anchor = "react_native_post_install(";
      const start = contents.indexOf(anchor);
      if (start === -1) return cfg;

      const close = contents.indexOf("\n    )\n", start);
      if (close === -1) return cfg;

      const insertAt = close + "\n    )\n".length;
      contents = contents.slice(0, insertAt) + SNIPPET + contents.slice(insertAt);
      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
}

module.exports = withXcode26FmtFix;
