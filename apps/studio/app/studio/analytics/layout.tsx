export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ml-18">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 -top-40 size-175 rounded-full bg-[radial-gradient(circle_at_40%_40%,#ff6a2b,#b3261e_55%,transparent_72%)] opacity-40 blur-[90px]"
      />
      {children}
    </div>
  );
}
