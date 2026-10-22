"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  IconMenu2,
  IconSearch,
  IconShoppingBag,
  IconUser,
} from "@/components/store/StoreIcon";
import ZeroPopFooter from "@/components/store/ZeroPopFooter";
import productData from "@/lib/zeropop-products.json";

type Product = (typeof productData)[number];
type Sort = "featured" | "low" | "high";
type CartLine = { id: number; quantity: number; bundle?: boolean };
const products: Product[] = productData;
const categories = [
  "All",
  "Tees",
  "Hoodies",
  "Posters",
  "Frames",
  "Digital",
  "Accessories",
];
const heroSlides = [
  {
    id: 8,
    caption:
      "Rain on the window, filter coffee and a first-day-first-show kind of morning.",
  },
  {
    id: 11,
    caption: "Sea breeze, tea stalls and a story that stays after the credits.",
  },
  {
    id: 10,
    caption: "Neon, whistles and a midnight show you will never forget.",
  },
  {
    id: 12,
    caption: "Moonlit streets, old songs and a city that never sleeps.",
  },
  { id: 14, caption: "The only dialogue you need for opening day." },
];
const bundles = [
  { name: "Fan Pack", ids: [0, 14] },
  { name: "Mallu Mode Pack", ids: [1, 13] },
  { name: "Frame It Pack", ids: [10, 15] },
];
const reviews = [
  [
    "Heavy fabric, print still sharp after 10 washes. The Vera Level tee gets compliments daily.",
    "Karthik, Chennai",
    "Tamil",
  ],
  [
    "Finally Malayalam typography that looks proper. My Adipoli tee is the best fit I own.",
    "Anjali, Kochi",
    "Malayalam",
  ],
  [
    "Poster print quality is theatre-lobby level. Ordered the fan pack for my brother too.",
    "Arun, Bengaluru",
    "Both",
  ],
];
const questions = [
  [
    "Are these official film posters?",
    "No. ZEROPOP posters are original, film-inspired artworks and typography designs. We are not affiliated with any film, actor or studio.",
  ],
  [
    "What is the tee fabric and fit?",
    "Tees are heavy cotton with a soft hand feel. Check the size guide inside each product. For an oversized fit, go one size up.",
  ],
  [
    "How long does delivery take?",
    "Orders are dispatched in 2–4 working days. Delivery usually takes 3–5 days across India after dispatch.",
  ],
  [
    "Can I return or exchange?",
    "Unused items can be returned or exchanged within 7 days. Digital downloads are non-refundable once delivered.",
  ],
  [
    "How do digital products work?",
    "You get an instant download link after payment. Files are for personal use only.",
  ],
];
const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const art = (id: number) => `/brand/store-art/${id}.svg`;
const language = (key: string | null) =>
  key === "ta" ? "Tamil" : key === "ml" ? "Malayalam" : "";

function Art({
  id,
  alt,
  className = "",
}: {
  id: number;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      className={className}
      src={art(id)}
      alt={alt}
      width={400}
      height={500}
      unoptimized
    />
  );
}

