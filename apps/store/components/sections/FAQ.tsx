const Q = [
  [
    "Are these official film posters?",
    "No. Padam Club posters are original, film-inspired artworks and typography designs. We are not affiliated with any film, actor or studio.",
  ],
  [
    "What is the tee fabric and fit?",
    "Tees are heavy cotton with a soft hand feel. Check the size guide inside each product. For an oversized fit, go one size up.",
  ],
  [
    "How long does delivery take?",
    "Orders are dispatched in 2–4 working days. Delivery usually takes 3–5 days across India after dispatch.",
  ],
  [
    "Can I return or exchange?",
    "Yes, unused items can be returned or exchanged within 7 days. Digital downloads are non-refundable once delivered.",
  ],
  [
    "How do digital products work?",
    "You get an instant download link after payment. Files are for personal use only.",
  ],
];
export default function Faq() {
  return (
    <section style={{ paddingTop: 0 }}>
      <div className="storefront-container">
        <div
          className="storefront-section-heading"
          style={{ justifyContent: "center", textAlign: "center" }}
        >
          <div>
            <div className="storefront-kicker storefront-mono" style={{ justifyContent: "center" }}>
              Doubts?
            </div>
            <h2 className="storefront-display reveal-on-scroll">
              Quick <em>answers.</em>
            </h2>
          </div>
        </div>
        <div className="faq-list reveal-on-scroll">
          {Q.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
