"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function StatementSection() {
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    gsap.fromTo(el, 
      { opacity: 0.3, y: 50 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 1,
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          end: "top 40%",
          scrub: 1,
        }
      }
    );
  }, []);

  return (
    <section className="py-40 flex items-center justify-center text-center px-4 min-h-[60vh]">
      <div className="max-w-4xl mx-auto">
        <h2 ref={textRef} className="kora-h2 text-gray-900">
          The strategies that built your company won't scale it.
        </h2>
      </div>
    </section>
  );
}
