import Link from 'next/link';
import { notFound } from 'next/navigation';
import AddPanel from '@/components/AddPanel';
import CatalogProductCard from '@/components/CatalogProductCard';
import Icon from '@/components/Icon';
import { getProductBySlug, getRelatedProducts } from '@/lib/commerce/catalog';

export const dynamic = 'force-dynamic';

type ProductRouteParams = { params: Promise<{ slug: string }> };

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export async function generateMetadata({ params }: ProductRouteParams) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product ? `${product.title} | ZeroCraft` : 'Product not found | ZeroCraft' };
}

export default async function ProductPage({ params }: ProductRouteParams) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categorySlug, 4);
  const images = product.images.length ? product.images : ['/og-image.jpg'];
  const hasDiscount = product.originalPrice > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const badge = product.isNew ? 'NEW' : hasDiscount ? `${discount}% OFF` : null;

  return (
    <div className="wrap pdp product-page">
      <nav className="crumbs mono" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href={`/shop?cat=${product.categorySlug}`}>{product.category}</Link><span>/</span><span aria-current="page">{product.title}</span></nav>
      <div className="pdp-g">
        <div className="gallery">
          <div className="g-main">
            <div className="pt pdp-image"><img src={images[0]} alt={product.title} /></div>
            {badge && <span className={`bd ${hasDiscount ? 'r' : ''}`}>{badge}</span>}
          </div>
          {images.length > 1 && <div className="g-thumbs" aria-label="Product images">{images.slice(0, 4).map((image, index) => <div key={image} className={index === 0 ? 'on' : ''}><img src={image} alt="" /></div>)}</div>}
        </div>
        <div className="info">
          <span className="mono red-t">{product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}</span>
          <h1>{product.title}</h1>
          {product.reviewCount > 0 && <div className="rate-row"><span className="rt"><Icon name="star" size={12} />{product.rating}</span><span className="muted small">{product.reviewCount} verified reviews</span></div>}
          <div className="pr xl">{formatMoney(product.price, product.currency)} {hasDiscount && <><s>{formatMoney(product.originalPrice, product.currency)}</s><span>{discount}% OFF</span></>}</div>
          <p className="small muted">Inclusive of all taxes. Free shipping above ₹999.</p>
          <p className="desc">{product.description || product.shortDescription}</p>
          <AddPanel product={product} />
          <div className="tick-list">
            <div><Icon name="truck" /> <span>{product.shippingBadge || 'Ships in 2–4 days'}</span></div>
            <div><Icon name="ret" /> <span>7-day exchange</span></div>
            <div><Icon name="shield" /> <span>Secure UPI and cards</span></div>
          </div>
          {product.specifications.length > 0 && <details className="acc" open><summary>Details</summary><ul>{product.specifications.map((specification) => <li key={specification.label}><b>{specification.label}:</b> {specification.value}</li>)}</ul></details>}
          <details className="acc"><summary>Shipping and returns</summary><p>Orders dispatch from our studio. Exchange within 7 days of delivery for size or print defects, in original condition.</p></details>
        </div>
      </div>
      {related.length > 0 && <section className="rel-s" aria-labelledby="related-products-title">
        <h2 id="related-products-title" className="h-md">You may also <em>like.</em></h2>
        <div className="pgrid">{related.map((relatedProduct) => <CatalogProductCard key={relatedProduct.id} product={relatedProduct} />)}</div>
      </section>}
    </div>
  );
}
