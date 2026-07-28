// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'สายรหัส | APE/TME',
  description: 'ช่องทางสื่อสารแบบไม่ระบุตัวตนระหว่างพี่น้อง APE/TME',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  viewportFit: 'cover',
  themeColor: '#fafafa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://script.google.com" />
        <link rel="preconnect" href="https://script.google.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}