import PolicyPage, { type PolicySection } from '@/components/PolicyPage';

export const metadata = { title: 'Shipping policy | ZeroCraft' };

const sections: PolicySection[] = [
  {
    title: 'Where we ship',
    paragraphs: ['ZeroCraft currently fulfils orders in India. Delivery availability can depend on the destination PIN code and the courier network serving it.'],
  },
  {
    title: 'Dispatch and delivery',
    bullets: ['Regular products generally dispatch in 2–4 business days.', 'Custom or made-to-order pieces may need 4–6 business days before dispatch.', 'Courier delivery time varies by destination, serviceability, weather, and peak-season volume.', 'You will receive the available order or delivery update through the contact details provided at checkout.'],
  },
  {
    title: 'Shipping charges',
    paragraphs: ['Standard shipping is free for eligible orders above ₹999. Orders below that threshold currently carry a ₹79 shipping fee. The applicable charge is shown in the cart or checkout summary before confirmation.'],
  },
  {
    title: 'Address changes and delivery issues',
    paragraphs: ['Please verify your address and PIN code before placing an order. Contact support as soon as possible if a change is needed; changes cannot be guaranteed after dispatch. If a parcel arrives damaged or appears tampered with, keep the packaging and contact support with photographs.'],
  },
  {
    title: 'Delays and undelivered parcels',
    paragraphs: ['Delivery estimates are not guarantees. If a parcel is delayed, refused, or returned because the address was incomplete or the recipient was unavailable, we will review the next step with you. Additional shipping charges may apply for a re-ship where the delivery failure was not caused by ZeroCraft.'],
  },
];

export default function ShippingPolicyPage() {
  return <PolicyPage eyebrow="ZeroCraft / Shipping" title="Shipping policy." intro="What happens after your order leaves the studio." updated="27 October 2026" sections={sections} />;
}
