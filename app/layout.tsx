import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Infracis — Know the place before the property",
  description:
    "Evidence-first location due diligence that helps you compare places, inspect sources, and discover what still needs verification.",
  applicationName: "Infracis"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
