import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

/**
 * Construction du site :
 *  - vinext reprend l'organisation « Next.js » (dossier app/) ;
 *  - Nitro produit la version à déployer. Sur Vercel, il détecte Vercel tout seul ;
 *    sur un ordinateur, il produit un serveur Node (`npm start`).
 * La base de données est Neon (variable DATABASE_URL).
 */
const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Avec Nitro, les @import CSS de paquets ne sont pas résolus seuls : on pointe vers leurs fichiers CSS.
      { find: /^tailwindcss$/, replacement: local("./node_modules/tailwindcss/index.css") },
      { find: /^tw-animate-css$/, replacement: local("./node_modules/tw-animate-css/dist/tw-animate.css") },
    ],
  },
  plugins: [vinext(), nitro()],
});
