import Link from 'next/link';

export default function PoliciesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="policies-shell">
      <div className="policies-shell__bar">
        <Link href="/" className="mono">ZeroCraft</Link>
        <span className="mono">Customer policies</span>
        <Link href="/faq" className="mono">Need help?</Link>
      </div>
      {children}
    </div>
  );
}
