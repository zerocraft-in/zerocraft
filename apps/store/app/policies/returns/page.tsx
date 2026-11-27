import PolicyPage, { type PolicySection } from '@/components/PolicyPage';

export const metadata = { title: 'Returns and exchanges | ZeroCraft' };

const sections: PolicySection[] = [
  {
    title: '7-day exchange window',
    paragraphs: ['We offer an exchange request window of 7 days from delivery for eligible products. Start a request as soon as you notice a size issue, manufacturing defect, or transit damage.'],
  },
  {
    title: 'Eligibility',
    bullets: ['Items must be unused, unwashed, unaltered, and in original condition with tags and packaging where supplied.', 'Size exchanges depend on available stock and may be limited to the same product.', 'For a defect or damage claim, send clear photographs of the item and packaging when contacting support.', 'Customised, personalised, worn, washed, altered, or final-sale items may not be eligible for change of mind exchanges, except where required for a product defect or applicable law.'],
  },
  {
    title: 'How to request an exchange',
    paragraphs: ['Use the support details in your order confirmation and include your order reference, the item concerned, and the reason for the request. Do not ship an item back before the request is reviewed and return instructions are provided.'],
  },
  {
    title: 'Inspection and replacement',
    paragraphs: ['Approved items may be inspected when received. If the request is accepted, we will confirm the available exchange or the next available resolution. An exchange can be delayed when the requested replacement is out of stock.'],
  },
];

export default function ReturnsPolicyPage() {
  return <PolicyPage eyebrow="ZeroCraft / Returns" title="Returns & exchanges." intro="A fair, practical process for size issues, defects, and damaged deliveries." updated="27 October 2026" sections={sections} />;
}
