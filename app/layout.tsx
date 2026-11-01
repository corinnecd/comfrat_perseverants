import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COM’FRAT — Les Persévérants",
  description: "Chaque présence compte. Accueil et suivi de la Com’Frat Les Persévérants.",
  other: {
    "codex-preview": "development",
  },
  // Icônes : favicon pour les onglets, apple-touch-icon pour l'écran d'accueil iOS,
  // manifest pour l'installation PWA.
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "COM’FRAT",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#001b35",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"if(/[?&](token|session)=/.test(location.search))document.documentElement.classList.add('qr-arrival')"}}/><link rel="preload" as="image" href="/logo-perseverants.webp" type="image/webp"/><link rel="preload" as="image" href="/communion-fraternelle.webp" type="image/webp"/></head><body className="antialiased">{children}</body>
    </html>
  );
}
