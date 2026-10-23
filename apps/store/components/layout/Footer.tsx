import Link from "next/link";
import { FooterLogo } from "./InlineBranding";

export default function Footer() {
  return (
    <footer>
      <div className="storefront-container">
        <FooterLogo />
        <div className="storefront-mono">
          <span>© 2026 Zerocraft Studio</span>
          <span><Link href="/shop?cat=Tees">Tees</Link> · <Link href="/shop?cat=Posters">Posters</Link> · <Link href="/shop?cat=Frames">Frames</Link> · <Link href="/shop?cat=Digital">Digital</Link></span>
          <span>Instagram · YouTube</span>
        </div>
      </div>
    </footer>
  );
}
