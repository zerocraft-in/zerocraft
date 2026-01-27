"use client";
import { AvatarCircles } from "@/components/ui/avatar-circles";
import TestimonialSlider from "./testimonials";
import Image from "next/image";
import { motion } from "framer-motion"; // Import Framer Motion

const avatars = [
  {
    imageUrl: "/images/u/16860528.png",
    profileUrl: "https://github.com/dillionverma",
  },
  {
    imageUrl: "/images/u/20110627.png",
    profileUrl: "https://github.com/tomonarifeehan",
  },
  {
    imageUrl: "/images/u/106103625.png",
    profileUrl: "https://github.com/BankkRoll",
  },
  {
    imageUrl: "/images/u/59228569.png",
    profileUrl: "https://github.com/safethecode",
  },
  {
    imageUrl: "/images/u/59442788.png",
    profileUrl: "https://github.com/sanjay-mali",
  },
  {
    imageUrl: "/images/u/89768406.png",
    profileUrl: "https://github.com/itsarghyadas",
  },
];

const TestimoinalsSection = () => {
  return (
    <section className="py-20 framer-11cicqo" id="testimonials">
      <motion.div
        id="container"
        className="framer-dgmq81 container mx-auto py-10"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <header className="section-header" id="heading">
          <h2 className="section-title text-accent-primary">Words from my clients</h2>
          <div className="flex flex-col py-5 justify-center items-center">
            <div className="border p-1 rounded-full bg-background">
              <AvatarCircles numPeople={99} avatarUrls={avatars} />
            </div>
            <div className="py-5">
              <span className="text-sm text-primary">Loved by those</span>
              <p className="text-xs text-muted-foreground">
                who value thoughtful design.
              </p>
            </div>
          </div>
        </header>

        {/* Motion added here */}
        <div id="phone" className="framer-1d0bs7b">
          <div
            className="framer-5zin16 hidden-via1vz opacity-[1] transform-none"
            id="screen"
          />
          <TestimonialSlider />
          <div
            className="framer-6z6rmz hidden-via1vz opacity-[1] transform-none"
            id="screen"
          />
          <div
            id="hand"
            className="opacity-[1] framer-1elj2c1 hidden-via1vz max-md:hidden transform-none"
          >
            <div className="absolute top-0 right-0 bottom-0 left-0">
              <Image
                src="/images/mobile-hand.png"
                alt="Close-up of the hand holding the mobile phone"
                width={731}
                height={1096}
                sizes="(max-width: 768px) 100vw, 550px"
                className="block w-full h-full object-cover object-center"
                priority={false}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default TestimoinalsSection;
