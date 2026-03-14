import type { Metadata } from 'next';
import { Inter, Noto_Sans_Lao, Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/app-layout';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const notoLao = Noto_Sans_Lao({ subsets: ['lao'], variable: '--font-lao' });
const notoThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-thai' });

export const metadata: Metadata = {
  title: 'Demios POS System',
  description: 'A comprehensive Point of Sale system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Demios POS',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoLao.variable} ${notoThai.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
