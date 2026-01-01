"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";

const testimonialsData = [
  {
    id: 1,
    avatar: "/images/me-2.jpg",
    name: "Maran IVD",
    role: "Creative Director",
    rating: 4,
    text: "Andrew delivered exceptional work—creative, detailed, and perfectly aligned with our vision. Highly recommend!",
    author: "Jessica Stone",
    authorRole: "Creative Director at Lumina",
    background: "/images/jessica.png",
  },
  {
    id: 2,
    avatar: "/images/me-2.jpg",
    name: "Maran IVD",
    role: "Creative Director",
    rating: 5,
    text: "Jane's work is always top-notch. She pays attention to every detail and delivers on time.",
    author: "John Smith",
    authorRole: "Product Manager at TechCorp",
    background: "/images/john-smith.png",
  },
  {
    id: 3,
    avatar: "/images/me-2.jpg",
    name: "Maran IVD",
    role: "Creative Director",
    rating: 5,
    text: "John's leadership and attention to detail have been instrumental in our success.",
    author: "Jane Doe",
    authorRole: "UI/UX Designer at TechCorp",
    background: "/images/john-smith.png",
  },
];

const Testimonials = () => {
  const [index, setIndex] = useState(0);

  const nextTestimonial = () => {
    setIndex((prevIndex) => (prevIndex + 1) % testimonialsData.length);
  };

  const prevTestimonial = () => {
    setIndex(
      (prevIndex) =>
        (prevIndex - 1 + testimonialsData.length) % testimonialsData.length
    );
  };

  const testimonial = testimonialsData[index];

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      nextTestimonial();
    }, 5000); // Change testimonial every 5 seconds

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [index]);

  return (
    <div className="ssr-variant hidden-via1vz">
      <div className="framer-1q7an67-container opacity-100 transform-none">
        <div className="framer-pPJUL framer-3KqNm framer-mqgVs framer-ys3KV framer-u1hvij framer-v-1diuxkp cursor-pointer bg-primary rounded-[60px] opacity-100">
          <div className="ivd-17l49fu opacity-100" id="border">
            <div className="absolute border-inherit top-0 right-0 left-0 bottom-0">
              <Image
                src="/images/mobile-frame.png"
                alt="Border Image"
                width={461}
                height={461}
                className="block w-full h-full border-inherit object-center object-cover"
              />
            </div>
          </div>
          <div
            id="gestures"
            className="framer-1wfwcdg rounded-[60px] opacity-100"
          >
            <div className="framer-q7lyue-container opacity-100">
              <div
                className="framer-6sTST framer-l9voy8 framer-v-l9voy8 h-full w-full opacity-100"
                data-framer-name="Left"
                onClick={prevTestimonial}
              >
                <div
                  className="framer-1x9hzl9"
                  style={{
                    background:
                      "linear-gradient(270deg, rgba(0, 0, 0, 0) -4%, rgba(0, 0, 0, 0.16) 100%)",
                    opacity: "0",
                    willChange: "transform",
                  }}
                ></div>
              </div>
            </div>
            <div className="framer-1bbytm5-container" style={{ opacity: "1" }}>
              <div
                className="framer-6sTST framer-l9voy8 framer-v-1nrkebe h-full w-full opacity-100"
                data-framer-name="Right"
                onClick={nextTestimonial}
              >
                <div
                  className="framer-1x9hzl9"
                  style={{
                    background:
                      "linear-gradient(270deg, rgba(0, 0, 0, 0.16) 0%, rgba(0, 0, 0, 0) 100%)",
                    opacity: "0",
                    willChange: "transform",
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="framer-tjz15z" id="Content">
            <div className="framer-4k3j5v" id="top">
              {/* Circular Progress Bar */}
              <div className="flex justify-center items-center relative space-x-2">
                {testimonialsData.map((_, i) => (
                  <div
                    key={i}
                    className={`w-20 h-1 rounded-full transition-colors duration-300 ${
                      i === index ? "bg-background" : "bg-muted/60"
                    }`}
                  ></div>
                ))}
              </div>
              <div
                className="flex items-center w-full space-x-2"
                data-framer-name="Person"
              >
                <div
                  className="framer-a8pssy"
                  data-framer-name="Avatar"
                  style={{ opacity: "1", borderRadius: "100%" }}
                >
                  <div
                    style={{
                      position: "absolute",
                      borderRadius: "inherit",
                      top: "0",
                      right: "0",
                      bottom: "0",
                      left: "0",
                    }}
                  >
                    <Image
                      src={testimonial.avatar}
                      alt="Avatar"
                      width={33}
                      height={33}
                      className="block w-full h-full shadow-md border-2 rounded-full object-cover"
                    />
                  </div>
                </div>
                <div
                  className="framer-1rx9d1e flex flex-col w-full"
                  data-framer-name="Text"
                >
                  <div
                    className="framer-1gw64r"
                    style={{
                      outline: "none",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      flexShrink: "0",
                      color: "rgb(255, 255, 255)",
                      opacity: "1",
                    }}
                  >
                    <p className="text-sm">{testimonial.name}</p>
                  </div>
                  <div
                    className="framer-9dni2d text-muted text-xs"
                    style={{
                      outline: "none",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      flexShrink: "0",
                      opacity: "0.6",
                    }}
                  >
                    <p className="text-xs">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div
                  className="framer-klkaz5"
                  data-framer-name="Content"
                  style={{ opacity: "1", transform: "none" }}
                >
                  <div
                    className="framer-1jh088u"
                    data-framer-name="Testimonial"
                  >
                    <div className="flex gap-1 py-2 items-start">
                      {Array.from({ length: testimonial.rating }, (_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 fill-secondary stroke-none"
                        />
                      ))}
                    </div>
                    <div
                      className="framer-4w0oj"
                      data-framer-name="Testimonial Text"
                    >
                      <p className="text-sm text-background">
                        {testimonial.text}
                      </p>
                    </div>
                  </div>
                  <div className="framer-sj6uqc" data-framer-name="Author">
                    <div
                      className="framer-17sokik"
                      data-framer-name={testimonial.author}
                    >
                      <p className="text-secondary">{testimonial.author}</p>
                    </div>
                    <div
                      className="framer-5u8bdm"
                      data-framer-name={testimonial.authorRole}
                    >
                      <p className="text-xs text-muted/60">
                        {testimonial.authorRole}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            className="framer-fmdq4v"
            data-framer-name="Image container"
            style={{ opacity: "0.07" }}
          >
            <div
              className="framer-1b5lqgf"
              data-framer-name="BG"
              style={{ opacity: "1", transform: "none", borderRadius: "60px" }}
            >
              <div
                style={{
                  position: "absolute",
                  borderRadius: "inherit",
                  top: "0",
                  right: "0",
                  bottom: "0",
                  left: "0",
                }}
              >
                <Image
                  src={testimonial.background}
                  alt="Background"
                  width={360} // Set an appropriate width
                  height={360} // Set an appropriate height
                  className="block w-full h-full rounded-[60px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
