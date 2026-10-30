import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

const localBindingConfig = {
  main: "vinext/server/fetch-handler",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

/**
 * Cible de construction :
 *  - par défaut : Cloudflare Workers / OpenAI Sites (base D1), comme aujourd'hui ;
 *  - Vercel : quand Vercel construit le site (variable VERCEL=1) ou avec COMFRAT_TARGET=vercel.
 *    Le site passe alors par Nitro et utilise uniquement la base Neon (DATABASE_URL).
 */
const vercelTarget = process.env.VERCEL === "1" || process.env.COMFRAT_TARGET === "vercel";

export default defineConfig(async () => {
  if (vercelTarget) {
    process.env.NITRO_PRESET ??= "vercel";
    const { nitro } = await import("nitro/vite");
    return {
      resolve: {
        alias: [
          { find: "cloudflare:workers", replacement: fileURLToPath(new URL("./build/vercel-env-shim.ts", import.meta.url)) },
          // Avec Nitro, les @import CSS de paquets ne sont pas résolus seuls : on pointe vers leurs fichiers CSS.
          { find: /^tailwindcss$/, replacement: fileURLToPath(new URL("./node_modules/tailwindcss/index.css", import.meta.url)) },
          { find: /^tw-animate-css$/, replacement: fileURLToPath(new URL("./node_modules/tw-animate-css/dist/tw-animate.css", import.meta.url)) },
        ],
      },
      plugins: [vinext(), nitro()],
    };
  }


  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      ...(managedLinux ? { host: "0.0.0.0", allowedHosts: ["terminal.local"] } : {}),
      ...(isCodexSeatbeltSandbox ? { watch: { useFsEvents: false, usePolling: true } } : {}),
    },
    plugins: [
      vinext(),
      sites({ mockAuth: !managedLinux }),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
