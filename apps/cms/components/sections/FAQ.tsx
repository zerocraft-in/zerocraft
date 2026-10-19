import RotatingWords from "@/components/ui/RotatingWords";
import StudioGlyph from "@/components/ui/StudioGlyph";

const questions = [
  [
    "What services does Zerocraft Studio offer?",
    "We work across branding, graphic design, UI/UX, website and app development, photography, video production, and motion design.",
  ],
  [
    "How do I start a project?",
    "Reach out with a brief overview of your idea, goals, and requirements. We'll discuss your vision, define the scope, and plan the next steps.",
  ],
  [
    "Can we collaborate remotely?",
    "Yes. We're based in Tenkasi, Tamil Nadu, and welcome remote collaborations with clients from different locations.",
  ],
  [
    "How are project costs and timelines determined?",
    "Every project has unique requirements. Pricing and timelines are based on scope, complexity, deliverables, and the level of creative and technical work involved.",
  ],
  [
    "Do you take on smaller projects?",
    "We consider projects of different sizes, from individual creative deliverables to complete brand and digital experiences.",
  ],
];
export default function FAQ() {
  return (
    <section
      className="section studio-faq"
      id="faq"
      aria-labelledby="faq-heading"
    >
      <div className="container-site studio-faq__layout">
        <div>
          <span className="studio-eyebrow studio-eyebrow--section">A little clarity</span>
          <h2 id="faq-heading" className="studio-heading" aria-label="Good questions. Clear answers.">
            Good questions.
            <br />
            <RotatingWords words={["Clear answers.", "Honest answers.", "Useful answers."]} className="studio-accent" />
          </h2>
        </div>
        <div>
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span className="studio-faq__icon" aria-hidden="true"><StudioGlyph variant="plus" size={15} className="studio-faq__glyph--plus" /><StudioGlyph variant="close" size={15} className="studio-faq__glyph--close" /></span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
