import { existsSync, cpSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = resolve(rootDir, "apps/desktop/dist");
const androidAssetsWebDir = resolve(rootDir, "apps/android/app/src/main/assets/web");

console.log("==> Building desktop web frontend for Android...");
execSync("npm --workspace @recast/desktop run build", {
  cwd: rootDir,
  stdio: "inherit",
});

if (!existsSync(distDir)) {
  console.error("Error: desktop dist directory does not exist at:", distDir);
  process.exit(1);
}

console.log("==> Syncing web assets to Android project...");
if (existsSync(androidAssetsWebDir)) {
  rmSync(androidAssetsWebDir, { recursive: true, force: true });
}
mkdirSync(androidAssetsWebDir, { recursive: true });

cpSync(distDir, androidAssetsWebDir, { recursive: true });

// Inject early Tauri shim into index.html so isTauri() is guaranteed true synchronously
const indexHtmlPath = resolve(androidAssetsWebDir, "index.html");
if (existsSync(indexHtmlPath)) {
  let html = readFileSync(indexHtmlPath, "utf-8");
  const shim = `
    <script>
      (function() {
        if (window.__TAURI_INTERNALS__) return;
        window.__recast_callbacks = {};
        window.__TAURI_INTERNALS__ = {
            invoke: function(cmd, args, options) {
                return new Promise(function(resolve, reject) {
                    var callbackId = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    window.__recast_callbacks[callbackId] = { resolve: resolve, reject: reject };
                    if (window.AndroidBridge && window.AndroidBridge.invoke) {
                        window.AndroidBridge.invoke(cmd, JSON.stringify(args || {}), callbackId);
                    } else {
                        reject(new Error("AndroidBridge not available"));
                    }
                });
            },
            transformCallback: function(callback, once) {
                var id = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                window.__recast_callbacks[id] = { resolve: callback, reject: function() {} };
                return id;
            },
            unregisterCallback: function(id) {
                delete window.__recast_callbacks[id];
            },
            callbacks: {},
            metadata: {
                currentWindow: { label: "main" }
            },
            convertFileSrc: function(filePath, protocol) {
                return filePath;
            }
        };

        window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
            unregisterListener: function(event, eventId) {}
        };
      })();
    </script>
  `;
  html = html.replace("<head>", "<head>" + shim);
  writeFileSync(indexHtmlPath, html, "utf-8");
  console.log("==> Injected Tauri IPC bootstrap into Android index.html");
}

const files = readdirSync(androidAssetsWebDir, { recursive: true });
console.log(`==> Successfully synced ${files.length} files to apps/android/app/src/main/assets/web`);
