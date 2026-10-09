const questions = [
  ["What can we create together?", "Brand identities, websites, digital interfaces, photography, video, and motion. Tell us what you want to achieve and we can discuss the right combination for your project."],
  ["How do I start a project?", "Send a short introduction with your goals, the kind of work you need, and any dates or budget you have in mind. The contact page helps you prepare an email brief."],
  ["Can we collaborate remotely?", "The studio is based in Tenkasi, India. You can start the conversation by email from wherever you are, then agree on a collaboration and review process together."],
  ["How are pricing and timelines decided?", "Both depend on the scope, deliverables, and review process. Share your requirements so these can be discussed before the work begins."],
];
export default function FAQ() {
  return <section className="section studio-faq" id="faq" aria-labelledby="faq-heading"><div className="container-site studio-faq__layout">
    <div><span className="studio-eyebrow">/ A little clarity</span><h2 id="faq-heading" className="studio-heading">Good questions.<br /><span>Clear answers.</span></h2></div>
    <div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
  </div></section>;
}
