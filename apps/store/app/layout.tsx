import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/components/CartProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Marquee from '@/components/Marquee';
import MotionExperience from '@/components/MotionExperience';

export const metadata: Metadata = {
  title: 'ZeroCraft | Cinema streetwear, posters and customs',
  description: 'Streetwear, posters and custom pieces built on Tamil and Malayalam cinema. Original art, studio printed in India.',
};
export const viewport: Viewport = { themeColor: '#1C1411', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" data-site="zerocraft-store">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;700;800&family=Space+Mono:wght@400;700&family=Noto+Sans+Tamil:wght@700&family=Noto+Sans+Malayalam:wght@700&display=swap" />
      </head>
      <body id="storefront" data-page-shell="storefront">
        <CartProvider>
          <a className="skip" href="#main">Skip to content</a>
          <MotionExperience />
          <Marquee className="ann mono" seconds={34} items={['First day first show', 'Free shipping above ₹999', 'Code FIRSTSHOW10 for 10% off', 'Tamil + Malayalam drops weekly']} />
          <Header />
          <main id="main" data-content-region="primary">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
