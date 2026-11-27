import Link from 'next/link';
import Icon from './Icon';
import Marquee from './Marquee';
import CatalogProductCard from './CatalogProductCard';
import NewsForm from './NewsForm';
import { Burst, Clap, Corn, PosterFrame, Reel } from './Graphics';
import { getProducts } from '@/lib/commerce/catalog';
import { formatMoney } from '@/lib/products';
import Customize from './Customize';

const stars = Array.from({ length: 5 });

const REVIEWS = [
  { band: 'var(--red)', ink: '#fff', label: 'Tamil · Chennai', quote: 'Heavy fabric, print still sharp after 10 washes. The Vera Level tee gets compliments daily.', who: 'Karthik · Chennai', no: '0001', seat: 'Row H · Seat 12' },
  { band: 'var(--yel)', ink: 'var(--ink)', label: 'Malayalam · Kochi', quote: 'Finally Malayalam typography that looks proper. My Adipoli tee is the best fit I own.', who: 'Anjali · Kochi', no: '0002', seat: 'Row C · Seat 07' },
  { band: 'var(--ink)', ink: 'var(--paper)', label: 'Poster · Bengaluru', quote: 'Poster print quality is theatre-lobby level. Ordered the fan pack for my brother too.', who: 'Arun · Bengaluru', no: '0003', seat: 'Row F · Seat 21' },
];

