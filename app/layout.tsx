import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Todos',
  description: 'A tiny todo app backed by PocketBase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
