import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider }   from '@/app/components/ui/Toast';
import { NetworkStatus }  from '@/app/components/ui/NetworkStatus';
import { CommandMenu }    from '@/app/components/ui/CommandMenu';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zmayy — Social Mapping & Real-Time Chat",
  description:
    "Zmayy is a premium social mapping application. Discover friends near you, share your location, and chat in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full overflow-hidden">
        <ToastProvider>
          <NetworkStatus />
          <CommandMenu />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
