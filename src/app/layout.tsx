import type { Metadata, Viewport } from "next";
import "./globals.css";
import AutoLogout from "@/components/AutoLogout";
import NavigationLoader from "@/components/NavigationLoader";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

/**
 * بنیادی ڈھانچہ — زبان اردو، سمت RTL، وہی عنوان اور وہی اردو فونٹ،
 * جیسے مرحلہ 1 کی منظور شدہ فائل میں تھے۔
 */

export const metadata: Metadata = {
  title: "جامعہ منیجمنٹ سسٹم — مین ڈیش بورڈ",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "جامعہ مینجمنٹ",
    statusBarStyle: "default",
  },
  other: { "color-scheme": "light dark" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#123a63",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ur" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AutoLogout />
        <NavigationLoader />
        <ServiceWorkerRegister />
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
