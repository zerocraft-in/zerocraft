import PolicyPage, { type PolicySection } from '@/components/PolicyPage';

export const metadata = { title: 'Privacy policy | ZeroCraft' };

const sections: PolicySection[] = [
  {
    title: 'What we collect',
    paragraphs: ['When you browse or place an order, we may receive information you provide such as your name, delivery address, phone number, email address, order details, and messages sent to support. We collect only what is needed to operate the storefront and fulfil your request.'],
  },
  {
    title: 'How we use it',
    bullets: ['Process, confirm, pack, and deliver orders.', 'Provide support, exchanges, refunds, and order updates.', 'Keep the storefront, catalogue, cart, and checkout secure.', 'Understand storefront performance and improve the shopping experience.', 'Send marketing messages only where you have chosen to receive them.'],
  },
  {
    title: 'Payments and service providers',
    paragraphs: ['Payment details are handled by the payment or banking providers made available at checkout. ZeroCraft does not ask you to send card passwords, UPI PINs, or one-time passwords by email or chat. We may share the minimum delivery and order information needed with fulfilment, logistics, hosting, analytics, and payment partners.'],
  },
  {
    title: 'Cookies and local storage',
    paragraphs: ['The storefront may use cookies or browser storage to keep your cart, remember preferences, maintain sessions, and understand basic site usage. Clearing browser storage can remove a locally saved cart.'],
  },
  {
    title: 'Your choices',
    paragraphs: ['You may ask us to review, correct, or delete personal information where applicable. You can also unsubscribe from marketing messages. Some information may need to be retained where required for order records, fraud prevention, accounting, or legal obligations.'],
  },
];

export default function PrivacyPolicyPage() {
  return <PolicyPage eyebrow="ZeroCraft / Privacy" title="Privacy policy." intro="A clear account of the information we use to run a small, useful storefront." updated="27 October 2026" sections={sections} />;
}
