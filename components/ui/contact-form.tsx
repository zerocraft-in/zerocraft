"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type React from "react";
import type { Easing } from "framer-motion";

const easeOut: Easing = [0.16, 1, 0.3, 1];
const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setFormData({ name: "", email: "", company: "", message: "" });
      setIsSubmitted(false);
    }, 3000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: easeOut },
    },
  };

  return (
    <motion.form
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit}
      className="contact-form"
    >
      {/* Name */}
      <motion.div variants={itemVariants} className="form-field">
        <label htmlFor="name">Full Name</label>
        <motion.input
          whileFocus={{ scale: 1.02 }}
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Your name"
        />
      </motion.div>

      {/* Email */}
      <motion.div variants={itemVariants} className="form-field">
        <label htmlFor="email">Email Address</label>
        <motion.input
          whileFocus={{ scale: 1.02 }}
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="your@email.com"
        />
      </motion.div>

      {/* Company */}
      <motion.div variants={itemVariants} className="form-field">
        <label htmlFor="company">Company</label>
        <motion.input
          whileFocus={{ scale: 1.02 }}
          id="company"
          name="company"
          type="text"
          value={formData.company}
          onChange={handleChange}
          placeholder="Your company"
        />
      </motion.div>

      {/* Message */}
      <motion.div variants={itemVariants} className="form-field">
        <label htmlFor="message">Message</label>
        <motion.textarea
          whileFocus={{ scale: 1.02 }}
          id="message"
          name="message"
          rows={5}
          value={formData.message}
          onChange={handleChange}
          required
          placeholder="Tell us about your project..."
        />
      </motion.div>

      {/* Submit */}
      <motion.div variants={itemVariants}>
        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="form-success"
          >
            Message sent successfully! We’ll be in touch soon.
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="form-submit"
          >
            Send Message
          </motion.button>
        )}
      </motion.div>
    </motion.form>
  );
};

export default ContactForm;
