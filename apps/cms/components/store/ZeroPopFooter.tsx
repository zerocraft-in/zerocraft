import Link from "next/link";

export default function ZeroPopFooter() {
  return (
    <footer className="zeropop-site-footer">
      <div className="zeropop-footer-inner">
        <div className="zeropop-footer-grid">
          <div className="zeropop-footer-statement">
            <span>ZEROPOP / ZC. 2026</span>
            <h2>Made for the<br /><em>first show.</em></h2>
            <p>Original South Indian cinema-inspired art, apparel and objects—designed by Zerocraft Studio.</p>
          </div>
          <div><b>Shop</b><Link href="/store/shop">All products</Link><Link href="/store/category/tees">Tees</Link><Link href="/store/category/posters">Posters</Link><Link href="/store/category/digital">Digital</Link></div>
          <div><b>Club</b><Link href="/store/about">Our story</Link><Link href="/store/contact">Contact</Link><Link href="/store/account">Account</Link><Link href="/store/account/orders">Orders</Link></div>
          <div><b>Art &amp; rights</b><p>Independent, original artwork. Personal-use art licence applies. No film, actor or studio affiliation.</p></div>
        </div>
        <div className="zeropop-footer-wordmark" aria-hidden="true">ZEROPOP</div>
        <div className="zeropop-footer-bottom"><span>© 2026 ZEROPOP / Zerocraft Studio</span><span>Made in Tamil Nadu · Shipping across India</span></div>
      </div>
    </footer>
  );
}