export default function StorefrontPage() {
  const reduceMotion = useReducedMotion();
  const [category, setCategory] = useState("All");
  const [languageFilter, setLanguageFilter] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("featured");
  const [limit, setLimit] = useState(8);
  const [slide, setSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickView, setQuickView] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % heroSlides.length),
      5500,
    );
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    const result = products.filter(
      (product) =>
        (category === "All" || product.category === category) &&
        (!languageFilter ||
          !product.language ||
          product.language === languageFilter) &&
        (!value ||
          `${product.name} ${product.subtitle} ${product.category}`
            .toLowerCase()
            .includes(value)),
    );
    if (sort === "low") result.sort((a, b) => a.price - b.price);
    if (sort === "high") result.sort((a, b) => b.price - a.price);
    return result;
  }, [category, languageFilter, query, sort]);

  const selectCategory = (value: string) => {
    setCategory(value);
    setLanguageFilter("");
    setLimit(8);
    setMenuOpen(false);
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  };
  const addToCart = (id: number) => {
    setCart((current) => {
      const found = current.find((item) => item.id === id && !item.bundle);
      return found
        ? current.map((item) =>
            item.id === id && !item.bundle ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...current, { id, quantity: 1 }];
    });
    setQuickView(null);
    setCartOpen(true);
  };
  const addBundle = (ids: number[]) => {
    setCart((current) => {
      const next = [...current];
      for (const id of ids) {
        const index = next.findIndex((item) => item.id === id && item.bundle);
        if (index < 0) next.push({ id, quantity: 1, bundle: true });
        else next[index] = { ...next[index], quantity: next[index].quantity + 1 };
      }
      return next;
    });
    setCartOpen(true);
  };
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + Math.round(products[item.id].price * (item.bundle ? 0.85 : 1)) * item.quantity,
    0,
  );
  const hero = heroSlides[slide];
  const featured = products[hero.id];

  return (
    <div className="zeropop-native-storefront">
      <div className="tk m">
        <div>
          {Array.from({ length: 3 }, (_, index) => (
            <span key={index}>
              ★ First day first show &nbsp; ★ Free shipping above ₹999 &nbsp; ★
              Tamil + Malayalam drops weekly &nbsp; ★ Original studio drops every week
              off &nbsp;{" "}
            </span>
          ))}
        </div>
      </div>
      <header className={menuOpen ? "menu-open" : ""}>
        <div className="w">
          <button
            className="mobile-menu-trigger"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <IconMenu2 size={20} />
          </button>
          <Link href="/" className="lg d" aria-label="ZEROPOP home">
            <span className="logo-lockup">
              <Image
                className="zeropop-logo"
                src="/brand/zeropop-logo-header.svg"
                alt="ZEROPOP"
                width={175}
                height={62}
                priority
              />
              <span className="logo-byline">BY ZEROCRAFT STUDIO</span>
            </span>
          </Link>
          <nav className="m" aria-label="Store categories">
            {categories.slice(1, 6).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => selectCategory(item)}
              >
                {item}
              </button>
            ))}
            <a href="#bundles" onClick={() => setMenuOpen(false)}>
              Bundles
            </a>
          </nav>
          <div className="ic">
            <button
              className="sr"
              type="button"
              aria-label="Search our store"
              onClick={() => {
                document
                  .getElementById("shop")
                  ?.scrollIntoView({ behavior: "smooth" });
                document.getElementById("store-search")?.focus();
              }}
            >
              <IconSearch size={20} />
              <span>Search our store</span>
            </button>
            <Link href="/store/account" aria-label="Open account">
              <IconUser size={20} />
            </Link>
            <button
              className="ct"
              type="button"
              aria-label={`Open cart, ${cartCount} items`}
              onClick={() => setCartOpen(true)}
            >
              <IconShoppingBag size={20} />
              <span>{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" aria-label="Featured ZEROPOP artwork">
          <div className="bl t" aria-hidden="true" />
          <div className="s on">
            <div className="hero-copy">
              <span className="kk m">
                Now showing ·{" "}
                {language(featured.language) || "Tamil + Malayalam"}
              </span>
              <h1 className="d">
                {featured.title.replaceAll("|", " ")}
                <small className="nt">
                  {featured.native || "தமிழ் · മലയാളം"}
                </small>
              </h1>
              <p>{hero.caption}</p>
              <div className="bt2">
                <button
                  className="b"
                  type="button"
                  onClick={() => setQuickView(featured.id)}
                >
                  View poster · {money(featured.price)}
                </button>
                <button
                  className="b g"
                  type="button"
                  onClick={() => selectCategory("Tees")}
                >
                  Shop tees
                </button>
              </div>
            </div>
            <div className="pp">
              <Image
                className="sp b2"
                src={`/brand/store-art/poster-${heroSlides[(slide + 1) % heroSlides.length].id}.svg`}
                alt=""
                width={300}
                height={400}
                unoptimized
              />
              <Image
                className="sp b1"
                src={`/brand/store-art/poster-${hero.id}.svg`}
                alt={featured.name}
                width={300}
                height={400}
                priority
                unoptimized
              />
              <span className="lgb">
                {language(featured.language) || "Tamil + Malayalam"}
              </span>
            </div>
          </div>
          <div className="fic">
            Original artwork · © ZEROPOP / Zerocraft Studio · Personal-use art
            license · Not affiliated with any film or studio
          </div>
          <div className="sc" aria-hidden="true" />
        </section>

        <section className="categories-section">
          <div className="w">
            <div className="sh">
              <div>
                <div className="k m">01 / Pick your seat</div>
                <h2 className="d">
                  Shop the <em>screen.</em>
                </h2>
              </div>
              <button
                className="lnk m"
                type="button"
                onClick={() => selectCategory("All")}
              >
                Shop all →
              </button>
            </div>
            <div className="cats">
              {categories.slice(1).map((item) => {
                const product = products.find(
                  (entry) => entry.category === item,
                )!;
                return (
                  <button
                    className="ct2"
                    key={item}
                    type="button"
                    onClick={() => selectCategory(item)}
                  >
                    <div className="ci">
                      <Art id={product.id} alt="" />
                    </div>
                    <div className="cn d">
                      {item}
                      <small>
                        {
                          products.filter((entry) => entry.category === item)
                            .length
                        }{" "}
                        items
                      </small>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="language-section">
          <div className="w">
            <div className="sh">
              <div>
                <div className="k m">02 / Choose your industry</div>
                <h2 className="d">
                  Tamil. <em>Malayalam.</em>
                </h2>
              </div>
            </div>
            <div className="lgs">
              {[
                ["ta", "t", "Kollywood vibes", "Tamil", "தமிழ்", 8, 10],
                ["ml", "l", "Mollywood vibes", "Malayalam", "മലയാളം", 11, 12],
              ].map(([key, tone, label, name, native, first, second]) => (
                <button
                  className={`lc ${tone}`}
                  key={key}
                  type="button"
                  onClick={() => {
                    setCategory("All");
                    setLanguageFilter(String(key));
                    setLimit(8);
                    document
                      .getElementById("shop")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <div className="pz">
                    <Image
                      src={`/brand/store-art/poster-${first}.svg`}
                      alt=""
                      width={190}
                      height={253}
                      unoptimized
                    />
                    <Image
                      src={`/brand/store-art/poster-${second}.svg`}
                      alt=""
                      width={150}
                      height={200}
                      unoptimized
                    />
                  </div>
                  <span className="m">{label}</span>
                  <h3 className="d">{name}</h3>
                  <span className="nt">{native}</span>
                  <em className="m">
                    Shop{" "}
                    {products.filter((entry) => entry.language === key).length}{" "}
                    designs →
                  </em>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="shop" className="products-section">
          <div className="w">
            <div className="sh">
              <div>
                <div className="k m">03 / Now trending</div>
                <h2 className="d">
                  First day. <em>First show.</em>
                </h2>
              </div>
            </div>
            <div className="bar m">
              {categories.map((item) => (
                <button
                  className={`chip ${category === item ? "on" : ""}`}
                  key={item}
                  type="button"
                  onClick={() => {
                    setCategory(item);
                    setLimit(8);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="bar m">
              <button
                className={`chip lp ${!languageFilter ? "on" : ""}`}
                type="button"
                onClick={() => setLanguageFilter("")}
              >
                All languages
              </button>
              <button
                className={`chip lp ${languageFilter === "ta" ? "on" : ""}`}
                type="button"
                onClick={() => setLanguageFilter("ta")}
              >
                Tamil
              </button>
              <button
                className={`chip lp ${languageFilter === "ml" ? "on" : ""}`}
                type="button"
                onClick={() => setLanguageFilter("ml")}
              >
                Malayalam
              </button>
              <input
                className="sp2"
                id="store-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(8);
                }}
                placeholder="Search tees, posters, typography…"
                aria-label="Search products"
              />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                aria-label="Sort products"
              >
                <option value="featured">Featured</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </div>
            <div className="cnt m">
              Showing {Math.min(limit, filtered.length)} of {filtered.length}{" "}
              designs
            </div>
            <div className="grid">
              {filtered.slice(0, limit).map((product) => (
                <motion.article className="pc" key={product.id} initial={reduceMotion ? undefined : { opacity: 0, y: 22 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.45, ease: "easeOut" }}>
                  <button
                    className="im"
                    type="button"
                    onClick={() => setQuickView(product.id)}
                    aria-label={`View ${product.name}`}
                  >
                    <Art id={product.id} alt="" />
                    {product.badge && (
                      <span className="bd m">{product.badge}</span>
                    )}
                    <span className="off m">
                      −
                      {Math.round(
                        (1 - product.price / product.originalPrice) * 100,
                      )}
                      %
                    </span>
                    {product.language && (
                      <span className="lt m">{language(product.language)}</span>
                    )}
                  </button>
                  <div className="in">
                    <small className="m">{product.subtitle}</small>
                    <h3>{product.name}</h3>
                    <div className="ft">
                      <div className="pr">
                        <b>{money(product.price)}</b>
                        <s>{money(product.originalPrice)}</s>
                      </div>
                      <button
                        className="ad"
                        type="button"
                        onClick={() => addToCart(product.id)}
                      >
                        + Add
                      </button>
                    </div>
                    {product.badge === "Limited" && (
                      <div className="lw">Only {3 + (product.id % 5)} left</div>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="empty-products">
                Nothing here yet. Try another search.
              </p>
            )}
            {filtered.length > limit && (
              <div className="more">
                <button
                  className="b k2"
                  type="button"
                  onClick={() => setLimit(limit + 8)}
                >
                  Load more designs
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="tyb">
          <div className="mq2 d">
            <div>
              <span>First Day First Show</span>
              <b>★</b>
              <span className="nt">செம்ம மாஸ்</span>
              <b>★</b>
              <span>Mass Entry</span>
              <b>★</b>
              <span>First Day First Show</span>
            </div>
          </div>
          <div className="mq2 d rv">
            <div>
              <span>Interval Break</span>
              <b>★</b>
              <span className="nt">வேற லெவல்</span>
              <b>★</b>
              <span>Last Row Gang</span>
              <b>★</b>
              <span>Interval Break</span>
            </div>
          </div>
          <div className="c">
            <button
              className="b"
              type="button"
              onClick={() => {
                setCategory("All");
                setQuery("Typography");
                document
                  .getElementById("shop")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Shop typography drops →
            </button>
          </div>
        </div>

        <section id="bundles" className="bundles-section">
          <div className="w">
            <div className="sh">
              <div>
                <div className="k m">04 / Combo offers</div>
                <h2 className="d">
                  Fan packs. <em>Save 15%.</em>
                </h2>
              </div>
            </div>
            <div className="bnd">
              {bundles.map((bundle) => {
                const total = bundle.ids.reduce(
                  (sum, id) => sum + products[id].price,
                  0,
                );
                return (
                  <article className="bd2" key={bundle.name}>
                    <div className="th2">
                      <div>
                        <Art id={bundle.ids[0]} alt="" />
                      </div>
                      <i>+</i>
                      <div>
                        <Art id={bundle.ids[1]} alt="" />
                      </div>
                    </div>
                    <div className="bi">
                      <div className="k m">Save 15%</div>
                      <h3 className="d">{bundle.name}</h3>
                      <p>
                        {bundle.ids.map((id) => products[id].name).join(" + ")}
                      </p>
                      <div className="pr">
                        <b>{money(bundle.ids.reduce((sum, id) => sum + Math.round(products[id].price * 0.85), 0))}</b>
                        <s>{money(total)}</s>
                      </div>
                      <button
                        className="b r"
                        type="button"
                        onClick={() => addBundle(bundle.ids)}
                      >
                        Add bundle
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="abs">
          <div className="w ab">
            <div>
              <div className="k m">Our story</div>
              <h2 className="d">
                For the last row. <em>For the whistle.</em>
              </h2>
              <p>
                ZEROPOP is cinema streetwear for people who grew up on
                first-day-first-show, tea stall debates and dialogues they still
                quote. Original art, studio printed, made for Tamil and
                Malayalam fans.
              </p>
              <button
                className="b"
                type="button"
                onClick={() => selectCategory("All")}
              >
                Browse the drop →
              </button>
            </div>
            <div className="st">
              <div>
                <b>22</b>original designs
              </div>
              <div>
                <b>2</b>languages, one club
              </div>
              <div>
                <b>4.8★</b>average rating
              </div>
              <div>
                <b>2–4</b>days to dispatch
              </div>
            </div>
          </div>
        </section>
        <section className="reviews-section">
          <div className="w">
            <div className="sh">
              <div>
                <div className="k m">Fan reviews</div>
                <h2 className="d">
                  Houseful <em>reviews.</em>
                </h2>
              </div>
            </div>
            <div className="rvs">
              {reviews.map(([quote, author, origin]) => (
                <article className="rc" key={author}>
                  <span className="st2 m">★★★★★</span>
                  <p>{quote}</p>
                  <div className="m">
                    <span>{author}</span>
                    <span>{origin}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="faq-section">
          <div className="w">
            <div className="sh">
              <div>
                <div className="k m">Doubts?</div>
                <h2 className="d">
                  Quick <em>answers.</em>
                </h2>
              </div>
            </div>
            <div className="fq">
              {questions.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <div className="w">
          <div className="tr m">
            <div>
              <b>Free shipping</b>Above ₹999
            </div>
            <div>
              <b>7-day returns</b>Easy exchange
            </div>
            <div>
              <b>Secure checkout</b>UPI and cards
            </div>
            <div>
              <b>Made in India</b>Studio printed
            </div>
          </div>
        </div>
        <div className="nl">
          <div className="w">
            <div>
              <div className="k m">Admit one</div>
              <h2 className="d">
                Join the <em>first-show list.</em>
              </h2>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const email = new FormData(event.currentTarget).get("email");
                setEmailMessage(
                  typeof email === "string" && /^\S+@\S+\.\S+$/.test(email)
                    ? "You're on the first-show list!"
                    : "Please enter a valid email.",
                );
              }}
            >
              <input
                name="email"
                type="email"
                placeholder="Your email for early access"
                aria-label="Your email for early access"
              />
              <button type="submit">Get in</button>
              {emailMessage && (
                <span role="status" className="newsletter-status">
                  {emailMessage}
                </span>
              )}
            </form>
          </div>
        </div>
      </main>
      <ZeroPopFooter />
      <footer className="legacy-footer" aria-hidden="true">
        <div className="w">
          <div className="wm d">THE ZEROPOP CLUB</div>
          <div className="m">
            <span>© 2026 ZEROPOP / Zerocraft Studio</span>
            <span>Original artwork · Personal-use art license</span>
            <Link href="/store/contact">Contact</Link>
          </div>
        </div>
      </footer>
      <div className="mb">
        <button type="button" onClick={() => selectCategory("All")}>
          Shop
        </button>
        <button
          type="button"
          onClick={() => document.getElementById("store-search")?.focus()}
        >
          Search
        </button>
        <button type="button" onClick={() => setCartOpen(true)}>
          Cart {cartCount}
        </button>
      </div>
      {(cartOpen || quickView !== null) && (
        <button
          className="ov on"
          type="button"
          aria-label="Close dialog"
          onClick={() => {
            setCartOpen(false);
            setQuickView(null);
          }}
        />
      )}
      {quickView !== null && (
        <div
          className="md on"
          role="dialog"
          aria-modal="true"
          aria-label={products[quickView].name}
        >
          <div className="ph">
            <Art id={quickView} alt={products[quickView].name} />
          </div>
          <div className="tx">
            <button
              className="x"
              type="button"
              aria-label="Close"
              onClick={() => setQuickView(null)}
            >
              ×
            </button>
            <div className="k m">{products[quickView].subtitle}</div>
            <h3 className="d">{products[quickView].name}</h3>
            <div className="pr">
              <b>{money(products[quickView].price)}</b>
              <s>{money(products[quickView].originalPrice)}</s>
            </div>
            <p className="ds">
              Original ZEROPOP artwork, studio printed for cinema fans. Not an
              official film product.
            </p>
            <button
              className="b r"
              type="button"
              onClick={() => addToCart(quickView)}
            >
              Add to cart
            </button>
          </div>
        </div>
      )}
      <aside
        className={`dr ${cartOpen ? "on" : ""}`}
        aria-label="Your cart"
        aria-hidden={!cartOpen}
      >
        <h3 className="d">
          Your cart{" "}
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
          >
            ×
          </button>
        </h3>
        <div className="fs">
          {cartTotal >= 999
            ? "✓ Free shipping unlocked"
            : `Add ${money(999 - cartTotal)} more for free shipping`}
        </div>
        <div className="cart-lines">
          {cart.length === 0 ? (
            <p>Your cart is empty. Pick a scene.</p>
          ) : (
            cart.map((line) => (
              <div className="it" key={`${line.id}-${line.bundle ? "bundle" : "single"}`}>
                <div className="th">
                  <Art id={line.id} alt="" />
                </div>
                <div>
                  <b>{products[line.id].name}</b>
                  <span>
                    {money(Math.round(products[line.id].price * (line.bundle ? 0.85 : 1)))} × {line.quantity}{line.bundle ? " · Bundle −15%" : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCart((current) =>
                      current.filter((entry) => entry.id !== line.id || !!entry.bundle !== !!line.bundle),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <div className="tot">
          <span>Total</span>
          <span>{money(cartTotal)}</span>
        </div>
        <Link className="b r checkout-link" href="/store/checkout">
          Checkout →
        </Link>
      </aside>
    </div>
  );
}
