import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider }   from '@/app/components/ui/Toast';
import { NetworkStatus }  from '@/app/components/ui/NetworkStatus';
import { CommandMenu }    from '@/app/components/ui/CommandMenu';
import { ServiceWorkerRegister } from '@/app/components/ui/ServiceWorkerRegister';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zmayy — Social Mapping & Real-Time Chat",
  description:
    "Zmayy is a premium social mapping application. Discover friends near you, share your location, and chat in real time.",
  icons: {
    icon: [
      { rel: 'icon', url: '/images/zmay_logo.png' },
      { rel: 'apple-touch-icon', url: '/images/zmay_logo.png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/images/zmay_logo.png" />
        <meta name="theme-color" content="#0B0E11" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Zmayy" />
      </head>
      <body className="h-full overflow-hidden">
        <ErrorBoundary>
          <ToastProvider>
            <NetworkStatus />
            <CommandMenu />
            <ServiceWorkerRegister />
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
