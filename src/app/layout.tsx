import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { DynamicThemeColor } from "@/components/dynamic-theme-color";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mada Dashboard - Profit Analytics",
  description: "A comprehensive dashboard for profit analysis and business insights",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mada Dashboard",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF9F5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon-180x180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Mada Dashboard" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#FAF9F5" />
        <meta name="msapplication-tap-highlight" content="no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Log exact background colors for debugging
              if (typeof window !== 'undefined') {
                window.addEventListener('load', () => {
                  const bg = window.getComputedStyle(document.body).backgroundColor;
                  console.log('Dashboard exact background color:', bg);
                  // Convert to hex
                  const nums = bg.match(/\\d+/g);
                  if (nums && nums.length >= 3) {
                    const hex = '#' + nums.slice(0,3).map(n => parseInt(n).toString(16).padStart(2,'0')).join('').toUpperCase();
                    console.log('As hex:', hex);
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DynamicThemeColor />
          {children}
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
