export default function TopTicker() {
  const t = "★ First day first show  ★ Free shipping above ₹999  ★ Tamil + Malayalam drops weekly  ★ Code FIRSTSHOW10 for 10% off  ";
  return (
    <div className="announcement-ticker storefront-mono" role="region" aria-label="Store announcements">
      <div aria-hidden="true">{t.repeat(2)}</div>
    </div>
  );
}
