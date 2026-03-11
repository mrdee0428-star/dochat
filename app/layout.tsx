import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PhoneCrawl - So sánh giá iPhone cũ',
  description: 'Tìm kiếm và so sánh giá iPhone cũ từ các cửa hàng uy tín tại Việt Nam',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
