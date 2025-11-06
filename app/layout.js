// app/layout.js
import './lib/error-handler'; // Import error handler untuk mencegah styling CSS hilang

import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Aplikasi Survei Cahaya',
  description: 'Aplikasi untuk survei pencahayaan jalan',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#111827',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#111827" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
