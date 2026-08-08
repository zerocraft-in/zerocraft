"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const projects = [
  {
    id: 1,
    title: "Illustrations set",
    tags: ["DESIGN", "ILLUSTRATIONS", "PACKAGING", "MARKETING"],
    image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 2,
    title: "Interactive concept",
    tags: ["UI/UX", "DEVELOPMENT", "BRAND"],
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 3,
    title: "Creative studio template",
    tags: ["BRAND", "MARKETING", "WEBSITE"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 4,
    title: "Interactive concept",
    tags: ["DESIGN", "MARKETING", "WEBSITE"],
    image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 5,
    title: "Interactive concept",
    tags: ["BRAND", "MARKETING", "WEBSITE"],
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 6,
    title: "Interactive concept",
    tags: ["BRAND", "MARKETING", "WEBSITE"],
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1000",
  }
];

export default function Works() {
  const sectionRef = useRef<HTMLElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Cursor Follower
      const cursor = cursorRef.current;
      if (cursor) {
        gsap.set(cursor, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
        
        const moveCursor = (e: MouseEvent) => {
          gsap.to(cursor, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.6,
            ease: "expo.out"
          });
        };

        window.addEventListener("mousemove", moveCursor);

        itemsRef.current.forEach(item => {
          if (!item) return;
          item.addEventListener("mouseenter", () => {
            gsap.to(cursor, { scale: 1, opacity: 1, duration: 0.4, ease: "expo.out" });
          });
          item.addEventListener("mouseleave", () => {
            gsap.to(cursor, { scale: 0, opacity: 0, duration: 0.4, ease: "expo.out" });
          });
        });

        return () => {
          window.removeEventListener("mousemove", moveCursor);
        };
      }
    }, sectionRef);

        // Parallax
    const pxCtx = gsap.context(() => {
      itemsRef.current.forEach((item) => {
        if (!item) return;
        const image = item.querySelector(".parallax-img") as HTMLImageElement;
        if (image) {
          gsap.fromTo(
            image,
            { yPercent: -10 },
            {
              yPercent: 10,
              ease: "none",
              force3D: true,
              scrollTrigger: {
                trigger: item,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            }
          );
        }
      });
    }, sectionRef);

    return () => {
      ctx.revert();
      pxCtx.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full bg-background text-foreground py-24 md:py-32 px-4 md:px-8 overflow-hidden" id="works">
      {/* Custom Cursor */}
      <div 
        ref={cursorRef} 
        className="fixed top-0 left-0 w-[100px] h-[100px] rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold tracking-widest pointer-events-none z-50 text-center leading-tight"
      >
        VIEW<br />WORK
      </div>

      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-20 md:mb-32">
          <div className="md:col-span-4 flex flex-col justify-between h-full space-y-12">
            <p className="section-desc max-w-xs mt-2">
              Innovative design and<br />cutting-edge development.
            </p>
            <Link href="/works" className="text-label hover:opacity-50 transition-opacity">
              [ ALL WORKS ]
            </Link>
          </div>
          <div className="md:col-span-8">
            <h2 className="section-heading">
              Featured case<br />studies
            </h2>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 items-start">
          
          {/* Column 1 */}
          <div className="flex flex-col gap-16 md:gap-24 pt-0 md:pt-12">
            {/* Project 1 */}
            <div ref={(el) => { itemsRef.current[0] = el; }} className="group cursor-none">
              <div className="relative aspect-[3/4] overflow-hidden bg-muted rounded-sm">
                <Image src={projects[0].image} alt={projects[0].title} fill className="object-cover parallax-img scale-[1.2] will-change-transform" />
              </div>
              <div className="mt-5 flex justify-between items-start">
                <h3 className="text-xl font-medium">{projects[0].title}</h3>
                <div className="text-[9px] font-medium uppercase tracking-widest text-right flex flex-col gap-1 text-gray-500 dark:text-gray-400">
                  {projects[0].tags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
              </div>
            </div>
            
            {/* Project 6 */}
            <div ref={(el) => { itemsRef.current[5] = el; }} className="group cursor-none mt-8 md:mt-24">
              <div className="relative aspect-[4/5] overflow-hidden bg-muted rounded-sm">
                <Image src={projects[5].image} alt={projects[5].title} fill className="object-cover parallax-img scale-[1.2] will-change-transform" />
              </div>
              <div className="mt-5 flex justify-between items-start">
                <h3 className="text-xl font-medium">{projects[5].title}</h3>
                <div className="text-[9px] font-medium uppercase tracking-widest text-right flex flex-col gap-1 text-gray-500 dark:text-gray-400">
                  {projects[5].tags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-16 md:gap-24 mt-16 md:mt-0">
            {/* Project 2 */}
            <div ref={(el) => { itemsRef.current[1] = el; }} className="group cursor-none">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted rounded-sm">
                <Image src={projects[1].image} alt={projects[1].title} fill className="object-cover parallax-img scale-[1.2] will-change-transform" />
              </div>
              <div className="mt-5 flex justify-between items-start">
                <h3 className="text-xl font-medium">{projects[1].title}</h3>
                <div className="text-[9px] font-medium uppercase tracking-widest text-right flex flex-col gap-1 text-gray-500 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-500 mb-1">01/06</span>
                  {projects[1].tags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
              </div>
            </div>

            {/* Project 4 */}
            <div ref={(el) => { itemsRef.current[3] = el; }} className="group cursor-none w-full md:w-[85%] mx-auto mt-8 md:mt-12">
              <div className="relative aspect-[4/5] overflow-hidden bg-muted rounded-sm">
                <Image src={projects[3].image} alt={projects[3].title} fill className="object-cover parallax-img scale-[1.2] will-change-transform" />
              </div>
              <div className="mt-5 flex justify-between items-start">
                <h3 className="text-xl font-medium">{projects[3].title}</h3>
                <div className="text-[9px] font-medium uppercase tracking-widest text-right flex flex-col gap-1 text-gray-500 dark:text-gray-400">
                  {projects[3].tags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
              </div>
            </div>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-16 md:gap-24 mt-16 md:mt-[15vw]">
            {/* Project 3 */}
            <div ref={(el) => { itemsRef.current[2] = el; }} className="group cursor-none w-full md:w-[90%]">
              <div className="relative aspect-square overflow-hidden bg-muted rounded-sm">
                <Image src={projects[2].image} alt={projects[2].title} fill className="object-cover parallax-img scale-[1.2] will-change-transform" />
              </div>
              <div className="mt-5 flex justify-between items-start">
                <h3 className="text-xl font-medium">{projects[2].title}</h3>
                <div className="text-[9px] font-medium uppercase tracking-widest text-right flex flex-col gap-1 text-gray-500 dark:text-gray-400">
                  {projects[2].tags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
              </div>
            </div>

            {/* Project 5 */}
            <div ref={(el) => { itemsRef.current[4] = el; }} className="group cursor-none mt-8 md:mt-12">
              <div className="relative aspect-[16/10] overflow-hidden bg-muted rounded-sm">
                <Image src={projects[4].image} alt={projects[4].title} fill className="object-cover parallax-img scale-[1.2] will-change-transform" />
              </div>
              <div className="mt-5 flex justify-between items-start">
                <h3 className="text-xl font-medium">{projects[4].title}</h3>
                <div className="text-[9px] font-medium uppercase tracking-widest text-right flex flex-col gap-1 text-gray-500 dark:text-gray-400">
                  {projects[4].tags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
              </div>
            </div>
            
            {/* Bottom link box */}
            <div className="aspect-[4/3] bg-muted rounded-sm flex flex-col justify-between p-8 group overflow-hidden cursor-pointer mt-8 transition-colors hover:bg-gray-300 dark:hover:bg-[#333]">
              <div className="text-xs font-bold tracking-widest uppercase z-10 relative">
                [ ALL WORKS ]
              </div>
              <div className="relative w-full h-32 mt-4 z-10 flex-grow">
                <Image src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400" alt="All works" fill className="object-cover rounded-sm group-hover:scale-105 transition-transform duration-700 opacity-90" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}