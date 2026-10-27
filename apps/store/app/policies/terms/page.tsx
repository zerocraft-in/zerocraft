import PolicyPage, { type PolicySection } from '@/components/PolicyPage';

export const metadata = { title: 'Terms of service | ZeroCraft' };

const sections: PolicySection[] = [
  {
    title: 'Using the store',
    paragraphs: ['By using ZeroCraft, you agree to use the site lawfully and not to interfere with the store, copy its content, abuse discounts, place fraudulent orders, or misuse another person’s information.'],
  },
  {
    title: 'Products, prices, and availability',
    paragraphs: ['We aim to keep product names, images, descriptions, prices, stock, and variant information accurate. Colours and print placement can vary slightly by screen, material, and production. Prices are shown in Indian rupees and may change before an order is accepted. A product can become unavailable before fulfilment.'],
  },
  {
    title: 'Orders',
    paragraphs: ['Adding an item to your cart does not reserve stock. An order is accepted only after the payment or order confirmation step succeeds. If an order cannot be fulfilled, we will communicate the issue and arrange the applicable cancellation or refund. Please check your delivery details before confirming.'],
  },
  {
    title: 'Original work and site content',
    paragraphs: ['ZeroCraft artwork, writing, graphics, logos, and storefront presentation belong to ZeroCraft or their respective rights holders. Do not reproduce, sell, scrape, or commercially reuse them without written permission.'],
  },
  {
    title: 'Changes and responsibility',
    paragraphs: ['We may update products, prices, policies, or parts of the store as the business changes. Nothing in these terms removes rights that cannot be excluded under applicable law.'],
  },
];

export default function TermsPage() {
  return <PolicyPage eyebrow="ZeroCraft / Terms" title="Terms of service." intro="The simple rules for shopping, ordering, and using the ZeroCraft storefront." updated="27 October 2026" sections={sections} />;
}
