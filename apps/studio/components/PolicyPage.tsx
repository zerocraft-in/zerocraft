import Link from "next/link";

export type PolicySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export default function PolicyPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: PolicySection[];
}) {
  return (
    <main className="studio-policy-page">
      <div className="studio-policy-page__inner">
        <Link href="/" className="studio-policy-page__back">
          ← Back to Zerocraft Studio
        </Link>
        <p className="studio-eyebrow studio-eyebrow--section">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="studio-policy-page__intro">{intro}</p>
        <p className="studio-policy-page__updated">Last updated: {updated}</p>
        <div className="studio-policy-page__sections">
          {sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {(section.paragraphs ?? []).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
        <p className="studio-policy-page__contact">
          Questions about these policies? Contact{" "}
          <a href="mailto:hello@zerocraft.in">hello@zerocraft.in</a>.
        </p>
      </div>
    </main>
  );
}
