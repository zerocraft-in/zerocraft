import type { Metadata } from "next";
import PolicyPage, { type PolicySection } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Zerocraft Studio collects and uses information.",
};

const sections: PolicySection[] = [
  {
    title: "Information we collect",
    paragraphs: [
      "When you contact Zerocraft Studio, request a project, or use one of our digital services, we may receive information you choose to provide, such as your name, email address, company details, project requirements, and messages.",
      "When you connect a mailbox to the Zerocraft Studio Email Workspace, we process the Gmail account identifier, OAuth tokens, and the message metadata or content needed to display and manage email in the workspace.",
    ],
  },
  {
    title: "How we use information",
    bullets: [
      "Respond to enquiries and provide requested creative or digital services.",
      "Operate, secure, troubleshoot, and improve our websites and tools.",
      "Display, search, draft, send, archive, or label Gmail messages when you explicitly use the Email Workspace.",
      "Send service notifications and important account or security updates.",
      "Meet legal, accounting, fraud-prevention, and security obligations.",
    ],
  },
  {
    title: "Google and service providers",
    paragraphs: [
      "The Email Workspace uses Google OAuth and the Gmail API. We request only the Gmail permissions shown during Google consent, and we use the connected account only to provide the workspace features you initiate. We do not sell personal information or use Gmail content for advertising.",
      "We may use trusted hosting, database, analytics, email, and security providers to operate the service. They receive only the information needed for the relevant service and are expected to protect it.",
    ],
  },
  {
    title: "Retention and your choices",
    paragraphs: [
      "You can disconnect Gmail from the Email Workspace at any time. You may also ask us to review, correct, or delete personal information where applicable. We retain information only for as long as needed for the purposes described here, legitimate business records, security, dispute resolution, or legal obligations.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "For privacy questions or requests, email hello@zerocraft.in. Zerocraft Studio is based in Tenkasi, Tamil Nadu, India.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Zerocraft Studio / Privacy"
      title="Privacy policy."
      intro="A clear account of the information we use to run Zerocraft Studio and its connected tools."
      updated="27 October 2026"
      sections={sections}
    />
  );
}
