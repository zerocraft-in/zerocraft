"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LineChart, Gift, FolderKanban, Star } from "lucide-react";
import IvdLink from "../ui/ivd-link";
import { cn } from "@/lib/utils";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: <LineChart className="w-4 h-4" />,
    },
    {
      name: "About Us",
      href: "/about-us",
      icon: <Star className="w-4 h-4" />,
    },
    {
      name: "Services",
      href: "/services",
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      name: "Case Studies",
      href: "/works",
      icon: <FolderKanban className="w-4 h-4" />,
    },
    {
      name: "Blog",
      href: "/blogs",
      icon: <LineChart className="w-4 h-4" />,
    },
  ];

  return (
    <header className="fixed top-4 w-full z-10 flex justify-center">
      <div className="bg-background/90 backdrop-blur-sm rounded-full shadow-sm p-2 flex items-center justify-between max-w-4xl max-md:mx-2 w-full">
        {/* Logo */}
        <div className="flex items-center">
          <div className="text-xl font-bold text-primary flex items-center">
            <Link href="/">
              {" "}
              <div className="w-10 h-10 bg-background border shadow-sm rounded-full flex items-center justify-center mr-2">
                <span className="text-primary font-bold text-sm">P</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex">
          <div className="md:flex items-center gap-2 px-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center text-gray-600 hover:text-primary transition-colors text-sm font-medium px-3 py-1.5 rounded-full",
                  pathname === item.href
                    ? "bg-background border border-gray-500 text-muted-foreground"
                    : ""
                )}
              >
                {item.icon}
                <span className="ml-1.5">{item.name}</span>
              </Link>
            ))}
          </div>
          <IvdLink
            href="/contact"
            className="bg-primary rounded-full !text-background"
            title="Let's Talk"
          />
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            className="flex items-center gap-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <span>Menu</span>
            <div className="relative w-4 h-2">
              {/* Top Line */}
              <motion.div
                className="absolute top-0 left-0 w-full h-0.5 bg-secondary"
                animate={{
                  rotate: isOpen ? 45 : 0,
                  y: isOpen ? 4 : 0,
                  transformOrigin: "center",
                }}
                transition={{ duration: 0.3 }}
              />
              {/* Bottom Line */}
              <motion.div
                className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary"
                animate={{
                  rotate: isOpen ? -45 : 0,
                  y: isOpen ? -4 : 0,
                  transformOrigin: "center",
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-full mt-2 right-4 rounded-2xl w-64 bg-white shadow-lg p-4 z-40"
          >
            <ul className="space-y-4">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center text-gray-600 hover:text-primary transition-colors py-2",
                      pathname === item.href && "text-primary font-medium"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon}
                    <span className="ml-2">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
