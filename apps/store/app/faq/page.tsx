import PolicyPage, { type PolicyFaq } from '@/components/PolicyPage';

export const metadata = { title: 'Frequently asked questions | ZeroCraft' };

const faq: PolicyFaq[] = [
  { question: 'How long does delivery take?', answer: 'Regular products generally dispatch in 2–4 business days. Custom or made-to-order pieces may need 4–6 business days before dispatch. Courier time varies by destination and serviceability.' },
  { question: 'Is shipping free?', answer: 'Yes. Shipping is free for eligible orders above ₹999. Orders below that threshold currently carry a ₹79 shipping fee, shown in your cart or checkout summary.' },
  { question: 'Can I exchange my size?', answer: 'Eligible products can be requested for exchange within 7 days of delivery. Items should be unused, unwashed, unaltered, and in original condition. Exchange stock is subject to availability.' },
  { question: 'What payment methods are available?', answer: 'The payment methods available for your order are shown at checkout and may include UPI and cards. Never share your UPI PIN, card PIN, password, or one-time password with anyone.' },
  { question: 'Can I change my delivery address?', answer: 'Contact support as soon as possible using the details in your order confirmation. Address changes cannot be guaranteed after an order has been dispatched.' },
  { question: 'What should I do if my payment was debited but I have no confirmation?', answer: 'Do not immediately place a duplicate order. Keep the payment reference and contact support using the details in your order confirmation so the payment can be checked safely.' },
  { question: 'Do you accept custom orders?', answer: 'The Custom Studio supports made-to-order designs. Custom or personalised pieces may have different production times and may not be eligible for change-of-mind exchanges, except for defects or where applicable law requires otherwise.' },
];

export default function FAQPage() {
  return <PolicyPage eyebrow="ZeroCraft / Help" title="Questions, answered." intro="The quick guide to ordering, delivery, exchanges, and payments." updated="27 October 2026" sections={[]} faq={faq} />;
}
