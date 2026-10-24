const R = [
  ["Heavy fabric, print still sharp after 10 washes. The Vera Level tee gets compliments daily.", "Karthik, Chennai", "Tamil"],
  ["Finally Malayalam typography that looks proper. My Adipoli tee is the best fit I own.", "Anjali, Kochi", "Malayalam"],
  ["Poster print quality is theatre-lobby level. Ordered the fan pack for my brother too.", "Arun, Bengaluru", "Both"],
];
export default function Reviews() {
  const cards = (ariaHidden = false) => R.map(([text, name, language]) => (
    <article className="review-card" key={`${name}-${ariaHidden ? "duplicate" : "review"}`} aria-hidden={ariaHidden}>
      <span className="review-stars storefront-mono" role="img" aria-label="5 out of 5 stars">★★★★★</span>
      <p>{text}</p>
      <div className="storefront-mono"><span>{name}</span><span>{language}</span></div>
    </article>
  ));

  return (
    <section className="reviews-section">
      <div className="storefront-container">
        <div className="storefront-section-heading">
          <div>
            <div className="storefront-kicker storefront-mono">Fan reviews</div>
            <h2 className="storefront-display reveal-on-scroll">Houseful <em>reviews.</em></h2>
          </div>
        </div>
      </div>
      <div className="review-marquee" role="region" aria-label="Customer reviews">
        <div className="review-marquee__track">
          <div className="review-marquee__group">{cards()}</div>
          <div className="review-marquee__group" aria-hidden="true">{cards(true)}</div>
        </div>
      </div>
    </section>
  );
}
