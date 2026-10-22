"use client";
import { useState, type FormEvent } from "react";
import ArrowIcon from "@/components/ui/ArrowIcon";
export default function ProjectBrief() {
  const [prepared, setPrepared] = useState(false);
  const [completion, setCompletion] = useState(0);
  function updateCompletion(form: HTMLFormElement) {
    const fields = ["name", "email", "message"];
    const filled = fields.filter((name) => {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      return Boolean(field?.value.trim());
    }).length;
    setCompletion(Math.round((filled / fields.length) * 100));
  }
  function prepareEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (const name of ["name", "message"]) {
      const field = event.currentTarget.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement;
      field.setCustomValidity(
        field.value.trim() ? "" : "Please enter your project details.",
      );
      if (!field.reportValidity()) return;
    }
    const data = new FormData(event.currentTarget);
    const body = `Hello Zerocraft,\n\nI'm ${data.get("name")}.\nEmail: ${data.get("email")}\nInterested in: ${data.get("service")}\nTimeline: ${data.get("timeline") || "To discuss"}\n\n${data.get("message")}\n`;
    window.location.href = `mailto:hello@zerocraft.in?subject=${encodeURIComponent(`Project enquiry: ${data.get("service")}`)}&body=${encodeURIComponent(body)}`;
    setPrepared(true);
  }
  return (
    <section className="section container-site studio-contact">
      <div>
        <span className="studio-eyebrow">/ A conversation starts here</span>
        <h2 className="studio-heading">
          Tell us what
          <br />
          <span>you have in mind.</span>
        </h2>
        <a className="studio-contact__email" href="mailto:hello@zerocraft.in">
          hello@zerocraft.in <ArrowIcon direction="up-right" size={13} />
        </a>
        <p>Tenkasi, Tamil Nadu, India</p>
        <a
          href="https://instagram.com/studio.zerocraft"
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram / @studio.zerocraft <ArrowIcon direction="up-right" size={13} />
        </a>
      </div>
      <form
        onInput={(event) => {
          const field = event.target;
          if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLTextAreaElement
          )
            field.setCustomValidity("");
          updateCompletion(event.currentTarget);
          setPrepared(false);
        }}
        onSubmit={prepareEmail}
        className="studio-brief"
      >
        <div className="studio-brief__row">
          <label>
            Your name
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={100}
              placeholder="How should we call you?"
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={200}
              placeholder="you@company.com"
            />
          </label>
        </div>
        <label>
          What do you need?
          <select name="service" defaultValue="Brand identity">
            <option>Brand identity</option>
            <option>Digital design</option>
            <option>Website or application</option>
            <option>Photography, video, or motion</option>
            <option>Let’s figure it out together</option>
          </select>
        </label>
        <label>
          Timeline (optional)
          <input
            name="timeline"
            maxLength={120}
            placeholder="A target date, or no rush"
          />
        </label>
        <label>
          A little about your project
          <textarea
            name="message"
            rows={5}
            required
            maxLength={2500}
            placeholder="Your idea, goals, and anything you would like us to know."
          />
        </label>
        <p className="studio-brief__note">
          This prepares a draft in your email app. Review it and press Send
          there; this form does not send or store your message.
        </p>
        <div className="studio-brief__progress" aria-label={`Brief completion ${completion}%`}>
          <div className="studio-brief__progress-label"><span>Brief readiness</span><span>{String(completion).padStart(3, "0")} %</span></div>
          <span className="studio-brief__progress-track"><span style={{ width: `${completion}%` }} /></span>
        </div>
        <button className="badge-btn" type="submit">
          PREPARE MY EMAIL <ArrowIcon direction="up-right" size={13} />
        </button>
        <p role="status">
          {prepared
            ? "Your email app has been requested. No message has been sent. If no email app opens, send your brief directly to hello@zerocraft.in."
            : ""}
        </p>
      </form>
    </section>
  );
}
