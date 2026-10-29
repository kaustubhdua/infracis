import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Infracis — Know the place before the property",
  description:
    "Evidence-first location due diligence that helps you compare places, inspect sources, and discover what still needs verification.",
  applicationName: "Infracis"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#174b38"
};

// Applies the saved theme before first paint (no flash). Reads the preferences
// cookie, falling back to the localStorage key used by earlier versions.
const themeInitScript = `(function(){try{var t=null;var m=document.cookie.match(/(?:^|; )infracis_prefs=([^;]*)/);if(m){t=JSON.parse(decodeURIComponent(m[1])).uiTheme}if(!t){t=window.localStorage.getItem('infracis-theme')}if(t==='original'||t==='ux4g-white'||t==='ux4g-dark'){document.documentElement.dataset.theme=t}}catch(e){}})();`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
