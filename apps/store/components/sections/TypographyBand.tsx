import Link from "next/link";

const A = ["First Day First Show", "செம்ம மாஸ்", "Mass Entry", "അടിപൊളി"];
const B = ["Interval Break", "வேற லெவல்", "Last Row Gang", "പൊളി സീൻ"];
const Line = ({ words }: { words: string[] }) => (
  <>{[0, 1].map((r) => words.map((w, i) => <span key={`${r}${i}`}><span className="storefront-script">{w}</span><b>★</b></span>))}</>
);

export default function TypographyBand() {
  return (
    <div className="typography-band">
      <div className="typography-marquee storefront-display"><div><Line words={A} /></div></div>
      <div className="typography-marquee storefront-display reveal-on-scroll--reverse"><div><Line words={B} /></div></div>
      <div className="typography-band__action"><Link href="/shop?q=typography" className="storefront-button">Shop typography drops →</Link></div>
    </div>
  );
}
