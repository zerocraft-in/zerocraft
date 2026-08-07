"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSearch,
  IconHeart,
  IconShoppingBag,
  IconUser,
  IconMenu2,
  IconX,
  IconSparkles,
  IconSun,
  IconMoon,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useStore } from "@/lib/store/useStore";

export default function StoreHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { cart, wishlist, toggleCartDrawer, toggleSearchModal } = useStore();

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlist.length;

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Categories", href: "/shop#categories" },
    { label: "Custom Products", href: "/shop?category=customized-gifts" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-[200] transition-all duration-300 ${
          scrolled
            ? "py-3 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/60 shadow-xs"
            : "py-5 bg-transparent"
        }`}
      >
        <div className="container-site flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label="ZeroCraft Store Home"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black group-hover:scale-105 transition-transform shadow-xs">
              <svg
                viewBox="0 0 24 24"
                width={20}
                height={20}
                fill="currentColor"
              >
                <path d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white uppercase leading-none">
                ZeroCraft
              </span>
              <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 tracking-widest uppercase">
                Store
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-mono tracking-wider uppercase transition-colors relative py-1 ${
                    isActive
                      ? "text-neutral-900 dark:text-white font-semibold"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500 rounded-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Search Trigger */}
            <button
              onClick={() => toggleSearchModal(true)}
              aria-label="Search Store"
              className="p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5 text-xs font-mono"
            >
              <IconSearch size={19} />
              <span className="hidden sm:inline text-[11px] text-neutral-400">⌘K</span>
            </button>

            {/* Wishlist Button */}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              <IconHeart size={19} />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-mono font-bold text-white shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Trigger Drawer Button */}
            <button
              onClick={() => toggleCartDrawer(true)}
              aria-label="Open Shopping Cart"
              className="relative flex items-center gap-2 py-2 px-3.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-xs"
            >
              <IconShoppingBag size={17} />
              <span className="hidden sm:inline font-mono">Cart</span>
              {totalCartCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-mono font-bold text-black ml-1">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Account Profile Link */}
            <Link
              href="/account"
              aria-label="Account Profile"
              className="hidden sm:flex p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              <IconUser size={19} />
            </Link>

            {/* Theme Toggle Button */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle dark/light mode"
                className="p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                {theme === "dark" ? <IconSun size={19} className="text-amber-400" /> : <IconMoon size={19} />}
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 top-[70px] z-[190] bg-white dark:bg-neutral-950 p-6 flex flex-col justify-between border-t border-neutral-200 dark:border-neutral-800 lg:hidden overflow-y-auto"
          >
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xl font-bold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-2 border-b border-neutral-100 dark:border-neutral-900"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xl font-bold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-2 border-b border-neutral-100 dark:border-neutral-900"
              >
                My Account Profile
              </Link>
              <Link
                href="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xl font-bold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-2 border-b border-neutral-100 dark:border-neutral-900"
              >
                Wishlist ({wishlistCount})
              </Link>
            </nav>

            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center">
              <p className="text-xs font-mono text-neutral-400 mb-2">
                store.zerocraft.in • Crafted with Passion
              </p>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-xs uppercase tracking-wider"
              >
                Close Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
