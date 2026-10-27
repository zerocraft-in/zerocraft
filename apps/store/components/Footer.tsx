import Link from 'next/link';
import Icon from './Icon';

const FOOTER_LINKS = [
  { href: '/shop', label: 'Shop all' },
  { href: '/shop?cat=posters', label: 'Posters' },
  { href: '/cart', label: 'Cart' },
];

const POLICY_LINKS = [
  { href: '/policies/privacy', label: 'Privacy' },
  { href: '/policies/terms', label: 'Terms' },
  { href: '/policies/shipping', label: 'Shipping' },
  { href: '/policies/returns', label: 'Returns & exchanges' },
  { href: '/policies/refunds', label: 'Refunds & payments' },
  { href: '/faq', label: 'FAQ' },
];

export default function Footer() {
  return (
    <footer id="site-footer" className="minimal-footer" data-region="footer">
      <div className="site-container minimal-footer__inner">
        <div className="minimal-footer__meta">
          <span>© 2026 ZeroCraft Studio</span>
          <span>Original cinema culture · Designed and printed in India</span>
          <nav aria-label="Footer links">
            {[...FOOTER_LINKS, ...POLICY_LINKS].map((link) => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </nav>
        </div>
        <div className="minimal-footer__help">
          <span>Need help with an order?</span>
          <Link href="/faq">Help &amp; support <Icon name="arrow" size={15} /></Link>
        </div>
      </div>
      <div className="minimal-footer__notice">
        <div className="site-container">
          Fan art, made with respect · Printed in India · Questions? <Link href="/faq">Contact ZeroCraft support</Link>
        </div>
      </div>
    </footer>
  );
}
