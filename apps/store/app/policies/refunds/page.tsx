import PolicyPage, { type PolicySection } from '@/components/PolicyPage';

export const metadata = { title: 'Refunds and payments | ZeroCraft' };

const sections: PolicySection[] = [
  {
    title: 'Payment methods',
    paragraphs: ['The storefront may offer UPI, cards, and other payment methods displayed at checkout. Payment availability can vary by order, currency, provider, or temporary service status. Never share your UPI PIN, card PIN, password, or one-time password with anyone claiming to be ZeroCraft support.'],
  },
  {
    title: 'When a refund may apply',
    bullets: ['An order is cancelled because the product cannot be fulfilled.', 'A return or exchange review approves a refund rather than a replacement.', 'A payment was captured but the order was not created or cannot be fulfilled.', 'A duplicate payment or other payment error is confirmed.'],
  },
  {
    title: 'Refund process',
    paragraphs: ['Approved refunds are initiated to the original payment method where the payment provider supports it. Processing time can depend on the payment provider and your bank. We may request order or payment details to verify a refund request; we will never request your PIN or password.'],
  },
  {
    title: 'Shipping and other charges',
    paragraphs: ['Shipping charges, discounts, and any applicable deductions are reviewed against the reason for cancellation or return. The final refund amount is confirmed when the request is approved.'],
  },
  {
    title: 'Payment support',
    paragraphs: ['If money was debited but your order confirmation did not arrive, do not place repeated orders immediately. Keep the payment reference and contact support using the details in your order confirmation so the payment can be checked safely.'],
  },
];

export default function RefundsPolicyPage() {
  return <PolicyPage eyebrow="ZeroCraft / Payments" title="Refunds & payments." intro="How payment issues, cancellations, and approved refunds are handled." updated="27 October 2026" sections={sections} />;
}
