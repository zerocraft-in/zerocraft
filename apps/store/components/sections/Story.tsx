import Link from "next/link";
export default function Story() {
  return (
    <section className="story-section"><div className="storefront-container story-section__inner">
      <div className="reveal-on-scroll">
        <div className="storefront-kicker storefront-mono">Our story</div>
        <h2 className="storefront-display">For the last row. <em>For the whistle.</em></h2>
        <p>Padam Club is cinema streetwear for people who grew up on first-day-first-show, tea stall debates and dialogues they still quote. Original art, studio printed, made for Tamil and Malayalam fans.</p>
        <Link href="/shop" className="storefront-button">Browse the drop →</Link>
      </div>
      <div className="story-section__details reveal-on-scroll">
        <div><b>22</b>original designs</div><div><b>2</b>languages, one club</div><div><b>4.8★</b>average rating</div><div><b>2–4</b>days to dispatch</div>
      </div>
    </div></section>
  );
}
