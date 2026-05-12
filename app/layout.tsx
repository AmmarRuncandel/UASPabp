import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider }   from '@/app/components/ui/Toast';
import { NetworkStatus }  from '@/app/components/ui/NetworkStatus';
import { CommandMenu }    from '@/app/components/ui/CommandMenu';
import { ServiceWorkerRegister } from '@/app/components/ui/ServiceWorkerRegister';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { ChatNotificationsProvider } from '@/app/context/ChatNotifications';

// Import debug tools (only in development)
if (process.env.NODE_ENV === 'development') {
  import('@/app/utils/debug');
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zmayy Social Mapping & Real-Time Chat",
  description:
    "Temukan teman di sekitarmu, bagikan lokasi, dan chat secara real-time dengan Zmayy social mapping.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zmayy",
  },
  icons: {
    icon: [
      { rel: 'icon',             url: '/images/zmay_logo.png', type: 'image/png' },
      { rel: 'apple-touch-icon', url: '/images/zmay_logo.png', type: 'image/png' },
    ],
  },
};

/**
 * Viewport must be exported separately from metadata in Next.js App Router.
 * Chrome's PWA installability check requires width=device-width + initial-scale=1.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0B0E11',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} h-full`}>
      <head>
        {/* PWA manifest — also set via metadata.manifest but belt-and-suspenders */}
        <link rel="manifest" href="/manifest.json" />
        {/* Apple PWA meta tags not yet covered by Next.js appleWebApp */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full overflow-hidden">
        <ErrorBoundary>
          <ToastProvider>
            <NetworkStatus />
            <CommandMenu />
            <ServiceWorkerRegister />
            <ChatNotificationsProvider>
              {children}
            </ChatNotificationsProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
