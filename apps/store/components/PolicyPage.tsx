export type PolicySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type PolicyFaq = {
  question: string;
  answer: string;
};

type PolicyPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: PolicySection[];
  faq?: PolicyFaq[];
};

export default function PolicyPage({ eyebrow, title, intro, updated, sections, faq }: PolicyPageProps) {
  return (
    <div className="policy-page">
      <div className="wrap policy-page__wrap">
        <header className="policy-page__header">
          <span className="mono gold">{eyebrow}</span>
          <h1 className="h-lg">{title}</h1>
          <p className="policy-page__intro">{intro}</p>
          <p className="mono muted policy-page__updated">Last updated: {updated}</p>
        </header>
        <div className="policy-page__layout">
          <article className="policy-page__content">
            {sections.map((section) => (
              <section key={section.title} className="policy-page__section">
                <h2>{section.title}</h2>
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}
            {faq && (
              <div className="policy-page__faq" aria-label="Frequently asked questions">
                {faq.map((item) => (
                  <details key={item.question} className="policy-page__faq-item">
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            )}
            <p className="policy-page__contact">Questions about a policy or an order? Please use the support details included in your order confirmation.</p>
          </article>
        </div>
      </div>
    </div>
  );
}