export default async function Home() {
  const [{ products: trending }, { products: featured }, { products: posters }] = await Promise.all([
    getProducts({ pageSize: 8, sort: 'newest' }),
    getProducts({ page: 2, pageSize: 3, sort: 'newest' }),
    getProducts({ pageSize: 3, categorySlug: 'posters', sort: 'newest' }),
  ]);
  const tones = ['var(--ink)', 'var(--red)', 'var(--teal2)'];

  return (
    <>
      {/* HERO */}
      <section id="home-hero" className="hero-s ht" aria-labelledby="home-hero-title">
        <div className="hero-glow" />
        <Reel className="hero-wm" />
        <div className="wrap hero">
          <div className="hero-copy">
            <span className="mono gold row-c"><Icon name="reel" /> ZeroCraft Commerce presents · Drop 07</span>
            <h1 id="home-hero-title">Wear the<br /><span>Story.</span></h1>
            <div className="langs-line"><span lang="ta">தமிழ்</span> · <span lang="ml">മലയാളം</span></div>
            <p className="lead">Streetwear, posters and custom pieces built on cinema, tea-stall debates and the stories of Tamil Nadu and Kerala. Original art, studio printed.</p>
            <div className="cta-row">
              <Link className="btn glow" href="/shop">Shop the drop <Icon name="arrow" /></Link>
              <Link className="btn o" href="/shop?cat=posters">Browse posters</Link>
            </div>
            <dl className="stats">
              <div><dt>4.8</dt><dd className="mono">Avg rating</dd></div>
              <div><dt>10K+</dt><dd className="mono">Happy fans</dd></div>
              <div><dt>7 day</dt><dd className="mono">Easy returns</dd></div>
            </dl>
          </div>
          <div className="hero-art" aria-hidden="true">
            <Reel className="h-reel spin" />
            <PosterFrame v={1} className="hp hp1" />
            <PosterFrame v={3} className="hp hp3" />
            <PosterFrame v={2} className="hp hp2" />
            <Clap className="h-clap" />
            <Corn className="h-corn" />
            <div className="h-burst"><Burst className="fill" /><span>New<br />drop<br />live</span></div>
            <div className="tk h-ticket" style={{ ['--pg' as string]: '#1C1411' }}>
              <div className="mono red-t">Admit one</div>
              <div className="ttl">Posters from ₹299</div>
            </div>
          </div>
        </div>
        <div className="film" />
      </section>

      {/* CATEGORIES */}
      <section id="shop-categories" className="sec" aria-labelledby="shop-categories-title">
        <div className="wrap">
          <div className="hd">
            <div><span className="mono red-t">Pick your seat</span><h2 id="shop-categories-title">Shop the <em>screen.</em></h2></div>
            <Link className="btn o" href="/shop">Shop all <Icon name="arrow" /></Link>
          </div>
          <div className="cats">
            {[
              ['tees', 'Tees', '12 styles', 'var(--yel)', 'var(--ink)'],
              ['hoodies', 'Hoodies', '8 styles', 'var(--ink)', 'var(--paper)'],
              ['posters', 'Posters', '24 prints', 'var(--red)', '#fff'],
              ['frames', 'Frames', '6 styles', 'var(--teal2)', '#fff'],
              ['accessories', 'Totes & mugs', '10 items', 'var(--sand)', 'var(--ink)'],
              ['bundles', 'Fan packs', 'Save 15%', 'var(--gold)', 'var(--ink)'],
            ].map(([k, t, n, bg, c]) => (
              <Link key={k} href={`/shop?cat=${k}`} className="tk cat" style={{ background: bg, color: c, ['--pg' as string]: '#F0E2C3' }}>
                <span className="mono">{n}</span><b>{t}</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* LANGUAGES */}
      <section id="language-collections" className="dark-s ht" aria-labelledby="language-collections-title">
        <div className="wrap">
          <span className="mono gold">Choose your industry</span>
          <h2 id="language-collections-title" className="h-lg">Tamil. <span className="red-l">Malayalam.</span></h2>
          <div className="langs">
            <Link href="/shop?q=tamil" className="lang l-ta">
              <div className="lang-t"><span className="mono">Kollywood vibes</span><div><div className="big-w">TAMIL</div><div lang="ta" className="sub">தமிழ்</div><span className="mono ul">Shop Tamil designs →</span></div></div>
              <PosterFrame v={1} className="lang-p" style={{ transform: 'rotate(4deg)' }} />
            </Link>
            <Link href="/shop?q=malayalam" className="lang l-ml">
              <div className="lang-t"><span className="mono">Mollywood vibes</span><div><div className="big-w sm">MALAYALAM</div><div lang="ml" className="sub">മലയാളം</div><span className="mono ul">Shop Malayalam designs →</span></div></div>
              <PosterFrame v={2} className="lang-p" style={{ transform: 'rotate(-4deg)' }} />
            </Link>
          </div>
        </div>
      </section>

      {/* TRENDING */}
      <section id="trending-products" className="sec trending-products-section" aria-labelledby="trending-products-title">
        <div className="wrap">
          <div className="hd">
            <div><span className="mono red-t">Now trending</span><h2 id="trending-products-title">First day. <em>First show.</em></h2><p className="muted">Fresh picks for your next favourite.</p></div>
            <Link className="btn o" href="/shop">View all <Icon name="arrow" /></Link>
          </div>
          {trending.length ? <div className="pgrid trending-products-grid">{trending.map((product, index) => <div className={`trending-product-item trending-product-item--${index + 1}`} key={product.id}><span className="trending-product-item__number">{String(index + 1).padStart(2, '0')}</span><CatalogProductCard product={product} /></div>)}</div> : <p className="muted">New products will appear here when they are published in Commerce.</p>}
        </div>
      </section>

      {/* BIG MARQUEE */}
      <section className="band htd" aria-label="First day first show">
        <Marquee className="big-mq" seconds={38} items={['First day first show', 'செம்ம மாஸ்', 'Interval break', 'വേറെ ലെവൽ', 'Houseful']} />
      </section>

      {/* FAN PACKS */}
      <section className="sec">
        <div className="wrap">
          <div className="hd"><div><span className="mono red-t">From the catalog</span><h2>More to <em>discover.</em></h2></div></div>
          {featured.length ? <div className="packs">
            {featured.map((product, i) => (
              <div key={product.id} className="tk pack-c" style={{ background: tones[i], ['--pg' as string]: '#F0E2C3' }}>
                <Link href={`/product/${product.slug}`} className="pack-img"><img src={product.images[0] ?? '/og-image.jpg'} alt={product.title} /></Link>
                <div className="pack-b">
                  <span className="mono gold">{product.category}</span>
                  <h3>{product.title}</h3>
                  <p>{product.shortDescription}</p>
                  <div className="pack-f"><div className="pr big">{formatMoney(product.price, product.currency)} {product.originalPrice > product.price && <s>{formatMoney(product.originalPrice, product.currency)}</s>}</div><Link className="btn y sm" href={`/product/${product.slug}`}>View product</Link></div>
                </div>
              </div>
            ))}
          </div> : <p className="muted">More products will appear here as the catalog grows.</p>}
        </div>
      </section>

      {/* NOW SHOWING */}
      <section className="dark-s ht rel">
        <Corn className="dec corn-d" />
        <Burst className="dec burst-d" fill="#EFB033" />
        <div className="wrap">
          <div className="hd"><div><span className="mono gold">Now showing</span><h2>Posters at the <span className="yel-l">box office.</span></h2></div><Link className="btn o" href="/shop?cat=posters">All posters <Icon name="arrow" /></Link></div>
          {posters.length ? <div className="show">
            {posters.map((product, i) => (
                <div key={product.id} className="show-c">
                  <Link href={`/product/${product.slug}`}><img src={product.images[0] ?? '/og-image.jpg'} alt={product.title} className="show-p" /></Link>
                  <div className="tk show-t" style={{ background: i === 1 ? 'var(--yel)' : 'var(--paper)', ['--pg' as string]: '#1C1411' }}>
                    <div><div className="mono red-t">{product.subcategory || product.category}</div><div className="ttl2">{product.title.replace(' Poster', '')}</div></div>
                    <Link className="btn k sm" href={`/product/${product.slug}`}>{formatMoney(product.price, product.currency)}</Link>
                  </div>
                </div>
            ))}
          </div> : <p className="muted">Published posters will appear here.</p>}
        </div>
      </section>

      {/* STORY */}
      <section className="sec">
        <div className="wrap story">
          <div className="story-t">
            <span className="mono red-t">Our story</span>
            <h2 className="h-xl">For the last row. <mark>For the whistle.</mark></h2>
            <p className="lead dk">ZeroCraft is cinema streetwear for people who grew up on first-day-first-show, tea stall debates and the dialogues they still quote. Original art, studio printed, made for Tamil and Malayalam fans.</p>
            <Link className="btn k" href="/shop">Browse the drop <Icon name="arrow" /></Link>
          </div>
          <div className="stat-g">
            <div style={{ background: 'var(--ink)', color: 'var(--paper)' }}><b>100+</b><span className="mono">Original designs</span></div>
            <div style={{ background: 'var(--red)', color: '#fff' }}><b>2</b><span className="mono">Languages, one club</span></div>
            <div style={{ background: 'var(--yel)' }}><b>4.8</b><span className="mono">Average rating</span></div>
            <div style={{ background: 'var(--teal2)', color: '#fff' }}><b>2-4</b><span className="mono">Days to dispatch</span></div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="trust-s">
        <div className="wrap trust">
          {[['truck', 'Free shipping', 'Above ₹999'], ['ret', 'Easy exchange', '7-day returns'], ['shield', 'Secure checkout', 'UPI & cards'], ['reel', 'Commerce printed', 'Made in India']].map(([i, t, s]) => (
            <div key={t}><Icon name={i} size={30} /><div><b>{t}</b><div className="mono muted">{s}</div></div></div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="teal-s ht rel">
        <Burst className="dec burst-r" fill="#EFB033" />
        <Reel className="dec reel-r" />
        <div className="wrap rel">
          <div className="hd">
            <div><span className="mono gold">Fan reviews</span><h2>Houseful <span className="yel-l">reviews.</span></h2></div>
            <div className="mono score"><b>4.8</b><span>Rated by<br />10K+ fans</span></div>
          </div>
          <div className="rv-marquee" aria-label="Fan reviews">
            <div className="rv-marquee__track">
            {[...REVIEWS, ...REVIEWS].map((r, i) => (
              <figure key={`${r.no}-${i}`} className="vt" style={{ ['--pg' as string]: '#17464C' }}>
                <div className="stamp">Verified<br />fan</div>
                <figcaption className="mono tag" style={{ background: r.band, color: r.ink }}>{r.label}</figcaption>
                <div className="stars" aria-label="5 out of 5 stars">{stars.map((_, i) => <Icon key={i} name="star" size={18} fill="currentColor" />)}</div>
                <div className="qm" aria-hidden="true">“</div>
                <blockquote>{r.quote}</blockquote>
                <div className="mono who">{r.who}</div>
                <div className="stub"><div><div className="mono red-t">Admit one</div><div className="mono who">No. {r.no} · {r.seat}</div></div><div className="barcode" aria-hidden="true" /></div>
              </figure>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="wrap news-s">
        <div className="tk htd news">
          <Clap className="dec news-clap" />
          <div><span className="mono red-t">Admit one</span><h2>Join the first-show <em>list.</em></h2></div>
          <NewsForm />
        </div>
      </section>
    </>
  );
}
