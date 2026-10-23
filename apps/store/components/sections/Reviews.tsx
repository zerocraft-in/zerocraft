const R = [
  ["Heavy fabric, print still sharp after 10 washes. The Vera Level tee gets compliments daily.", "Karthik, Chennai", "Tamil"],
  ["Finally Malayalam typography that looks proper. My Adipoli tee is the best fit I own.", "Anjali, Kochi", "Malayalam"],
  ["Poster print quality is theatre-lobby level. Ordered the fan pack for my brother too.", "Arun, Bengaluru", "Both"],
];
export default function Reviews() {
  return (
    <section><div className="storefront-container">
      <div className="storefront-section-heading"><div><div className="storefront-kicker storefront-mono">Fan reviews</div><h2 className="storefront-display reveal-on-scroll">Houseful <em>reviews.</em></h2></div></div>
      <div className="review-grid reveal-on-scroll">
        {R.map(([t, n, l]) => <div className="review-card" key={n}><span className="review-stars storefront-mono">★★★★★</span><p>{t}</p><div className="storefront-mono"><span>{n}</span><span>{l}</span></div></div>)}
      </div>
    </div></section>
  );
}
