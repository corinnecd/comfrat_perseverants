import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COM’FRAT — Les Persévérants",
  description: "Chaque présence compte. Accueil et suivi de la Com’Frat Les Persévérants.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
