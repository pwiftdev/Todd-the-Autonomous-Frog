import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todd — Autonomous frog",
  description: "People suggest. Todd decides. Todd evolves.",
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
