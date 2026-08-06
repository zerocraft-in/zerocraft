"use client";

import Reveal from "@/components/ui/Reveal";

const clients = [
  "Google",
  "Apple",
  "Nike",
  "Stripe",
  "Vercel",
  "Spotify",
  "Netflix",
  "Airbnb",
];

// Duplicate the array to create a seamless loop
const duplicatedClients = [...clients, ...clients, ...clients, ...clients];

const SparkleIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="clients__marquee-icon"
  >
    <path
      d="M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z"
      fill="currentColor"
    />
  </svg>
);

export default function Clients() {
  return (
    <section className="section clients" id="clients">
      <Reveal className="clients__header" delay={0}>
        <span className="clients__label text-label">Selected Clients</span>
      </Reveal>

      <div className="clients__marquee-container">
        <div className="clients__marquee">
          {duplicatedClients.map((client, index) => (
            <div key={`${client}-${index}`} className="clients__marquee-item">
              <span>{client}</span>
              <SparkleIcon />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
