import Link from "next/link";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default function SearchPage() {
  return <ZeroPopStorePage eyebrow="Search the catalogue" title="Find your" accent="frame."><div className="zeropop-page-panel"><form action="/store/shop" method="get"><input name="query" aria-label="Search products" placeholder="Search tees, posters, frames..." style={{ width: "100%" }} /><button className="zeropop-page-link" type="submit">Search the drop →</button></form><p><Link href="/store/shop" className="zeropop-page-link">Browse everything</Link></p></div></ZeroPopStorePage>;
}
