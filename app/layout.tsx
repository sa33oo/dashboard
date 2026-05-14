import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '動物病院 月次売上ダッシュボード v0.1'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
