"use client";

import { motion } from "framer-motion";
import type React from "react";
import type { Easing } from "framer-motion";
import {
  IconMail,
  IconPhone,
  IconMapPin,
  IconArrowRight,
  IconBrandTwitter,
  IconBrandLinkedin,
  IconBrandInstagram,
} from "@tabler/icons-react";

const easeOut: Easing = [0.16, 1, 0.3, 1];

interface ContactMethod {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}

const ContactInfo: React.FC = () => {
  const contactMethods: ContactMethod[] = [
    {
      icon: <IconMail size={28} stroke={1.5} />,
      label: "Email",
      value: "hello.zerocraft@gmail.com",
      href: "mailto:hello.zerocraft@gmail.com",
    },
    {
      icon: <IconPhone size={28} stroke={1.5} />,
      label: "Phone",
      value: "+91 9566830682",
      href: "tel:+919566830682",
    },
    {
      icon: <IconMapPin size={28} stroke={1.5} />,
      label: "Location",
      value: "Tenkasi, Tamilnadu",
      href: "#",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: easeOut },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="contact-info"
    >
      {/* Contact Methods */}
      {contactMethods.map((method, index) => (
        <motion.a
          key={index}
          variants={itemVariants}
          href={method.href}
          className="contact-card"
          whileHover={{ y: -4 }}
        >
          <div className="contact-card-inner">
            <motion.div
              whileHover={{ scale: 1.15, rotate: 6 }}
              className="contact-icon"
            >
              {method.icon}
            </motion.div>

            <div className="contact-content">
              <p className="contact-label">{method.label}</p>
              <p className="contact-value">{method.value}</p>
            </div>

            <motion.span
              className="contact-arrow"
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <IconArrowRight size={18} />
            </motion.span>
          </div>
        </motion.a>
      ))}

      {/* Availability */}
      <motion.div variants={itemVariants} className="contact-availability">
        <p className="availability-label">Response Time</p>
        <p className="availability-text">
          We typically respond within
          <motion.span
            className="availability-accent"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            24 hours
          </motion.span>
        </p>
      </motion.div>

      {/* Social Links */}
      <motion.div variants={itemVariants} className="contact-social">
        <p className="social-title">Follow Us</p>
        <div className="social-links">
          {[
            {
              icon: <IconBrandTwitter size={18} />,
              label: "Twitter",
            },
            {
              icon: <IconBrandLinkedin size={18} />,
              label: "LinkedIn",
            },
            {
              icon: <IconBrandInstagram size={18} />,
              label: "Instagram",
            },
          ].map((social, idx) => (
            <motion.a
              key={social.label}
              href="#"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + idx * 0.1, ease: easeOut }}
              whileHover={{ scale: 1.15, y: -2 }}
              className="social-link"
              title={social.label}
            >
              {social.icon}
            </motion.a>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ContactInfo;
