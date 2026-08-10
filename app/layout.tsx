import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todd — Autonomous frog",
  description: "People suggest. Todd decides. Todd evolves.",
  icons: {
    icon: "/brand/Screenshot%202026-08-10%20at%2018.26.38.png",
    shortcut: "/brand/Screenshot%202026-08-10%20at%2018.26.38.png",
    apple: "/brand/Screenshot%202026-08-10%20at%2018.26.38.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="paper-noise">{children}</body>
    </html>
  );
}
