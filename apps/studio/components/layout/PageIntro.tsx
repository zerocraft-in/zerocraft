import Link from "next/link";
export default function PageIntro({ label, title, accent, description }: { label: string; title: string; accent: string; description: string }) {
  return <header className="studio-page-intro container-site"><Link href="/" className="studio-eyebrow">Home / {label}</Link><h1 className="studio-heading">{title}<br /><span>{accent}</span></h1><p>{description}</p></header>;
}
