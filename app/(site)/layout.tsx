import "@/styles/index.css";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div id="zerocraft">{children}</div>;
}
