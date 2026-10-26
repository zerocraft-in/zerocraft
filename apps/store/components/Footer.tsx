import Link from 'next/link';
import Icon from './Icon';
import { Logo } from './Graphics';

const FOOTER_LINKS = [
  { href: '/shop', label: 'Shop all' },
  { href: '/shop?cat=posters', label: 'Posters' },
  { href: '/cart', label: 'Cart' },
];

const SOCIAL_LINKS = [
  { href: 'https://www.instagram.com/', label: 'Instagram', icon: 'instagram' },
  { href: 'https://www.youtube.com/', label: 'YouTube', icon: 'youtube' },
  { href: 'https://www.facebook.com/', label: 'Facebook', icon: 'facebook' },
];

export default function Footer() {
  return (
    <footer id="site-footer" className="minimal-footer" data-region="footer">
      <div className="site-container minimal-footer__main">
        <div className="minimal-footer__brand">
          <Link href="/" className="minimal-footer__logo" aria-label="ZeroCraft home">
            <span className="minimal-footer__logo-backdrop"><Logo size={48} color="#F2B632" /></span>
          </Link>
          <div>
            <span className="minimal-footer__eyebrow mono">ZeroCraft Studio / 2026</span>
            <p>Original cinema culture, made wearable.<br />Designed and printed in India.</p>
          </div>
        </div>
        <div className="minimal-footer__links">
          <span className="minimal-footer__label mono">Explore</span>
          <nav aria-label="Footer navigation">{FOOTER_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
        </div>
        <div className="minimal-footer__social">
          <span className="minimal-footer__label mono">Follow the signal</span>
          <div className="minimal-footer__social-links">{SOCIAL_LINKS.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label}><Icon name={social.icon} size={18} /></a>)}</div>
        </div>
      </div>
      <div className="site-container minimal-footer__bottom">
        <span>© 2026 ZeroCraft Studio</span>
        <span>Kadayam, Tenkasi district</span>
        <a className="minimal-footer__top" href="#main" aria-label="Back to top"><Icon name="arrow-up" size={18} /></a>
      </div>
    </footer>
  );
}
