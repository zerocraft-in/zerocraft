import PolicyPage, { type PolicySection } from "@/components/PolicyPage";
import { studioMetadata } from "@/lib/studio-metadata";

export const metadata = studioMetadata(
  "Terms of Service — Zerocraft Studio",
  "Terms for using Zerocraft Studio websites and connected tools.",
  "/policies/terms",
);

const sections: PolicySection[] = [
  {
    title: "Using our services",
    paragraphs: [
      "Zerocraft Studio provides creative, digital, and workspace tools. You agree to use them lawfully, keep your account access secure, and provide accurate information when you contact us or connect a third-party account.",
    ],
  },
  {
    title: "Gmail workspace",
    paragraphs: [
      "The Email Workspace is an optional tool that connects to a Gmail account through Google OAuth. You control which account is connected and can disconnect it at any time. You are responsible for the messages you send, drafts you create, and actions you take through the workspace.",
    ],
  },
  {
    title: "Content and availability",
    paragraphs: [
      "You retain ownership of content you provide to us, subject to the permissions needed to deliver the requested service. We work to keep our websites and tools available and secure, but we do not promise uninterrupted availability or that every third-party integration will always operate without interruption.",
    ],
  },
  {
    title: "Changes and contact",
    paragraphs: [
      "We may update these terms as our services change. The latest version will be posted on this page. If you have questions, contact hello@zerocraft.in.",
    ],
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Zerocraft Studio / Terms"
      title="Terms of service."
      intro="The simple rules for using Zerocraft Studio websites and connected tools."
      updated="27 October 2026"
      sections={sections}
    />
  );
}
